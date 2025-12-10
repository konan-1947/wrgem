import React from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';

const { createElement: h, useState } = React;

/**
 * Component input field với prompt
 */
const InputBox = ({ onSubmit, disabled = false, placeholder = 'Type a message...' }) => {
    const [value, setValue] = useState('');

    const handleSubmit = () => {
        if (!value.trim() || disabled) {
            return;
        }
        onSubmit(value.trim());
        setValue('');
    };

    // Handle Enter key
    useInput((input, key) => {
        if (key.return && !disabled) {
            handleSubmit();
        }
    });

    return h(Box, null,
        h(Text, { color: 'cyan' }, '> '),
        h(TextInput, {
            value,
            onChange: setValue,
            placeholder,
            isDisabled: disabled,
            showCursor: !disabled
        })
    );
};

export default InputBox;
