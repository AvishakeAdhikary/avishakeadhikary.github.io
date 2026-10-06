import type { Tier } from "@/lib/tiers";

/**
 * Every achievement on the site. Points come from the tier (lib/tiers.ts);
 * ranks come from the total. `test` reads the visitor's progress record
 * (lib/progress.ts), so achievements unlock from what actually happened,
 * never from a separate flag that could drift.
 */
export type Category = "explore" | "terminal" | "audio" | "customise" | "arcade" | "secrets";

export const CATEGORIES: { id: Category; label: string; sub: string }[] = [
  { id: "explore", label: "Explore", sub: "read the whole model card" },
  { id: "terminal", label: "Terminal", sub: "talk to the runtime" },
  { id: "audio", label: "Audio", sub: "the soundtrack" },
  { id: "customise", label: "Customise", sub: "settings & keybinds" },
  { id: "arcade", label: "Arcade", sub: "ML mini-games" },
  { id: "secrets", label: "Secrets", sub: "hidden until found" },
];

/** What a test can see (kept minimal and serialisable). */
export interface ProgressView {
  sets: Record<string, string[]>;
  counters: Record<string, number>;
  days: string[];
  flags: Record<string, boolean>;
}

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  tier: Tier;
  cat: Category;
  secret?: boolean;
  test: (p: ProgressView) => boolean;
}

export const MAIN_PAGES = ["/", "/work/", "/projects/", "/skills/", "/research/", "/about/", "/gallery/", "/lab/", "/arcade/", "/contact/"];

export const GAMES = [
  { id: "gradient-golf", name: "Gradient Descent Golf" },
  { id: "kmeans", name: "K-Means Cluster Rush" },
  { id: "knn", name: "KNN: Classify the Skill" },
  { id: "perceptron", name: "Perceptron Duel" },
  { id: "tokens", name: "Token Prediction" },
  { id: "debugger", name: "Transformer Debugger" },
  { id: "interp", name: "Mechanistic Interpretability" },
] as const;
export type GameId = (typeof GAMES)[number]["id"];

/**
 * How each game turns level results into "cleared" and "mastered". A level
 * result is 1 (cleared) or 2 (cleared the hard way: under par, first try,
 * beat the machine…). Default: every level ≥ 1 clears, every level 2 masters.
 */
export interface GameRule {
  levels: number;
  clear?: (lv: number[]) => boolean;
  master?: (lv: number[]) => boolean;
}

export const GAME_RULES: Record<GameId, GameRule> = {
  "gradient-golf": { levels: 4 },
  kmeans: { levels: 4 },
  // One "level": 1 = ten correct answers in total, 2 = a streak of ten.
  knn: { levels: 1 },
  // Levels 0–2 are separable; level 3 (XOR) is mastered by declaring it impossible.
  perceptron: { levels: 4, clear: (lv) => [0, 1, 2].every((i) => (lv[i] ?? 0) >= 1), master: (lv) => (lv[3] ?? 0) >= 2 },
  tokens: { levels: 6 },
  debugger: { levels: 7 },
  interp: { levels: 4 },
};

export const gameCleared = (game: GameId, lv: number[] = []) => {
  const r = GAME_RULES[game];
  return r.clear ? r.clear(lv) : Array.from({ length: r.levels }, (_, i) => lv[i] ?? 0).every((x) => x >= 1);
};

export const gameMastered = (game: GameId, lv: number[] = []) => {
  const r = GAME_RULES[game];
  return r.master ? r.master(lv) : Array.from({ length: r.levels }, (_, i) => lv[i] ?? 0).every((x) => x >= 2);
};

const has = (p: ProgressView, set: string, v: string) => (p.sets[set] ?? []).includes(v);
const count = (p: ProgressView, set: string) => (p.sets[set] ?? []).length;
const flag = (p: ProgressView, f: string) => !!p.flags[f];

