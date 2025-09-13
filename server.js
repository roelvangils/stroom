import express from 'express';
import { readdir } from 'fs/promises';
import { join, parse } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3001;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.get('/api/recordings', async (req, res) => {
  try {
    const recordingsPath = join(__dirname, 'public', 'recordings');
    const files = await readdir(recordingsPath);

    const recordings = {};

    files.forEach(file => {
      const { name, ext } = parse(file);

      // Check if this is a background image
      if (name.endsWith('_bg')) {
        const baseName = name.replace('_bg', '');
        if (!recordings[baseName]) {
          recordings[baseName] = { name: baseName };
        }
        recordings[baseName].backgroundImage = `/recordings/${file}`;
      } else if (ext === '.mp3') {
        if (!recordings[name]) {
          recordings[name] = { name };
        }
        recordings[name].audio = `/recordings/${file}`;
      } else if (['.jpg', '.jpeg', '.png'].includes(ext)) {
        if (!recordings[name]) {
          recordings[name] = { name };
        }
        recordings[name].image = `/recordings/${file}`;
      }
    });

    const recordingsList = Object.values(recordings).filter(r => r.audio && r.image);
    res.json(recordingsList);
  } catch (error) {
    console.error('Error reading recordings:', error);
    res.status(500).json({ error: 'Failed to read recordings' });
  }
});

app.listen(port, () => {
  console.log(`API server running at http://localhost:${port}`);
});