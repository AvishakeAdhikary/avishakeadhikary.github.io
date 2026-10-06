import type { GameId } from "@/content/achievements";

/** What the Arcade lists. The games themselves are code-split (see game-loader.tsx). */
export interface GameInfo {
  id: GameId;
  name: string;
  tagline: string;
  concept: string;
  level: "Classic" | "Advanced";
  ready: boolean;
}

export const GAME_INFO: GameInfo[] = [
  {
    id: "gradient-golf",
    name: "Gradient Descent Golf",
    tagline: "Pick a club, set the power, roll down the loss landscape.",
    concept: "gradient descent · learning rate · momentum · Adam",
    level: "Classic",
    ready: true,
  },
  {
    id: "kmeans",
    name: "K-Means Cluster Rush",
    tagline: "Place the centroids yourself, then race Lloyd's algorithm.",
    concept: "unsupervised clustering · inertia · local optima · k-means++",
    level: "Classic",
    ready: true,
  },
  {
    id: "knn",
    name: "KNN: Classify the Skill",
    tagline: "My real skill map is the training set. Be the classifier.",
    concept: "k-nearest neighbours · k · distance weighting · decision regions",
    level: "Classic",
    ready: true,
  },
  {
    id: "perceptron",
    name: "Perceptron Duel",
    tagline: "Draw the decision boundary, then watch the perceptron learn its own.",
    concept: "linear classifiers · w·x + b · the update rule · XOR",
    level: "Classic",
    ready: true,
  },
  {
    id: "tokens",
    name: "Token Prediction",
    tagline: "Steer an LLM's next word with logits, temperature, top-k and top-p.",
    concept: "tokens · logits · softmax · sampling",
    level: "Advanced",
    ready: false,
  },
  {
    id: "debugger",
    name: "Transformer Debugger",
    tagline: "A tiny transformer is training badly. Read the telemetry, find the bug.",
    concept: "attention · masking · normalization · gradients",
    level: "Advanced",
    ready: false,
  },
  {
    id: "interp",
    name: "Mechanistic Interpretability",
    tagline: "Open a miniature transformer and find the circuit behind its answer.",
    concept: "attention heads · residual stream · ablation · circuits",
    level: "Advanced",
    ready: false,
  },
];

export const gameInfo = (id: string) => GAME_INFO.find((g) => g.id === id);
