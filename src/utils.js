/**
 * Utils - Helper functions
 */

const path = require('path');
const os = require('os');

/**
 * Lấy default user data directory trong AppData
 */
function getDefaultUserDataDir() {
    const appDataPath = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    return path.join(appDataPath, 'rev-aistudio', 'chrome-session');
}

module.exports = {
    getDefaultUserDataDir
};
