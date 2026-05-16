const cloudinary = require('cloudinary').v2;
const axios      = require('axios');
const { Readable } = require('stream');

/* =========================
   CLOUDINARY CONFIG
========================= */

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


/* =========================
   EXTRACT PUBLIC_ID
   From a Cloudinary URL like:
   https://res.cloudinary.com/demo/image/upload/v123/idc/filename.jpg
   → returns "idc/filename"
========================= */

function extractPublicId(cloudinaryUrl) {
  if (!cloudinaryUrl || !cloudinaryUrl.includes('res.cloudinary.com')) return null;

  try {
    const url   = new URL(cloudinaryUrl);
    // pathname: /demo/image/upload/v1234567/idc/filename.jpg
    const parts = url.pathname.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return null;

    // skip the version segment (starts with 'v' + digits) if present
    let afterUpload = parts.slice(uploadIndex + 1);
    if (/^v\d+$/.test(afterUpload[0])) {
      afterUpload = afterUpload.slice(1);
    }

    // join and strip extension
    const withExt = afterUpload.join('/');
    return withExt.replace(/\.[^/.]+$/, '');   // "idc/filename"
  } catch {
    return null;
  }
}


/* =========================
   DELETE FROM CLOUDINARY
   Safe — logs warning if URL
   is not a Cloudinary URL.
========================= */

async function deleteFromCloudinary(imageUrl) {
  const publicId = extractPublicId(imageUrl);
  if (!publicId) return;   // not a Cloudinary URL — nothing to delete

  try {
    await cloudinary.uploader.destroy(publicId);
    console.log(`🗑️  Cloudinary deleted: ${publicId}`);
  } catch (err) {
    console.warn(`Cloudinary delete failed (${publicId}):`, err.message);
  }
}


/* =========================
   EXTRACT DRIVE FILE ID
========================= */

function extractDriveId(url) {
  if (!url) return null;

  const matchA = url.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
  if (matchA) return matchA[1];

  const matchB = url.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (matchB) return matchB[1];

  return null;
}


/* =========================
   EXTRACT CONFIRM TOKEN
========================= */

function extractConfirmToken(html) {
  const match = html.match(/confirm=([0-9A-Za-z_-]+)/);
  return match ? match[1] : null;
}


/* =========================
   UPLOAD BUFFER → CLOUDINARY
========================= */

function uploadBufferToCloudinary(buffer, folder = 'idc') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (err, result) => {
        if (err) return reject(err);
        resolve(result.secure_url);
      }
    );
    Readable.from(buffer).pipe(stream);
  });
}


/* =========================
   FETCH DIRECT URL → BUFFER
========================= */

async function fetchBuffer(url) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout:      25000,
    maxRedirects: 5,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0',
    },
  });
  return {
    buffer:      Buffer.from(response.data),
    contentType: response.headers['content-type'] || 'image/jpeg',
  };
}


/* =========================
   UPLOAD URL → CLOUDINARY
   Handles Drive links + any
   direct image URL.
========================= */

async function uploadImageFromUrl(imageUrl) {
  if (!imageUrl || imageUrl.trim() === '') return '';

  const driveId = extractDriveId(imageUrl);

  if (!driveId) {
    try {
      const { buffer } = await fetchBuffer(imageUrl);
      return await uploadBufferToCloudinary(buffer);
    } catch (err) {
      console.error('Direct upload to Cloudinary failed:', err.message);
      return '';
    }
  }

  const downloadUrl =
    `https://drive.google.com/uc?export=download&id=${driveId}`;

  try {
    const response = await axios.get(downloadUrl, {
      responseType: 'arraybuffer',
      timeout:      25000,
      maxRedirects: 5,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0',
      },
    });

    const contentType = response.headers['content-type'] || '';

    if (contentType.includes('text/html')) {
      const html    = Buffer.from(response.data).toString('utf-8');
      const confirm = extractConfirmToken(html);

      if (!confirm) {
        console.warn(`Drive ID ${driveId}: No confirm token — file may be private.`);
        return '';
      }

      const confirmedUrl =
        `https://drive.google.com/uc?export=download&id=${driveId}&confirm=${confirm}`;

      const { buffer } = await fetchBuffer(confirmedUrl);
      return await uploadBufferToCloudinary(buffer);
    }

    return await uploadBufferToCloudinary(Buffer.from(response.data));

  } catch (err) {
    console.error(`Drive → Cloudinary failed (ID: ${driveId}):`, err.message);
    return '';
  }
}


/* =========================
   UPLOAD MULTER FILE
========================= */

async function uploadMulterFileToCloudinary(file) {
  if (!file) return '';
  try {
    return await uploadBufferToCloudinary(file.buffer, 'idc');
  } catch (err) {
    console.error('Multer → Cloudinary failed:', err.message);
    return '';
  }
}


module.exports = {
  uploadImageFromUrl,
  uploadMulterFileToCloudinary,
  deleteFromCloudinary,
};
