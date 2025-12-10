#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import App from './components/App.js';

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    process.exit(0);
});

// Render the app
render(React.createElement(App));
