/**
 * _waitForResponse - Đợi và lấy response từ AI Studio (markdown format)
 * @private
 * Dựa trên structure: .chat-turn-container > .turn-content > ms-cmark-node
 */

const htmlToMarkdown = require('./htmlToMarkdown');

async function _waitForResponse(message, options = {}) {
    return new Promise(async (resolve, reject) => {
        let previousText = '';
        let noChangeCount = 0;
        const maxNoChange = 10;
        let checkInterval = null;

        const cleanup = () => {
            if (checkInterval) {
                clearInterval(checkInterval);
                checkInterval = null;
            }
        };

        try {
            checkInterval = setInterval(async () => {
                try {
                    const responseData = await this.page.evaluate(() => {
                        const containers = document.querySelectorAll('.chat-turn-container');

                        if (containers.length > 0) {
                            const lastContainer = containers[containers.length - 1];
                            const turnContent = lastContainer.querySelector('.turn-content');

                            if (turnContent) {
                                const cmarkNode = turnContent.querySelector('ms-cmark-node');

                                if (cmarkNode) {
                                    const html = cmarkNode.innerHTML;
                                    const textPreview = cmarkNode.textContent?.trim() || '';
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

                    if (currentHtml && currentHtml !== previousText && textPreview.length > 0) {
                        if (previousText === '' && options.onStatus) {
                            options.onStatus('streaming');
                        }

                        previousText = currentHtml;
                        noChangeCount = 0;

                        const markdown = htmlToMarkdown(currentHtml);

                        if (options.onUpdate && typeof options.onUpdate === 'function') {
                            options.onUpdate(markdown);
                        } else {
                            process.stdout.write(`\r← ${textPreview.substring(0, 100)}...`);
                        }
                    } else if (currentHtml && currentHtml === previousText) {
                        noChangeCount++;

                        if (hasFooter || noChangeCount >= maxNoChange) {
                            cleanup();

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
        } catch (error) {
            cleanup();
            reject(error);
        }
    });
}

module.exports = _waitForResponse;
