/**
 * Achievement entity - represents a milestone achievement
 */
export type BadgeType =
  | "shield"
  | "star"
  | "wings"
  | "chevron"
  | "scroll"
  | "lightning"
  | "triangle"
  | "crosshair";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  badgeType: BadgeType;
  unlockedAt?: number; // Timestamp when achieved, undefined if not earned
  metadata?: Record<string, unknown>; // Additional data (e.g., level number, word count)
}

/**
 * Achievement definitions - all available achievements
 */
export const ACHIEVEMENT_DEFINITIONS: Omit<Achievement, "unlockedAt" | "id">[] = [
  {
    name: "INITIATE",
    description: "Created your first note",
    badgeType: "shield",
  },
  {
    name: "OBSERVER",
    description: "Captured 10 images",
    badgeType: "crosshair",
  },
  {
    name: "VETERAN",
    description: "Reached level 10",
    badgeType: "star",
  },
  {
    name: "COMMANDER",
    description: "Completed 100 sessions",
    badgeType: "wings",
  },
  {
    name: "CHRONICLER",
    description: "Written 1,000 words",
    badgeType: "scroll",
  },
  {
    name: "STREAK MASTER",
    description: "Maintained 7-day streak",
    badgeType: "chevron",
  },
  {
    name: "TRILOGY",
    description: "Used all 3 themes",
    badgeType: "triangle",
  },
  {
    name: "SPEED OPERATOR",
    description: "Created 10 notes in one session",
    badgeType: "lightning",
  },
  {
    name: "LEVEL 25",
    description: "Reached level 25",
    badgeType: "star",
    metadata: { level: 25 },
  },
  {
    name: "WORDSMITH",
    description: "Written 5,000 words",
    badgeType: "scroll",
    metadata: { wordCount: 5000 },
  },
];

