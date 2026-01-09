# Chapter 7: Extended Thinking with Reasoning & Visual Cues

## Overview

Chapter 7 extends Chapter 6's streaming agent to capture and display Claude's reasoning process with progressive disclosure and visual indicators. This enhancement provides transparency into the AI's thought process while maintaining backward compatibility.

## Architecture Goals

1. **Capture Reasoning**: Extract reasoning blocks from extended thinking API
2. **Visual Feedback**: Provide clear indicators for thinking states
3. **Progressive Disclosure**: Allow expand/collapse of reasoning content
4. **Color-Coded Output**: Different colors for reasoning stages
5. **Tool Reasoning**: Show reasoning before tool execution
6. **Backward Compatible**: Works with existing Chapter 6 code

## Core Components

### 1. Enhanced Agent Class

```typescript
// 7-reasoning-response/agent.ts

export class Agent {
  private client: Anthropic;
  private rl: readline.Interface;
  private verbose: boolean;
  private tools: ToolDefinition[];
  private enableThinking: boolean; // New: Enable extended thinking
  private showReasoning: boolean;  // New: Display reasoning blocks

  constructor(
    client: Anthropic,
    rl: readline.Interface,
    tools: ToolDefinition[],
    options?: AgentOptions
  ) {
    this.client = client;
    this.rl = rl;
    this.tools = tools;
    this.verbose = options?.verbose ?? false;
    this.enableThinking = options?.enableThinking ?? true;
    this.showReasoning = options?.showReasoning ?? true;
  }

  async run() {
    // Similar to Chapter 6, with reasoning event handling
  }

  private async runInference(conversation: Anthropic.MessageParam[]) {
    const stream = this.client.messages.stream({
      model: "claude-3-5-sonnet-latest", // Supports extended thinking
      max_tokens: 8000,
      messages: conversation,
      tools: anthropicTools,
      thinking: {
        type: "enabled",
        budget_tokens: 5000
      }
    });

    return stream;
  }
}
```

**Key Changes from Chapter 6:**
- Added `enableThinking` and `showReasoning` options
- Model changed to `claude-3-5-sonnet-latest` (supports reasoning)
- Added `thinking` parameter to API call
- Enhanced event handling for reasoning blocks

### 2. Reasoning Event Types

```typescript
// 7-reasoning-response/types.ts

export interface ToolDefinition {
    Param: Anthropic.Tool;
    Execute: (args: any) => Promise<string>;
}

export interface AgentOptions {
    verbose?: boolean;
    enableThinking?: boolean;  // Enable extended thinking API
    showReasoning?: boolean;   // Display reasoning blocks
}

export interface ReasoningState {
    stage: ReasoningStage;
    content: string;
    timestamp: number;
}

export enum ReasoningStage {
    ANALYZING = "analyzing",
    PLANNING = "planning",
    DECIDING = "deciding",
    EXECUTING = "executing",
    EVALUATING = "evaluating"
}

export interface ThinkingBlock {
    type: "thinking";
    thinking: string;
}

export interface ThinkingDelta {
    type: "thinking_delta";
    delta: {
        type: "thinking_delta";
        thinking: string;
    };
}
```

**Extension Points:**
- `AgentOptions`: New configuration interface
- `ReasoningState`: Tracks current reasoning stage
- `ReasoningStage`: Enum for different thinking phases
- `ThinkingBlock`: Anthropic API thinking content block
- `ThinkingDelta`: Streaming thinking delta events

### 3. Enhanced Console Output Utilities

