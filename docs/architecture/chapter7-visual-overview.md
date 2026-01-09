# Chapter 7: Visual Overview

## Reasoning Flow Architecture

```mermaid
graph TB
    subgraph "User Interaction"
        A[User Input] --> B[Agent.run]
    end

    subgraph "Streaming Response Processing"
        B --> C[runInference with thinking]
        C --> D{Stream Event Type}

        D -->|content_block_start| E{Block Type}
        E -->|thinking| F[reasoningStart]
        E -->|tool_use| G[toolStart]
        E -->|text| H[textStart]

        D -->|content_block_delta| I{Delta Type}
        I -->|thinking_delta| J[reasoningStream]
        I -->|text_delta| K[claudeStream]

        D -->|content_block_stop| L{Block Type}
        L -->|thinking| M[reasoningEnd]
        L -->|tool_use| N[toolEnd]
    end

    subgraph "Reasoning Stage Detection"
        J --> O[detectReasoningStage]
        O --> P{Stage Changed?}
        P -->|Yes| Q[reasoningEnd + reasoningStart]
        P -->|No| R[Continue Streaming]
    end

    subgraph "Visual Output"
        F --> S[🤔 Analyzing]
        F --> T[📋 Planning]
        F --> U[💡 Deciding]
        F --> V[⚡ Executing]
        F --> W[✓ Evaluating]

        S & T & U & V & W --> X[Color-Coded Stream]
        X -->|Expanded| Y[Show Full Reasoning]
        X -->|Collapsed| Z[Show Summary]
    end

    subgraph "Tool Execution"
        G --> AA[Show Tool Call]
        AA --> AB[Execute Tool]
        AB --> AC[Show Result]
        AC --> C
    end
```

## Event Flow Sequence

```mermaid
sequenceDiagram
    participant User
    participant Agent
    participant Anthropic
    participant Console

    User->>Agent: Send message
    Agent->>Anthropic: Stream request with thinking

    Anthropic-->>Agent: content_block_start (thinking)
    Agent->>Console: reasoningStart(ANALYZING)
    Console->>User: 🤔 Analyzing (cyan)

    Anthropic-->>Agent: thinking_delta
    Agent->>Agent: detectReasoningStage
    Agent->>Console: reasoningStream (cyan)
    Console->>User: Stream reasoning text...

    Anthropic-->>Agent: thinking_delta
    Agent->>Agent: Stage changed to DECIDING
    Agent->>Console: reasoningEnd + reasoningStart(DECIDING)
    Console->>User: 💡 Deciding (magenta)

    Anthropic-->>Agent: content_block_stop (thinking)
    Agent->>Console: reasoningEnd

    Anthropic-->>Agent: content_block_start (tool_use)
    Agent->>Console: toolStart("list_files")
    Console->>User: ⚡ Calling list_files

    Agent->>Agent: Execute tool
    Agent->>Console: toolEnd(success)
    Console->>User: ✓ Finished list_files

    Agent->>Anthropic: Send tool results

    Anthropic-->>Agent: content_block_delta (text)
    Agent->>Console: claudeStream
    Console->>User: Stream response text...

    Anthropic-->>Agent: Message complete
    Console->>User: Ready for next input
```

## Component Architecture

```mermaid
graph LR
    subgraph "Agent Core"
        A[Agent Class]
        A --> B[runInference]
        A --> C[Event Handlers]
        A --> D[Tool Registry]
    end

    subgraph "Console Output"
        E[console_out]
        E --> F[reasoningStart]
        E --> G[reasoningStream]
        E --> H[reasoningEnd]
        E --> I[toolStart/End]
        E --> J[claudeStream]
    end

    subgraph "Reasoning Logic"
        K[detectReasoningStage]
        L[getStageEmoji]
        M[getStageLabel]
        N[getStageColor]

        K --> L
        K --> M
        K --> N
    end

    subgraph "Types"
        O[ReasoningStage]
        P[ReasoningState]
        Q[AgentOptions]
        R[ThinkingBlock]
    end

    C --> E
    E --> K
    K --> O
    A --> Q
```

## Stage Visualization

### Reasoning Stages with Visual Indicators

| Stage | Emoji | Color | Trigger Keywords | Purpose |
|-------|-------|-------|------------------|---------|
| **Analyzing** | 🤔 | Cyan | "analyzing", "examining", "looking at" | Understanding the problem |
| **Planning** | 📋 | Blue | "planning", "will", "approach" | Designing solution |
| **Deciding** | 💡 | Magenta | "deciding", "choosing", "considering" | Making choices |
| **Executing** | ⚡ | Yellow | "executing", "running", "calling" | Taking action |
| **Evaluating** | ✓ | Green | "checking", "verifying", "result" | Validating results |

### Example Output (Expanded Mode)

