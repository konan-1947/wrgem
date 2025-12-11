#!/usr/bin/env node
import React, { useState, useEffect, useRef } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const AIStudioClient = require('../index.js');

const { createElement: h } = React;

// Animated dots component
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

// Logo component
const Logo = () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const logoPath = path.join(__dirname, 'logo');

    let logoText = '';
    try {
        logoText = fs.readFileSync(logoPath, 'utf-8');
    } catch (e) {
        logoText = 'WRGEM';
    }


    const lines = logoText.split('\n').filter(line => line.trim());

    // Tạo gradient động
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

// Tips component
const Tips = () => {
    return h(Box, { marginTop: 1 },
        h(Text, { dimColor: true }, 'Made by Konan')
    );
};

// Loading indicator
const LoadingIndicator = ({ text }) => {
    return h(Box, {},
        h(Text, { color: 'yellow' }, `${text}`),
        h(AnimatedDots, { color: 'yellow' })
    );
};

// Process text - extract URLs and replace with numbers
const processText = (text) => {
    if (!text) return { text: '', urls: [] };

    const urls = [];
    let urlIndex = 0;

    // Extract and replace URLs with [1], [2], etc
    let processed = text.replace(/(https?:\/\/[^\s\)]+)/g, (url) => {
        urlIndex++;
        urls.push(url);
        return `[${urlIndex}]`;
    });

    // Remove grounding citations that are already numbered like [[1]], [[2]]
    processed = processed.replace(/\[\[\d+\]\]/g, '');

    return { text: processed, urls };
};

const ChatApp = () => {
    const { exit } = useApp();
    const [client] = useState(() => new AIStudioClient());
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [status, setStatus] = useState('Đang khởi tạo');
    const [thinkingTime, setThinkingTime] = useState(0);
    const thinkingIntervalRef = useRef(null);

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
        setThinkingTime(0);

        // Start thinking timer
        thinkingIntervalRef.current = setInterval(() => {
            setThinkingTime(prev => prev + 1);
        }, 1000);

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
            if (thinkingIntervalRef.current) {
                clearInterval(thinkingIntervalRef.current);
                thinkingIntervalRef.current = null;
            }
            setIsLoading(false);
            restore();
        }
    };

    return h(Box, { flexDirection: 'column' },
        // Spacer to push content down and cover warnings
        h(Box, { height: 12 }),

        // Logo - always visible
        h(Box, { paddingX: 1 },
            h(Logo)
        ),

        // Tips - only show when not initialized or no messages
        (!isInitialized || messages.length === 0) && h(Box, { paddingX: 1, marginTop: 1 },
            h(Tips)
        ),

        // Loading status during init - with border
        !isInitialized && h(Box, {
            borderStyle: 'round',
            borderColor: 'yellow',
            paddingX: 1,
            marginX: 1,
            marginTop: 1
        },
            h(LoadingIndicator, { text: status })
        ),

        // Messages area
        isInitialized && h(Box, { flexDirection: 'column', marginTop: 2, paddingX: 1, width: '100%' },
            messages.slice(-6).map((msg, i) => {
                const { text: processedText, urls } = processText(msg.content);

                return h(Box, { key: i, flexDirection: 'column', marginBottom: 2, width: '100%' },
                    h(Text, {
                        bold: true,
                        color: msg.role === 'user' ? '#00d9ff' : '#ff00ff'
                    }, msg.role === 'user' ? 'Bạn' : 'AI'),
                    h(Box, { width: '100%', flexDirection: 'column' },
                        h(Text, { wrap: 'wrap' }, processedText),
                        // Show URLs list if any
                        urls.length > 0 && h(Box, { flexDirection: 'column', marginTop: 1 },
                            urls.map((url, idx) =>
                                h(Text, {
                                    key: idx,
                                    dimColor: true,
                                    color: 'cyan'
                                }, `[${idx + 1}] ${url}`)
                            )
                        )
                    )
                );
            })
        ),

        // Input box with status
        isInitialized && h(Box, {
            borderStyle: 'round',
            borderColor: isLoading ? 'yellow' : '#00d9ff',
            paddingX: 1,
            marginX: 1,
            marginTop: 1,
            justifyContent: 'space-between'
        },
            h(Box, { flexGrow: 1 },
                isLoading
                    ? h(Box, {},
                        h(Text, { color: 'yellow' }, `Thinking in ${thinkingTime}s`),
                        h(AnimatedDots, { color: 'yellow' })
                    )
                    : h(Text, null, `> ${input}${isInitialized ? '█' : ''}`)
            ),
            !isLoading && h(Text, {
                color: 'green',
                dimColor: true
            }, `(${status})`)
        ),

        // Help text
        isInitialized && h(Box, { marginTop: 1, paddingX: 1 },
            h(Text, { dimColor: true }, 'Enter để gửi • "exit" thoát • "clear" xóa')
        )
    );
};

// Handle Ctrl+C
process.on('SIGINT', () => process.exit(0));

// Clear terminal before rendering
console.clear();

// Render
render(h(ChatApp));
