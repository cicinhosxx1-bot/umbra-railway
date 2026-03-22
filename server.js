const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));   // serve index.html e app.js da raiz

// ═══════════════════════════════════════════
//  MULTI-POOL KEY SYSTEM
// ═══════════════════════════════════════════
const POOLS = {

  yt_main: {
    name: 'YT Data v3',
    host: 'youtube-v31.p.rapidapi.com',
    limit: 100,
    keys: [
      '3a0fadde0bmsh3bdc24f7b6b54a8p102809jsnc72915f2dfe3',
      'a9f40cd55fmsh2b14b1e8831dbf6p1bf01ajsnce33d14e2a2a',
      '76c0b8393bmshb33402a764932c6p1ce435jsn7b93b25736fe',
      'fe19f98d5amsh6f86a8298d1a5cfp127680jsn351cd3b79817',
      'd70b30e481msh7c765f83c46e76ep1bb4fcjsn47bca36f7068',
      '85466c35f7mshabef6384e4e762fp16f10bjsnfba494772ea6',
      'a9d81e2ec2msh22954d06397d760p19e80fjsn86484cb77421',
      '56f9db7b90msh569eae34c8423f1p1690dajsn1c05ee9a242c',
      '9c212f6cf1msh6914f929abe839dp1a34f3jsnb4a23bf18742',
      '4c1806ac4emsh392bb25fb4f9ea1p133f0djsned629ed0a0d0',
    ],
    idx: 0, usage: [], dead: [],
  },

  downloader: {
    name: 'Downloader',
    host: 'youtube-media-downloader.p.rapidapi.com',
    limit: 100,
    keys: [
      '3a0fadde0bmsh3bdc24f7b6b54a8p102809jsnc72915f2dfe3',
      'a9f40cd55fmsh2b14b1e8831dbf6p1bf01ajsnce33d14e2a2a',
      '76c0b8393bmshb33402a764932c6p1ce435jsn7b93b25736fe',
      '56f9db7b90msh569eae34c8423f1p1690dajsn1c05ee9a242c',
      'a9d81e2ec2msh22954d06397d760p19e80fjsn86484cb77421',
      '85466c35f7mshabef6384e4e762fp16f10bjsnfba494772ea6',
      'd70b30e481msh7c765f83c46e76ep1bb4fcjsn47bca36f7068',
      '4c1806ac4emsh392bb25fb4f9ea1p133f0djsned629ed0a0d0',
      '9c212f6cf1msh6914f929abe839dp1a34f3jsnb4a23bf18742',
      'fe19f98d5amsh6f86a8298d1a5cfp127680jsn351cd3b79817',
    ],
    idx: 0, usage: [], dead: [],
  },

  channel_videos: {
    name: 'Channel Videos',
    host: 'youtube-channel-videos.p.rapidapi.com',
    limit: 100,
    keys: [
      'a9f40cd55fmsh2b14b1e8831dbf6p1bf01ajsnce33d14e2a2a',
      '76c0b8393bmshb33402a764932c6p1ce435jsn7b93b25736fe',
      '56f9db7b90msh569eae34c8423f1p1690dajsn1c05ee9a242c',
      'a9d81e2ec2msh22954d06397d760p19e80fjsn86484cb77421',
      '3a0fadde0bmsh3bdc24f7b6b54a8p102809jsnc72915f2dfe3',
      '85466c35f7mshabef6384e4e762fp16f10bjsnfba494772ea6',
      'd70b30e481msh7c765f83c46e76ep1bb4fcjsn47bca36f7068',
      '4c1806ac4emsh392bb25fb4f9ea1p133f0djsned629ed0a0d0',
      '9c212f6cf1msh6914f929abe839dp1a34f3jsnb4a23bf18742',
      'fe19f98d5amsh6f86a8298d1a5cfp127680jsn351cd3b79817',
    ],
    idx: 0, usage: [], dead: [],
  },
};

Object.values(POOLS).forEach(p => {
  p.usage = new Array(p.keys.length).fill(0);
  p.dead  = new Array(p.keys.length).fill(false);
});

function poolAllDead(p) { return p.dead.every(Boolean); }

function poolRotate(p) {
  p.dead[p.idx] = true;
  for (let i = 1; i <= p.keys.length; i++) {
    const idx = (p.idx + i) % p.keys.length;
    if (!p.dead[idx]) { p.idx = idx; return true; }
  }
  return false;
}

