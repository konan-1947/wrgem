import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';

const { createElement: h } = React;

/**
 * Component hiển thị trạng thái thinking với animation
 */
const ThinkingIndicator = ({ elapsedTime }) => {
    return h(Box, null,
        h(Text, { dimColor: true },
            h(Spinner, { type: 'dots' }),
            ` Thinking... (${elapsedTime}s)`
        )
    );
};

export default ThinkingIndicator;
