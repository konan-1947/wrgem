#!/usr/bin/env node
import React, { useState, useEffect, useRef } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const AIStudioClient = require('../index.js');

const { createElement: h } = React;

const ChatApp = () => {
    const { exit } = useApp();
    const [client] = useState(() => new AIStudioClient());
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [status, setStatus] = useState('Đang khởi tạo...');

    // Suppress console logs
    const suppressLogs = () => {
        const originalLog = console.log;
        console.log = () => { };
        return () => { console.log = originalLog; };
    };

    // Initialize client
    useEffect(() => {
        const initClient = async () => {
            const restore = suppressLogs();
            try {
                const result = await client.init();
                if (result.success) {
                    setIsInitialized(true);
                    setStatus('Sẵn sàng');
                } else {
                    setStatus(`Lỗi: ${result.error.message}`);
                }
            } catch (err) {
                setStatus(`Lỗi: ${err.message}`);
            } finally {
                restore();
            }
        };
        initClient();
    }, []);

    // Handle input
    useInput((input, key) => {
        if (!isInitialized || isLoading) return;

        if (key.return) {
            handleSubmit();
        } else if (key.backspace || key.delete) {
            setInput(prev => prev.slice(0, -1));
        } else if (input && !key.ctrl && !key.meta) {
            setInput(prev => prev + input);
        }
    });

    // Handle submit
    const handleSubmit = async () => {
        const text = input.trim();
        if (!text) return;

        // Command handling
        if (text === 'exit' || text === 'quit') {
            exit();
            return;
        }

        if (text === 'clear') {
            setMessages([]);
            setInput('');
            return;
        }

        setInput('');
        setIsLoading(true);
        setStatus('Đang xử lý...');

        const restore = suppressLogs();

        // Add user message
        setMessages(prev => [...prev, { role: 'user', content: text }]);

        try {
            const result = await client.request_aistudio(text, {
                onUpdate: (content) => {
                    setMessages(prev => {
                        const lastMsg = prev[prev.length - 1];
                        if (lastMsg && lastMsg.role === 'assistant') {
                            return [...prev.slice(0, -1), { role: 'assistant', content }];
                        } else {
                            return [...prev, { role: 'assistant', content }];
                        }
                    });
                }
            });

            if (!result.success) {
                setMessages(prev => [...prev, { role: 'assistant', content: `⚠ ${result.error.message}` }]);
            }
            setStatus('Sẵn sàng');
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', content: `⚠ ${err.message}` }]);
            setStatus('Lỗi');
        } finally {
            setIsLoading(false);
            restore();
        }
    };

    return h(Box, { flexDirection: 'column', padding: 1 },
        // Header
        h(Box, { borderStyle: 'round', borderColor: 'cyan', paddingX: 1 },
            h(Text, { bold: true, color: 'cyan' }, '💬 AI Studio Chat')
        ),

        // Messages
        h(Box, { flexDirection: 'column', marginTop: 1, marginBottom: 1 },
            messages.slice(-10).map((msg, i) =>
                h(Box, { key: i, flexDirection: 'column', marginBottom: 1 },
                    h(Text, {
                        bold: true,
                        color: msg.role === 'user' ? 'green' : 'blue'
                    }, msg.role === 'user' ? '🧑 Bạn:' : '🤖 AI:'),
                    h(Text, null, msg.content)
                )
            )
        ),

        // Status line
        h(Box, { borderStyle: 'single', borderColor: 'gray', paddingX: 1 },
            h(Text, { color: isLoading ? 'yellow' : 'green' }, `${status}`)
        ),

        // Input box
        h(Box, { borderStyle: 'round', borderColor: isLoading ? 'gray' : 'green', paddingX: 1, marginTop: 1 },
            h(Text, null,
                isLoading
                    ? '⏳ Đang xử lý...'
                    : `> ${input}${isInitialized ? '█' : ''}`
            )
        ),

        // Help text
        h(Box, { marginTop: 1 },
            h(Text, { dimColor: true }, 'Enter để gửi • "exit" để thoát • "clear" để xóa')
        )
    );
};

// Handle Ctrl+C
process.on('SIGINT', () => process.exit(0));

// Render
render(h(ChatApp));
