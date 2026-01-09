# Chapter 7: Reasoning Visualization - Comprehensive Test Strategy

## Executive Summary

This document outlines a comprehensive testing strategy for Chapter 7's reasoning visualization features, building on the streaming foundation from Chapter 6. The strategy covers unit tests, integration tests, manual testing, and performance benchmarks to ensure robust reasoning block capture, display, and user experience.

---

## 1. Feature Overview

### Chapter 7 Features to Test
1. **Reasoning Block Capture** - Capture extended thinking blocks from Claude API
2. **Visual Output Formatting** - Display reasoning with colors, icons, and formatting
3. **Progressive Disclosure** - Expandable/collapsible reasoning sections
4. **Tool Use Reasoning** - Show reasoning behind tool calls
5. **Streaming Performance** - Handle reasoning overhead during streaming
6. **Edge Case Handling** - Empty reasoning, malformed blocks, long reasoning chains

---

## 2. Unit Test Scenarios

### 2.1 Reasoning Block Parser Tests

**File**: `tests/unit/reasoning-parser.test.ts`

```typescript
describe('ReasoningParser', () => {
  describe('parseReasoningBlock', () => {
    it('should parse valid reasoning block', () => {
      const block = {
        type: 'thinking',
        thinking: 'User wants to list files...'
      };
      const result = parseReasoningBlock(block);
      expect(result.content).toBe('User wants to list files...');
      expect(result.type).toBe('thinking');
    });

    it('should handle empty reasoning content', () => {
      const block = { type: 'thinking', thinking: '' };
      const result = parseReasoningBlock(block);
      expect(result.content).toBe('');
      expect(result.isEmpty).toBe(true);
    });

    it('should handle whitespace-only reasoning', () => {
      const block = { type: 'thinking', thinking: '   \n\t  ' };
      const result = parseReasoningBlock(block);
      expect(result.isEmpty).toBe(true);
    });

    it('should extract multi-line reasoning', () => {
      const block = {
        type: 'thinking',
        thinking: 'Step 1: Analyze request\nStep 2: Choose tool\nStep 3: Execute'
      };
      const result = parseReasoningBlock(block);
      expect(result.lines).toEqual(['Step 1: Analyze request', 'Step 2: Choose tool', 'Step 3: Execute']);
    });

    it('should truncate very long reasoning blocks', () => {
      const longText = 'a'.repeat(5000);
      const block = { type: 'thinking', thinking: longText };
      const result = parseReasoningBlock(block, { maxLength: 1000 });
      expect(result.content.length).toBeLessThanOrEqual(1003); // 1000 + '...'
      expect(result.isTruncated).toBe(true);
    });

    it('should handle malformed JSON in reasoning', () => {
      const block = { type: 'thinking', thinking: '{"broken: json}' };
      expect(() => parseReasoningBlock(block)).not.toThrow();
    });

    it('should handle null/undefined reasoning', () => {
      expect(() => parseReasoningBlock({ type: 'thinking', thinking: null })).not.toThrow();
      expect(() => parseReasoningBlock({ type: 'thinking', thinking: undefined })).not.toThrow();
    });
  });

  describe('extractToolReasoning', () => {
    it('should extract reasoning before tool use', () => {
      const blocks = [
        { type: 'thinking', thinking: 'Need to read file' },
        { type: 'tool_use', name: 'read_file', id: '123', input: {} }
      ];
      const result = extractToolReasoning(blocks, '123');
      expect(result).toBe('Need to read file');
    });

    it('should return null if no reasoning before tool', () => {
      const blocks = [
        { type: 'tool_use', name: 'read_file', id: '123', input: {} }
      ];
      const result = extractToolReasoning(blocks, '123');
      expect(result).toBeNull();
    });

    it('should associate reasoning with correct tool', () => {
      const blocks = [
        { type: 'thinking', thinking: 'Reasoning 1' },
        { type: 'tool_use', name: 'list_files', id: '1', input: {} },
        { type: 'thinking', thinking: 'Reasoning 2' },
        { type: 'tool_use', name: 'read_file', id: '2', input: {} }
      ];
      expect(extractToolReasoning(blocks, '1')).toBe('Reasoning 1');
      expect(extractToolReasoning(blocks, '2')).toBe('Reasoning 2');
    });
  });
});
```

