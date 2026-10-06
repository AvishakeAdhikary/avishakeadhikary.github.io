/** Main-thread handle on the training loop (the worker builds its own from engine.ts). */
import { createEngine } from "./engine";
import { SEP } from "./tiny-transformer";

export type { RunOptions, Telemetry } from "./engine";
export { LEN, LOSS_FLOOR } from "./tiny-transformer";

const E = createEngine();
export const { DEMO, demoTokens, runTraining } = E;
export const TOKEN_LABEL = (t: number) => (t === SEP ? "|" : String(t));
