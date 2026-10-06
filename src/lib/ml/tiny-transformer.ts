/** Main-thread handle on the training engine (see engine.ts). */
import { createEngine } from "./engine";

export type { Bugs, Config, Param } from "./engine";

const E = createEngine();
export const TinyTransformer = E.TinyTransformer;
export type TinyTransformer = InstanceType<typeof E.TinyTransformer>;
export const { DIGITS, LEN, SEP, TASK_CFG, LOSS_FLOOR, makeExample, allSequences, generate } = E;
