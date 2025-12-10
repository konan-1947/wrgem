/**
 * init_aistudio - Khởi tạo lần đầu
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const { getDefaultUserDataDir } = require('./utils');
const _checkIfLoggedIn = require('./_checkIfLoggedIn');
const _waitForEnter = require('./_waitForEnter');

puppeteer.use(StealthPlugin());

async function init_aistudio(options = {}) {
    const headless = options.headless !== undefined ? options.headless : false;
    const userDataDir = options.userDataDir || getDefaultUserDataDir();

    console.log('→ Đang mở browser với stealth mode...');

    if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
    }

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

    console.log('→ Đang truy cập AI Studio...');
    await this.page.goto('https://aistudio.google.com/prompts/new_chat', { waitUntil: 'networkidle2' });

    console.log('→ Toggle device mode để trigger UI...');
    const client = await this.page.target().createCDPSession();
    await client.send('Emulation.setDeviceMetricsOverride', {
        width: 375,
        height: 667,
        deviceScaleFactor: 2,
        mobile: true
    });
    await this.page.waitForTimeout(500);
    await client.send('Emulation.clearDeviceMetricsOverride');

    console.log('→ Đợi UI load...');
    try {
        await this.page.waitForSelector('textarea', { timeout: 10000 });
    } catch (e) {
        console.log('  ⚠️  Không thấy textarea, thử reload...');
        await this.page.reload({ waitUntil: 'networkidle2' });
        await this.page.waitForSelector('textarea', { timeout: 10000 });
    }
    await this.page.waitForTimeout(2000);

    const isLoggedIn = await _checkIfLoggedIn.call(this);

    if (!isLoggedIn) {
        console.log('\n⚠️  Vui lòng đăng nhập vào Google AI Studio trong browser!');
        console.log('   Nhấn Enter sau khi đăng nhập xong...');
        await _waitForEnter();

        const isLoggedInNow = await _checkIfLoggedIn.call(this);
        if (!isLoggedInNow) {
            throw new Error('Chưa đăng nhập thành công');
        }
    }

    console.log('✓ Đã đăng nhập thành công!');
    console.log('✓ Khởi tạo AI Studio Client V2 thành công');
    return true;
}

module.exports = init_aistudio;