```typescript
// 7-reasoning-response/console-reasoning.ts

import pc from "picocolors";
import boxen from "boxen";
import logSymbols from "log-symbols";

let claudeTurnStarted = false;
let reasoningExpanded = true; // Default: show reasoning

export const console_out = {
    // ... existing methods from Chapter 6 ...

    /**
     * Print reasoning start indicator with stage emoji
     */
    reasoningStart(stage: ReasoningStage): void {
        const emoji = getStageEmoji(stage);
        const label = getStageLabel(stage);
        const color = getStageColor(stage);

        console.log(`\n${emoji} ${pc.dim("Thinking:")} ${color(label)}`);
    },

    /**
     * Stream reasoning text with visual indicator
     */
    reasoningStream(delta: string, stage: ReasoningStage): void {
        if (!reasoningExpanded) return; // Skip if collapsed

        const color = getStageColor(stage);
        process.stdout.write(pc.dim(color(delta)));
    },

    /**
     * Print reasoning end indicator
     */
    reasoningEnd(stage: ReasoningStage): void {
        if (reasoningExpanded) {
            console.log(); // Add spacing after reasoning
        }
    },

    /**
     * Print tool reasoning before execution
     */
    toolReasoning(toolName: string, reasoning: string): void {
        console.log(`\n${pc.magenta("🔍")} ${pc.dim("Reasoning about")} ${pc.yellow(toolName)}:`);
        if (reasoningExpanded) {
            console.log(pc.dim(pc.magenta(reasoning)));
        }
    },

    /**
     * Toggle reasoning visibility
     */
    toggleReasoning(): void {
        reasoningExpanded = !reasoningExpanded;
        const status = reasoningExpanded ? "expanded" : "collapsed";
        console.log(`\n${pc.cyan("ℹ")} Reasoning display: ${pc.cyan(status)}`);
    },

    /**
     * Print reasoning summary (collapsed view)
     */
    reasoningSummary(stages: ReasoningStage[], duration: number): void {
        const emojis = stages.map(s => getStageEmoji(s)).join(" ");
        console.log(`\n${emojis} ${pc.dim(`Completed in ${duration}ms`)} ${pc.dim("(press 'r' to expand)")}`);
    }
};

/**
 * Get emoji for reasoning stage
 */
function getStageEmoji(stage: ReasoningStage): string {
    switch (stage) {
        case ReasoningStage.ANALYZING:
            return pc.cyan("🤔");
        case ReasoningStage.PLANNING:
            return pc.blue("📋");
        case ReasoningStage.DECIDING:
            return pc.magenta("💡");
        case ReasoningStage.EXECUTING:
            return pc.yellow("⚡");
        case ReasoningStage.EVALUATING:
            return pc.green("✓");
        default:
            return pc.gray("•");
    }
}

/**
 * Get label for reasoning stage
 */
function getStageLabel(stage: ReasoningStage): string {
    switch (stage) {
        case ReasoningStage.ANALYZING:
            return "Analyzing";
        case ReasoningStage.PLANNING:
            return "Planning";
        case ReasoningStage.DECIDING:
            return "Deciding";
        case ReasoningStage.EXECUTING:
            return "Executing";
        case ReasoningStage.EVALUATING:
            return "Evaluating";
        default:
            return "Thinking";
    }
}

/**
 * Get color function for reasoning stage
 */
function getStageColor(stage: ReasoningStage): (text: string) => string {
    switch (stage) {
        case ReasoningStage.ANALYZING:
            return pc.cyan;
        case ReasoningStage.PLANNING:
            return pc.blue;
        case ReasoningStage.DECIDING:
            return pc.magenta;
        case ReasoningStage.EXECUTING:
            return pc.yellow;
        case ReasoningStage.EVALUATING:
            return pc.green;
        default:
            return pc.gray;
    }
}

/**
 * Detect reasoning stage from content
 */
export function detectReasoningStage(content: string): ReasoningStage {
    const lower = content.toLowerCase();

    if (lower.includes("analyzing") || lower.includes("examining") || lower.includes("looking at")) {
        return ReasoningStage.ANALYZING;
    } else if (lower.includes("planning") || lower.includes("will") || lower.includes("approach")) {
        return ReasoningStage.PLANNING;
    } else if (lower.includes("deciding") || lower.includes("choosing") || lower.includes("considering")) {
        return ReasoningStage.DECIDING;
    } else if (lower.includes("executing") || lower.includes("running") || lower.includes("calling")) {
        return ReasoningStage.EXECUTING;
    } else if (lower.includes("checking") || lower.includes("verifying") || lower.includes("result")) {
        return ReasoningStage.EVALUATING;
    }

    return ReasoningStage.ANALYZING; // Default
}
```

