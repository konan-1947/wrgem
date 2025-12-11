import React from 'react';
import { Box, Text } from 'ink';
import AnimatedDots from './AnimatedDots.js';

const { createElement: h } = React;

const InputBox = ({ input, isLoading, thinkingTime, status, currentStatus, isInitialized }) => {
    return h(Box, {
        borderStyle: 'round',
        borderColor: isLoading ? 'yellow' : '#00d9ff',
        paddingX: 1,
        marginX: 1,
        marginTop: 1,
        justifyContent: 'space-between'
    },
        h(Box, { flexGrow: 1 },
            isLoading
                ? h(Box, {},
                    h(Text, { color: 'yellow' },
                        currentStatus
                            ? `(${thinkingTime}s) ${currentStatus}`
                            : `(${thinkingTime}s) Thinking`
                    ),
                    h(AnimatedDots, { color: 'yellow' })
                )
                : h(Text, null, `> ${input}${isInitialized ? '█' : ''}`)
        ),
        !isLoading && h(Text, {
            color: 'green',
            dimColor: true
        }, `(${status})`)
    );
};

export default InputBox;
