const express = require('express');
const cors    = require('cors');
const path    = require('path');
const app     = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ═══════════════════════════════════════════════════════
//  MULTI-POOL KEY SYSTEM
// ═══════════════════════════════════════════════════════
const POOLS = {
  yt_main: {
    name: 'YT Data v3', host: 'youtube-v31.p.rapidapi.com', limit: 100,
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
    name: 'Downloader', host: 'youtube-media-downloader.p.rapidapi.com', limit: 100,
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
};

Object.values(POOLS).forEach(p => {
  p.usage = new Array(p.keys.length).fill(0);
  p.dead  = new Array(p.keys.length).fill(false);
});

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
  if (p.dead.every(Boolean)) throw new Error(`Pool "${p.name}" esgotado.`);
  let res = await fetch(url, { headers: { 'X-RapidAPI-Key': p.keys[p.idx], 'X-RapidAPI-Host': p.host } });
  if (res.status === 429) {
    if (!poolRotate(p)) throw new Error(`Pool "${p.name}" esgotado.`);
    res = await fetch(url, { headers: { 'X-RapidAPI-Key': p.keys[p.idx], 'X-RapidAPI-Host': p.host } });
  }
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); msg = j?.message || j?.error?.message || j?.error || msg; } catch {}
    throw new Error(msg);
  }
  poolBump(p);
  return res.json();
}

// ═══════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════
function mapChannel(ch) {
  return {
    id: ch.id, title: ch.snippet.title, description: ch.snippet.description,
    thumbnail: ch.snippet.thumbnails?.high?.url, country: ch.snippet.country,
    publishedAt: ch.snippet.publishedAt, subscribers: ch.statistics.subscriberCount,
    views: ch.statistics.viewCount, videoCount: ch.statistics.videoCount,
  };
}
function mapVideo(v) {
  const views=parseInt(v.statistics.viewCount||0), likes=parseInt(v.statistics.likeCount||0), comments=parseInt(v.statistics.commentCount||0);
  return {
    id: v.id, title: v.snippet.title,
    thumbnail: v.snippet.thumbnails?.maxres?.url || v.snippet.thumbnails?.high?.url,
    channelTitle: v.snippet.channelTitle, publishedAt: v.snippet.publishedAt,
    duration: v.contentDetails?.duration, views, likes, comments,
    engagement: views>0?(((likes+comments)/views)*100).toFixed(2):'0',
    likeRatio: views>0?((likes/views)*100).toFixed(2):'0',
  };
}

// ═══════════════════════════════════════════════════════
//  ROUTES
// ═══════════════════════════════════════════════════════

// Status
app.get('/api/status', (req, res) => {
  res.json({ ok: true, pools: Object.entries(POOLS).map(([id,p]) => ({
    id, name: p.name, limit: p.limit, currentKey: p.idx+1,
    currentUsage: p.usage[p.idx], totalUsage: p.usage.reduce((a,b)=>a+b,0),
    aliveKeys: p.dead.filter(d=>!d).length,
    keys: p.keys.map((_,i)=>({ n:i+1, usage:p.usage[i], dead:p.dead[i], active:i===p.idx })),
  }))});
});

// Resolve @handle → channelId
app.get('/api/resolve-channel', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'q obrigatorio' });
    if (/^UC[\w-]{21,}$/.test(q)) return res.json({ channelId: q });
    const data = await poolFetch(POOLS.yt_main, `https://${POOLS.yt_main.host}/search?part=snippet&q=${encodeURIComponent(q)}&type=channel&maxResults=1`);
    const channelId = data.items?.[0]?.id?.channelId;
    if (!channelId) return res.status(404).json({ error: `Canal "${q}" nao encontrado` });
    res.json({ channelId });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Canal básico