function poolBump(p) {
  p.usage[p.idx]++;
  if (p.usage[p.idx] >= p.limit) poolRotate(p);
}

async function poolFetch(p, url) {
  if (poolAllDead(p)) throw new Error(`Pool "${p.name}" esgotado.`);
  let res = await fetch(url, {
    headers: { 'X-RapidAPI-Key': p.keys[p.idx], 'X-RapidAPI-Host': p.host }
  });
  if (res.status === 429) {
    console.warn(`[${p.name}] rate limited KEY_${p.idx + 1}, rotating...`);
    if (!poolRotate(p)) throw new Error(`Pool "${p.name}" esgotado.`);
    res = await fetch(url, {
      headers: { 'X-RapidAPI-Key': p.keys[p.idx], 'X-RapidAPI-Host': p.host }
    });
  }
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); msg = j?.message || j?.error?.message || j?.error || msg; } catch {}
    throw new Error(msg);
  }
  poolBump(p);
  return res.json();
}

// ═══════════════════════════════════════════
//  ROUTES
// ═══════════════════════════════════════════

app.get('/api/status', (req, res) => {
  res.json({ ok: true, pools: Object.entries(POOLS).map(([id, p]) => ({
    id, name: p.name, limit: p.limit,
    currentKey: p.idx + 1,
    currentUsage: p.usage[p.idx],
    totalUsage: p.usage.reduce((a, b) => a + b, 0),
    aliveKeys: p.dead.filter(d => !d).length,
    keys: p.keys.map((_, i) => ({ n: i+1, usage: p.usage[i], dead: p.dead[i], active: i === p.idx })),
  }))});
});

