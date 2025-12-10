import React from 'react';
import { Box, Text } from 'ink';
import chalk from 'chalk';

const { createElement: h } = React;

const LOGO = `_ _ _ ___ ___ ___ _____ 
| | | |  _| . | -_|     |
|_____|_| |_  |___|_|_|_|
          |___|          `;

/**
 * Component hiển thị logo ASCII art
 */
const Logo = () => {
    return h(Box, { flexDirection: 'column', alignItems: 'center', marginBottom: 1 },
        ...LOGO.split('\n').map((line, index) =>
            h(Box, { key: index },
                h(Text, { color: 'cyan' }, line)
            )
        )
    );
};

export default Logo;
