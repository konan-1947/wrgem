export const suppressLogs = () => {
    const originalLog = console.log;
    console.log = () => { };
    return () => { console.log = originalLog; };
};
