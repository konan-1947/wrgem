import React from 'react';
import { Box, Text } from 'ink';
import chalk from 'chalk';

const { createElement: h } = React;

/**
 * Component hiển thị một tin nhắn
 */
const Message = ({ role, content, time }) => {
    const isUser = role === 'user';
    const icon = isUser ? chalk.gray('>') : chalk.white('●');
    const lines = content.split('\n');

    return h(Box, { flexDirection: 'column', marginBottom: 1 },
        lines.map((line, index) =>
            h(Box, { key: index },
                index === 0
                    ? h(Text, null, `${icon} ${line}`)
                    : h(Text, null, `  ${line}`)
            )
        ),
        !isUser && time !== null && h(Box, null,
            h(Text, { dimColor: true }, `${time}s`)
        )
    );
};

export default Message;
