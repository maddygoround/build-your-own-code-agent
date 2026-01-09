/**
 * Console output utilities for reasoning visualization.
 * Extends the base console utilities with reasoning-specific displays.
 */

import pc from "picocolors";
import boxen from "boxen";
import logSymbols from "log-symbols";
import { ReasoningStage, ReasoningStageVisual } from "./types";

let claudeTurnStarted = false;
let reasoningBlockActive = false;

/**
 * Visual representations for each reasoning stage
 */
export const REASONING_VISUALS: Record<ReasoningStage, ReasoningStageVisual> = {
    [ReasoningStage.ANALYZING]: {
        icon: "🤔",
        color: pc.cyan,
        label: "Analyzing",
    },
    [ReasoningStage.PLANNING]: {
        icon: "📋",
        color: pc.blue,
        label: "Planning",
    },
    [ReasoningStage.DECIDING]: {
        icon: "💡",
        color: pc.magenta,
        label: "Deciding",
    },
    [ReasoningStage.EXECUTING]: {
        icon: "⚡",
        color: pc.yellow,
        label: "Executing",
    },
    [ReasoningStage.EVALUATING]: {
        icon: "✓",
        color: pc.green,
        label: "Evaluating",
    },
};

/**
 * Detect reasoning stage from thinking content
 */
export function detectReasoningStage(text: string): ReasoningStage {
    const lower = text.toLowerCase();

    // Order matters - check more specific patterns first, prioritize verbs over nouns

    // Evaluating (checking/validating)
    if (/\b(evaluat|validat|verif|check)\w*\b/.test(lower)) {
        return ReasoningStage.EVALUATING;
    }

    // Executing (doing/implementing) - check early to catch "execute the plan"
    if (/\b(execut\w*|implement(?:ing|ed)?|writ(?:ing|e|ten))\b/.test(lower)) {
        return ReasoningStage.EXECUTING;
    }

    // Deciding (choosing)
    if (/\b(decid|choos|select|determin)\w*\b/.test(lower)) {
        return ReasoningStage.DECIDING;
    }

    // Planning (designing/strategizing)
    if (/\b(plan\w*|design|approach|strateg)\w*\b/.test(lower)) {
        return ReasoningStage.PLANNING;
    }

    // Default to analyzing
    return ReasoningStage.ANALYZING;
}

export const console_reasoning = {
    /**
     * Print the welcome banner in a styled box
     */
    banner(message: string): void {
        console.log(
            boxen(pc.bold(message), {
                padding: { top: 0, bottom: 0, left: 1, right: 1 },
                borderColor: "cyan",
                borderStyle: "round",
            })
        );
        console.log();
    },

    /**
     * Get the styled "You: " prompt string for readline
     */
    userPromptString(): string {
        return `${pc.blue(pc.bold("You"))} ${pc.dim("›")} `;
    },

    /**
     * Print Claude's response. Only shows "Claude:" prefix once per turn.
     */
    claude(text: string): void {
        if (!claudeTurnStarted) {
            console.log();
            console.log(`${pc.green(pc.bold("Claude"))} ${pc.dim("›")} ${text}`);
            claudeTurnStarted = true;
        } else {
            console.log();
            console.log(text);
        }
    },

    /**
     * Print Claude's streaming text delta. Shows "Claude:" prefix once per turn.
     * Does not add newlines - text is printed as it streams.
     */
    claudeStream(delta: string): void {
        if (!claudeTurnStarted) {
            process.stdout.write(`\n${pc.green(pc.bold("Claude"))} ${pc.dim("›")} `);
            claudeTurnStarted = true;
        }
        process.stdout.write(delta);
    },

    /**
     * Start a reasoning block with stage indicator
     */
    reasoningStart(stage: ReasoningStage, collapsed: boolean = false): void {
        reasoningBlockActive = true;
        const visual = REASONING_VISUALS[stage];

        if (collapsed) {
            console.log(`\n${pc.dim("💭")} ${pc.dim(visual.color(`${visual.label}...`))}`);
        } else {
            console.log(`\n${pc.dim("💭")} ${visual.icon} ${visual.color(pc.bold(visual.label))}`);
        }
    },

    /**
     * Stream reasoning content with dimmed styling
     */
    thinkingStream(delta: string, stage: ReasoningStage): void {
        const visual = REASONING_VISUALS[stage];
        // Stream with dimmed color-coded text
        process.stdout.write(pc.dim(visual.color(delta)));
    },

    /**
     * End reasoning block
     */
    reasoningEnd(): void {
        if (reasoningBlockActive) {
            console.log(); // New line after reasoning
            reasoningBlockActive = false;
        }
    },

    /**
     * Display collapsed reasoning summary
     */
    reasoningCollapsed(summary: string): void {
        console.log(`${pc.dim("💭")} ${pc.dim(summary)}`);
    },

    /**
     * Print tool call start indicator
     */
    toolStart(toolName: string): void {
        console.log(`\n${pc.yellow("⚡")} ${pc.dim("Calling")} ${pc.yellow(pc.bold(toolName))}`);
    },

    /**
     * Print tool execution result indicator
     */
    toolEnd(toolName: string, success: boolean): void {
        if (success) {
            console.log(`${pc.green("✓")} ${pc.dim("Finished")} ${pc.green(toolName)}`);
        } else {
            console.log(`${pc.red("✗")} ${pc.dim("Failed")} ${pc.red(toolName)}`);
        }
    },

    /**
     * Mark the end of Claude's turn (resets prefix tracking).
     */
    finishClaudeTurn(): void {
        if (claudeTurnStarted) {
            console.log();
            claudeTurnStarted = false;
        }
        reasoningBlockActive = false;
    },

    /**
     * Print an error message with symbol
     */
    error(message: string): void {
        console.error(`${logSymbols.error} ${pc.red(pc.bold("Error"))}: ${message}`);
    },

    /**
     * Print a success message with symbol
     */
    success(message: string): void {
        console.log(`${logSymbols.success} ${pc.green(message)}`);
    },

    /**
     * Print a warning message with symbol
     */
    warn(message: string): void {
        console.warn(`${logSymbols.warning} ${pc.yellow(message)}`);
    },

    /**
     * Print an info message with symbol
     */
    info(message: string): void {
        console.log(`${logSymbols.info} ${pc.cyan(message)}`);
    },
};
