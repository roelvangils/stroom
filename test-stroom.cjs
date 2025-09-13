const { chromium } = require('@playwright/test');

async function testStroom(url, name) {
  console.log(`\n📍 Testing ${name}: ${url}`);
  console.log('='.repeat(50));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Capture console logs
  const consoleLogs = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleLogs.push(`❌ Console Error: ${msg.text()}`);
    }
  });

  try {
    // Navigate to the app
    console.log('📱 Loading page...');
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    console.log(`✅ Page loaded (status: ${response.status()})`);

    // Check recordings.json loads
    console.log('\n📂 Checking recordings.json...');
    const recordingsResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('./recordings.json');
        const data = await response.json();
        return {
          status: response.status,
          count: data.length,
          first: data[0]?.name || 'none'
        };
      } catch (e) {
        return { error: e.message };
      }
    });

    if (recordingsResponse.error) {
      console.log(`❌ recordings.json failed: ${recordingsResponse.error}`);
    } else {
      console.log(`✅ recordings.json loaded: ${recordingsResponse.count} recordings`);
      console.log(`   First recording: ${recordingsResponse.first}`);
    }

    // Wait for cards to load
    console.log('\n🎵 Checking cards...');
    await page.waitForSelector('.card', { timeout: 10000 });
    const cards = await page.$$('.card');
    console.log(`✅ Found ${cards.length} cards`);

    // Check each card's data
    const cardData = await page.evaluate(() => {
      const cards = document.querySelectorAll('.card');
      return Array.from(cards).map(card => ({
        audio: card.dataset.audio,
        backgroundImage: card.dataset.backgroundImage,
        hasImage: !!card.querySelector('img'),
        imageSrc: card.querySelector('img')?.src
      }));
    });

    console.log('\n📋 Card details:');
    cardData.forEach((card, i) => {
      console.log(`   Card ${i + 1}:`);
      console.log(`   - Audio: ${card.audio || '❌ missing'}`);
      console.log(`   - Background: ${card.backgroundImage || '❌ missing'}`);
      console.log(`   - Image: ${card.hasImage ? '✅' : '❌'} ${card.imageSrc || ''}`);
    });

    // Test audio loading for first card
    if (cards.length > 0) {
      console.log('\n🔊 Testing audio playback...');

      // Check if audio files are accessible
      const audioUrls = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.card')).map(card => {
          const audioFile = card.dataset.audio;
          if (audioFile) {
            // Construct the full URL based on current location
            const baseUrl = window.location.href.replace(/\/$/, '');
            return `${baseUrl}/recordings/${audioFile}`;
          }
          return null;
        }).filter(Boolean);
      });

      // Test first audio URL
      if (audioUrls.length > 0) {
        const audioUrl = audioUrls[0];
        console.log(`   Testing audio URL: ${audioUrl}`);

        const audioResponse = await page.evaluate(async (url) => {
          try {
            const response = await fetch(url, { method: 'HEAD' });
            return {
              status: response.status,
              contentType: response.headers.get('content-type')
            };
          } catch (e) {
            return { error: e.message };
          }
        }, audioUrl);

        if (audioResponse.error) {
          console.log(`   ❌ Audio fetch failed: ${audioResponse.error}`);
        } else {
          console.log(`   ✅ Audio accessible (status: ${audioResponse.status}, type: ${audioResponse.contentType})`);
        }
      }

      // Click first card to test playback
      console.log('\n🎮 Clicking first card...');
      await cards[0].click();
      await page.waitForTimeout(2000);

      // Check if background is applied
      const bgState = await page.evaluate(() => {
        const layer1 = document.getElementById('bg-layer-1');
        const layer2 = document.getElementById('bg-layer-2');
        return {
          layer1: {
            background: layer1.style.backgroundImage,
            hasActive: layer1.classList.contains('active')
          },
          layer2: {
            background: layer2.style.backgroundImage,
            hasActive: layer2.classList.contains('active')
          }
        };
      });

      console.log('\n🖼️ Background state:');
      console.log(`   Layer 1: ${bgState.layer1.hasActive ? 'active' : 'inactive'} - ${bgState.layer1.background || 'no image'}`);
      console.log(`   Layer 2: ${bgState.layer2.hasActive ? 'active' : 'inactive'} - ${bgState.layer2.background || 'no image'}`);

      // Check for audio errors
      const audioErrors = await page.evaluate(() => {
        const errors = [];
        document.querySelectorAll('audio').forEach(audio => {
          if (audio.error) {
            errors.push({
              src: audio.src,
              error: audio.error.message || audio.error.code
            });
          }
        });
        return errors;
      });

      if (audioErrors.length > 0) {
        console.log('\n❌ Audio errors detected:');
        audioErrors.forEach(err => {
          console.log(`   ${err.src}: ${err.error}`);
        });
      } else {
        console.log('\n✅ No audio errors detected');
      }
    }

    // Check console errors
    if (consoleLogs.length > 0) {
      console.log('\n⚠️ Console errors:');
      consoleLogs.forEach(log => console.log(`   ${log}`));
    }

    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.log(`\n❌ Test failed: ${error.message}`);
  } finally {
    await browser.close();
  }
}

async function runTests() {
  console.log('🚀 Starting Stroom tests...\n');

  // Test local version
  await testStroom('http://localhost:5173', 'Local Development');

  // Wait for GitHub Pages deployment to complete
  console.log('\n⏳ Waiting 60 seconds for GitHub Pages deployment...');
  await new Promise(resolve => setTimeout(resolve, 60000));

  // Test GitHub Pages version
  await testStroom('https://roelvangils.github.io/stroom/', 'GitHub Pages');

  console.log('\n✨ All tests completed!');
}

runTests().catch(console.error);