const YT = 'youtube86.p.rapidapi.com';
const H = (host) => ({ 'x-rapidapi-key': process.env.RAPIDAPI_KEY, 'x-rapidapi-host': host });

// ផ្សេងពី YouTube៖ បំពេញ path ពិតពី RapidAPI
const OTHERS = {
  tiktok:    { host: 'tik-tok2.p.rapidapi.com',          path: '/CHANGE_ME', param: 'url' },
  instagram: { host: 'ig-downloader-api.p.rapidapi.com', path: '/CHANGE_ME', param: 'url' },
  facebook:  { host: 'facebook17.p.rapidapi.com',        path: '/CHANGE_ME', param: 'url' },
  twitter:   { host: 'twitter65.p.rapidapi.com',         path: '/CHANGE_ME', param: 'url' },
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
    if (typeof u === 'string' && /^https?:/.test(u) && !/\.(jpg|jpeg|png|webp)(\?|$)|ytimg/i.test(u)) {
      out.push({ url: u, label: [node.quality, node.format, node.ext, node.type].filter(Boolean).join(' ') || 'Download' });
    }
    Object.values(node).forEach(v => collect(v, out));
  }
}

export default async function handler(req, res) {
  const { url } = req.query;
  const key = detect(url || '');
  if (!key) return res.status(400).json({ error: 'Unsupported or missing URL' });
  try {
    if (key === 'youtube') {
      const r = await fetch(`https://${YT}/api/youtube/links`, {
        method: 'POST',
        headers: { ...H(YT), 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await r.json();
      const d = Array.isArray(data) ? data[0] : data;
      if (!d || !d.urls) return res.status(502).json({ error: 'API error ' + r.status + ': ' + JSON.stringify(data).slice(0,300) });
      const items = d.urls.map(u => ({
        label: `${u.name} ${u.subName || u.quality}`,
        ext: u.extension,
        audio: !!u.audio,
        bundle: !!u.isBundle,
        size: u.filesize || null,
        ...(u.url.startsWith('/') ? { convert: u.url } : { url: u.url }),
      }));
      return res.status(200).json({
        title: d.meta && d.meta.title,
        duration: d.meta && d.meta.duration,
        thumb: d.pictureUrl,
        items,
      });
    }
    const p = OTHERS[key];
    const r = await fetch(`https://${p.host}${p.path}?${p.param}=${encodeURIComponent(url)}`, { headers: H(p.host) });
    const data = await r.json();
    const links = [];
    collect(data, links);
    const seen = new Set();
    const items = links.filter(l => !seen.has(l.url) && seen.add(l.url)).map(l => ({
      label: l.label, url: l.url, bundle: true, audio: /mp3|m4a|audio/i.test(l.label + l.url),
    }));
    res.status(200).json({ items, raw: items.length ? undefined : data });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
