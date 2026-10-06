/// <reference lib="webworker" />
/**
 * Trains the Debugger's transformer off the main thread. Bundled by
 * Turbopack as a worker entry (see use-trainer.ts).
 *
 * Protocol: { type: "run", id, opts } starts a run (and supersedes any
 * running one); { type: "stop" } stops. Every message back carries the run
 * id so the page can ignore stragglers from a superseded run.
 */
import { runTraining, type RunOptions } from "@/lib/ml/trainer-core";

declare const self: DedicatedWorkerGlobalScope;

let current = -1;

self.onmessage = (e: MessageEvent<{ type: "run"; id: number; opts: RunOptions } | { type: "stop" }>) => {
  if (e.data.type === "stop") {
    current = -1;
    return;
  }
  const id = (current = e.data.id);
  void runTraining(
    e.data.opts,
    (t) => self.postMessage({ type: "tick", id, t }),
    () => id !== current,
  ).then(() => {
    if (id === current) self.postMessage({ type: "done", id });
  });
};
