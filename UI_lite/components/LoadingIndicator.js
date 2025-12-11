import React from 'react';
import { Box, Text } from 'ink';
import AnimatedDots from './AnimatedDots.js';

const { createElement: h } = React;

const LoadingIndicator = ({ text }) => {
    return h(Box, {},
        h(Text, { color: 'yellow' }, `${text}`),
        h(AnimatedDots, { color: 'yellow' })
    );
};

export default LoadingIndicator;
