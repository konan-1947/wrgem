/**
 * initFromFile - Khởi tạo từ session đã lưu
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const { getDefaultUserDataDir } = require('./utils');
const _checkIfLoggedIn = require('./_checkIfLoggedIn');

puppeteer.use(StealthPlugin());

async function initFromFile(options = {}) {
    const headless = options.headless !== undefined ? options.headless : true;
    const userDataDir = options.userDataDir || getDefaultUserDataDir();

    if (!fs.existsSync(userDataDir)) {
        throw new Error('Chưa có user data. Vui lòng chạy init_aistudio() trước.');
    }

    console.log('=> Đang mở browser (headless)...');

    this.browser = await puppeteer.launch({
        headless: headless,
        userDataDir: userDataDir,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-features=IsolateOrigins,site-per-process'
        ],
        defaultViewport: {
            width: 1280,
            height: 800
        }
    });

    this.page = await this.browser.newPage();
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    console.log('=> Đang truy cập AI Studio...');
    await this.page.goto('https://aistudio.google.com/prompts/new_chat?model=gemini-2.5-pro', { waitUntil: 'networkidle2' });

    // Toggle device mode
    const client = await this.page.target().createCDPSession();
    await client.send('Emulation.setDeviceMetricsOverride', {
        width: 375,
        height: 667,
        deviceScaleFactor: 2,
        mobile: true
    });
    await this.page.waitForTimeout(500);
    await client.send('Emulation.clearDeviceMetricsOverride');

    // Đợi UI load
    try {
        await this.page.waitForSelector('textarea', { timeout: 10000 });
    } catch (e) {
        await this.page.reload({ waitUntil: 'networkidle2' });
        await this.page.waitForSelector('textarea', { timeout: 10000 });
    }
    await this.page.waitForTimeout(2000);

    const isLoggedIn = await _checkIfLoggedIn.call(this);
    if (!isLoggedIn) {
        throw new Error('Session đã hết hạn. Vui lòng chạy lại init_aistudio()');
    }

    console.log('✓ Khởi tạo từ session thành công (headless mode)');
    return true;
}

module.exports = initFromFile;
