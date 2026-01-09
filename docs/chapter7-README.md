# Chapter 7: Reasoning and Visual Cues

Chapter 7 extends Chapter 6's streaming capabilities by adding **Extended Thinking** and **reasoning visualization**. Now you can see Claude's thought process in real-time with visual cues for different cognitive stages.

## What's New in Chapter 7

### Extended Thinking
- **Claude's reasoning is visible**: See how Claude analyzes problems, plans solutions, and makes decisions
- **5 cognitive stages with visual indicators**:
  - 🤔 **Analyzing** (cyan) - Understanding the problem
  - 📋 **Planning** (blue) - Designing solution approach
  - 💡 **Deciding** (magenta) - Making choices
  - ⚡ **Executing** (yellow) - Taking action
  - ✓ **Evaluating** (green) - Validating results

### Visual Cues
- **Real-time reasoning stream**: Watch Claude think as text streams in
- **Color-coded stages**: Different colors for different types of thinking
- **Dimmed thinking display**: Reasoning is visually distinct from responses
- **Progressive disclosure**: Option to collapse/expand reasoning blocks

## Running Chapter 7

```bash
# With extended thinking (default)
bun run 7-reasoning-response/index.ts

# Without reasoning visualization
bun run 7-reasoning-response/index.ts --no-thinking

# With collapsed reasoning (show summaries only)
bun run 7-reasoning-response/index.ts --collapse-reasoning

# Verbose mode with thinking
bun run 7-reasoning-response/index.ts --verbose
```

## Example Interactions

### Try These Commands

1. **See analytical reasoning**:
   ```
   You: What TypeScript files are in this project?
   💭 🤔 Analyzing
   First I need to understand what the user is asking for...
   Claude › Let me list the TypeScript files...
   ```

2. **Watch decision-making**:
   ```
   You: Fix any type errors in the codebase
   💭 📋 Planning
   I should first check for errors, then prioritize them...
   💭 💡 Deciding
   Starting with the most critical errors first makes sense...
   ```

3. **See execution reasoning**:
   ```
   You: Create a new tool that counts lines in files
   💭 ⚡ Executing
   I'll implement this by reading the file and counting newlines...
   ```

## How It Works

### Extended Thinking API

Chapter 7 uses Claude's Extended Thinking capability:

```typescript
const params = {
  model: "claude-3-5-sonnet-latest",
  thinking: {
    type: "enabled",
    budget_tokens: 5000,
  },
  // ... other params
};
```

### Streaming Events

The agent handles new thinking events:

```typescript
case "thinking_delta":
  // Detect cognitive stage from content
  const stage = detectReasoningStage(thinkingText);

  // Display with stage-specific styling
  console_reasoning.thinkingStream(delta, stage);
  break;
```

### Stage Detection

Reasoning stages are detected by analyzing thinking content:

```typescript
function detectReasoningStage(text: string): ReasoningStage {
  const lower = text.toLowerCase();

  if (lower.includes("evaluat") || lower.includes("check")) {
    return ReasoningStage.EVALUATING;
  }
  if (lower.includes("execut") || lower.includes("implement")) {
    return ReasoningStage.EXECUTING;
  }
  // ... more patterns
}
```

## Architecture

### New Files

```
7-reasoning-response/
├── index.ts                 # Entry point with thinking options
├── agent.ts                 # Agent with reasoning state management
├── types.ts                 # Reasoning types and enums
├── console-reasoning.ts     # Extended console utilities
└── tools/                   # Inherited from Chapter 6
```

### Key Components

1. **Agent Class** (`agent.ts`):
   - Manages reasoning state during streaming
   - Detects stage transitions
   - Handles thinking block start/stop events

2. **Console Reasoning** (`console-reasoning.ts`):
   - Visual indicators for each stage
   - Color-coded streaming output
   - Collapsed/expanded display modes

3. **Types** (`types.ts`):
   - `ReasoningStage` enum (5 stages)
   - `ReasoningState` interface
   - `ReasoningStageVisual` metadata

## CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--verbose` | Enable debug logging | `false` |
| `--no-thinking` | Disable reasoning visualization | `false` (thinking enabled) |
| `--collapse-reasoning` | Show reasoning summaries only | `false` (expanded) |

## Comparison with Chapter 6

| Feature | Chapter 6 | Chapter 7 |
|---------|-----------|-----------|
| Streaming responses | ✅ | ✅ |
| Tool call visibility | ✅ | ✅ |
| Extended thinking | ❌ | ✅ |
| Reasoning visualization | ❌ | ✅ |
| Cognitive stage indicators | ❌ | ✅ |
| Progressive disclosure | ❌ | ✅ |
| Model | Haiku | Sonnet 3.5 |

## Benefits

### Transparency
- **See the thought process**: Understand how Claude approaches problems
- **Debug reasoning**: Identify where Claude's thinking diverges from expectations
- **Learn from Claude**: Observe problem-solving strategies

### User Experience
- **Build trust**: Visible reasoning creates confidence in responses
- **Manage expectations**: Users see when Claude is thinking hard vs. responding quickly
- **Educational value**: Watch an AI's cognitive process in real-time

### Development
- **Better prompting**: Understand what reasoning patterns work best
- **Quality control**: Catch errors in Claude's thinking before they become output errors
- **Performance tuning**: Balance thinking budget vs. response quality

## Performance Notes

- **Thinking budget**: 5000 tokens allocated for reasoning (adjustable)
- **Overhead**: Minimal (<50ms) for stage detection and formatting
- **Model requirement**: Extended thinking requires Sonnet 3.5 or newer
- **Streaming**: Real-time display maintains sub-100ms latency

## Technical Details

### Thinking Block Lifecycle

1. **Start**: `content_block_start` with `type: "thinking"`
   - Initialize reasoning state
   - Display stage indicator

2. **Stream**: `thinking_delta` events
   - Accumulate text
   - Detect stage transitions
   - Stream with stage-specific styling

3. **Stop**: `content_block_stop`
   - Finalize reasoning display
   - Reset state for next block

### Stage Transition Logic

```typescript
// Stages are detected from accumulated thinking text
const newStage = detectReasoningStage(accumulatedText);

if (newStage !== currentStage) {
  // Visual transition
  reasoningEnd();
  reasoningStart(newStage);
  currentStage = newStage;
}
```

## Next Steps

After completing Chapter 7, you can extend with:

1. **Interactive reasoning controls**: Pause/resume thinking during stream
2. **Reasoning history**: Save and replay thought processes
3. **Custom stage detection**: Fine-tune stage classification for your domain
4. **Thinking analytics**: Track reasoning patterns and efficiency
5. **Multi-model comparison**: Compare reasoning across different Claude versions

## Troubleshooting

**Reasoning not displaying?**
- Ensure you're using Sonnet 3.5 or newer
- Check that `--no-thinking` flag is not set
- Verify API key has access to extended thinking

**Colors not showing?**
- Check terminal supports ANSI colors
- Try setting `FORCE_COLOR=1` environment variable
- Use `NO_COLOR=1` to disable colors if needed

**Performance issues?**
- Reduce thinking budget from 5000 to 2000-3000 tokens
- Use `--collapse-reasoning` for less visual overhead
- Consider using `--no-thinking` for faster responses

## Learn More

- [Extended Thinking Documentation](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking)
- [Claude API Reference](https://docs.anthropic.com/en/api)
- [Streaming Events Guide](https://docs.anthropic.com/en/api/streaming)

---

Built with ❤️ using TypeScript, Anthropic SDK, and Extended Thinking.