```
You › What files are in the 6-streaming-response directory?

🤔 Thinking: Analyzing
  The user wants to know about files in a specific directory.
  I need to use the list_files tool with the path parameter.

📋 Thinking: Planning
  I'll construct the path and call list_files to get the
  directory contents. Then I'll summarize what I find.

💡 Thinking: Deciding
  Using list_files tool with path "6-streaming-response"

⚡ Calling list_files

✓ Finished list_files

Claude › The 6-streaming-response directory contains:
- agent.ts (main agent class)
- index.ts (entry point)
- types.ts (type definitions)
- tools/ directory with 5 tools
- ripgrep/ directory with utilities

Would you like me to read any of these files?
```

### Example Output (Collapsed Mode)

```
You › What files are in the 6-streaming-response directory?

🤔 📋 💡 Completed in 245ms (press 'r' to expand)

⚡ Calling list_files

✓ Finished list_files

Claude › The 6-streaming-response directory contains:
- agent.ts (main agent class)
- index.ts (entry point)
...
```

## File Dependencies

```mermaid
graph TD
    A[index.ts] --> B[agent.ts]
    B --> C[types.ts]
    B --> D[console-reasoning.ts]
    B --> E[tools/]

    D --> F[picocolors]
    D --> G[boxen]
    D --> H[log-symbols]

    C --> I[ReasoningStage]
    C --> J[ReasoningState]
    C --> K[AgentOptions]

    E --> L[read_file.ts]
    E --> M[list_files.ts]
    E --> N[bash_tool.ts]
    E --> O[edit_tool.ts]
    E --> P[grep.ts]

    style A fill:#e1f5ff
    style B fill:#fff4e1
    style D fill:#f0e1ff
    style C fill:#e1ffe1
```

## Progressive Disclosure States

```mermaid
stateDiagram-v2
    [*] --> Expanded: Default
    Expanded --> Collapsed: Press 'r'
    Collapsed --> Expanded: Press 'r'

    state Expanded {
        [*] --> ShowEmoji
        ShowEmoji --> ShowLabel
        ShowLabel --> StreamText
        StreamText --> ShowDuration
    }

    state Collapsed {
        [*] --> ShowEmojis
        ShowEmojis --> ShowDuration
        ShowDuration --> ShowHint
    }

    Expanded --> [*]: Reasoning Complete
    Collapsed --> [*]: Reasoning Complete
```

## Configuration Options Flow

```mermaid
graph LR
    A[CLI Args] --> B{Parse Options}
    B --> C[verbose]
    B --> D[enableThinking]
    B --> E[showReasoning]
    B --> F[collapseReasoning]

    C --> G[Agent Options]
    D --> G
    E --> G

    G --> H[Agent Constructor]
    H --> I[Configure API]
    H --> J[Configure Console]

    F --> J

    I --> K[thinking: enabled/disabled]
    J --> L[reasoningExpanded: true/false]
```

## Backward Compatibility Matrix

| Feature | Chapter 6 | Chapter 7 (default) | Chapter 7 (--no-thinking) |
|---------|-----------|---------------------|----------------------------|
| Streaming text | ✅ | ✅ | ✅ |
| Tool visibility | ✅ | ✅ | ✅ |
| Reasoning display | ❌ | ✅ | ❌ |
| Visual indicators | ❌ | ✅ | ❌ (tools only) |
| Extended thinking | ❌ | ✅ | ❌ |
| Model | Haiku | Sonnet | Sonnet |
| Token budget | 1024 | 8000 + 5000 | 8000 |

## Performance Characteristics

```mermaid
graph TB
    subgraph "Token Usage"
        A[User Message] --> B[Reasoning Tokens: ~500-2000]
        B --> C[Response Tokens: ~200-1000]
        C --> D[Tool Results: ~100-500]
        D --> E[Total: ~800-3500]
    end

    subgraph "Latency"
        F[First Token] --> G[~200-400ms]
        G --> H[Reasoning Complete] --> I[~1-3s]
        I --> J[Response Complete] --> K[~2-5s]
    end

    subgraph "Display Performance"
        L[Stream Rendering] --> M[~16ms/frame]
        M --> N[Stage Detection] --> O[~1ms]
        O --> P[Color Rendering] --> Q[~0.1ms]
    end
```

## Summary

Chapter 7 provides:

1. **Visual Transparency**: See Claude's thinking process in real-time
2. **Stage-based Display**: 5 distinct reasoning stages with unique indicators
3. **Progressive Disclosure**: Expand/collapse reasoning for different detail levels
4. **Tool Reasoning**: Understand why tools are being called
5. **Backward Compatible**: Works seamlessly with Chapter 6 code

The architecture maintains clean separation between:
- **Capture** (Agent): Getting reasoning from API
- **Detection** (Logic): Identifying reasoning stages
- **Display** (Console): Visualizing with colors and emojis
- **Configuration** (Options): Controlling behavior

This design makes the AI's decision-making process transparent while keeping the codebase maintainable and extensible.
