import { useState, useEffect, useRef } from 'react';
import { createRequire } from 'module';
import { suppressLogs } from '../utils/logger.js';

const require = createRequire(import.meta.url);
const AIStudioClient = require('../../index.js');

export const useAIClient = () => {
    const [client] = useState(() => new AIStudioClient());
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [status, setStatus] = useState('Đang khởi tạo');
    const [currentStatus, setCurrentStatus] = useState('');
    const [thinkingTime, setThinkingTime] = useState(0);
    const thinkingIntervalRef = useRef(null);

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

    const handleSubmit = async (text) => {
        if (!text) return;

        setInput('');
        setIsLoading(true);
        setThinkingTime(0);

        thinkingIntervalRef.current = setInterval(() => {
            setThinkingTime(prev => prev + 1);
        }, 1000);

        const restore = suppressLogs();

        setMessages(prev => [...prev, { role: 'user', content: text }]);

        try {
            const result = await client.request_aistudio(text, {
                onStatus: (statusKey) => {
                    const statusMap = {
                        'reconnecting': 'Đang kết nối',
                        'finding_input': 'Tìm ô nhập',
                        'filling_message': 'Điền tin nhắn',
                        'sending_request': 'Gửi yêu cầu',
                        'waiting_response': 'Đợi phản hồi',
                        'streaming': 'Đang nhận'
                    };
                    setCurrentStatus(statusMap[statusKey] || statusKey);
                },
                onUpdate: (content) => {
                    setMessages(prev => {
                        const lastMsg = prev[prev.length - 1];
                        if (lastMsg && lastMsg.role === 'assistant') {
                            return [...prev.slice(0, -1), { role: 'assistant', content, responseTime: thinkingTime }];
                        } else {
                            return [...prev, { role: 'assistant', content, responseTime: thinkingTime }];
                        }
                    });
                }
            });

            if (!result.success) {
                setMessages(prev => [...prev, { role: 'assistant', content: `⚠ ${result.error.message}`, responseTime: thinkingTime }]);
            } else {
                // Update response time cho message cuối
                setMessages(prev => {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg && lastMsg.role === 'assistant') {
                        return [...prev.slice(0, -1), { ...lastMsg, responseTime: thinkingTime }];
                    }
                    return prev;
                });
            }
            setStatus('Sẵn sàng');
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', content: `⚠ ${err.message}`, responseTime: thinkingTime }]);
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

    return {
        client,
        messages,
        setMessages,
        input,
        setInput,
        isLoading,
        isInitialized,
        status,
        currentStatus,
        thinkingTime,
        handleSubmit
    };
};
