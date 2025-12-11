import React from 'react';
import { Box, Text } from 'ink';
import { processText } from '../utils/textProcessor.js';

const { createElement: h } = React;

const Message = ({ message, index }) => {
    const { text: processedText, urls } = processText(message.content);

    return h(Box, { key: index, flexDirection: 'column', marginBottom: 2, width: '100%' },
        h(Text, {
            bold: true,
            color: message.role === 'user' ? '#00d9ff' : '#ff00ff'
        }, message.role === 'user' ? 'Bạn' : 'AI'),
        h(Box, { width: '100%', flexDirection: 'column' },
            h(Text, { wrap: 'wrap' }, processedText),
            urls.length > 0 && h(Box, { flexDirection: 'column', marginTop: 1 },
                urls.map((url, idx) =>
                    h(Text, {
                        key: idx,
                        dimColor: true,
                        color: 'cyan'
                    }, `[${idx + 1}] ${url}`)
                )
            )
        )
    );
};

export default Message;