app.get('/api/channel', async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id obrigatorio' });
    const data = await poolFetch(POOLS.yt_main, `https://${POOLS.yt_main.host}/channels?part=snippet%2Cstatistics&id=${encodeURIComponent(id)}`);
    const ch = data.items?.[0];
    if (!ch) return res.status(404).json({ error: 'Canal nao encontrado' });
    res.json(mapChannel(ch));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Canal deep analysis
app.get('/api/channel-deep', async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id obrigatorio' });
    const [chData, plData] = await Promise.all([
      poolFetch(POOLS.yt_main, `https://${POOLS.yt_main.host}/channels?part=snippet%2Cstatistics&id=${encodeURIComponent(id)}`),
      poolFetch(POOLS.yt_main, `https://${POOLS.yt_main.host}/channels?part=contentDetails&id=${encodeURIComponent(id)}`),
    ]);
    const ch = chData.items?.[0];
    if (!ch) return res.status(404).json({ error: 'Canal nao encontrado' });
    const playlistId = plData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    let videos = [];
    if (playlistId) {
      const plItems = await poolFetch(POOLS.yt_main, `https://${POOLS.yt_main.host}/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=20`);
      const ids = (plItems.items||[]).map(i=>i.snippet.resourceId.videoId).join(',');
      if (ids) {
        const vData = await poolFetch(POOLS.yt_main, `https://${POOLS.yt_main.host}/videos?part=snippet%2Cstatistics%2CcontentDetails&id=${ids}`);
        videos = (vData.items||[]).map(v=>({ videoId:v.id, title:v.snippet.title, thumbnail:v.snippet.thumbnails?.medium?.url, publishedAt:v.snippet.publishedAt, duration:v.contentDetails.duration, views:parseInt(v.statistics.viewCount||0), likes:parseInt(v.statistics.likeCount||0), comments:parseInt(v.statistics.commentCount||0) }));
      }
    }
    const totalViews=parseInt(ch.statistics.viewCount||0), videoCount=parseInt(ch.statistics.videoCount||1);
    const avgViewsPerVideo=Math.round(totalViews/videoCount);
    const engs=videos.map(v=>v.views>0?((v.likes+v.comments)/v.views)*100:0);
    const avgEngagement=engs.length>0?(engs.reduce((a,b)=>a+b,0)/engs.length).toFixed(2):'0';
    const bestVideo=videos.reduce((b,v)=>(!b||v.views>b.views)?v:b,null);
    const worstVideo=videos.reduce((b,v)=>(!b||v.views<b.views)?v:b,null);
    let uploadFreqDays=null;
    if (videos.length>=2) {
      const dates=videos.map(v=>new Date(v.publishedAt)).sort((a,b)=>b-a);
      const diffs=[];
      for(let i=0;i<dates.length-1;i++) diffs.push((dates[i]-dates[i+1])/(1000*60*60*24));
      uploadFreqDays=Math.round(diffs.reduce((a,b)=>a+b,0)/diffs.length);
    }
    const dayCount={0:0,1:0,2:0,3:0,4:0,5:0,6:0}, hourBuckets={};
    videos.forEach(v=>{ const d=new Date(v.publishedAt); dayCount[d.getDay()]=(dayCount[d.getDay()]||0)+v.views; const h=d.getUTCHours(); hourBuckets[h]=(hourBuckets[h]||0)+v.views; });
    const bestDay=Object.entries(dayCount).sort((a,b)=>b[1]-a[1])[0]?.[0];
    const bestHour=Object.entries(hourBuckets).sort((a,b)=>b[1]-a[1])[0]?.[0];
    const dayNames=['Domingo','Segunda','Terca','Quarta','Quinta','Sexta','Sabado'];
    let trend='estavel';
    if(videos.length>=4){const h=Math.floor(videos.length/2),r=videos.slice(0,h),o=videos.slice(h),aR=r.reduce((s,v)=>s+v.views,0)/r.length,aO=o.reduce((s,v)=>s+v.views,0)/o.length,pct=((aR-aO)/aO)*100;if(pct>15)trend=`crescendo ${pct.toFixed(0)}%`;else if(pct<-15)trend=`caindo ${Math.abs(pct).toFixed(0)}%`;}
    res.json({ ...mapChannel(ch), avgViewsPerVideo, avgEngagement, uploadFreqDays, bestDay:bestDay!==undefined?dayNames[bestDay]:null, bestHour:bestHour!==undefined?`${bestHour}h-${parseInt(bestHour)+2}h UTC`:null, trend, bestVideo, worstVideo, recentVideos:videos });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Vídeo
app.get('/api/video', async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id obrigatorio' });
    const data = await poolFetch(POOLS.yt_main, `https://${POOLS.yt_main.host}/videos?part=snippet%2Cstatistics%2CcontentDetails&id=${encodeURIComponent(id)}`);
    const v = data.items?.[0];
    if (!v) return res.status(404).json({ error: 'Video nao encontrado' });
    res.json(mapVideo(v));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Engenharia reversa
app.get('/api/reverse-engineer', async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id obrigatorio' });
    const data = await poolFetch(POOLS.yt_main, `https://${POOLS.yt_main.host}/videos?part=snippet%2Cstatistics%2CcontentDetails&id=${encodeURIComponent(id)}`);
    const v = data.items?.[0];
    if (!v) return res.status(404).json({ error: 'Video nao encontrado' });
    const base = mapVideo(v);
    const title=v.snippet.title, titleLen=title.length;
    const hasNumber=/\d+/.test(title), hasYear=/202[0-9]/.test(title), hasQuestion=/\?/.test(title);
    const hasPowerWord=/melhor|pior|incrivel|segredo|nunca|sempre|como|por que|gratis|dinheiro|rico|viral|best|worst|secret|never|how|why|free|money|amazing|shocking/i.test(title);
    const hasEmoji=/[^\x00-\x7F]/.test(title), titleWords=title.split(' ').length;
    let titleScore=50;
    if(titleLen>=40&&titleLen<=70)titleScore+=15;if(hasNumber)titleScore+=10;if(hasYear)titleScore+=5;if(hasQuestion)titleScore+=10;if(hasPowerWord)titleScore+=15;if(hasEmoji)titleScore+=5;if(titleWords>=5&&titleWords<=12)titleScore+=5;titleScore=Math.min(titleScore,99);
    const durMatch=v.contentDetails.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    const totalSec=(parseInt(durMatch?.[1]||0)*3600)+(parseInt(durMatch?.[2]||0)*60)+parseInt(durMatch?.[3]||0);
    let durationTip='';
    if(totalSec<60)durationTip='Short/Reel - otimo para retencao';
    else if(totalSec<300)durationTip='Curto (1-5min) - alto CTR';
    else if(totalSec<900)durationTip='Medio (5-15min) - equilibrio ideal';
    else if(totalSec<1800)durationTip='Longo (15-30min) - boa monetizacao';
    else durationTip='Muito longo (+30min) - nicho especifico';
    const pubDate=new Date(v.snippet.publishedAt), dayNames=['Domingo','Segunda','Terca','Quarta','Quinta','Sexta','Sabado'];
    let viralScore=0;
    if(base.views>1000000)viralScore+=30;else if(base.views>100000)viralScore+=20;else if(base.views>10000)viralScore+=10;
    if(parseFloat(base.likeRatio)>5)viralScore+=20;else if(parseFloat(base.likeRatio)>2)viralScore+=10;
    viralScore+=Math.round(titleScore*0.3);viralScore=Math.min(viralScore,99);
    const tags=v.snippet.tags||[];
    res.json({ ...base, totalSeconds:totalSec, commentRatio:base.views>0?((base.comments/base.views)*100).toFixed(3):'0', viralScore, titleAnalysis:{ score:titleScore, length:titleLen, wordCount:titleWords, hasNumber, hasYear, hasQuestion, hasPowerWord, hasEmoji }, durationTip, pubDay:dayNames[pubDate.getDay()], pubHour:pubDate.getUTCHours(), tags, tagCount:tags.length, descriptionLength:(v.snippet.description||'').length });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Histórico de vídeos do canal
app.get('/api/channel-videos', async (req, res) => {
  try {
    const { id, max=20 } = req.query;
    if (!id) return res.status(400).json({ error: 'id obrigatorio' });
    const chData = await poolFetch(POOLS.yt_main, `https://${POOLS.yt_main.host}/channels?part=contentDetails&id=${encodeURIComponent(id)}`);
    const playlistId = chData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!playlistId) return res.status(404).json({ error: 'Canal nao encontrado' });
    const plData = await poolFetch(POOLS.yt_main, `https://${POOLS.yt_main.host}/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=${max}`);
    const ids = (plData.items||[]).map(i=>i.snippet.resourceId.videoId).join(',');
    if (!ids) return res.json([]);
    const vData = await poolFetch(POOLS.yt_main, `https://${POOLS.yt_main.host}/videos?part=snippet%2Cstatistics%2CcontentDetails&id=${ids}`);
    res.json((vData.items||[]).map(v=>mapVideo(v)));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Comparar
app.get('/api/compare', async (req, res) => {
  try {
    const { a, b } = req.query;
    if (!a||!b) return res.status(400).json({ error: 'a e b obrigatorios' });
    const [dA,dB] = await Promise.all([
      poolFetch(POOLS.yt_main, `https://${POOLS.yt_main.host}/channels?part=snippet%2Cstatistics&id=${encodeURIComponent(a)}`),
      poolFetch(POOLS.yt_main, `https://${POOLS.yt_main.host}/channels?part=snippet%2Cstatistics&id=${encodeURIComponent(b)}`),
    ]);
    const chA=dA.items?.[0], chB=dB.items?.[0];
    if (!chA||!chB) return res.status(404).json({ error: 'Canal nao encontrado' });
    res.json({ a: mapChannel(chA), b: mapChannel(chB) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Pesquisa
app.get('/api/search', async (req, res) => {
  try {
    const { q='', max=16, nicho='', subnicho='', idioma='', periodo='', videos='', order='relevance' } = req.query;
    const parts=[];
    if(q.trim()) parts.push(q.trim());
    if(subnicho) parts.push(subnicho);
    else if(nicho) parts.push(nicho);
    const finalQ=parts.join(' ')||'videos populares';
    const params=new URLSearchParams({ part:'snippet', q:finalQ, maxResults:max, type:'video', order });
    if(idioma) params.set('relevanceLanguage',idioma);
    if(videos==='short')  params.set('videoDuration','short');
    if(videos==='medium') params.set('videoDuration','medium');
    if(videos==='long')   params.set('videoDuration','long');
    if(periodo){const now=new Date(),map={today:1,week:7,'2weeks':14,month:30,'3months':90,'6months':180,year:365};const days=map[periodo];if(days){const d=new Date(now-days*864e5);params.set('publishedAfter',d.toISOString());}}
    const data = await poolFetch(POOLS.yt_main, `https://${POOLS.yt_main.host}/search?${params.toString()}`);
    res.json((data.items||[]).map(item=>({ videoId:item.id.videoId, title:item.snippet.title, channelTitle:item.snippet.channelTitle, thumbnail:item.snippet.thumbnails?.high?.url, publishedAt:item.snippet.publishedAt })));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Trending
app.get('/api/trending', async (req, res) => {
  try {
    const { region='BR', max=20, category='', videoDuration='' } = req.query;
    const clampedMax = Math.min(parseInt(max)||20, 50); // API hard limit
    const params=new URLSearchParams({ part:'snippet,statistics', chart:'mostPopular', regionCode:region, maxResults:clampedMax });
    if(category) params.set('videoCategoryId',category);
    if(videoDuration) params.set('videoDuration', videoDuration);
    const data = await poolFetch(POOLS.yt_main, `https://${POOLS.yt_main.host}/videos?${params.toString()}`);
    res.json((data.items||[]).map(v=>({ videoId:v.id, title:v.snippet.title, channelTitle:v.snippet.channelTitle, thumbnail:v.snippet.thumbnails?.high?.url, views:v.statistics.viewCount, likes:v.statistics.likeCount, publishedAt:v.snippet.publishedAt, categoryId:v.snippet.categoryId })));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Download
app.get('/api/download', async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id obrigatorio' });

    // Try endpoint v2 first, then v3 as fallback
    let data = null;
    const endpoints = [
      `https://${POOLS.downloader.host}/v2/video/details?videoId=${encodeURIComponent(id)}`,
      `https://${POOLS.downloader.host}/v3/video/details?videoId=${encodeURIComponent(id)}`,
      `https://${POOLS.downloader.host}/v2/video?videoId=${encodeURIComponent(id)}`,
    ];
    let lastErr = '';
    for (const url of endpoints) {
      try {
        data = await poolFetch(POOLS.downloader, url);
        if (data && (data.videos || data.audios || data.formats || data.title)) break;
      } catch(e) { lastErr = e.message; data = null; }
    }
    if (!data) return res.status(500).json({ error: `Downloader indisponível: ${lastErr}` });

    const formats = [];
    // v2 structure
    (data.videos?.items || []).slice(0, 8).forEach(f => {
      if (!f.url) return;
      formats.push({ type:'video', quality: f.quality || f.qualityLabel || f.resolution || '?', ext: f.extension || f.ext || 'mp4', url: f.url, size: f.sizeText || f.size || null });
    });
    (data.audios?.items || []).slice(0, 4).forEach(f => {
      if (!f.url) return;
      formats.push({ type:'audio', quality: f.quality || f.bitrate || 'MP3', ext: f.extension || f.ext || 'mp3', url: f.url, size: f.sizeText || f.size || null });
    });
    // v3 / alternate structure
    (data.formats || []).forEach(f => {
      if (!f.url) return;
      const type = (f.hasVideo || f.vcodec) ? 'video' : 'audio';
      formats.push({ type, quality: f.qualityLabel || f.quality || f.resolution || '?', ext: f.ext || f.extension || 'mp4', url: f.url, size: null });
    });

    if (!formats.length) return res.status(500).json({ error: 'Nenhum formato disponível para este vídeo.' });

    const thumb = data.thumbnail?.url || data.thumbnails?.[0]?.url || data.thumbnail || null;
    res.json({ title: data.title, thumbnail: thumb, duration: data.duration, formats });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════
//  MISTRAL AI — helper
// ═══════════════════════════════════════════════════════
const MISTRAL_KEY = process.env.MISTRAL_API_KEY || '';

async function mistral(systemPrompt, userPrompt) {
  if (!MISTRAL_KEY) throw new Error('MISTRAL_API_KEY não configurada no Railway.');
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MISTRAL_KEY}` },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      temperature: 0.85,
      max_tokens: 1200,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt   },
      ],
    }),
  });
  if (!res.ok) {
    let msg = `Mistral HTTP ${res.status}`;
    try { const j = await res.json(); msg = j?.message || j?.error?.message || msg; } catch {}
    throw new Error(msg);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

// IA — Títulos virais
app.post('/api/ia/titulos', async (req, res) => {
  try {
    const { tema, nicho = 'geral', estilo = 'viral' } = req.body;
    if (!tema) return res.status(400).json({ error: 'tema obrigatorio' });
    const system = `Você é um especialista em YouTube com mais de 10 anos de experiência criando títulos virais. 
Responda SOMENTE com um array JSON válido contendo exatamente 10 objetos, sem texto antes ou depois.
Formato: [{"text":"título aqui","score":85}, ...]
O score é de 0 a 99 e reflete o potencial viral do título.`;
    const user = `Crie 10 títulos para YouTube em português brasileiro.
Tema: ${tema}
Nicho: ${nicho}
Estilo: ${estilo}
Regras: títulos impactantes, entre 40-70 caracteres, use palavras de poder, números quando fizer sentido, emojis estratégicos. Varie os formatos. Pense no que faria uma pessoa parar e clicar.`;
    const raw = await mistral(system, user);
    const clean = raw.replace(/```json|```/g, '').trim();
    const titles = JSON.parse(clean);
    res.json({ titles });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// IA — Descrição SEO
app.post('/api/ia/descricao', async (req, res) => {
  try {
    const { titulo, pontos = '', canal = '', nicho = 'geral' } = req.body;
    if (!titulo) return res.status(400).json({ error: 'titulo obrigatorio' });
    const system = `Você é um especialista em SEO para YouTube. Escreva descrições otimizadas que rankeiam bem e convertem espectadores em inscritos. Responda APENAS com a descrição pronta, sem explicações.`;
    const user = `Crie uma descrição SEO completa para o vídeo abaixo.
Título: ${titulo}
Nicho: ${nicho}
${pontos ? `Pontos principais: ${pontos}` : ''}
${canal ? `Nome do canal: ${canal}` : ''}

A descrição deve ter: parágrafo de abertura com palavra-chave, timestamps (00:00, etc), CTA de inscrição, links placeholder, hashtags relevantes. Mínimo 300 palavras.`;
    const desc = await mistral(system, user);
    res.json({ description: desc });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// IA — Roteiro
app.post('/api/ia/roteiro', async (req, res) => {
  try {
    const { tema, formato = 'medio', estilo = 'educativo' } = req.body;
    if (!tema) return res.status(400).json({ error: 'tema obrigatorio' });
    const durations = { curto:'5-8 min', medio:'10-15 min', longo:'20-30 min', short:'60 segundos' };
    const system = `Você é um roteirista experiente de YouTube com domínio em retenção de audiência e storytelling. Responda SOMENTE com um array JSON válido, sem texto antes ou depois.
Formato: [{"title":"Nome da seção","content":"Texto do roteiro aqui"}, ...]`;
    const user = `Crie um roteiro detalhado de YouTube para:
Tema: ${tema}
Duração: ${durations[formato] || '10-15 min'}
Estilo: ${estilo}
Formato: ${formato === 'short' ? 'YouTube Short (60s)' : 'vídeo normal'}

Inclua: hook poderoso, introdução, 2-4 blocos de desenvolvimento com scripts reais (não só instruções), conclusão com CTA. Seja específico — escreva o que o criador vai FALAR, não só o que fazer.`;
    const raw = await mistral(system, user);
    const clean = raw.replace(/```json|```/g, '').trim();
    const sections = JSON.parse(clean);
    res.json({ sections });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Fallback
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Umbra v5 rodando na porta ${PORT}`));
