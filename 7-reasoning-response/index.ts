import Anthropic from "@anthropic-ai/sdk";
import { Command } from "commander";
import * as readline from "readline/promises";
import { console_reasoning } from "./console-reasoning";
import { logger } from "../logger";
import { Agent } from "./agent";
import { BashToolDefinition } from "./tools/bash_tool";
import { EditFileToolDefinition } from "./tools/edit_tool";
import { ListFilesToolDefinition } from "./tools/list_files";
import { ReadFileToolDefinition } from "./tools/read_file";
import { GrepToolDefinition } from "./tools/grep";

async function main() {
    const program = new Command();
    program
        .option("-v, --verbose", "Enable verbose logging")
        .option("--no-thinking", "Disable extended thinking/reasoning visualization")
        .option("--collapse-reasoning", "Collapse reasoning blocks by default")
        .parse(process.argv);

    const options = program.opts();
    const verbose = !!options.verbose;
    const enableThinking = options.thinking !== false;
    const collapseReasoning = !!options.collapseReasoning;

    if (verbose) {
        logger.level = "debug";
        logger.debug({
            enableThinking,
            collapseReasoning
        }, "Starting Chapter 7 agent");
    }

    const client = new Anthropic();

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const tools = [
        ListFilesToolDefinition,
        ReadFileToolDefinition,
        BashToolDefinition,
        EditFileToolDefinition,
        GrepToolDefinition
    ];

    const agent = new Agent(client, rl, tools, {
        verbose,
        enableThinking,
        collapseReasoning,
    });

    try {
        await agent.run();
    } catch (err) {
        console_reasoning.error(err instanceof Error ? err.message : String(err));
    } finally {
        rl.close();
    }
}

main().catch((err) => {
    console_reasoning.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
});