app.get('/api/resolve-channel', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'q obrigatorio' });
    if (/^UC[\w-]{21,}$/.test(q)) return res.json({ channelId: q });
    const data = await poolFetch(POOLS.yt_main,
      `https://${POOLS.yt_main.host}/search?part=snippet&q=${encodeURIComponent(q)}&type=channel&maxResults=1`);
    const channelId = data.items?.[0]?.id?.channelId;
    if (!channelId) return res.status(404).json({ error: `Canal "${q}" nao encontrado` });
    res.json({ channelId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/channel', async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id obrigatorio' });
    const data = await poolFetch(POOLS.yt_main,
      `https://${POOLS.yt_main.host}/channels?part=snippet%2Cstatistics%2CbrandingSettings&id=${encodeURIComponent(id)}`);
    const ch = data.items?.[0];
    if (!ch) return res.status(404).json({ error: 'Canal nao encontrado' });
    res.json({
      id: ch.id, title: ch.snippet.title, description: ch.snippet.description,
      thumbnail: ch.snippet.thumbnails?.high?.url, country: ch.snippet.country,
      publishedAt: ch.snippet.publishedAt, subscribers: ch.statistics.subscriberCount,
      views: ch.statistics.viewCount, videoCount: ch.statistics.videoCount,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/video', async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id obrigatorio' });
    const data = await poolFetch(POOLS.yt_main,
      `https://${POOLS.yt_main.host}/videos?part=snippet%2Cstatistics%2CcontentDetails&id=${encodeURIComponent(id)}`);
    const v = data.items?.[0];
    if (!v) return res.status(404).json({ error: 'Video nao encontrado' });
    const views = parseInt(v.statistics.viewCount||0), likes = parseInt(v.statistics.likeCount||0), comments = parseInt(v.statistics.commentCount||0);
    res.json({ id: v.id, title: v.snippet.title, thumbnail: v.snippet.thumbnails?.maxres?.url || v.snippet.thumbnails?.high?.url,
      channelTitle: v.snippet.channelTitle, publishedAt: v.snippet.publishedAt, duration: v.contentDetails.duration,
      views, likes, comments, engagement: views > 0 ? (((likes+comments)/views)*100).toFixed(2) : '0' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/channel-videos', async (req, res) => {
  try {
    const { id, max = 20 } = req.query;
    if (!id) return res.status(400).json({ error: 'id obrigatorio' });
    const chData = await poolFetch(POOLS.yt_main,
      `https://${POOLS.yt_main.host}/channels?part=contentDetails&id=${encodeURIComponent(id)}`);
    const playlistId = chData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!playlistId) return res.status(404).json({ error: 'Canal nao encontrado' });
    const plData = await poolFetch(POOLS.yt_main,
      `https://${POOLS.yt_main.host}/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=${max}`);
    const ids = (plData.items||[]).map(i => i.snippet.resourceId.videoId).join(',');
    if (!ids) return res.json([]);
    const vData = await poolFetch(POOLS.yt_main,
      `https://${POOLS.yt_main.host}/videos?part=snippet%2Cstatistics%2CcontentDetails&id=${ids}`);
    res.json((vData.items||[]).map(v => {
      const views=parseInt(v.statistics.viewCount||0), likes=parseInt(v.statistics.likeCount||0), comments=parseInt(v.statistics.commentCount||0);
      return { videoId: v.id, title: v.snippet.title, thumbnail: v.snippet.thumbnails?.medium?.url,
        publishedAt: v.snippet.publishedAt, duration: v.contentDetails.duration,
        views, likes, comments, engagement: views > 0 ? (((likes+comments)/views)*100).toFixed(2) : '0' };
    }));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/compare', async (req, res) => {
  try {
    const { a, b } = req.query;
    if (!a||!b) return res.status(400).json({ error: 'a e b obrigatorios' });
    const [dA, dB] = await Promise.all([
      poolFetch(POOLS.yt_main, `https://${POOLS.yt_main.host}/channels?part=snippet%2Cstatistics&id=${encodeURIComponent(a)}`),
      poolFetch(POOLS.yt_main, `https://${POOLS.yt_main.host}/channels?part=snippet%2Cstatistics&id=${encodeURIComponent(b)}`),
    ]);
    const map = ch => ({ id: ch.id, title: ch.snippet.title, thumbnail: ch.snippet.thumbnails?.high?.url,
      country: ch.snippet.country, subscribers: ch.statistics.subscriberCount,
      views: ch.statistics.viewCount, videoCount: ch.statistics.videoCount });
    const chA = dA.items?.[0], chB = dB.items?.[0];
    if (!chA||!chB) return res.status(404).json({ error: 'Canal nao encontrado' });
    res.json({ a: map(chA), b: map(chB) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/search', async (req, res) => {
  try {
    const { q, max = 12 } = req.query;
    if (!q) return res.status(400).json({ error: 'q obrigatorio' });
    const data = await poolFetch(POOLS.yt_main,
      `https://${POOLS.yt_main.host}/search?part=snippet&q=${encodeURIComponent(q)}&maxResults=${max}&type=video&order=relevance`);
    res.json((data.items||[]).map(item => ({
      videoId: item.id.videoId, title: item.snippet.title,
      channelTitle: item.snippet.channelTitle, thumbnail: item.snippet.thumbnails?.high?.url,
      publishedAt: item.snippet.publishedAt,
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/trending', async (req, res) => {
  try {
    const { region = 'BR', max = 12 } = req.query;
    const data = await poolFetch(POOLS.yt_main,
      `https://${POOLS.yt_main.host}/videos?part=snippet%2Cstatistics&chart=mostPopular&regionCode=${region}&maxResults=${max}`);
    res.json((data.items||[]).map(v => ({
      videoId: v.id, title: v.snippet.title, channelTitle: v.snippet.channelTitle,
      thumbnail: v.snippet.thumbnails?.high?.url, views: v.statistics.viewCount,
      likes: v.statistics.likeCount, publishedAt: v.snippet.publishedAt,
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/download', async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id obrigatorio' });
    const data = await poolFetch(POOLS.downloader,
      `https://${POOLS.downloader.host}/v2/video/details?videoId=${encodeURIComponent(id)}`);
    const formats = [];
    (data.videos?.items||[]).slice(0,6).forEach(f => formats.push({ type:'video', quality:f.quality||f.qualityLabel||'?', ext:f.extension||'mp4', url:f.url, size:f.sizeText||null }));
    (data.audios?.items||[]).slice(0,3).forEach(f => formats.push({ type:'audio', quality:f.quality||f.bitrate||'audio', ext:f.extension||'mp3', url:f.url, size:f.sizeText||null }));
    res.json({ title: data.title, thumbnail: data.thumbnail?.url||data.thumbnails?.[0]?.url, duration: data.duration, formats });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Fallback → index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`✅ Umbra rodando na porta ${PORT}`));
