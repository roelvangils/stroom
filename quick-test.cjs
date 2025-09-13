const { chromium } = require('@playwright/test');

async function quickTest() {
  console.log('🚀 Quick test of Stroom deployment\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Test GitHub Pages
  console.log('Testing GitHub Pages: https://roelvangils.github.io/stroom/');

  try {
    await page.goto('https://roelvangils.github.io/stroom/', { waitUntil: 'networkidle', timeout: 30000 });

    // Check if recordings.json loads
    const recordingsData = await page.evaluate(async () => {
      const response = await fetch('./recordings.json');
      const data = await response.json();
      return { status: response.status, count: data.length };
    });
    console.log(`✅ recordings.json loaded: ${recordingsData.count} items`);

    // Check if cards load
    await page.waitForSelector('.card', { timeout: 10000 });
    const cardCount = await page.$$eval('.card', cards => cards.length);
    console.log(`✅ ${cardCount} cards loaded`);

    // Check audio URLs
    const audioCheck = await page.evaluate(() => {
      const card = document.querySelector('.card');
      const audioFile = card?.dataset.audio;
      if (!audioFile) return { error: 'No audio data' };

      // Build the URL
      const baseUrl = window.location.href.replace(/\/$/, '');
      const audioUrl = `${baseUrl}/recordings/${audioFile}`;

      return { audioFile, audioUrl };
    });

    console.log(`📂 First audio file: ${audioCheck.audioFile}`);
    console.log(`📍 URL: ${audioCheck.audioUrl}`);

    // Test if audio file is accessible
    const audioResponse = await page.evaluate(async (url) => {
      const response = await fetch(url, { method: 'HEAD' });
      return {
        status: response.status,
        contentType: response.headers.get('content-type')
      };
    }, audioCheck.audioUrl);

    if (audioResponse.status === 200) {
      console.log(`✅ Audio accessible (${audioResponse.contentType})`);
    } else {
      console.log(`❌ Audio not accessible (status: ${audioResponse.status})`);
    }

    // Click first card
    await page.click('.card:first-child');
    await page.waitForTimeout(2000);

    // Check for audio errors
    const hasAudioError = await page.evaluate(() => {
      const audio = document.querySelector('audio');
      return audio?.error ? audio.error.message || audio.error.code : null;
    });

    if (hasAudioError) {
      console.log(`❌ Audio error: ${hasAudioError}`);
    } else {
      console.log('✅ No audio errors');
    }

    // Check background
    const bgActive = await page.evaluate(() => {
      const layer1 = document.getElementById('bg-layer-1');
      const layer2 = document.getElementById('bg-layer-2');
      return layer1?.classList.contains('active') || layer2?.classList.contains('active');
    });
    console.log(bgActive ? '✅ Background active' : '❌ Background not active');

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }

  await browser.close();
  console.log('\n✨ Test complete!');
}

quickTest().catch(console.error);