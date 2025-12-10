/**
 * _waitForResponse - Đợi và lấy response từ AI Studio
 * @private
 */

async function _waitForResponse(message, options = {}) {
    return new Promise(async (resolve) => {
        let previousText = '';
        let noChangeCount = 0;
        const maxNoChange = 10;

        const checkInterval = setInterval(async () => {
            try {
                const bodyText = await this.page.evaluate(() => document.body.innerText);

                const parts = bodyText.split(message);
                let currentText = '';

                if (parts.length > 1) {
                    currentText = parts[parts.length - 1].trim();
                    currentText = currentText.replace(/^Run\s*Ctrl\+Enter.*/, '').trim();
                }

                if (currentText && currentText !== previousText && currentText.length > 10) {
                    previousText = currentText;
                    noChangeCount = 0;

                    if (options.onUpdate && typeof options.onUpdate === 'function') {
                        options.onUpdate(currentText);
                    } else {
                        process.stdout.write(`\r← ${currentText.substring(0, 100)}...`);
                    }
                } else if (currentText) {
                    noChangeCount++;

                    if (noChangeCount >= maxNoChange) {
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
