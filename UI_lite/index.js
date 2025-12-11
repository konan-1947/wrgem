#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import ChatApp from './components/ChatApp.js';

const { createElement: h } = React;

process.on('SIGINT', () => process.exit(0));

console.clear();

render(h(ChatApp));
