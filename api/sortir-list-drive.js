// api/sortir-list-drive.js
// Vercel serverless function to list files from a public Google Drive folder securely.

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.MIDTRANS_SERVER_KEY; // Fallback or direct key

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { folderId } = req.query;

  if (!folderId) {
    return res.status(400).json({ error: 'Missing folderId parameter' });
  }

  // We check if GOOGLE_API_KEY is configured. If not, we can warn.
  // We will call Google Drive API files.list endpoint.
  // It fetches files that are in the parent folder, not trashed, and are images/folders.
  const fields = "files(id,name,mimeType,thumbnailLink,size,createdTime)";
  const q = `'${folderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&key=${GOOGLE_API_KEY}&fields=${encodeURIComponent(fields)}&pageSize=1000&orderBy=name`;

  try {
    const driveRes = await fetch(url);
    if (!driveRes.ok) {
      const errText = await driveRes.text();
      console.error('Google Drive API Error Response:', errText);
      return res.status(driveRes.status).json({ error: 'Failed to fetch files from Google Drive. Ensure the folder is public and shared.' });
    }

    const data = await driveRes.json();
    return res.status(200).json(data.files || []);

  } catch (error) {
    console.error('List Drive error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
