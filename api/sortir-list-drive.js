// api/sortir-list-drive.js
// Vercel serverless function — lists files recursively from all subfolders
// of a public Google Drive folder, so structures like:
//   Root/
//     Kamera 1/  → file1.jpg, file2.nef
//     Kamera 3/  → file3.jpg
// are all returned as a flat list.

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

// Helper: fetch one page of Drive files with given query
async function driveList(q, pageToken = null) {
  const fields = 'nextPageToken,files(id,name,mimeType,parents,thumbnailLink)';
  let url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&key=${GOOGLE_API_KEY}&fields=${encodeURIComponent(fields)}&pageSize=1000&orderBy=name`;
  if (pageToken) url += `&pageToken=${pageToken}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Drive API error: ${res.status} ${await res.text()}`);
  return res.json();
}

// Recursively collect all image file IDs from a folder and its subfolders
async function collectFiles(folderId, depth = 0) {
  if (depth > 5) return []; // safety guard against infinite nesting

  const results = [];
  let pageToken = null;

  // 1. Get all items (files + subfolders) directly inside this folder
  do {
    const data = await driveList(`'${folderId}' in parents and trashed = false`, pageToken);
    const items = data.files || [];

    for (const item of items) {
      if (item.mimeType === 'application/vnd.google-apps.folder') {
        // Recurse into subfolder
        const subFiles = await collectFiles(item.id, depth + 1);
        results.push(...subFiles);
      } else {
        // It's a file — include it
        results.push(item);
      }
    }

    pageToken = data.nextPageToken || null;
  } while (pageToken);

  return results;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { folderId } = req.query;

  if (!folderId) {
    return res.status(400).json({ error: 'Missing folderId parameter' });
  }

  if (!GOOGLE_API_KEY) {
    return res.status(500).json({ error: 'Server misconfiguration: GOOGLE_API_KEY not set' });
  }

  try {
    const files = await collectFiles(folderId);

    // Return only image-like files (filter out docs, spreadsheets, etc.)
    const imageExts = /\.(jpg|jpeg|png|gif|webp|heic|tif|tiff|cr2|cr3|nef|arw|dng|raf|rw2|orf|raw)$/i;
    const imageFiles = files.filter(f =>
      imageExts.test(f.name) ||
      (f.mimeType && f.mimeType.startsWith('image/'))
    );

    return res.status(200).json(imageFiles);

  } catch (error) {
    console.error('List Drive recursive error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