### 2.2 Visual Formatter Tests

**File**: `tests/unit/reasoning-formatter.test.ts`

```typescript
describe('ReasoningFormatter', () => {
  describe('formatReasoning', () => {
    it('should add thinking emoji and color', () => {
      const formatted = formatReasoning('Analyzing request');
      expect(formatted).toContain('💭');
      expect(formatted).toContain('\x1b['); // ANSI color codes
    });

    it('should format collapsed reasoning preview', () => {
      const longText = 'This is a long reasoning block...';
      const formatted = formatReasoning(longText, { collapsed: true, previewLength: 20 });
      expect(formatted).toContain('This is a long...');
      expect(formatted).toContain('[show more]');
    });

    it('should format expanded reasoning', () => {
      const formatted = formatReasoning('Full reasoning', { collapsed: false });
      expect(formatted).not.toContain('[show more]');
      expect(formatted).toContain('[hide]');
    });

    it('should apply dimmed style for collapsed', () => {
      const formatted = formatReasoning('text', { collapsed: true });
      expect(formatted).toMatch(/\x1b\[2m/); // ANSI dim code
    });

    it('should handle empty reasoning gracefully', () => {
      const formatted = formatReasoning('');
      expect(formatted).toBe('');
    });

    it('should format with proper indentation', () => {
      const multiline = 'Line 1\nLine 2\nLine 3';
      const formatted = formatReasoning(multiline, { indent: 2 });
      expect(formatted).toContain('  Line 1');
      expect(formatted).toContain('  Line 2');
    });

    it('should preserve code blocks in reasoning', () => {
      const withCode = 'Reasoning:\n```js\nconst x = 1;\n```';
      const formatted = formatReasoning(withCode);
      expect(formatted).toContain('```');
    });
  });

  describe('formatToolReasoning', () => {
    it('should format tool reasoning with context', () => {
      const formatted = formatToolReasoning('read_file', 'Need to check config');
      expect(formatted).toContain('read_file');
      expect(formatted).toContain('Need to check config');
      expect(formatted).toContain('⚡'); // Tool icon
    });

    it('should handle no reasoning for tool', () => {
      const formatted = formatToolReasoning('list_files', null);
      expect(formatted).toBe('');
    });
  });
});
```

### 2.3 Progressive Disclosure Tests

**File**: `tests/unit/progressive-disclosure.test.ts`

```typescript
describe('ProgressiveDisclosure', () => {
  let disclosure: ProgressiveDisclosure;

  beforeEach(() => {
    disclosure = new ProgressiveDisclosure();
  });

  describe('state management', () => {
    it('should initialize with collapsed state', () => {
      expect(disclosure.isCollapsed('reasoning-1')).toBe(true);
    });

    it('should toggle state', () => {
      disclosure.toggle('reasoning-1');
      expect(disclosure.isCollapsed('reasoning-1')).toBe(false);
      disclosure.toggle('reasoning-1');
      expect(disclosure.isCollapsed('reasoning-1')).toBe(true);
    });

    it('should expand specific reasoning block', () => {
      disclosure.expand('reasoning-1');
      expect(disclosure.isCollapsed('reasoning-1')).toBe(false);
    });

    it('should collapse specific reasoning block', () => {
      disclosure.expand('reasoning-1');
      disclosure.collapse('reasoning-1');
      expect(disclosure.isCollapsed('reasoning-1')).toBe(true);
    });

    it('should expand all blocks', () => {
      disclosure.expandAll(['r1', 'r2', 'r3']);
      expect(disclosure.isCollapsed('r1')).toBe(false);
      expect(disclosure.isCollapsed('r2')).toBe(false);
      expect(disclosure.isCollapsed('r3')).toBe(false);
    });

    it('should collapse all blocks', () => {
      disclosure.expandAll(['r1', 'r2']);
      disclosure.collapseAll(['r1', 'r2']);
      expect(disclosure.isCollapsed('r1')).toBe(true);
      expect(disclosure.isCollapsed('r2')).toBe(true);
    });
  });

  describe('persistence', () => {
    it('should save state to storage', () => {
      disclosure.expand('r1');
      disclosure.save();
      const saved = disclosure.getState();
      expect(saved['r1']).toBe(false);
    });

    it('should restore state from storage', () => {
      const state = { 'r1': false, 'r2': true };
      disclosure.restore(state);
      expect(disclosure.isCollapsed('r1')).toBe(false);
      expect(disclosure.isCollapsed('r2')).toBe(true);
    });
  });

  describe('auto-collapse', () => {
    it('should auto-collapse old reasoning blocks', () => {
      disclosure.expand('r1');
      disclosure.expand('r2');
      disclosure.expand('r3');
      disclosure.autoCollapseOld(2); // Keep 2 newest expanded
      expect(disclosure.isCollapsed('r1')).toBe(true);
      expect(disclosure.isCollapsed('r2')).toBe(false);
      expect(disclosure.isCollapsed('r3')).toBe(false);
    });
  });
});
```

### 2.4 Streaming Integration Tests

**File**: `tests/unit/reasoning-stream.test.ts`

```typescript
describe('ReasoningStream', () => {
  describe('reasoning delta handling', () => {
    it('should accumulate reasoning deltas', () => {
      const stream = new ReasoningStream();
      stream.appendDelta('Part 1');
      stream.appendDelta(' Part 2');
      stream.appendDelta(' Part 3');
      expect(stream.getComplete()).toBe('Part 1 Part 2 Part 3');
    });

    it('should detect complete reasoning blocks', () => {
      const stream = new ReasoningStream();
      stream.appendDelta('Complete reasoning');
      expect(stream.isComplete()).toBe(false);
      stream.finalize();
      expect(stream.isComplete()).toBe(true);
    });

    it('should handle reasoning updates during streaming', () => {
      const stream = new ReasoningStream();
      const updates: string[] = [];
      stream.on('update', (delta) => updates.push(delta));

      stream.appendDelta('Part 1');
      stream.appendDelta(' Part 2');

      expect(updates).toEqual(['Part 1', ' Part 2']);
    });
  });

  describe('performance tracking', () => {
    it('should track reasoning overhead', () => {
      const stream = new ReasoningStream();
      stream.startTracking();
      stream.appendDelta('text');
      stream.finalize();
      const metrics = stream.getMetrics();
      expect(metrics.duration).toBeGreaterThan(0);
      expect(metrics.characterCount).toBe(4);
    });

    it('should calculate streaming rate', () => {
      const stream = new ReasoningStream();
      stream.startTracking();
      stream.appendDelta('a'.repeat(100));
      const metrics = stream.getMetrics();
      expect(metrics.charactersPerSecond).toBeGreaterThan(0);
    });
  });
});
```

---

## 3. Integration Test Flows

### 3.1 End-to-End Reasoning Display

**File**: `tests/integration/reasoning-e2e.test.ts`

```typescript
describe('Reasoning Visualization E2E', () => {
  let agent: Agent;
  let mockClient: MockAnthropicClient;

  beforeEach(() => {
    mockClient = new MockAnthropicClient();
    agent = new Agent(mockClient, mockReadline, tools);
  });

  it('should display reasoning before text response', async () => {
    mockClient.mockStreamResponse([
      { type: 'content_block_start', content_block: { type: 'thinking', thinking: '' } },
      { type: 'content_block_delta', delta: { type: 'thinking_delta', thinking: 'Analyzing...' } },
      { type: 'content_block_stop' },
      { type: 'content_block_start', content_block: { type: 'text', text: '' } },
      { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Here is the result' } },
      { type: 'content_block_stop' }
    ]);

    const output = await captureOutput(() => agent.processMessage('test'));

    expect(output).toContain('💭'); // Thinking emoji
    expect(output).toContain('Analyzing...');
    expect(output).toContain('Here is the result');
    expect(output.indexOf('Analyzing')).toBeLessThan(output.indexOf('Here is the result'));
  });

  it('should display reasoning before tool call', async () => {
    mockClient.mockStreamResponse([
      { type: 'content_block_start', content_block: { type: 'thinking' } },
      { type: 'content_block_delta', delta: { type: 'thinking_delta', thinking: 'Need to read file' } },
      { type: 'content_block_stop' },
      { type: 'content_block_start', content_block: { type: 'tool_use', name: 'read_file', id: '1' } }
    ]);

    const output = await captureOutput(() => agent.processMessage('read config'));

    expect(output).toContain('💭 Need to read file');
    expect(output).toContain('⚡ Calling read_file');
  });

  it('should handle multiple reasoning blocks in sequence', async () => {
    mockClient.mockStreamResponse([
      { type: 'content_block_start', content_block: { type: 'thinking' } },
      { type: 'content_block_delta', delta: { type: 'thinking_delta', thinking: 'First thought' } },
      { type: 'content_block_stop' },
      { type: 'content_block_start', content_block: { type: 'thinking' } },
      { type: 'content_block_delta', delta: { type: 'thinking_delta', thinking: 'Second thought' } },
      { type: 'content_block_stop' }
    ]);

    const output = await captureOutput(() => agent.processMessage('test'));

    expect(output).toContain('First thought');
    expect(output).toContain('Second thought');
  });

  it('should collapse long reasoning by default', async () => {
    const longReasoning = 'a'.repeat(500);
    mockClient.mockStreamResponse([
      { type: 'content_block_start', content_block: { type: 'thinking' } },
      { type: 'content_block_delta', delta: { type: 'thinking_delta', thinking: longReasoning } }
    ]);

    const output = await captureOutput(() => agent.processMessage('test'));

    expect(output).toContain('[show more]');
    expect(output).not.toContain(longReasoning);
  });
});
```

### 3.2 Chapter 6 Compatibility Tests

**File**: `tests/integration/chapter6-compat.test.ts`

```typescript
describe('Chapter 6 Compatibility', () => {
  it('should maintain text streaming from Chapter 6', async () => {
    const agent = new Agent(client, mockReadline, tools);
    const chunks: string[] = [];

    mockClient.mockStreamResponse([
      { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello' } },
      { type: 'content_block_delta', delta: { type: 'text_delta', text: ' world' } }
    ]);

    agent.on('textDelta', (delta) => chunks.push(delta));
    await agent.processMessage('test');

    expect(chunks).toEqual(['Hello', ' world']);
  });

  it('should maintain tool call visibility', async () => {
    mockClient.mockStreamResponse([
      { type: 'content_block_start', content_block: { type: 'tool_use', name: 'read_file' } }
    ]);

    const output = await captureOutput(() => agent.processMessage('test'));
    expect(output).toContain('⚡ Calling read_file');
  });

  it('should maintain tool execution status', async () => {
    const agent = new Agent(client, mockReadline, tools);
    mockClient.mockToolCall('read_file', { path: 'test.txt' });

    const output = await captureOutput(() => agent.run());
    expect(output).toContain('✓ Finished read_file');
  });

  it('should not break existing streaming performance', async () => {
    const startTime = Date.now();

    mockClient.mockStreamResponse(
      Array(100).fill({ type: 'content_block_delta', delta: { type: 'text_delta', text: 'x' } })
    );

    await agent.processMessage('test');
    const duration = Date.now() - startTime;

    // Should not add significant overhead
    expect(duration).toBeLessThan(100);
  });
});
```

---

## 4. Edge Case Testing

### 4.1 Edge Case Checklist

**File**: `tests/edge-cases/reasoning-edge-cases.test.ts`

```typescript
describe('Reasoning Edge Cases', () => {
  describe('empty reasoning', () => {
    it('should handle empty reasoning block', () => {
      const block = { type: 'thinking', thinking: '' };
      expect(() => formatReasoning(block)).not.toThrow();
    });

    it('should not display empty reasoning', () => {
      const output = formatReasoning({ type: 'thinking', thinking: '' });
      expect(output).toBe('');
    });
  });

  describe('malformed blocks', () => {
    it('should handle missing thinking field', () => {
      const block = { type: 'thinking' };
      expect(() => parseReasoningBlock(block)).not.toThrow();
    });

    it('should handle invalid JSON structure', () => {
      const block = { invalid: 'structure' };
      expect(() => parseReasoningBlock(block)).not.toThrow();
    });

    it('should handle non-string thinking content', () => {
      const block = { type: 'thinking', thinking: 12345 };
      const result = parseReasoningBlock(block);
      expect(typeof result.content).toBe('string');
    });
  });

  describe('very long reasoning', () => {
    it('should truncate reasoning over 10,000 characters', () => {
      const longReasoning = 'a'.repeat(15000);
      const formatted = formatReasoning(longReasoning, { maxLength: 10000 });
      expect(formatted.length).toBeLessThanOrEqual(10003);
    });

    it('should provide expand option for truncated reasoning', () => {
      const longReasoning = 'a'.repeat(5000);
      const formatted = formatReasoning(longReasoning, { collapsed: true });
      expect(formatted).toContain('[show more]');
    });

    it('should handle memory efficiently with long reasoning', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const longReasoning = 'a'.repeat(100000);
      formatReasoning(longReasoning);
      const memoryIncrease = process.memoryUsage().heapUsed - initialMemory;
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // <10MB
    });
  });

  describe('special characters', () => {
    it('should handle ANSI codes in reasoning', () => {
      const withAnsi = 'Reasoning with \x1b[31mcolor\x1b[0m codes';
      expect(() => formatReasoning(withAnsi)).not.toThrow();
    });

    it('should handle unicode emojis in reasoning', () => {
      const withEmoji = 'Reasoning with 🚀 emoji';
      const formatted = formatReasoning(withEmoji);
      expect(formatted).toContain('🚀');
    });

    it('should handle newlines and tabs', () => {
      const withWhitespace = 'Line 1\n\tIndented\n\n\nMultiple breaks';
      const formatted = formatReasoning(withWhitespace);
      expect(formatted).toContain('Line 1');
      expect(formatted).toContain('Indented');
    });
  });

  describe('streaming interruptions', () => {
    it('should handle incomplete reasoning blocks', () => {
      const stream = new ReasoningStream();
      stream.appendDelta('Incomplete');
      // Stream interrupted
      expect(() => stream.finalize()).not.toThrow();
    });

    it('should handle connection loss during reasoning', async () => {
      mockClient.mockStreamError(new Error('Connection lost'));
      expect(async () => await agent.processMessage('test')).not.toThrow();
    });
  });

  describe('concurrent reasoning blocks', () => {
    it('should handle overlapping reasoning blocks', () => {
      const events = [
        { type: 'content_block_start', index: 0, content_block: { type: 'thinking' } },
        { type: 'content_block_start', index: 1, content_block: { type: 'thinking' } },
        { type: 'content_block_delta', index: 0, delta: { thinking: 'First' } },
        { type: 'content_block_delta', index: 1, delta: { thinking: 'Second' } }
      ];

      expect(() => processStreamEvents(events)).not.toThrow();
    });
  });
});
```

---

## 5. Performance Benchmarks

### 5.1 Performance Test Suite

**File**: `tests/performance/reasoning-performance.test.ts`

```typescript
describe('Reasoning Performance', () => {
  describe('streaming overhead', () => {
    it('should add minimal overhead to text streaming', async () => {
      const withoutReasoning = await measureStreamingTime(1000, false);
      const withReasoning = await measureStreamingTime(1000, true);

      const overhead = withReasoning - withoutReasoning;
      expect(overhead).toBeLessThan(50); // <50ms overhead
    });

    it('should handle 100 reasoning deltas under 100ms', async () => {
      const stream = new ReasoningStream();
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        stream.appendDelta('delta');
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100);
    });

    it('should format reasoning under 10ms', () => {
      const reasoning = 'a'.repeat(1000);
      const start = performance.now();
      formatReasoning(reasoning);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(10);
    });
  });

  describe('memory usage', () => {
    it('should not leak memory with continuous reasoning', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < 100; i++) {
        const stream = new ReasoningStream();
        stream.appendDelta('text'.repeat(100));
        stream.finalize();
      }

      global.gc?.();
      const finalMemory = process.memoryUsage().heapUsed;
      const increase = finalMemory - initialMemory;

      expect(increase).toBeLessThan(5 * 1024 * 1024); // <5MB
    });

    it('should clean up old reasoning blocks', () => {
      const disclosure = new ProgressiveDisclosure({ maxBlocks: 10 });

      for (let i = 0; i < 20; i++) {
        disclosure.expand(`block-${i}`);
      }

      const stateSize = JSON.stringify(disclosure.getState()).length;
      expect(stateSize).toBeLessThan(1000); // Limited state size
    });
  });

  describe('large reasoning chains', () => {
    it('should handle 50 reasoning blocks efficiently', async () => {
      const blocks = Array(50).fill(null).map((_, i) => ({
        type: 'thinking',
        thinking: `Reasoning ${i}`
      }));

      const start = performance.now();
      blocks.forEach(block => formatReasoning(block.thinking));
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(500); // <500ms for 50 blocks
    });

    it('should maintain consistent performance', async () => {
      const durations: number[] = [];

      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        await agent.processWithReasoning('test');
        durations.push(performance.now() - start);
      }

      const avgDuration = durations.reduce((a, b) => a + b) / durations.length;
      const variance = durations.map(d => Math.abs(d - avgDuration));
      const maxVariance = Math.max(...variance);

      expect(maxVariance).toBeLessThan(avgDuration * 0.5); // <50% variance
    });
  });

  describe('real-world scenarios', () => {
    it('should handle typical reasoning workflow', async () => {
      // Simulate realistic usage: 5 reasoning blocks, 3 tool calls, 2 text responses
      const start = performance.now();

      await agent.processMessage('Complex task requiring multiple steps');

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(2000); // <2s for typical workflow
    });

    it('should stream reasoning at readable pace', async () => {
      const stream = new ReasoningStream();
      const deltas: number[] = [];

      stream.on('delta', () => {
        deltas.push(performance.now());
      });

      for (let i = 0; i < 50; i++) {
        stream.appendDelta('word ');
        await sleep(10);
      }

      // Check that deltas arrive at reasonable intervals
      const intervals = deltas.slice(1).map((t, i) => t - deltas[i]);
      const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;

      expect(avgInterval).toBeGreaterThan(5); // Not too fast
      expect(avgInterval).toBeLessThan(50); // Not too slow
    });
  });
});
```

### 5.2 Benchmark Configuration

```typescript
// tests/performance/benchmark-config.ts
export const PERFORMANCE_THRESHOLDS = {
  // Streaming
  textStreamOverhead: 50, // ms
  reasoningDeltaProcessing: 1, // ms per delta

  // Formatting
  reasoningFormat: 10, // ms
  longReasoningFormat: 50, // ms (>5000 chars)

  // Memory
  maxMemoryIncrease: 10 * 1024 * 1024, // 10MB
  maxStateSize: 5 * 1024 * 1024, // 5MB

  // End-to-end
  simpleRequest: 500, // ms
  complexWorkflow: 2000, // ms

  // Progressive disclosure
  toggleState: 5, // ms
  renderUpdate: 20, // ms
};
```

---

## 6. Manual Testing Checklist

### 6.1 Visual Verification

- [ ] **Reasoning Icon**: `💭` emoji displays correctly
- [ ] **Color Coding**: Reasoning text uses appropriate colors (cyan/dim)
- [ ] **Indentation**: Multi-line reasoning is properly indented
- [ ] **Spacing**: Adequate spacing between reasoning and other content
- [ ] **Tool Association**: Reasoning before tool calls is visually connected

### 6.2 Interactive Testing

- [ ] **Progressive Disclosure**: Click/keyboard to expand collapsed reasoning
- [ ] **State Persistence**: Expansion state persists across messages
- [ ] **Scrolling**: Long reasoning blocks scroll properly
- [ ] **Copy-Paste**: Reasoning text can be selected and copied
- [ ] **Search**: Reasoning content is searchable (Ctrl+F)

### 6.3 User Experience

- [ ] **Readability**: Reasoning text is easy to read at default size
- [ ] **Performance Feel**: No noticeable lag when reasoning appears
- [ ] **Clarity**: Clear visual distinction between reasoning and responses
- [ ] **Interruption**: User can interrupt long reasoning streams
- [ ] **Accessibility**: Screen readers can parse reasoning content

### 6.4 Cross-Platform Testing

**macOS**:
- [ ] Terminal.app rendering
- [ ] iTerm2 rendering
- [ ] Hyper rendering

**Linux**:
- [ ] GNOME Terminal
- [ ] Konsole
- [ ] Alacritty

**Windows**:
- [ ] Windows Terminal
- [ ] Command Prompt
- [ ] PowerShell

### 6.5 Test Scenarios

**Scenario 1: Simple Query**
```
Input: "What is 2+2?"
Expected:
💭 This is a simple arithmetic question...
Claude › The answer is 4.
```

**Scenario 2: Tool Use**
```
Input: "Read package.json"
Expected:
💭 The user wants to read a file...
⚡ Calling read_file
✓ Finished read_file
Claude › Here's the content...
```

**Scenario 3: Long Reasoning**
```
Input: "Explain quantum computing"
Expected:
💭 This is a complex topic... [show more]
Claude › Quantum computing is...
```

**Scenario 4: Multiple Steps**
```
Input: "Analyze and fix the bug"
Expected:
💭 First, I need to understand the code...
⚡ Calling read_file
💭 Now I can see the issue...
💭 I'll create a fix...
Claude › Here's the solution...
```

---

## 7. Test Infrastructure

### 7.1 Test Environment Setup

```typescript
// tests/setup.ts
import { MockAnthropicClient } from './mocks/anthropic-client';
import { MockReadline } from './mocks/readline';

