const PLATFORMS = {
  youtube:   { host: 'youtube86.p.rapidapi.com',         path: '/links',     method: 'POST' },
  tiktok:    { host: 'tik-tok2.p.rapidapi.com',          path: '/CHANGE_ME', method: 'GET', param: 'url' },
  instagram: { host: 'ig-downloader-api.p.rapidapi.com', path: '/CHANGE_ME', method: 'GET', param: 'url' },
  facebook:  { host: 'facebook17.p.rapidapi.com',        path: '/CHANGE_ME', method: 'GET', param: 'url' },
  twitter:   { host: 'twitter65.p.rapidapi.com',         path: '/CHANGE_ME', method: 'GET', param: 'url' },
};

function detect(u) {
  if (/youtu\.?be/.test(u)) return 'youtube';
  if (/tiktok\.com/.test(u)) return 'tiktok';
  if (/instagram\.com/.test(u)) return 'instagram';
  if (/facebook\.com|fb\.watch/.test(u)) return 'facebook';
  if (/twitter\.com|x\.com/.test(u)) return 'twitter';
  return null;
}

function collect(node, out) {
  if (Array.isArray(node)) return node.forEach(n => collect(n, out));
  if (node && typeof node === 'object') {
    const u = node.url || node.link || node.download_url;
    if (typeof u === 'string' && /^https?:/.test(u)) {
      out.push({ url: u, label: [node.quality, node.qualityLabel, node.format, node.ext, node.type].filter(Boolean).join(' ') || 'Download' });
    }
    Object.values(node).forEach(v => collect(v, out));
  } else if (typeof node === 'string' && /^https?:.*(\.mp4|\.mp3|\.m4a|googlevideo|video)/i.test(node)) {
    out.push({ url: node, label: 'Download' });
  }
}

export default async function handler(req, res) {
  const { url } = req.query;
  const key = detect(url || '');
  if (!key) return res.status(400).json({ error: 'Unsupported or missing URL' });
  const p = PLATFORMS[key];
  const headers = { 'x-rapidapi-key': process.env.RAPIDAPI_KEY, 'x-rapidapi-host': p.host };
  try {
    let r;
    if (p.method === 'POST') {
      headers['Content-Type'] = 'application/json';
      r = await fetch(`https://${p.host}${p.path}`, { method: 'POST', headers, body: JSON.stringify({ url }) });
    } else {
      r = await fetch(`https://${p.host}${p.path}?${p.param}=${encodeURIComponent(url)}`, { headers });
    }
    const data = await r.json();
    const links = [];
    collect(data, links);
    const seen = new Set();
    const unique = links.filter(l => !seen.has(l.url) && seen.add(l.url));
    res.status(200).json({ platform: key, links: unique, raw: unique.length ? undefined : data });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
