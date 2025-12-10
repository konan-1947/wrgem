const AIStudioClient = require('../index');
const readline = require('readline');

// Colors
const c = {
    reset: '\x1b[0m',
    dim: '\x1b[2m',
    bright: '\x1b[1m',
    gray: '\x1b[90m',
    white: '\x1b[37m',
    cyan: '\x1b[36m',
    yellow: '\x1b[33m'
};

// State management
const state = {
    currentConversation: null,   // { user: string, assistant: string, time: number }
    previousConversation: null,  // Lưu conversation cũ khi thinking
    mode: 'init',                // 'init' | 'ready' | 'thinking' | 'responding'
    thinkingTime: 0
};

// Get terminal size
function getTerminalSize() {
    return {
        height: process.stdout.rows || 24,
        width: process.stdout.columns || 80
    };
}

// Render current conversation
function renderConversation() {
    const size = getTerminalSize();
    const chatHeight = size.height - 2; // Reserve 2 lines for separator + input

    let lines = [];

    if (state.currentConversation) {
        // User message
        if (state.currentConversation.user) {
            lines.push(`${c.gray}>${c.reset} ${state.currentConversation.user}`);
            lines.push(''); // Blank line
        }

        // Assistant response
        if (state.currentConversation.assistant) {
            const responseLines = state.currentConversation.assistant.split('\n');
            responseLines.forEach((line, i) => {
                if (i === 0) {
                    lines.push(`${c.white}●${c.reset} ${line}`);
                } else {
                    lines.push(`  ${line}`);
                }
            });

            // Time if available
            if (state.currentConversation.time) {
                lines.push(`${c.dim}${state.currentConversation.time}s${c.reset}`);
            }
        }
    }

    // Pad with empty lines
    for (let i = lines.length; i < chatHeight; i++) {
        lines.push('');
    }

    // Print all lines
    for (let i = 0; i < chatHeight; i++) {
        console.log(lines[i] || '');
    }
}

// STATE 1: Render init screen
function renderInit(statusText = 'Initializing...') {
    const size = getTerminalSize();
    console.clear();

    // Empty chat area
    for (let i = 0; i < size.height - 2; i++) {
        console.log('');
    }

    // Separator + status
    console.log(`${c.dim}${'─'.repeat(size.width)}${c.reset}`);
    console.log(`${c.dim}${statusText}${c.reset}`);
}

// STATE 2: Render ready screen (waiting for input)
function renderReady() {
    const size = getTerminalSize();
    console.clear();

    // Current conversation (if any)
    renderConversation();

    // Separator + input prompt
    console.log(`${c.dim}${'─'.repeat(size.width)}${c.reset}`);
    process.stdout.write(`${c.cyan}>${c.reset} `);
}

// STATE 3: Render thinking screen (old conversation visible)
function renderThinking() {
    const size = getTerminalSize();
    console.clear();

    // Show previous conversation (before new question)
    const tempConv = state.currentConversation;
    state.currentConversation = state.previousConversation;
    renderConversation();
    state.currentConversation = tempConv;

    // Separator + thinking status
    console.log(`${c.dim}${'─'.repeat(size.width)}${c.reset}`);
    console.log(`${c.dim}Thinking... (${state.thinkingTime}s)${c.reset}`);
}

// STATE 4: Render responding screen (new conversation only)
function renderResponding() {
    const size = getTerminalSize();
    console.clear();

    // Only current conversation
    renderConversation();

    // Separator + thinking status
    console.log(`${c.dim}${'─'.repeat(size.width)}${c.reset}`);
    console.log(`${c.dim}Thinking... (${state.thinkingTime}s)${c.reset}`);
}

// Update thinking counter (only update bottom 2 lines)
function updateThinkingCounter() {
    const size = getTerminalSize();

    // Save cursor, move to separator line (2nd from bottom)
    process.stdout.write('\x1b7'); // Save cursor
    process.stdout.write(`\x1b[${size.height - 1};1H`); // Move to line height-1

    // Clear and render separator
    process.stdout.write('\x1b[K'); // Clear line
    process.stdout.write(`${c.dim}${'─'.repeat(size.width)}${c.reset}\n`);

    // Render thinking text
    process.stdout.write('\x1b[K'); // Clear line
    process.stdout.write(`${c.dim}Thinking... (${state.thinkingTime}s)${c.reset}`);

    // Restore cursor
    process.stdout.write('\x1b8');
}

