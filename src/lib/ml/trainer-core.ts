/** The training loop shared by the Debugger's worker and its main-thread fallback (see engine.ts). */
import { SEP } from "./engine";

export { DEMO, demoTokens, LEN, LOSS_FLOOR, runTraining } from "./engine";
export type { RunOptions, Telemetry } from "./engine";
export const TOKEN_LABEL = (t: number) => (t === SEP ? "|" : String(t));
