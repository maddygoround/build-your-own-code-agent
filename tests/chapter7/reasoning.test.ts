/**
 * Unit tests for Chapter 7 reasoning visualization
 */

import { describe, it, expect } from "bun:test";
import { detectReasoningStage, REASONING_VISUALS } from "../../7-reasoning-response/console-reasoning";
import { ReasoningStage } from "../../7-reasoning-response/types";

describe("Chapter 7 - Reasoning Visualization", () => {
  describe("detectReasoningStage", () => {
    it("should detect ANALYZING stage", () => {
      const texts = [
        "Let me analyze this problem first",
        "I need to understand what the user is asking",
        "Looking at the code structure to analyze dependencies",
      ];

      texts.forEach((text) => {
        expect(detectReasoningStage(text)).toBe(ReasoningStage.ANALYZING);
      });
    });

    it("should detect PLANNING stage", () => {
      const texts = [
        "I'll plan out the implementation steps",
        "My approach is to use a modular solution",
      ];

      texts.forEach((text) => {
        expect(detectReasoningStage(text)).toBe(ReasoningStage.PLANNING);
      });
    });

    it("should detect DECIDING stage", () => {
      const texts = [
        "I need to decide between approach A or B",
        "Let me choose the best option here",
        "I've determined that this is the right path",
      ];

      texts.forEach((text) => {
        expect(detectReasoningStage(text)).toBe(ReasoningStage.DECIDING);
      });
    });

    it("should detect EXECUTING stage", () => {
      const texts = [
        "Now I'll execute the plan by implementing the function",
        "I'm writing the code now",
      ];

      texts.forEach((text) => {
        expect(detectReasoningStage(text)).toBe(ReasoningStage.EXECUTING);
      });
    });

    it("should detect EVALUATING stage", () => {
      const texts = [
        "I should evaluate whether this solution is correct",
        "Let me validate the results",
        "Checking if this meets the requirements",
        "I need to verify this works as expected",
      ];

      texts.forEach((text) => {
        expect(detectReasoningStage(text)).toBe(ReasoningStage.EVALUATING);
      });
    });

    it("should default to ANALYZING for ambiguous text", () => {
      const ambiguousTexts = [
        "This is a coding task",
        "The user wants something",
        "Here's what we need to do",
      ];

      ambiguousTexts.forEach((text) => {
        expect(detectReasoningStage(text)).toBe(ReasoningStage.ANALYZING);
      });
    });

    it("should handle empty strings", () => {
      expect(detectReasoningStage("")).toBe(ReasoningStage.ANALYZING);
    });

    it("should be case-insensitive", () => {
      expect(detectReasoningStage("PLANNING the approach")).toBe(ReasoningStage.PLANNING);
      expect(detectReasoningStage("Planning the approach")).toBe(ReasoningStage.PLANNING);
      expect(detectReasoningStage("planning the approach")).toBe(ReasoningStage.PLANNING);
    });
  });

  describe("REASONING_VISUALS", () => {
    it("should have visuals for all stages", () => {
      const stages = Object.values(ReasoningStage);

      stages.forEach((stage) => {
        expect(REASONING_VISUALS[stage]).toBeDefined();
        expect(REASONING_VISUALS[stage].icon).toBeDefined();
        expect(REASONING_VISUALS[stage].label).toBeDefined();
        expect(typeof REASONING_VISUALS[stage].color).toBe("function");
      });
    });

    it("should have correct icons for stages", () => {
      expect(REASONING_VISUALS[ReasoningStage.ANALYZING].icon).toBe("🤔");
      expect(REASONING_VISUALS[ReasoningStage.PLANNING].icon).toBe("📋");
      expect(REASONING_VISUALS[ReasoningStage.DECIDING].icon).toBe("💡");
      expect(REASONING_VISUALS[ReasoningStage.EXECUTING].icon).toBe("⚡");
      expect(REASONING_VISUALS[ReasoningStage.EVALUATING].icon).toBe("✓");
    });

    it("should have descriptive labels", () => {
      expect(REASONING_VISUALS[ReasoningStage.ANALYZING].label).toBe("Analyzing");
      expect(REASONING_VISUALS[ReasoningStage.PLANNING].label).toBe("Planning");
      expect(REASONING_VISUALS[ReasoningStage.DECIDING].label).toBe("Deciding");
      expect(REASONING_VISUALS[ReasoningStage.EXECUTING].label).toBe("Executing");
      expect(REASONING_VISUALS[ReasoningStage.EVALUATING].label).toBe("Evaluating");
    });

    it("should have color functions that return strings", () => {
      const stages = Object.values(ReasoningStage);

      stages.forEach((stage) => {
        const colorFn = REASONING_VISUALS[stage].color;
        const result = colorFn("test");
        expect(typeof result).toBe("string");
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Stage Transitions", () => {
    it("should detect stage transitions in sequential text", () => {
      const sequence = [
        "First, let me analyze the problem",
        "Now I'll plan the solution",
        "I need to choose the best approach",
        "Let me execute this by implementing",
        "Finally, I'll evaluate the results",
      ];

      const expectedStages = [
        ReasoningStage.ANALYZING,
        ReasoningStage.PLANNING,
        ReasoningStage.DECIDING,
        ReasoningStage.EXECUTING,
        ReasoningStage.EVALUATING,
      ];

      sequence.forEach((text, index) => {
        expect(detectReasoningStage(text)).toBe(expectedStages[index]);
      });
    });

    it("should prioritize more specific stages over generic ones", () => {
      // "evaluat" should win over "analyzing" even if both keywords present
      const text = "I'm analyzing and evaluating this solution";
      expect(detectReasoningStage(text)).toBe(ReasoningStage.EVALUATING);
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long text", () => {
      const longText = "analyze ".repeat(1000) + "planning the approach";
      expect(detectReasoningStage(longText)).toBe(ReasoningStage.PLANNING);
    });

    it("should handle special characters", () => {
      const texts = [
        "I'm deciding... 🤔",
        "Let's plan! @#$%",
        "Time to execute (finally)",
      ];

      expect(detectReasoningStage(texts[0])).toBe(ReasoningStage.DECIDING);
      expect(detectReasoningStage(texts[1])).toBe(ReasoningStage.PLANNING);
      expect(detectReasoningStage(texts[2])).toBe(ReasoningStage.EXECUTING);
    });

    it("should handle unicode characters", () => {
      const texts = [
        "私は計画を立てています planning the approach",
        "执行 implementing the solution",
        "تقييم evaluating results",
      ];

      expect(detectReasoningStage(texts[0])).toBe(ReasoningStage.PLANNING);
      expect(detectReasoningStage(texts[1])).toBe(ReasoningStage.EXECUTING);
      expect(detectReasoningStage(texts[2])).toBe(ReasoningStage.EVALUATING);
    });
  });
});
