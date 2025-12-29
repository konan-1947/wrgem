#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import ChatApp from './components/ChatApp.js';

const { createElement: h } = React;

let isExiting = false;
process.on('SIGINT', () => {
    if (!isExiting) {
        isExiting = true;
        setTimeout(() => process.exit(0), 500);
    }
});

console.clear();

render(h(ChatApp));
