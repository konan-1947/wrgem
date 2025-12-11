import { useInput, useApp } from 'ink';

export const useInputHandler = ({ isInitialized, isLoading, input, setInput, setMessages, handleSubmit }) => {
    const { exit } = useApp();

    useInput((inputChar, key) => {
        if (!isInitialized || isLoading) return;

        if (key.return) {
            const text = input.trim();
            if (!text) return;

            if (text === 'exit' || text === 'quit') {
                exit();
                return;
            }

            if (text === 'clear') {
                setMessages([]);
                setInput('');
                return;
            }

            handleSubmit(text);
        } else if (key.backspace || key.delete) {
            setInput(prev => prev.slice(0, -1));
        } else if (inputChar && !key.ctrl && !key.meta) {
            setInput(prev => prev + inputChar);
        }
    });
};
