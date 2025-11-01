import { describe, it, expect } from "vitest";
import { ScoringService } from "@/application/services/ScoringService";
import type { Session } from "@/domain/entities";

describe("ScoringService", () => {
  describe("calculateScore", () => {
    const mockSession: Session = {
      id: "session-1",
      title: "Test Session",
      createdAt: Date.now(),
      lastModified: Date.now(),
      score: 0,
    };

    it("should calculate base score from duration", () => {
      const duration = 60_000; // 1 minute
      const score = ScoringService.calculateScore(mockSession, 0, 0, duration);
      expect(score).toBeGreaterThan(0);
    });

    it("should add points for notes", () => {
      const duration = 60_000;
      const notesCount = 2;
      const score = ScoringService.calculateScore(mockSession, notesCount, 0, duration);
      const scoreWithoutNotes = ScoringService.calculateScore(mockSession, 0, 0, duration);
      expect(score).toBeGreaterThan(scoreWithoutNotes);
    });

    it("should add points for images", () => {
      const duration = 60_000;
      const imagesCount = 3;
      const score = ScoringService.calculateScore(mockSession, 0, imagesCount, duration);
      const scoreWithoutImages = ScoringService.calculateScore(mockSession, 0, 0, duration);
      expect(score).toBeGreaterThan(scoreWithoutImages);
    });

    it("should calculate engagement bonus for longer sessions", () => {
      const shortDuration = 30_000; // 30 seconds
      const longDuration = 90_000; // 90 seconds
      
      const shortScore = ScoringService.calculateScore(mockSession, 0, 0, shortDuration);
      const longScore = ScoringService.calculateScore(mockSession, 0, 0, longDuration);
      
      expect(longScore).toBeGreaterThan(shortScore);
    });

    it("should combine all scoring factors", () => {
      const duration = 120_000; // 2 minutes
      const notesCount = 5;
      const imagesCount = 2;
      
      const score = ScoringService.calculateScore(mockSession, notesCount, imagesCount, duration);
      
      // Should have points from all sources
      expect(score).toBeGreaterThan(0);
      // Minimum expected: duration (2) + notes (25) + images (20) = at least 47
      expect(score).toBeGreaterThanOrEqual(47);
    });
  });

  describe("getLevel", () => {
    it("should return level 1 for score 0", () => {
      expect(ScoringService.getLevel(0)).toBe(1);
    });

    it("should return level 1 for score less than threshold", () => {
      expect(ScoringService.getLevel(50)).toBe(1);
      expect(ScoringService.getLevel(99)).toBe(1);
    });

    it("should return level 2 for score at threshold", () => {
      expect(ScoringService.getLevel(100)).toBe(2);
    });

    it("should return level 3 for score at double threshold", () => {
      expect(ScoringService.getLevel(200)).toBe(3);
    });

    it("should calculate correct level for higher scores", () => {
      expect(ScoringService.getLevel(450)).toBe(5);
      expect(ScoringService.getLevel(550)).toBe(6);
    });
  });

  describe("getProgressToNextLevel", () => {
    it("should return 0 for score 0", () => {
      const progress = ScoringService.getProgressToNextLevel(0);
      expect(progress).toBe(0);
    });

    it("should return 50 for score halfway to next level", () => {
      const progress = ScoringService.getProgressToNextLevel(50); // Halfway to level 2
      expect(progress).toBeCloseTo(50, 1);
    });

    it("should return 0 for score exactly at threshold (just reached new level)", () => {
      const progress = ScoringService.getProgressToNextLevel(100); // Just reached level 2
      expect(progress).toBe(0); // 0% progress toward level 3
    });

    it("should return correct progress for level 2", () => {
      const progress = ScoringService.getProgressToNextLevel(150); // 50 points into level 2
      expect(progress).toBeCloseTo(50, 1);
    });

    it("should always return value between 0 and 100", () => {
      for (let score = 0; score < 1000; score += 50) {
        const progress = ScoringService.getProgressToNextLevel(score);
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThanOrEqual(100);
      }
    });
  });
});

