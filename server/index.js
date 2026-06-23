import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const app = express();
const PORT = process.env.PORT || 8443;

app.use(express.static(publicDir));

app.post('/api/stylize', upload.single('image'), async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(503).json({ error: 'AI service not configured', fallback: true });
  }

  try {
    const prompt = req.body.prompt || 'The Garden forest oasis fine dining scene';
    const imageBuffer = req.file?.buffer;

    if (!imageBuffer) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const base64 = imageBuffer.toString('base64');
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        response_format: 'b64_json',
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('OpenAI error:', err);
      return res.status(502).json({ error: 'AI generation failed', fallback: true });
    }

    const data = await response.json();
    const b64 = data.data?.[0]?.b64_json;

    if (!b64) {
      return res.status(502).json({ error: 'No image returned', fallback: true });
    }

    res.json({ imageUrl: `data:image/png;base64,${b64}` });
  } catch (err) {
    console.error('Stylize error:', err);
    res.status(500).json({ error: 'Internal error', fallback: true });
  }
});

function createServer() {
  const certPath = path.join(process.env.HOME, '.garden-certs', 'cert.pem');
  const keyPath = path.join(process.env.HOME, '.garden-certs', 'key.pem');

  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    const options = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
    return https.createServer(options, app);
  }

  console.warn('SSL certs not found — running HTTP on port 8080 (camera requires HTTPS on mobile)');
  return http.createServer(app);
}

const server = createServer();
const listenPort = server instanceof https.Server ? PORT : 8080;

server.listen(listenPort, '0.0.0.0', () => {
  const protocol = server instanceof https.Server ? 'https' : 'http';
  console.log(`The Garden running at ${protocol}://0.0.0.0:${listenPort}/`);
});
