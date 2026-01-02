/**
 * Console output utilities for conversation display.
 * Separate from logging - this is for user-facing chat output.
 */

const colors = {
    blue: "\x1b[94m",
    green: "\x1b[92m",
    reset: "\x1b[0m",
};

let claudeTurnStarted = false;

export const console_out = {
    /**
     * Print the welcome banner
     */
    banner(message: string): void {
        console.log(message);
        console.log();
    },

    /**
     * Print the user prompt prefix and wait for input
     */
    userPrompt(): void {
        process.stdout.write(`${colors.blue}You${colors.reset}: `);
    },

    /**
     * Print Claude's response. Only shows "Claude:" prefix once per turn.
     * Call finishClaudeTurn() when the turn is complete.
     */
    claude(text: string): void {
        if (!claudeTurnStarted) {
            console.log(`${colors.green}Claude${colors.reset}: ${text}`);
            claudeTurnStarted = true;
        } else {
            console.log(text);
        }
    },

    /**
     * Mark the end of Claude's turn (resets prefix tracking).
     * Call this after user input loop resumes.
     */
    finishClaudeTurn(): void {
        if (claudeTurnStarted) {
            console.log();
            claudeTurnStarted = false;
        }
    },

    /**
     * Print an error message
     */
    error(message: string): void {
        console.error(`Error: ${message}`);
    },
};
