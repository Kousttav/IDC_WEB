const axios = require('axios');
const fs    = require('fs');
const path  = require('path');

const uploadPath = path.join(__dirname, '../uploads');

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}


/* =========================
   EXTRACT DRIVE FILE ID
   Handles all Drive URL formats
========================= */

function extractDriveId(url) {
  if (!url) return null;

  // /file/d/FILE_ID/view  or  /d/FILE_ID/
  const matchA = url.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
  if (matchA) return matchA[1];

  // ?id=FILE_ID  or  &id=FILE_ID
  const matchB = url.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (matchB) return matchB[1];

  return null;
}


/* =========================
   EXTRACT CONFIRM TOKEN
   Google shows a warning page
   for large files — we parse
   the token from the HTML
========================= */

function extractConfirmToken(html) {
  // newer Drive warning pages use a form with "confirm" param
  const match = html.match(/confirm=([0-9A-Za-z_-]+)/);
  return match ? match[1] : null;
}


/* =========================
   SAVE BUFFER TO /uploads
========================= */

function saveBuffer(data, contentType) {
  const extMap = {
    'image/jpeg' : '.jpg',
    'image/jpg'  : '.jpg',
    'image/png'  : '.png',
    'image/webp' : '.webp',
    'image/gif'  : '.gif',
  };

  const mimeKey = (contentType || 'image/jpeg').split(';')[0].trim();
  const ext      = extMap[mimeKey] || '.jpg';
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  const filepath = path.join(uploadPath, filename);

  fs.writeFileSync(filepath, data);
  console.log(`✅ Image saved: ${filename}`);

  return `/uploads/${filename}`;
}


/* =========================
   DOWNLOAD ANY DIRECT URL
========================= */

async function downloadDirect(url) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 25000,
    maxRedirects: 5,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0',
    },
  });

  const contentType = response.headers['content-type'] || 'image/jpeg';
  return saveBuffer(response.data, contentType);
}


/* =========================
   MAIN EXPORT
   Accepts any Google Drive URL
   or a plain image URL.
   Returns local path like:
   /uploads/filename.jpg
   Returns '' on failure.
========================= */

async function downloadImageFromUrl(imageUrl) {
  if (!imageUrl || imageUrl.trim() === '') return '';

  const driveId = extractDriveId(imageUrl);

  /* ── Not a Drive link — download directly ── */
  if (!driveId) {
    try {
      return await downloadDirect(imageUrl);
    } catch (err) {
      console.error('Direct download failed:', err.message);
      return '';
    }
  }

  /* ── Google Drive link ── */
  const downloadUrl =
    `https://drive.google.com/uc?export=download&id=${driveId}`;

  try {
    const response = await axios.get(downloadUrl, {
      responseType: 'arraybuffer',
      timeout: 25000,
      maxRedirects: 5,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0',
      },
    });

    const contentType = response.headers['content-type'] || '';

    /* Google returned an HTML warning page (large file) */
    if (contentType.includes('text/html')) {
      const html    = Buffer.from(response.data).toString('utf-8');
      const confirm = extractConfirmToken(html);

      if (!confirm) {
        console.warn(
          `Drive ID ${driveId}: No confirm token — file may be private or restricted.`
        );
        return '';
      }

      /* Retry with confirmation token */
      const confirmedUrl =
        `https://drive.google.com/uc?export=download&id=${driveId}&confirm=${confirm}`;

      return await downloadDirect(confirmedUrl);
    }

    /* Got image bytes directly */
    return saveBuffer(response.data, contentType);

  } catch (err) {
    console.error(`Drive download failed (ID: ${driveId}):`, err.message);
    return '';
  }
}

module.exports = { downloadImageFromUrl };