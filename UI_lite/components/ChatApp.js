import React from 'react';
import { Box } from 'ink';
import Logo from './Logo.js';
import Tips from './Tips.js';
import LoadingIndicator from './LoadingIndicator.js';
import Message from './Message.js';
import InputBox from './InputBox.js';
import HelpText from './HelpText.js';
import { useAIClient } from '../hooks/useAIClient.js';
import { useInputHandler } from '../hooks/useInputHandler.js';

const { createElement: h } = React;

const ChatApp = () => {
    const {
        messages,
        setMessages,
        input,
        setInput,
        isLoading,
        isInitialized,
        status,
        thinkingTime,
        handleSubmit
    } = useAIClient();

    useInputHandler({ isInitialized, isLoading, input, setInput, setMessages, handleSubmit });

    return h(Box, { flexDirection: 'column' },
        h(Box, { height: 12 }),

        h(Box, { paddingX: 1 },
            h(Logo)
        ),

        (!isInitialized || messages.length === 0) && h(Box, { paddingX: 1, marginTop: 1 },
            h(Tips)
        ),

        !isInitialized && h(Box, {
            borderStyle: 'round',
            borderColor: 'yellow',
            paddingX: 1,
            marginX: 1,
            marginTop: 1
        },
            h(LoadingIndicator, { text: status })
        ),

        isInitialized && h(Box, { flexDirection: 'column', marginTop: 2, paddingX: 1, width: '100%' },
            messages.slice(-6).map((msg, i) =>
                h(Message, { key: i, message: msg, index: i })
            )
        ),

        isInitialized && h(InputBox, {
            input,
            isLoading,
            thinkingTime,
            status,
            isInitialized
        }),

        isInitialized && h(HelpText)
    );
};

export default ChatApp;
