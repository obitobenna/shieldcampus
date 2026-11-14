import { describe, expect, it } from "vitest";
import { LESSONS } from "@/scripts/content/lessons";

describe("seed lessons", () => {
  it("has 5 lessons with unique, sequential positions and slugs", () => {
    expect(LESSONS).toHaveLength(5);
    expect(LESSONS.map((l) => l.position)).toEqual([1, 2, 3, 4, 5]);
    expect(new Set(LESSONS.map((l) => l.slug)).size).toBe(5);
  });

  it("each lesson has exactly 3 well-formed questions", () => {
    for (const lesson of LESSONS) {
      expect(lesson.questions).toHaveLength(3);
      for (const q of lesson.questions) {
        expect(q.options.length).toBeGreaterThanOrEqual(2);
        expect(q.correctIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctIndex).toBeLessThan(q.options.length);
        expect(q.explanation.length).toBeGreaterThan(10);
      }
    }
  });

  it("rewards are earned on lessons 3 and 4 only", () => {
    expect(LESSONS.filter((l) => l.rewardEligible).map((l) => l.position)).toEqual([3, 4]);
  });

  it("wallet setup warns about recovery phrases and has checkpoints", () => {
    const wallet = LESSONS.find((l) => l.slug === "wallet-setup");
    expect(wallet?.content).toMatch(/Never share it with anyone/);
    expect(wallet?.checkpoints.length).toBeGreaterThanOrEqual(3);
  });

  it("contains no emoji", () => {
    const emoji = /\p{Extended_Pictographic}/u;
    for (const lesson of LESSONS) {
      expect(emoji.test(lesson.content + lesson.title + lesson.summary)).toBe(false);
    }
  });
});
