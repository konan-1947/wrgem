/**
 * _waitForResponse - Đợi và lấy response từ AI Studio
 * @private
 * Dựa trên structure: .chat-turn-container > .turn-content > ms-cmark-node
 */

async function _waitForResponse(message, options = {}) {
    return new Promise(async (resolve) => {
        let previousText = '';
        let noChangeCount = 0;
        const maxNoChange = 10;

        const checkInterval = setInterval(async () => {
            try {
                // Extract response text
                const responseData = await this.page.evaluate(() => {
                    // Tìm tất cả chat turn containers
                    const containers = document.querySelectorAll('.chat-turn-container');

                    if (containers.length > 0) {
                        // Lấy container cuối cùng (response mới nhất)
                        const lastContainer = containers[containers.length - 1];

                        // Lấy turn content
                        const turnContent = lastContainer.querySelector('.turn-content');

                        if (turnContent) {
                            // Clone để không ảnh hưởng DOM
                            const clone = turnContent.cloneNode(true);

                            // Remove buttons
                            const buttons = clone.querySelectorAll('button');
                            buttons.forEach(el => el.remove());

                            // Remove thinking sections
                            const thinkingSections = clone.querySelectorAll('[class*="thinking"], [class*="thought"]');
                            thinkingSections.forEach(el => el.remove());

                            // Lấy text content
                            const text = clone.textContent?.trim() || '';

                            // Check footer có like button không (response complete)
                            const footer = lastContainer.querySelector('.turn-footer');
                            const hasLikeButton = footer ? !!footer.querySelector('button[iconname="thumb_up"]') : false;

                            return { text, hasFooter: hasLikeButton };
                        }
                    }

                    return { text: '', hasFooter: false };
                });

                const currentText = responseData.text;
                const hasFooter = responseData.hasFooter;

                // Check thay đổi
                if (currentText && currentText !== previousText && currentText.length > 10) {
                    previousText = currentText;
                    noChangeCount = 0;

                    if (options.onUpdate && typeof options.onUpdate === 'function') {
                        options.onUpdate(currentText);
                    } else {
                        process.stdout.write(`\r← ${currentText.substring(0, 100)}...`);
                    }
                } else if (currentText && currentText === previousText) {
                    noChangeCount++;

                    // Nếu có footer (like button) → response complete ngay
                    if (hasFooter || noChangeCount >= maxNoChange) {
                        clearInterval(checkInterval);

                        if (options.onComplete && typeof options.onComplete === 'function') {
                            options.onComplete(currentText);
                        }

                        resolve(currentText);
                    }
                }
            } catch (error) {
                // Ignore errors during polling
            }
        }, 500);
    });
}

module.exports = _waitForResponse;
