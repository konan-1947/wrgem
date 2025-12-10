import { useState, useEffect, useRef } from 'react';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const AIStudioClient = require('../../index.js');

/**
 * Hook quản lý AIStudio client và state
 * @returns {Object}
 */
const useAIStudio = () => {
    const [client] = useState(() => new AIStudioClient());
    const [isInitialized, setIsInitialized] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState([]);
    const [thinkingTime, setThinkingTime] = useState(0);
    const [error, setError] = useState(null);
    const [initStatus, setInitStatus] = useState('Initializing...');

    const thinkingIntervalRef = useRef(null);
    const thinkingStartRef = useRef(null);

    // Suppress console logs
    const suppressLogs = () => {
        const originalLog = console.log;
        const originalError = console.error;
        const originalStderr = process.stderr.write;

        console.log = () => { };
        console.error = () => { };
        process.stderr.write = () => { };

        return () => {
            console.log = originalLog;
            console.error = originalError;
            process.stderr.write = originalStderr;
        };
    };

    // Initialize client
    useEffect(() => {
        const initClient = async () => {
            const restore = suppressLogs();

            try {
                setInitStatus('Opening browser...');
                await new Promise(r => setTimeout(r, 200));

                setInitStatus('Accessing AI Studio...');
                const result = await client.init();

                if (result.success) {
                    setInitStatus('Ready!');
                    await new Promise(r => setTimeout(r, 300));
                    setIsInitialized(true);
                } else {
                    setError(result.error.message);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                restore();
            }
        };

        initClient();

        return () => {
            if (thinkingIntervalRef.current) {
                clearInterval(thinkingIntervalRef.current);
            }
        };
    }, []);

    // Send message
    const sendMessage = async (text) => {
        if (isLoading) return;

        setIsLoading(true);
        setError(null);
        setThinkingTime(0);

        const restore = suppressLogs();

        // Start thinking timer
        thinkingStartRef.current = Date.now();
        thinkingIntervalRef.current = setInterval(() => {
            const elapsed = Math.floor((Date.now() - thinkingStartRef.current) / 1000);
            setThinkingTime(elapsed);
        }, 1000);

        // Add user message
        const userMessage = { role: 'user', content: text, time: null };
        setMessages(prev => [...prev, userMessage]);

        // Sử dụng ref thay vì biến local để tránh closure issue
        const assistantMessageIndexRef = { current: null };
        const canShowResponseRef = { current: false };
        const pendingContentRef = { current: null };

        // Delay showing response (minimum 500ms thinking)
        setTimeout(() => {
            canShowResponseRef.current = true;
        }, 500);

        try {
            const startTime = Date.now();
            let isFirstUpdate = true;

            const result = await client.request_aistudio(text, {
                onUpdate: (content) => {
                    const elapsed = Math.floor((Date.now() - startTime) / 1000);
                    setThinkingTime(elapsed);

                    if (isFirstUpdate) {
                        isFirstUpdate = false;
                        pendingContentRef.current = content;

                        // Wait until we can show response
                        const waitAndShow = () => {
                            if (!canShowResponseRef.current) {
                                setTimeout(waitAndShow, 50);
                                return;
                            }

                            // Add assistant message
                            setMessages(prev => {
                                const newMessages = [...prev, {
                                    role: 'assistant',
                                    content: pendingContentRef.current,
                                    time: null
                                }];
                                assistantMessageIndexRef.current = newMessages.length - 1;
                                return newMessages;
                            });
                        };

                        waitAndShow();
                    } else {
                        // Update assistant message content
                        if (assistantMessageIndexRef.current !== null) {
                            setMessages(prev => {
                                const newMessages = [...prev];
                                if (assistantMessageIndexRef.current < newMessages.length) {
                                    newMessages[assistantMessageIndexRef.current] = {
                                        ...newMessages[assistantMessageIndexRef.current],
                                        content
                                    };
                                }
                                return newMessages;
                            });
                        } else {
                            // Still waiting for first message to be added, save to pending
                            pendingContentRef.current = content;
                        }
                    }
                }
            });

            // Update final time
            if (result.success) {
                const finalTime = Math.floor((Date.now() - startTime) / 1000);

                // Wait một chút để đảm bảo assistantMessageIndex đã được set
                await new Promise(r => setTimeout(r, 100));

                setMessages(prev => {
                    const newMessages = [...prev];
                    if (assistantMessageIndexRef.current !== null &&
                        assistantMessageIndexRef.current < newMessages.length) {
                        newMessages[assistantMessageIndexRef.current] = {
                            ...newMessages[assistantMessageIndexRef.current],
                            time: finalTime
                        };
                    } else if (assistantMessageIndexRef.current === null) {
                        // No streaming, add message now
                        newMessages.push({
                            role: 'assistant',
                            content: result.data,
                            time: finalTime
                        });
                    }
                    return newMessages;
                });
            } else {
                throw new Error(result.error.message);
            }
        } catch (err) {
            setError(err.message);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `⚠ ${err.message}`,
                time: null
            }]);
        } finally {
            if (thinkingIntervalRef.current) {
                clearInterval(thinkingIntervalRef.current);
                thinkingIntervalRef.current = null;
            }
            setIsLoading(false);
            restore();
        }
    };

    // Clear messages
    const clearMessages = () => {
        setMessages([]);
    };

    return {
        isInitialized,
        isLoading,
        error,
        initStatus,
        sendMessage,
        clearMessages,
        messages,
        thinkingTime
    };
};

export default useAIStudio;
