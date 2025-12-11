/**
 * _waitForResponse - Đợi và lấy response từ AI Studio (markdown format)
 * @private
 * Dựa trên structure: .chat-turn-container > .turn-content > ms-cmark-node
 */

const htmlToMarkdown = require('./htmlToMarkdown');

async function _waitForResponse(message, options = {}) {
    return new Promise(async (resolve) => {
        let previousText = '';
        let noChangeCount = 0;
        const maxNoChange = 10;

        const checkInterval = setInterval(async () => {
            try {
                // Extract response HTML từ ms-cmark-node
                const responseData = await this.page.evaluate(() => {
                    // Tìm tất cả chat turn containers
                    const containers = document.querySelectorAll('.chat-turn-container');

                    if (containers.length > 0) {
                        // Lấy container cuối cùng (response mới nhất)
                        const lastContainer = containers[containers.length - 1];

                        // Lấy turn content
                        const turnContent = lastContainer.querySelector('.turn-content');

                        if (turnContent) {
                            // Tìm ms-cmark-node (component chứa markdown đã render)
                            const cmarkNode = turnContent.querySelector('ms-cmark-node');

                            if (cmarkNode) {
                                // Lấy HTML để convert sang markdown
                                const html = cmarkNode.innerHTML;
                                const textPreview = cmarkNode.textContent?.trim() || '';

                                // Check footer có like button không (response complete)
                                const footer = lastContainer.querySelector('.turn-footer');
                                const hasLikeButton = footer ? !!footer.querySelector('button[iconname="thumb_up"]') : false;

                                return { html, textPreview, hasFooter: hasLikeButton };
                            }
                        }
                    }

                    return { html: '', textPreview: '', hasFooter: false };
                });

                const currentHtml = responseData.html;
                const textPreview = responseData.textPreview;
                const hasFooter = responseData.hasFooter;

                // Check thay đổi
                if (currentHtml && currentHtml !== previousText && textPreview.length > 10) {
                    previousText = currentHtml;
                    noChangeCount = 0;

                    // Convert HTML sang markdown cho progress update
                    const markdown = htmlToMarkdown(currentHtml);

                    if (options.onUpdate && typeof options.onUpdate === 'function') {
                        options.onUpdate(markdown);
                    } else {
                        process.stdout.write(`\r← ${textPreview.substring(0, 100)}...`);
                    }
                } else if (currentHtml && currentHtml === previousText) {
                    noChangeCount++;

                    // Nếu có footer (like button) → response complete ngay
                    if (hasFooter || noChangeCount >= maxNoChange) {
                        clearInterval(checkInterval);

                        // Convert HTML sang markdown cho kết quả cuối
                        const finalMarkdown = htmlToMarkdown(currentHtml);

                        if (options.onComplete && typeof options.onComplete === 'function') {
                            options.onComplete(finalMarkdown);
                        }

                        resolve(finalMarkdown);
                    }
                }
            } catch (error) {
                // Ignore errors during polling
            }
        }, 500);
    });
}

module.exports = _waitForResponse;
