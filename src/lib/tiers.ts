/** Achievement tiers (what one achievement is worth) and ranks (where your total puts you). */
export type Tier = "bronze" | "silver" | "gold" | "platinum" | "diamond";
export type Rank = Tier | "master" | "allrounder";

export const TIER_POINTS: Record<Tier, number> = { bronze: 10, silver: 25, gold: 50, platinum: 100, diamond: 200 };

export const RANK_LABEL: Record<Rank, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
  diamond: "Diamond",
  master: "Master",
  allrounder: "All-Rounder",
};

/** CSS colour token per tier/rank (defined in globals.css). */
export const rankColor = (r: Rank) => `var(--tier-${r})`;
