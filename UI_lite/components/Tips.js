import React from 'react';
import { Box, Text } from 'ink';

const { createElement: h } = React;

const Tips = () => {
    return h(Box, { marginTop: 1 },
        h(Text, { dimColor: true }, 'Made by Konan')
    );
};

export default Tips;