**Visual Indicators:**
- 🤔 Analyzing (cyan): Examining information
- 📋 Planning (blue): Creating approach
- 💡 Deciding (magenta): Making choices
- ⚡ Executing (yellow): Taking action
- ✓ Evaluating (green): Checking results

### 4. Streaming Event Handler with Reasoning

```typescript
// In agent.ts runInference method

stream.on("streamEvent", (event) => {
    switch (event.type) {
        case "content_block_start":
            switch (event.content_block.type) {
                case "thinking":
                    // Start reasoning display
                    const stage = detectReasoningStage(event.content_block.thinking);
                    console_out.reasoningStart(stage);
                    currentReasoningStage = stage;
                    reasoningStartTime = Date.now();
                    break;
                case "tool_use":
                    console_out.toolStart(event.content_block.name);
                    break;
            }
            break;

        case "content_block_delta":
            switch (event.delta.type) {
                case "thinking_delta":
                    // Stream reasoning text
                    const newStage = detectReasoningStage(event.delta.thinking);
                    if (newStage !== currentReasoningStage) {
                        console_out.reasoningEnd(currentReasoningStage);
                        console_out.reasoningStart(newStage);
                        currentReasoningStage = newStage;
                    }
                    console_out.reasoningStream(event.delta.thinking, currentReasoningStage);
                    break;
                case "text_delta":
                    console_out.claudeStream(event.delta.text);
                    break;
            }
            break;

        case "content_block_stop":
            if (event.content_block?.type === "thinking") {
                const duration = Date.now() - reasoningStartTime;
                console_out.reasoningEnd(currentReasoningStage);
                if (!reasoningExpanded) {
                    console_out.reasoningSummary([currentReasoningStage], duration);
                }
            }
            break;
    }
});
```

**Event Flow:**
1. `content_block_start` with `thinking` type → Start reasoning display
2. `content_block_delta` with `thinking_delta` → Stream reasoning text
3. Detect stage changes within reasoning content
4. `content_block_stop` → End reasoning display

## File Structure

```
7-reasoning-response/
├── index.ts                    # Entry point with CLI options
├── agent.ts                    # Enhanced Agent class with reasoning
├── types.ts                    # Type definitions + reasoning types
├── console-reasoning.ts        # Enhanced console output utilities
├── ripgrep/                    # Ripgrep utilities (inherited)
│   ├── downloader.ts
│   └── ripgrep.ts
└── tools/                      # Same tools as Chapter 6
    ├── bash_tool.ts
    ├── edit_tool.ts
    ├── grep.ts
    ├── list_files.ts
    ├── read_file.ts
    └── tool_description/
```

## Implementation Plan

### Phase 1: Core Reasoning Support
- [ ] Create `7-reasoning-response` directory
- [ ] Copy Chapter 6 files as baseline
- [ ] Add `AgentOptions` interface to `types.ts`
- [ ] Add reasoning types (`ReasoningState`, `ReasoningStage`, etc.)
- [ ] Update Agent constructor to accept options

### Phase 2: Console Output Enhancement
- [ ] Create `console-reasoning.ts` extending Chapter 6's console
- [ ] Implement stage detection logic
- [ ] Add reasoning display methods
- [ ] Implement toggle functionality
- [ ] Add color-coded output for stages

### Phase 3: Agent Integration
- [ ] Update `runInference` to include `thinking` parameter
- [ ] Add reasoning event handlers
- [ ] Implement stage transition detection
- [ ] Add tool reasoning display
- [ ] Maintain backward compatibility

### Phase 4: Interactive Features
- [ ] Add keyboard shortcut for toggling reasoning ('r' key)
- [ ] Implement progressive disclosure
- [ ] Add reasoning summary for collapsed view
- [ ] Show duration metrics