/** Per-game trio: tutorial (Bronze), clear (Gold), mastery (Platinum, or Diamond for the advanced three). */
const GAME_ACHIEVEMENTS: Record<GameId, [string, string, string, string, string, string]> = {
  "gradient-golf": ["Read the green", "Finish the walkthrough", "Converged", "Sink every hole", "Under par", "Finish every hole at or under par"],
  kmeans: ["Lloyd's apprentice", "Finish the walkthrough", "Inertia killer", "Clear every level", "Beat the algorithm", "Beat Lloyd's algorithm on every level"],
  knn: ["Neighbourly", "Finish the walkthrough", "Nearest neighbour", "Classify 10 skills correctly", "Perfect recall", "A streak of 10 in a row"],
  perceptron: ["Linear thinker", "Finish the walkthrough", "Separated", "Clear every separable level", "XOR enlightenment", "Recognise a problem no line can solve"],
  tokens: ["Tokenizer", "Finish the walkthrough", "Sampler", "Clear every challenge", "Temperature control", "Clear every challenge first try"],
  debugger: ["Hello, gradients", "Finish the walkthrough", "Bug squasher", "Fix every broken model", "Root cause", "Fix every model with no wrong diagnosis"],
  interp: ["Open the box", "Finish the walkthrough", "Circuit found", "Identify every circuit", "Mechanic", "Find every circuit with minimal ablations"],
};
const ADVANCED = new Set<GameId>(["tokens", "debugger", "interp"]);

const gameAchievements: Achievement[] = GAMES.flatMap(({ id, name }) => {
  const [t1, d1, t2, d2, t3, d3] = GAME_ACHIEVEMENTS[id];
  return [
    { id: `${id}-tutorial`, title: t1, desc: `${name}: ${d1.toLowerCase()}.`, tier: "bronze", cat: "arcade", test: (p) => has(p, "tutorials", id) },
    { id: `${id}-clear`, title: t2, desc: `${name}: ${d2.toLowerCase()}.`, tier: "gold", cat: "arcade", test: (p) => has(p, "cleared", id) },
    {
      id: `${id}-master`,
      title: t3,
      desc: `${name}: ${d3.toLowerCase()}.`,
      tier: ADVANCED.has(id) ? "diamond" : "platinum",
      cat: "arcade",
      test: (p) => has(p, "mastered", id),
    },
  ] satisfies Achievement[];
});