export function setupTestEnvironment() {
  // Mock Anthropic SDK
  global.mockClient = new MockAnthropicClient();

  // Mock console output
  global.captureOutput = captureConsoleOutput;

  // Mock readline
  global.mockReadline = new MockReadline();

  // Performance tracking
  global.performance = {
    now: () => Date.now(),
    measure: jest.fn()
  };
}

export function teardownTestEnvironment() {
  jest.clearAllMocks();
  global.gc?.();
}
```

### 7.2 Mock Implementation

```typescript
// tests/mocks/anthropic-client.ts
export class MockAnthropicClient {
  private responses: any[] = [];

  mockStreamResponse(events: any[]) {
    this.responses = events;
  }

  messages = {
    stream: (params: any) => {
      const stream = new MockStream(this.responses);
      return stream;
    }
  };
}

class MockStream {
  private events: any[];
  private listeners: Map<string, Function[]> = new Map();

  constructor(events: any[]) {
    this.events = events;
  }

  on(event: string, handler: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
  }

  async finalMessage() {
    // Simulate streaming
    for (const event of this.events) {
      const handlers = this.listeners.get('streamEvent') || [];
      handlers.forEach(h => h(event));
      await sleep(1); // Simulate network delay
    }

    return {
      content: this.buildContent()
    };
  }

