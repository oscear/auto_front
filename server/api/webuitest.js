const express = require('express');
const { chromium } = require('playwright');
const router = express.Router();

let browser;
let page;

router.post('/load-url', async (req, res) => {
  try {
    const { url, isRecording } = req.body;
    
    if (!browser) {
      browser = await chromium.launch({ headless: false });
      page = await browser.newPage();
    }
    
    await page.goto(url);
    
    if (isRecording) {
      // 设置监听器逻辑
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/stop-recording', async (req, res) => {
  try {
    if (page) await page.close();
    if (browser) await browser.close();
    browser = null;
    page = null;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;