const YT = 'youtube86.p.rapidapi.com';

function collect(node, out) {
  if (Array.isArray(node)) return node.forEach(n => collect(n, out));
  if (node && typeof node === 'object') {
    const u = node.url || node.link || node.download_url;
    if (typeof u === 'string' && /^https?:/.test(u) && !/\.(jpg|jpeg|png|webp)(\?|$)|ytimg/i.test(u)) out.push({ url: u });
    Object.values(node).forEach(v => collect(v, out));
  }
}

export default async function handler(req, res) {
  const { path } = req.query;
  if (!path || !path.startsWith('/convert?')) return res.status(400).json({ error: 'bad path' });
  try {
    const r = await fetch(`https://${YT}/api/youtube${path}`, {
      headers: { 'x-rapidapi-key': process.env.RAPIDAPI_KEY, 'x-rapidapi-host': YT },
    });
    const data = await r.json();
    const links = [];
    collect(data, links);
    const taskId = data.taskId || data.task_id || data.id || (data.data && (data.data.taskId || data.data.id));
    res.status(200).json({ taskId, links, raw: data });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
