import React from 'react';
import { Box, Text } from 'ink';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { createElement: h } = React;

const Logo = () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const logoPath = path.join(__dirname, '..', 'logo');

    let logoText = '';
    try {
        logoText = fs.readFileSync(logoPath, 'utf-8');
    } catch (e) {
        logoText = 'WRGEM';
    }

    const lines = logoText.split('\n').filter(line => line.trim());

    const getColor = (i, total) => {
        const colors = ['#00d9ff', '#00c4e8', '#00afd1', '#009aba', '#00838f'];
        const index = Math.floor((i / (total - 1)) * (colors.length - 1));
        return colors[Math.min(index, colors.length - 1)];
    };

    return h(Box, { flexDirection: 'column' },
        lines.map((line, i) =>
            h(Text, {
                key: i,
                color: getColor(i, lines.length),
                bold: true
            }, line)
        )
    );
};

export default Logo;
