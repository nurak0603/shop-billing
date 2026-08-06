import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
  if (!fs.existsSync('screenshots')) {
    fs.mkdirSync('screenshots');
  }

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 400, height: 800 });

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log('Capturing POS...');
  await page.goto('http://localhost:5173/');
  await sleep(2000);
  await page.screenshot({ path: 'screenshots/pos.png' });

  console.log('Capturing Inventory...');
  await page.goto('http://localhost:5173/inventory');
  await sleep(2000);
  await page.screenshot({ path: 'screenshots/inventory.png' });

  console.log('Capturing History...');
  await page.goto('http://localhost:5173/history');
  await sleep(2000);
  await page.screenshot({ path: 'screenshots/history.png' });

  console.log('Capturing Admin...');
  await page.goto('http://localhost:5173/admin');
  await sleep(1000);
  
  await page.type('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await sleep(2000);
  await page.screenshot({ path: 'screenshots/admin.png' });

  await browser.close();
  console.log('All screenshots captured!');
})();
