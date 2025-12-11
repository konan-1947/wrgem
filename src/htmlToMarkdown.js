/**
 * htmlToMarkdown - Convert HTML từ AI Studio sang markdown
 */

const TurndownService = require('turndown');

// Khởi tạo turndown service
const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-'
});

/**
 * Convert HTML sang markdown
 * @param {string} html - HTML string cần convert
 * @returns {string} Markdown string
 */
function htmlToMarkdown(html) {
    if (!html || typeof html !== 'string') {
        return '';
    }

    try {
        return turndownService.turndown(html);
    } catch (error) {
        console.error('Error converting HTML to markdown:', error);
        return html; // Fallback về HTML gốc nếu convert thất bại
    }
}

module.exports = htmlToMarkdown;
