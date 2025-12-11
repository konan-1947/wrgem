export const processText = (text) => {
    if (!text) return { text: '', urls: [] };

    const urls = [];
    let urlIndex = 0;

    let processed = text.replace(/(https?:\/\/[^\s\)]+)/g, (url) => {
        urlIndex++;
        urls.push(url);
        return `[${urlIndex}]`;
    });

    processed = processed.replace(/\[\[\d+\]\]/g, '');

    return { text: processed, urls };
};
