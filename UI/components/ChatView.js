import React from 'react';
import { Box, Text } from 'ink';
import Message from './Message.js';

const { createElement: h, useMemo } = React;

/**
 * Component hiển thị danh sách messages với scrolling
 */
const ChatView = ({ messages = [], maxHeight }) => {
    // Chỉ hiển thị messages cuối cùng vừa với maxHeight
    const visibleMessages = useMemo(() => {
        if (!maxHeight || messages.length === 0) return messages;

        // Tính số dòng mỗi message chiếm (rough estimate)
        let totalLines = 0;
        const result = [];

        // Đi từ cuối lên để ưu tiên messages mới nhất
        for (let i = messages.length - 1; i >= 0; i--) {
            const msg = messages[i];
            const lines = msg.content.split('\n').length;
            const messageLines = lines + 2; // +2 cho spacing và time

            if (totalLines + messageLines <= maxHeight) {
                result.unshift(msg);
                totalLines += messageLines;
            } else {
                break;
            }
        }

        return result;
    }, [messages, maxHeight]);

    return h(Box, {
        flexDirection: 'column',
        height: maxHeight || undefined
    },
        visibleMessages.length === 0
            ? h(Box)
            : visibleMessages.map((msg, index) =>
                h(Message, {
                    key: index,
                    role: msg.role,
                    content: msg.content,
                    time: msg.time
                })
            )
    );
};

export default ChatView;