### Phase 5: Testing & Documentation
- [ ] Test with complex queries requiring reasoning
- [ ] Verify backward compatibility with Chapter 6
- [ ] Create README with examples
- [ ] Add usage instructions

## Usage Examples

### Basic Usage (Default: Reasoning Enabled)

```bash
bun run 7-reasoning-response/index.ts
```

**Example Output:**
```
You › What files are in this project?

🤔 Thinking: Analyzing
  User is asking about files in the project. I should use the
  list_files tool to get a directory listing...

💡 Thinking: Deciding
  I'll call list_files on the current directory to see what's here.

⚡ Calling list_files

✓ Finished list_files

Claude › I can see several chapters in this project, including...
```

### Collapsed Reasoning Mode

```bash
bun run 7-reasoning-response/index.ts --collapse-reasoning
```

**Example Output:**
```
You › What files are in this project?

🤔 📋 💡 Completed in 245ms (press 'r' to expand)

⚡ Calling list_files

✓ Finished list_files

Claude › I can see several chapters in this project...
```

### Disable Reasoning (Chapter 6 Mode)

```bash
bun run 7-reasoning-response/index.ts --no-thinking
```

**Example Output:**
```
You › What files are in this project?

⚡ Calling list_files

✓ Finished list_files

Claude › I can see several chapters in this project...
```

## CLI Options

```typescript
// index.ts
import { Command } from "commander";

const program = new Command();

program
    .option("--verbose", "Enable debug logging")
    .option("--no-thinking", "Disable extended thinking")
    .option("--collapse-reasoning", "Start with reasoning collapsed")
    .option("--no-colors", "Disable colored output");

const options = program.parse().opts();
```

## Backward Compatibility

### Chapter 6 Compatibility
- All Chapter 6 code works unchanged
- `--no-thinking` flag disables reasoning features
- Same tools and API surface
- Console output gracefully degrades

### Migration Path
```typescript
// Chapter 6 style (still works)
const agent = new Agent(client, rl, tools, true);

// Chapter 7 style (new options)
const agent = new Agent(client, rl, tools, {
    verbose: true,
    enableThinking: true,
    showReasoning: true
});
```

## Performance Considerations

### Token Budget
- Reasoning tokens: 5000 (configurable)
- Main response tokens: 8000
- Total: ~13000 tokens

### Display Performance
- Streaming updates: No buffering delay
- Stage detection: O(1) per delta
- Color rendering: Minimal overhead

### Memory
- Reasoning history: Not stored (stream only)
- Stage tracking: Single enum value
- Event handlers: Efficient listeners

## Advanced Features (Future)

### Interactive Reasoning
- Pause/resume reasoning display
- Save reasoning to file
- Diff reasoning approaches

### Analytics
- Track reasoning patterns
- Measure thinking time per stage
- Analyze stage transitions

### Customization
- Custom stage definitions
- User-defined emoji mapping
- Pluggable reasoning detectors

## Testing Strategy

### Unit Tests
- Stage detection logic
- Color mapping functions
- Console output formatting

### Integration Tests
- Streaming with reasoning events
- Tool execution with reasoning
- Stage transitions

### End-to-End Tests
- Full conversation with reasoning
- Toggle functionality
- Backward compatibility

## Summary

Chapter 7 enhances the streaming agent with:

1. **Extended Thinking API**: Captures Claude's reasoning process
2. **Visual Indicators**: 5 emoji-based stage indicators with colors
3. **Progressive Disclosure**: Expandable/collapsible reasoning display
4. **Tool Reasoning**: Shows thinking before tool execution
5. **Backward Compatible**: Works with Chapter 6 code unchanged

The architecture maintains clean separation of concerns:
- `agent.ts`: Core reasoning capture logic
- `console-reasoning.ts`: Display and visualization
- `types.ts`: Type safety for reasoning events
- `index.ts`: CLI and configuration

This design provides transparency into AI decision-making while keeping the developer experience smooth and the code maintainable.
