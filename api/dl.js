import { Readable } from 'stream';
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  const { u, name } = req.query;
  let host;
  try { host = new URL(u).hostname; } catch { return res.status(400).end('bad url'); }
  if (!/\.googlevideo\.com$/.test(host)) return res.status(400).end('host not allowed');
  try {
    const r = await fetch(u);
    if (!r.ok) return res.status(502).end('upstream ' + r.status);
    const fname = (name || 'download').replace(/[\\/:*?"<>|]+/g, '_');
    res.setHeader('Content-Type', r.headers.get('content-type') || 'application/octet-stream');
    const len = r.headers.get('content-length');
    if (len) res.setHeader('Content-Length', len);
    res.setHeader('Content-Disposition', `attachment; filename="download"; filename*=UTF-8''${encodeURIComponent(fname)}`);
    Readable.fromWeb(r.body).pipe(res);
  } catch (e) {
    res.status(500).end(String(e));
  }
}
