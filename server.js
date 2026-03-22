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
    const { q='', max=12, nicho='', subnicho='', idioma='', periodo='', videos='', order='relevance' } = req.query;

    // Build enriched query combining user input + nicho/subnicho filters
    const parts = [];
    if (q.trim()) parts.push(q.trim());
    if (subnicho) parts.push(subnicho);
    else if (nicho) parts.push(nicho);
    const finalQ = parts.join(' ') || 'videos';

    // Build URL params
    const params = new URLSearchParams({
      part: 'snippet',
      q: finalQ,
      maxResults: max,
      type: 'video',
      order,
    });

    // Language/region filter
    if (idioma) params.set('relevanceLanguage', idioma);

    // Duration filter
    if (videos === 'short')  params.set('videoDuration', 'short');
    if (videos === 'medium') params.set('videoDuration', 'medium');
    if (videos === 'long')   params.set('videoDuration', 'long');

    // Published after filter
    if (periodo) {
      const now = new Date();
      const map = {
        today:    1, week: 7, '2weeks': 14,
        month:    30, '3months': 90,
        '6months':180, year: 365,
      };
      const days = map[periodo];
      if (days) {
        const d = new Date(now - days * 864e5);
        params.set('publishedAfter', d.toISOString());
      }
    }

    const data = await poolFetch(POOLS.yt_main,
      `https://${POOLS.yt_main.host}/search?${params.toString()}`);
    res.json((data.items||[]).map(item => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.high?.url,
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


// ── Análise avançada de canal ─────────────────────────────────────────────────
app.get('/api/channel-deep', async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id obrigatorio' });

    const [chData, plData] = await Promise.all([
      poolFetch(POOLS.yt_main, `https://${POOLS.yt_main.host}/channels?part=snippet%2Cstatistics%2CbrandingSettings&id=${encodeURIComponent(id)}`),
      poolFetch(POOLS.yt_main, `https://${POOLS.yt_main.host}/channels?part=contentDetails&id=${encodeURIComponent(id)}`),
    ]);

    const ch = chData.items?.[0];
    if (!ch) return res.status(404).json({ error: 'Canal nao encontrado' });

    const playlistId = plData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    let videos = [];

    if (playlistId) {
      const plItems = await poolFetch(POOLS.yt_main,
        `https://${POOLS.yt_main.host}/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=20`);
      const ids = (plItems.items || []).map(i => i.snippet.resourceId.videoId).join(',');
      if (ids) {
        const vData = await poolFetch(POOLS.yt_main,
          `https://${POOLS.yt_main.host}/videos?part=snippet%2Cstatistics%2CcontentDetails&id=${ids}`);
        videos = (vData.items || []).map(v => ({
          videoId: v.id,
          title: v.snippet.title,
          thumbnail: v.snippet.thumbnails?.medium?.url,
          publishedAt: v.snippet.publishedAt,
          duration: v.contentDetails.duration,
          views: parseInt(v.statistics.viewCount || 0),
          likes: parseInt(v.statistics.likeCount || 0),
          comments: parseInt(v.statistics.commentCount || 0),
        }));
      }
    }

    const totalViews   = parseInt(ch.statistics.viewCount || 0);
    const videoCount   = parseInt(ch.statistics.videoCount || 1);
    const avgViewsPerVideo = Math.round(totalViews / videoCount);

    const engagements  = videos.map(v => v.views > 0 ? ((v.likes + v.comments) / v.views) * 100 : 0);
    const avgEngagement = engagements.length > 0
      ? (engagements.reduce((a,b) => a+b, 0) / engagements.length).toFixed(2) : '0';

    const bestVideo  = videos.reduce((b, v) => (!b || v.views > b.views) ? v : b, null);
    const worstVideo = videos.reduce((b, v) => (!b || v.views < b.views) ? v : b, null);

    let uploadFreqDays = null;
    if (videos.length >= 2) {
      const dates = videos.map(v => new Date(v.publishedAt)).sort((a,b) => b-a);
      const diffs = [];
      for (let i = 0; i < dates.length - 1; i++) diffs.push((dates[i]-dates[i+1])/(1000*60*60*24));
      uploadFreqDays = Math.round(diffs.reduce((a,b)=>a+b,0) / diffs.length);
    }

    const dayCount = {0:0,1:0,2:0,3:0,4:0,5:0,6:0};
    const hourBuckets = {};
    videos.forEach(v => {
      const d = new Date(v.publishedAt);
      dayCount[d.getDay()] = (dayCount[d.getDay()] || 0) + v.views;
      const h = d.getUTCHours();
      hourBuckets[h] = (hourBuckets[h] || 0) + v.views;
    });
    const bestDay  = Object.entries(dayCount).sort((a,b) => b[1]-a[1])[0]?.[0];
    const bestHour = Object.entries(hourBuckets).sort((a,b) => b[1]-a[1])[0]?.[0];
    const dayNames = ['Domingo','Segunda','Terca','Quarta','Quinta','Sexta','Sabado'];

    let trend = 'estavel';
    if (videos.length >= 4) {
      const half   = Math.floor(videos.length/2);
      const recent = videos.slice(0, half);
      const older  = videos.slice(half);
      const avgR   = recent.reduce((s,v)=>s+v.views,0)/recent.length;
      const avgO   = older.reduce((s,v)=>s+v.views,0)/older.length;
      const pct    = ((avgR-avgO)/avgO)*100;
      if (pct > 15)       trend = `crescendo ${pct.toFixed(0)}%`;
      else if (pct < -15) trend = `caindo ${Math.abs(pct).toFixed(0)}%`;
      else                trend = 'estavel';
    }

    res.json({
      id: ch.id, title: ch.snippet.title, description: ch.snippet.description,
      thumbnail: ch.snippet.thumbnails?.high?.url, country: ch.snippet.country,
      publishedAt: ch.snippet.publishedAt, subscribers: ch.statistics.subscriberCount,
      views: ch.statistics.viewCount, videoCount: ch.statistics.videoCount,
      avgViewsPerVideo, avgEngagement, uploadFreqDays,
      bestDay:  bestDay  !== undefined ? dayNames[bestDay]  : null,
      bestHour: bestHour !== undefined ? `${bestHour}h-${parseInt(bestHour)+2}h UTC` : null,
      trend, bestVideo, worstVideo, recentVideos: videos,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Engenharia reversa de vídeo ───────────────────────────────────────────────
app.get('/api/reverse-engineer', async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id obrigatorio' });

    const data = await poolFetch(POOLS.yt_main,
      `https://${POOLS.yt_main.host}/videos?part=snippet%2Cstatistics%2CcontentDetails&id=${encodeURIComponent(id)}`);
    const v = data.items?.[0];
    if (!v) return res.status(404).json({ error: 'Video nao encontrado' });

    const views    = parseInt(v.statistics.viewCount    || 0);
    const likes    = parseInt(v.statistics.likeCount    || 0);
    const comments = parseInt(v.statistics.commentCount || 0);
    const engagement  = views > 0 ? (((likes+comments)/views)*100).toFixed(2) : '0';
    const likeRatio   = views > 0 ? ((likes/views)*100).toFixed(2) : '0';
    const commentRatio= views > 0 ? ((comments/views)*100).toFixed(3) : '0';

    const title    = v.snippet.title;
    const titleLen = title.length;
    const hasNumber   = /\d+/.test(title);
    const hasYear     = /202[0-9]/.test(title);
    const hasQuestion = /\?/.test(title);
    const hasPowerWord= /melhor|pior|incrivel|segredo|nunca|sempre|como|por que|gratis|dinheiro|rico|viral|best|worst|secret|never|always|how|why|free|money|rich|amazing|shocking|exposed/i.test(title);
    const hasEmoji    = title.length !== Buffer.byteLength(title, 'utf8') / 1 && /[^\x00-\x7F]/.test(title);
    const titleWords  = title.split(' ').length;

    let titleScore = 50;
    if (titleLen >= 40 && titleLen <= 70) titleScore += 15;
    if (hasNumber)    titleScore += 10;
    if (hasYear)      titleScore += 5;
    if (hasQuestion)  titleScore += 10;
    if (hasPowerWord) titleScore += 15;
    if (hasEmoji)     titleScore += 5;
    if (titleWords >= 5 && titleWords <= 12) titleScore += 5;
    titleScore = Math.min(titleScore, 99);

    const durMatch = v.contentDetails.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    const totalSec = (parseInt(durMatch?.[1]||0)*3600)+(parseInt(durMatch?.[2]||0)*60)+parseInt(durMatch?.[3]||0);
    let durationTip = '';
    if      (totalSec < 60)   durationTip = 'Short/Reel — otimo para retencao e loop';
    else if (totalSec < 300)  durationTip = 'Video curto (1-5min) — alto CTR, monetizacao limitada';
    else if (totalSec < 900)  durationTip = 'Video medio (5-15min) — equilibrio ideal de retencao e ads';
    else if (totalSec < 1800) durationTip = 'Video longo (15-30min) — mais mid-rolls, boa monetizacao';
    else                      durationTip = 'Video muito longo (+30min) — nicho especifico, alto CPM potencial';

    const pubDate  = new Date(v.snippet.publishedAt);
    const dayNames = ['Domingo','Segunda','Terca','Quarta','Quinta','Sexta','Sabado'];
    const pubDay   = dayNames[pubDate.getDay()];
    const pubHour  = pubDate.getUTCHours();

    let viralScore = 0;
    if      (views > 1000000) viralScore += 30;
    else if (views > 100000)  viralScore += 20;
    else if (views > 10000)   viralScore += 10;
    if      (parseFloat(likeRatio) > 5)    viralScore += 20;
    else if (parseFloat(likeRatio) > 2)    viralScore += 10;
    if      (parseFloat(commentRatio) > 0.5) viralScore += 20;
    else if (parseFloat(commentRatio) > 0.1) viralScore += 10;
    viralScore += Math.round(titleScore * 0.3);
    viralScore = Math.min(viralScore, 99);

    const tags    = v.snippet.tags || [];
    const descLen = (v.snippet.description || '').length;

    res.json({
      id: v.id, title, channelTitle: v.snippet.channelTitle,
      thumbnail: v.snippet.thumbnails?.maxres?.url || v.snippet.thumbnails?.high?.url,
      publishedAt: v.snippet.publishedAt, duration: v.contentDetails.duration, totalSeconds: totalSec,
      views, likes, comments, engagement, likeRatio, commentRatio, viralScore,
      titleAnalysis: { score: titleScore, length: titleLen, wordCount: titleWords, hasNumber, hasYear, hasQuestion, hasPowerWord, hasEmoji },
      durationTip, pubDay, pubHour, tags, tagCount: tags.length, descriptionLength: descLen,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Fallback → index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`✅ Umbra rodando na porta ${PORT}`));