// Init with loading
async function initWithLoading(client) {
    // Suppress logs
    const originalLog = console.log;
    const originalError = console.error;
    const originalStderr = process.stderr.write;

    console.log = () => { };
    console.error = () => { };
    process.stderr.write = () => { };

    // Show loading states
    state.mode = 'init';
    renderInit('Initializing...');
    await new Promise(r => setTimeout(r, 200));

    renderInit('Opening browser...');
    await new Promise(r => setTimeout(r, 200));

    renderInit('Accessing AI Studio...');
    const result = await client.init();

    renderInit('Ready!');
    await new Promise(r => setTimeout(r, 300));

    // Restore logs
    console.log = originalLog;
    console.error = originalError;
    process.stderr.write = originalStderr;

    return result;
}

// Request with status
async function requestWithStatus(client, userMessage) {
    // Suppress logs
    const originalLog = console.log;
    const originalError = console.error;
    const originalStderr = process.stderr.write;

    console.log = () => { };
    console.error = () => { };
    process.stderr.write = () => { };

    // Enter thinking mode (save old conversation)
    state.previousConversation = state.currentConversation;
    state.currentConversation = null;
    state.mode = 'thinking';
    state.thinkingTime = 0;

    const startTime = Date.now();
    renderThinking();

    // Update counter every second
    const thinkingInterval = setInterval(() => {
        state.thinkingTime = Math.floor((Date.now() - startTime) / 1000);
        updateThinkingCounter();
    }, 1000);

    // Đảm bảo thinking screen hiển thị ít nhất 500ms
    const minThinkingTime = 500;
    let canTransitionToResponding = false;
    setTimeout(() => {
        canTransitionToResponding = true;
    }, minThinkingTime);

    // Make request
    let isFirstUpdate = true;
    let pendingUpdate = null;
    const result = await client.request_aistudio(userMessage, {
        onUpdate: (text) => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            state.thinkingTime = elapsed;

            // First update: clear old conversation, show new
            if (isFirstUpdate) {
                isFirstUpdate = false;
                pendingUpdate = text;

                // Đợi đủ thời gian thinking trước khi chuyển sang responding
                const waitAndTransition = async () => {
                    if (!canTransitionToResponding) {
                        const timeElapsed = Date.now() - startTime;
                        const remainingTime = minThinkingTime - timeElapsed;
                        if (remainingTime > 0) {
                            await new Promise(r => setTimeout(r, remainingTime));
                        }
                    }

                    state.mode = 'responding';

                    // Create new conversation
                    state.currentConversation = {
                        user: userMessage,
                        assistant: pendingUpdate,
                        time: null
                    };

                    renderResponding();
                };

                waitAndTransition();
            } else {
                // Update assistant text
                if (state.currentConversation) {
                    state.currentConversation.assistant = text;
                    renderResponding();
                } else {
                    // Vẫn đang chờ transition, lưu text mới nhất
                    pendingUpdate = text;
                }
            }
        }
    });

    clearInterval(thinkingInterval);

    // Restore logs
    console.log = originalLog;
    console.error = originalError;
    process.stderr.write = originalStderr;

    return result;
}

// Main
async function main() {
    const client = new AIStudioClient();

    // Init
    const initResult = await initWithLoading(client);

    if (!initResult.success) {
        console.error(`Error: ${initResult.error.message}`);
        return;
    }

    // Enter ready mode
    state.mode = 'ready';
    renderReady();

    // Readline
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: ''
    });

    rl.on('line', async (input) => {
        const msg = input.trim();

        // Handle empty input
        if (!msg) {
            renderReady();
            return;
        }

        // Handle commands
        if (msg === 'exit' || msg === 'quit') {
            console.clear();
            console.log(`${c.dim}Goodbye${c.reset}`);
            rl.close();
            return;
        }

        if (msg === 'clear') {
            state.currentConversation = null;
            renderReady();
            return;
        }

        // Get response
        const startTime = Date.now();
        const result = await requestWithStatus(client, msg);

        // Process result
        if (result.success) {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);

            // Update time
            if (state.currentConversation) {
                state.currentConversation.time = elapsed;
            } else {
                // No streaming, create conversation now
                state.currentConversation = {
                    user: msg,
                    assistant: result.data,
                    time: elapsed
                };
            }
        } else {
            // Error
            state.currentConversation = {
                user: msg,
                assistant: `${c.yellow}⚠ ${result.error.message}${c.reset}`,
                time: null
            };
        }

        // Back to ready mode
        state.mode = 'ready';
        renderReady();
    });

    rl.on('close', () => {
        process.exit(0);
    });
}

// Handle Ctrl+C
process.on('SIGINT', () => {
    console.clear();
    console.log(`${c.dim}Goodbye${c.reset}`);
    process.exit(0);
});

main();