export const ACHIEVEMENTS: Achievement[] = [
  // Explore
  { id: "hello", title: "Hello, human", desc: "Load the runtime.", tier: "bronze", cat: "explore", test: (p) => count(p, "pages") >= 1 },
  { id: "walker", title: "Page walker", desc: "Visit 3 different pages.", tier: "bronze", cat: "explore", test: (p) => count(p, "pages") >= 3 },
  { id: "cartographer", title: "Cartographer", desc: "Visit every main page, the Arcade included.", tier: "gold", cat: "explore", test: (p) => MAIN_PAGES.every((m) => has(p, "pages", m)) },
  { id: "deep-dive", title: "Deep dive", desc: "Open a project's own page.", tier: "bronze", cat: "explore", test: (p) => count(p, "projects") >= 1 },
  { id: "zookeeper", title: "Zookeeper", desc: "Open 5 different project pages.", tier: "silver", cat: "explore", test: (p) => count(p, "projects") >= 5 },
  { id: "training-log", title: "Training log", desc: "Read the Work page to the very end.", tier: "silver", cat: "explore", test: (p) => has(p, "read", "/work/") },
  { id: "embedding", title: "Embedding explorer", desc: "Light up a cluster with an attention head on the Skills map.", tier: "silver", cat: "explore", test: (p) => flag(p, "skill-head") },
  { id: "citations", title: "Citation crawler", desc: "Trace a paper in the Research citation graph.", tier: "silver", cat: "explore", test: (p) => flag(p, "paper") },
  { id: "photographer", title: "Photographer", desc: "Open a photo in the Gallery.", tier: "bronze", cat: "explore", test: (p) => count(p, "photos") >= 1 },
  { id: "curator", title: "Curator", desc: "View every photo in the Gallery.", tier: "gold", cat: "explore", test: (p) => count(p, "photos") >= (p.counters.photoTotal ?? Infinity) },
  { id: "resume", title: "Résumé fetched", desc: "Open the résumé.", tier: "silver", cat: "explore", test: (p) => flag(p, "resume") },
  { id: "say-hello", title: "Say hello", desc: "Reach out: an email link, a social link or copying the address.", tier: "gold", cat: "explore", test: (p) => flag(p, "contact") },
  { id: "panic", title: "Kernel panic", desc: "Witness the crash.", tier: "silver", cat: "explore", test: (p) => flag(p, "crash") },
  // Terminal
  { id: "shell", title: "Shell access", desc: "Open the terminal.", tier: "bronze", cat: "terminal", test: (p) => flag(p, "terminal") },
  { id: "neofetch", title: "Screenshot-worthy", desc: "Run neofetch.", tier: "bronze", cat: "terminal", test: (p) => has(p, "commands", "neofetch") },
  { id: "prompt-engineer", title: "Prompt engineer", desc: "Ask the terminal a question.", tier: "silver", cat: "terminal", test: (p) => has(p, "commands", "ask") },
  { id: "sudo", title: "sudo make me an offer", desc: "Try the one command everyone tries.", tier: "gold", cat: "terminal", test: (p) => has(p, "commands", "sudo") },
  { id: "power-user", title: "Power user", desc: "Run 10 different commands.", tier: "platinum", cat: "terminal", test: (p) => count(p, "commands") >= 10 },
  // Audio
  { id: "dj", title: "DJ", desc: "Play the soundtrack.", tier: "bronze", cat: "audio", test: (p) => count(p, "sources") >= 1 },
  { id: "genre-hopper", title: "Genre hopper", desc: "Listen to all four music sources.", tier: "silver", cat: "audio", test: (p) => count(p, "sources") >= 4 },
  { id: "sound-engineer", title: "Sound engineer", desc: "Mix it yourself: set both the music and effects volume.", tier: "silver", cat: "audio", test: (p) => has(p, "settings", "volume") && has(p, "settings", "sfxVolume") },
  // Customise
  { id: "tinkerer", title: "Tinkerer", desc: "Change any setting.", tier: "bronze", cat: "customise", test: (p) => count(p, "settings") >= 1 },
  { id: "rtfm", title: "RTFM", desc: "Open the keybind sheet (press ?).", tier: "bronze", cat: "customise", test: (p) => has(p, "keys", "help") },
  { id: "palette", title: "Command line hero", desc: "Open the command menu.", tier: "bronze", cat: "customise", test: (p) => has(p, "keys", "palette") || flag(p, "palette") },
  { id: "speed-dial", title: "Speed dial", desc: "Jump pages with a G chord.", tier: "silver", cat: "customise", test: (p) => has(p, "keys", "go") },
  { id: "keyboard-warrior", title: "Keyboard warrior", desc: "Use 5 different keybinds.", tier: "silver", cat: "customise", test: (p) => count(p, "keys") >= 5 },
  { id: "jailbreak", title: "Jailbreak", desc: "Enter a certain famous code.", tier: "platinum", cat: "customise", test: (p) => flag(p, "konami") },
  // Arcade
  ...gameAchievements,
  { id: "full-stack-ml", title: "Full-stack ML", desc: "Clear all seven Arcade games.", tier: "diamond", cat: "arcade", test: (p) => GAMES.every((g) => has(p, "cleared", g.id)) },
  // Secrets
  { id: "resumed", title: "Inference resumed", desc: "Leave the tab, then come back.", tier: "bronze", cat: "secrets", secret: true, test: (p) => flag(p, "resumed") },
  { id: "lost", title: "Out of distribution", desc: "Find a page that doesn't exist.", tier: "bronze", cat: "secrets", secret: true, test: (p) => flag(p, "404") },
  { id: "night-owl", title: "Night owl", desc: "Visit between midnight and 5 am.", tier: "silver", cat: "secrets", secret: true, test: (p) => flag(p, "night") },
  { id: "loyal", title: "Returning user", desc: "Visit on 3 different days.", tier: "gold", cat: "secrets", secret: true, test: (p) => p.days.length >= 3 },
  { id: "speedrunner", title: "Speedrunner", desc: "Visit every main page within 3 minutes.", tier: "diamond", cat: "secrets", secret: true, test: (p) => flag(p, "speedrun") },
];
