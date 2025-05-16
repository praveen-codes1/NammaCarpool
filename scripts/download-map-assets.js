import { mkdir } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import https from 'https';
import { createWriteStream } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MARKER_FILES = {
  'marker-icon.png': 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  'marker-icon-2x.png': 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  'marker-shadow.png': 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
};

const downloadFile = (url, path) => {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }
      const fileStream = createWriteStream(path);
      response.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });
    }).on('error', reject);
  });
};

async function downloadMapAssets() {
  const markersDir = join(__dirname, '../public/map-markers');
  
  try {
    // Create markers directory if it doesn't exist
    await mkdir(markersDir, { recursive: true });
    
    // Download all marker files
    for (const [filename, url] of Object.entries(MARKER_FILES)) {
      const filePath = join(markersDir, filename);
      console.log(`Downloading ${filename}...`);
      await downloadFile(url, filePath);
    }
    
    console.log('Map assets downloaded successfully!');
  } catch (error) {
    console.error('Error downloading map assets:', error);
    process.exit(1);
  }
}

downloadMapAssets(); 