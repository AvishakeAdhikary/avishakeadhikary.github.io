"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createEngine } from "@/lib/ml/engine";
import { runTraining, type RunOptions, type Telemetry } from "@/lib/ml/trainer-core";

/**
 * The worker is built from createEngine's own source (it has no outside
 * references), so no bundler worker support is needed.
 */
function spawnWorker(): Worker {
  const src = `const createEngine = ${createEngine.toString()};
const E = createEngine();
let current = -1;
self.onmessage = (e) => {
  if (e.data.type === "stop") { current = -1; return; }
  const id = (current = e.data.id);
  E.runTraining(e.data.opts, (t) => self.postMessage({ type: "tick", id, t }), () => id !== current).then(() => {
    if (id === current) self.postMessage({ type: "done", id });
  });
};`;
  const url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
  const w = new Worker(url);
  URL.revokeObjectURL(url);
  return w;
}

/**
 * Runs training off the main thread (falls back to cooperative main-thread
 * chunks if a worker can't start) and exposes the telemetry history.
 */
export function useTrainer() {
  const worker = useRef<Worker | null>(null);
  const broken = useRef(false);
  const runId = useRef(0);
  const finish = useRef<(() => void) | null>(null);
  const lastOpts = useRef<RunOptions | null>(null);
  const [history, setHistory] = useState<Telemetry[]>([]);
  const [running, setRunning] = useState(false);

  useEffect(
    () => () => {
      runId.current++;
      worker.current?.terminate();
    },
    [],
  );

  const runHere = useCallback((opts: RunOptions, id: number) => {
    void runTraining(
      opts,
      (t) => {
        if (id === runId.current) setHistory((h) => [...h, t]);
      },
      () => id !== runId.current,
    ).then(() => finish.current?.());
  }, []);

  const run = useCallback(
    (opts: RunOptions, done?: () => void) => {
      const id = ++runId.current;
      lastOpts.current = opts;
      setHistory([]);
      setRunning(true);
      finish.current = () => {
        if (id !== runId.current) return;
        setRunning(false);
        done?.();
      };
      if (!broken.current) {
        try {
          if (!worker.current) {
            worker.current = spawnWorker();
            worker.current.onmessage = (e: MessageEvent<{ type: "tick" | "done"; id: number; t?: Telemetry }>) => {
              if (e.data.id !== runId.current) return; // a stale message from a stopped run
              if (e.data.type === "tick" && e.data.t) setHistory((h) => [...h, e.data.t!]);
              else if (e.data.type === "done") finish.current?.();
            };
            worker.current.onerror = () => {
              // Fall back to the main thread for this and every later run.
              broken.current = true;
              worker.current?.terminate();
              worker.current = null;
              if (lastOpts.current) runHere(lastOpts.current, runId.current);
            };
          }
          worker.current.postMessage({ type: "run", opts, id });
          return;
        } catch {
          broken.current = true;
        }
      }
      runHere(opts, id);
    },
    [runHere],
  );

  const stop = useCallback(() => {
    runId.current++;
    worker.current?.postMessage({ type: "stop" });
    setRunning(false);
  }, []);

  return { history, running, run, stop, last: history.at(-1) ?? null };
}
