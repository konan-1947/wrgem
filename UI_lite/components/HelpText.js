import React from 'react';
import { Box, Text } from 'ink';

const { createElement: h } = React;

const HelpText = () => {
    return h(Box, { marginTop: 1, paddingX: 1 },
        h(Text, { dimColor: true }, 'Enter để gửi • "exit" thoát • "clear" xóa')
    );
};

export default HelpText;
