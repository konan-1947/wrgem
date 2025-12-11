import React, { useState, useEffect } from 'react';
import { Text } from 'ink';

const { createElement: h } = React;

const AnimatedDots = ({ color = 'cyan' }) => {
    const [dots, setDots] = useState('');

    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => {
                if (prev.length >= 3) return '';
                return prev + '.';
            });
        }, 500);

        return () => clearInterval(interval);
    }, []);

    return h(Text, { color }, dots);
};

export default AnimatedDots;
