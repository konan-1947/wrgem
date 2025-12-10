/**
 * _waitForEnter - Đợi user nhấn Enter
 * @private
 */

async function _waitForEnter() {
    return new Promise((resolve) => {
        process.stdin.once('data', () => {
            resolve();
        });
    });
}

module.exports = _waitForEnter;