  private buildContent() {
    // Build final message from events
    // ...implementation
  }
}
```

### 7.3 Test Utilities

```typescript
// tests/utils/capture-output.ts
export function captureConsoleOutput(fn: () => Promise<void>): Promise<string> {
  const originalWrite = process.stdout.write;
  const originalLog = console.log;
  let output = '';

  process.stdout.write = (chunk: any) => {
    output += chunk.toString();
    return true;
  };

  console.log = (...args: any[]) => {
    output += args.join(' ') + '\n';
  };

  return fn()
    .finally(() => {
      process.stdout.write = originalWrite;
      console.log = originalLog;
    })
    .then(() => output);
}

// tests/utils/performance.ts
export async function measureStreamingTime(
  deltaCount: number,
  withReasoning: boolean
): Promise<number> {
  const agent = createTestAgent({ reasoning: withReasoning });
  const events = createMockEvents(deltaCount, withReasoning);

  const start = performance.now();
  await agent.processStreamEvents(events);
  return performance.now() - start;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

## 8. Continuous Integration

### 8.1 CI Test Pipeline

```yaml
# .github/workflows/test.yml
name: Test Chapter 7

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Run unit tests
        run: bun test tests/unit

      - name: Run integration tests
        run: bun test tests/integration

      - name: Run edge case tests
        run: bun test tests/edge-cases

      - name: Run performance benchmarks
        run: bun test tests/performance --threshold

      - name: Check code coverage
        run: bun test --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### 8.2 Coverage Requirements

```json
// jest.config.js or vitest.config.ts
{
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 85,
      "lines": 85,
      "statements": 85
    },
    "src/reasoning/*.ts": {
      "branches": 90,
      "functions": 95,
      "lines": 95,
      "statements": 95
    }
  }
}
```

---

## 9. Test Execution Plan

### Phase 1: Unit Tests (Week 1)
- Day 1-2: Reasoning parser tests
- Day 3-4: Visual formatter tests
- Day 5: Progressive disclosure tests

### Phase 2: Integration Tests (Week 2)
- Day 1-2: E2E reasoning display
- Day 3: Chapter 6 compatibility
- Day 4-5: Edge cases

### Phase 3: Performance & Manual (Week 3)
- Day 1-2: Performance benchmarks
- Day 3-4: Manual testing across platforms
- Day 5: Bug fixes and optimization

### Phase 4: CI & Documentation (Week 4)
- Day 1-2: CI pipeline setup
- Day 3: Test documentation
- Day 4-5: Final validation and release prep

---

## 10. Success Criteria

### Functional
- ✅ All unit tests pass (>95% coverage)
- ✅ All integration tests pass
- ✅ All edge cases handled gracefully
- ✅ Chapter 6 features remain intact

### Performance
- ✅ Streaming overhead <50ms
- ✅ Formatting time <10ms per block
- ✅ Memory increase <10MB for typical session
- ✅ No memory leaks in long sessions

### User Experience
- ✅ Reasoning displays clearly in all terminals
- ✅ Progressive disclosure works smoothly
- ✅ No visual glitches or artifacts
- ✅ Positive user feedback from beta testing

### Quality
- ✅ 90%+ test coverage for reasoning code
- ✅ All manual test scenarios pass
- ✅ CI pipeline passes consistently
- ✅ Documentation complete and accurate

---

## 11. Risk Mitigation

### High Risk Items

1. **Performance Degradation**
   - Risk: Reasoning adds latency to streaming
   - Mitigation: Strict performance benchmarks, async processing
   - Fallback: Option to disable reasoning display

2. **Terminal Compatibility**
   - Risk: Rendering issues on some terminals
   - Mitigation: Extensive cross-platform testing
   - Fallback: Plain text mode for incompatible terminals

3. **Memory Leaks**
   - Risk: Large reasoning chains consume memory
   - Mitigation: Automatic cleanup, size limits
   - Fallback: Aggressive garbage collection

4. **User Confusion**
   - Risk: Reasoning clutters output
   - Mitigation: Progressive disclosure, clear formatting
   - Fallback: Configuration option to collapse all reasoning

---

## 12. Testing Tools & Dependencies

```json
{
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "jest": "^29.5.0",
    "vitest": "^1.0.0",
    "@testing-library/user-event": "^14.5.0",
    "playwright": "^1.40.0",
    "benchmark": "^2.1.4",
    "memwatch-next": "^0.3.0"
  }
}
```

---

## Appendix A: Test File Structure

```
tests/
├── unit/
│   ├── reasoning-parser.test.ts
│   ├── reasoning-formatter.test.ts
│   ├── progressive-disclosure.test.ts
│   └── reasoning-stream.test.ts
├── integration/
│   ├── reasoning-e2e.test.ts
│   ├── chapter6-compat.test.ts
│   └── multi-agent-reasoning.test.ts
├── edge-cases/
│   └── reasoning-edge-cases.test.ts
├── performance/
│   ├── reasoning-performance.test.ts
│   └── benchmark-config.ts
├── mocks/
│   ├── anthropic-client.ts
│   ├── readline.ts
│   └── console-output.ts
├── utils/
│   ├── capture-output.ts
│   ├── performance.ts
│   └── test-helpers.ts
└── fixtures/
    ├── reasoning-examples.json
    └── stream-events.json
```

---

## Appendix B: Example Test Data

```typescript
// tests/fixtures/reasoning-examples.json
{
  "simple": {
    "reasoning": "The user is asking a simple question.",
    "expected_format": "💭 The user is asking a simple question."
  },
  "multi_line": {
    "reasoning": "Step 1: Analyze request\nStep 2: Choose tool\nStep 3: Execute",
    "expected_lines": 3
  },
  "long": {
    "reasoning": "a".repeat(5000),
    "should_collapse": true
  },
  "with_code": {
    "reasoning": "Here's the logic:\n```js\nconst x = 1;\n```",
    "preserves_formatting": true
  }
}
```

---

*Document Version: 1.0.0*
*Last Updated: 2026-01-09*
*Owner: QA Testing Team*
