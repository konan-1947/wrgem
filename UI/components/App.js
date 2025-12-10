import React from 'react';
import { Box, useApp, useStdout } from 'ink';
import ChatView from './ChatView.js';
import InputBox from './InputBox.js';
import StatusBar from './StatusBar.js';
import useAIStudio from '../hooks/useAIStudio.js';

const { createElement: h } = React;

/**
 * Main App component với fixed layout
 */
const App = () => {
    const { exit } = useApp();
    const { stdout } = useStdout();
    const terminalHeight = stdout?.rows || 24;

    const {
        isInitialized,
        isLoading,
        error,
        initStatus,
        sendMessage,
        clearMessages,
        messages,
        thinkingTime
    } = useAIStudio();

    // Calculate chat area height
    // Terminal height - StatusBar (2 lines) - InputBox (1 line)
    const chatHeight = Math.max(terminalHeight - 3, 5);

    // Determine current status
    const getStatus = () => {
        if (!isInitialized) return 'init';
        if (error) return 'error';
        if (isLoading) return 'thinking';
        return 'ready';
    };

    const status = getStatus();

    // Handle input submit
    const handleSubmit = (value) => {
        // Handle commands
        if (value === 'exit' || value === 'quit') {
            exit();
            return;
        }

        if (value === 'clear') {
            clearMessages();
            return;
        }

        if (value.startsWith('/')) {
            // Future: handle custom commands
            return;
        }

        // Send message
        sendMessage(value);
    };

    // Show init screen
    if (!isInitialized) {
        return h(Box, { flexDirection: 'column', height: terminalHeight },
            h(Box, { flexGrow: 1 }),
            h(StatusBar, { status: 'init', message: initStatus })
        );
    }

    // Show main UI với fixed positions
    return h(Box, {
        flexDirection: 'column',
        height: terminalHeight,
        width: '100%'
    },
        // Chat area - fixed height, scrollable
        h(Box, {
            flexDirection: 'column',
            height: chatHeight,
            flexShrink: 0
        },
            h(ChatView, { messages, maxHeight: chatHeight })
        ),
        // Status bar - fixed at bottom
        h(Box, { flexShrink: 0 },
            h(StatusBar, {
                status,
                message: error,
                thinkingTime
            })
        ),
        // Input box - fixed at bottom
        h(Box, { flexShrink: 0 },
            h(InputBox, {
                onSubmit: handleSubmit,
                disabled: isLoading,
                placeholder: 'Type a message...'
            })
        )
    );
};

export default App;
