import Anthropic from "@anthropic-ai/sdk";
import z from "zod";

export interface ToolDefinition {
    Param: Anthropic.Tool;
    Execute: (args: any) => Promise<string>;
}

export function GenerateSchema<T extends z.ZodType>(v: T): Anthropic.Tool['input_schema'] {
    const schema = v.toJSONSchema()
    return {
        type: "object",
        properties: schema.properties,
        required: schema.required,
    }
}

/**
 * Reasoning stage classifications for visual cues
 */
export enum ReasoningStage {
    ANALYZING = "analyzing",
    PLANNING = "planning",
    DECIDING = "deciding",
    EXECUTING = "executing",
    EVALUATING = "evaluating",
}

/**
 * Visual representation for each reasoning stage
 */
export interface ReasoningStageVisual {
    icon: string;
    color: (text: string) => string;
    label: string;
}

/**
 * Accumulated reasoning state during streaming
 */
export interface ReasoningState {
    isActive: boolean;
    currentStage: ReasoningStage | null;
    accumulatedText: string;
    collapsed: boolean;
}
