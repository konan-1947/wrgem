import React from 'react';
import { Box, Text, useStdout } from 'ink';

const { createElement: h } = React;

/**
 * Component hiển thị separator và status
 */
const StatusBar = ({ status, message, thinkingTime }) => {
    const { stdout } = useStdout();
    const width = stdout?.columns || 80;

    const getStatusMessage = () => {
        if (message) return message;

        switch (status) {
            case 'init':
                return 'Initializing...';
            case 'ready':
                return '';
            case 'thinking':
            case 'responding':
                return `Thinking... (${thinkingTime}s)`;
            case 'error':
                return 'Error occurred';
            default:
                return '';
        }
    };

    const statusMessage = getStatusMessage();
    const isError = status === 'error';

    return h(Box, { flexDirection: 'column' },
        h(Box, null,
            h(Text, { dimColor: true }, '─'.repeat(width))
        ),
        statusMessage && h(Box, null,
            h(Text, {
                color: isError ? 'red' : undefined,
                dimColor: !isError
            }, statusMessage)
        )
    );
};

export default StatusBar;
