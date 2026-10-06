import type { Bugs } from "./tiny-transformer";

/**
 * The Transformer Debugger's patients. Each runs the same tiny model on the
 * same task with exactly one real fault; the fixed config removes it. All
 * symptoms were checked by training headless (see the walkthrough copy).
 */
export type DiagnosisId = "mask" | "lr-high" | "lr-low" | "pos" | "norm" | "frozen" | "residual";

export const DIAGNOSES: { id: DiagnosisId; label: string; fix: string; tell: string }[] = [
  {
    id: "mask",
    label: "Causal mask missing",
    fix: "Mask out future positions before the softmax",
    tell: "Training loss drops below the entropy floor (impossible for an honest model); attention maps put weight above the diagonal.",
  },
  {
    id: "lr-high",
    label: "Learning rate far too high",
    fix: "Lower the learning rate (0.6 → 0.003)",
    tell: "Loss jumps to chance and stays there; activations in the residual stream explode by orders of magnitude.",
  },
  {
    id: "lr-low",
    label: "Learning rate far too low",
    fix: "Raise the learning rate (0.00002 → 0.003)",
    tell: "Loss barely moves; gradients look healthy but the weight updates are microscopic.",
  },
  {
    id: "pos",
    label: "Positional embeddings never added",
    fix: "Add the position vectors to the token embeddings",
    tell: "Loss plateaus well above the floor; attention can't target a position, so reversal stays mostly wrong.",
  },
  {
    id: "norm",
    label: "LayerNorm removed (with a large init)",
    fix: "Put the LayerNorms back",
    tell: "Huge loss and gradient norms from step one; activations blow up layer by layer.",
  },
  {
    id: "frozen",
    label: "Attention weights detached from the optimizer",
    fix: "Hand W_Q, W_K, W_V, W_O to the optimizer again",
    tell: "Gradients reach the attention weights but their update size is exactly zero; attention maps never change from their random start.",
  },
  {
    id: "residual",
    label: "Residual connections removed",
    fix: "Restore x + f(x) around every block",
    tell: "Loss stuck near chance; gradients shrink sharply towards the first layer (vanishing gradients).",
  },
];

export interface Case {
  id: string;
  title: string;
  story: string;
  bug: DiagnosisId;
  broken: { bugs: Bugs; lr: number };
  fixed: { bugs: Bugs; lr: number };
}

const OK_LR = 3e-3;

export const CASES: Case[] = [
  { id: "c1", title: "Too good to be true", story: "Training loss is the best we've ever seen. Ship it?", bug: "mask", broken: { bugs: { noMask: true }, lr: OK_LR }, fixed: { bugs: {}, lr: OK_LR } },
  { id: "c2", title: "Lost in place", story: "It learns something, then stalls. Most reversals come out scrambled.", bug: "pos", broken: { bugs: { noPos: true }, lr: OK_LR }, fixed: { bugs: {}, lr: OK_LR } },
  { id: "c3", title: "Overdrive", story: "Someone was in a hurry with the hyperparameters.", bug: "lr-high", broken: { bugs: {}, lr: 0.6 }, fixed: { bugs: {}, lr: OK_LR } },
  { id: "c4", title: "Asleep at the wheel", story: "It's been training for ages. Nothing happens.", bug: "lr-low", broken: { bugs: {}, lr: 2e-5 }, fixed: { bugs: {}, lr: OK_LR } },
  { id: "c5", title: "Meltdown", story: "A refactor 'simplified' the blocks. Now the numbers are enormous.", bug: "norm", broken: { bugs: { noNorm: true, initStd: 0.5 }, lr: OK_LR }, fixed: { bugs: { initStd: 0.5 }, lr: OK_LR } },
  { id: "c6", title: "Staring blankly", story: "The MLPs are learning. The attention… isn't?", bug: "frozen", broken: { bugs: { frozenAttn: true }, lr: OK_LR }, fixed: { bugs: {}, lr: OK_LR } },
  {
    id: "c7",
    title: "Deep and silent",
    story: "An experimental block without LayerNorm. Someone also removed the skip connections.",
    bug: "residual",
    broken: { bugs: { noResidual: true, noNorm: true, initStd: 0.03 }, lr: OK_LR },
    fixed: { bugs: { noNorm: true, initStd: 0.03 }, lr: OK_LR },
  },
];

export const STEPS_PER_RUN = 240;
