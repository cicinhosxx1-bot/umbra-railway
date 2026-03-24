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
  // 100/dia por chave — reseta todo dia à meia-noite
  yt_main: {
    name: 'YT Data v3', host: 'youtube-v31.p.rapidapi.com',
    limit: 100, resetType: 'daily',
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
    lastResetDate: new Date().toDateString(),
  },
  // 100/mês — reseta dia 1
  downloader: {
    name: 'Downloader', host: 'youtube-media-downloader.p.rapidapi.com',
    limit: 100, resetType: 'monthly',
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
    lastResetMonth: `${new Date().getFullYear()}-${new Date().getMonth()}`,
  },
};

// Inicializa arrays
Object.values(POOLS).forEach(p => {
  p.usage = new Array(p.keys.length).fill(0);
  p.dead  = new Array(p.keys.length).fill(false);
});

// ── Reset automático ──────────────────────────────────
function checkResets() {
  const now = new Date();

  // Reset DIÁRIO: YT Data v3 — recomeça do zero todo dia
  const todayStr = now.toDateString();
  if (POOLS.yt_main.lastResetDate !== todayStr) {
    POOLS.yt_main.usage = new Array(POOLS.yt_main.keys.length).fill(0);
    POOLS.yt_main.dead  = new Array(POOLS.yt_main.keys.length).fill(false);
    POOLS.yt_main.idx   = 0;
    POOLS.yt_main.lastResetDate = todayStr;
    console.log(`[RESET DIÁRIO] ${now.toISOString()} — YT Data v3 zerado. Todas as 10 chaves disponíveis.`);
  }

  // Reset MENSAL: Downloader — reseta no dia 1
  const monthStr = `${now.getFullYear()}-${now.getMonth()}`;
  if (POOLS.downloader.lastResetMonth !== monthStr) {
    POOLS.downloader.usage = new Array(POOLS.downloader.keys.length).fill(0);
    POOLS.downloader.dead  = new Array(POOLS.downloader.keys.length).fill(false);
    POOLS.downloader.idx   = 0;
    POOLS.downloader.lastResetMonth = monthStr;
    console.log(`[RESET MENSAL] ${now.toISOString()} — Downloader zerado.`);
  }
}

// Verifica a cada 5 minutos
setInterval(checkResets, 5 * 60 * 1000);

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
  checkResets();
  if (p.dead.every(Boolean)) throw new Error(`Pool "${p.name}" esgotado. Aguarde o próximo reset.`);
  let res = await fetch(url, { headers: { 'X-RapidAPI-Key': p.keys[p.idx], 'X-RapidAPI-Host': p.host } });
  if (res.status === 429) {
    if (!poolRotate(p)) throw new Error(`Pool "${p.name}" esgotado (429).`);
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
function parseDuration(dur) {
  const m = (dur||'').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  return m ? (parseInt(m[1]||0)*3600)+(parseInt(m[2]||0)*60)+parseInt(m[3]||0) : 0;
}
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
  const totalSeconds = parseDuration(v.contentDetails?.duration);
  return {
    id: v.id, title: v.snippet.title,
    thumbnail: v.snippet.thumbnails?.maxres?.url || v.snippet.thumbnails?.high?.url,
    channelTitle: v.snippet.channelTitle, publishedAt: v.snippet.publishedAt,
    duration: v.contentDetails?.duration, totalSeconds,
    views, likes, comments,
    tags: v.snippet.tags || [],
    description: v.snippet.description || '',
    descriptionLength: (v.snippet.description||'').length,
    engagement: views>0?(((likes+comments)/views)*100).toFixed(2):'0',
    likeRatio: views>0?((likes/views)*100).toFixed(2):'0',
  };
}

// ═══════════════════════════════════════════════════════
//  ROUTES
// ═══════════════════════════════════════════════════════

// Status — mostra info de reset
app.get('/api/status', (req, res) => {
  checkResets();
  const now = new Date();
  const nextMidnight = new Date(now);
  nextMidnight.setDate(now.getDate()+1); nextMidnight.setHours(0,0,0,0);
  const horasParaReset = Math.ceil((nextMidnight - now) / 3600000);

  res.json({
    ok: true,
    resetInfo: {
      ytMain: { tipo: 'Diário', proximoReset: `em ~${horasParaReset}h`, ultimoReset: POOLS.yt_main.lastResetDate },
      downloader: { tipo: 'Mensal', ultimoReset: POOLS.downloader.lastResetMonth },
    },
    pools: Object.entries(POOLS).map(([id,p]) => ({
      id, name: p.name, limit: p.limit, resetType: p.resetType,
      currentKey: p.idx+1, currentUsage: p.usage[p.idx],
      totalUsage: p.usage.reduce((a,b)=>a+b,0),
      aliveKeys: p.dead.filter(d=>!d).length,
      keys: p.keys.map((_,i)=>({ n:i+1, usage:p.usage[i], dead:p.dead[i], active:i===p.idx })),
    }))
  });
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

// Canal deep
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
    const engs=videos.map(v=>v.views>0?(((v.likes+v.comments)/v.views)*100):0);
    const avgEngagement=engs.length>0?(engs.reduce((a,b)=>a+b,0)/engs.length).toFixed(2):'0';
    const bestVideo=videos.reduce((b,v)=>(!b||v.views>b.views)?v:b,null);
    const worstVideo=videos.reduce((b,v)=>(!b||v.views<b.views)?v:b,null);
    let uploadFreqDays=null;
    if(videos.length>=2){const dates=videos.map(v=>new Date(v.publishedAt)).sort((a,b)=>b-a);const diffs=[];for(let i=0;i<dates.length-1;i++)diffs.push((dates[i]-dates[i+1])/(1000*60*60*24));uploadFreqDays=Math.round(diffs.reduce((a,b)=>a+b,0)/diffs.length);}
    const dayCount={0:0,1:0,2:0,3:0,4:0,5:0,6:0},hourBuckets={};
    videos.forEach(v=>{const d=new Date(v.publishedAt);dayCount[d.getDay()]=(dayCount[d.getDay()]||0)+v.views;const h=d.getUTCHours();hourBuckets[h]=(hourBuckets[h]||0)+v.views;});
    const bestDay=Object.entries(dayCount).sort((a,b)=>b[1]-a[1])[0]?.[0];
    const bestHour=Object.entries(hourBuckets).sort((a,b)=>b[1]-a[1])[0]?.[0];
    const dayNames=['Domingo','Segunda','Terca','Quarta','Quinta','Sexta','Sabado'];
    let trend='estavel';
    if(videos.length>=4){const h=Math.floor(videos.length/2),r=videos.slice(0,h),o=videos.slice(h),aR=r.reduce((s,v)=>s+v.views,0)/r.length,aO=o.reduce((s,v)=>s+v.views,0)/o.length,pct=((aR-aO)/aO)*100;if(pct>15)trend=`crescendo ${pct.toFixed(0)}%`;else if(pct<-15)trend=`caindo ${Math.abs(pct).toFixed(0)}%`;}
    res.json({...mapChannel(ch),avgViewsPerVideo,avgEngagement,uploadFreqDays,bestDay:bestDay!==undefined?dayNames[bestDay]:null,bestHour:bestHour!==undefined?`${bestHour}h-${parseInt(bestHour)+2}h UTC`:null,trend,bestVideo,worstVideo,recentVideos:videos});
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
    const title=v.snippet.title,titleLen=title.length;
    const hasNumber=/\d+/.test(title),hasYear=/202[0-9]/.test(title),hasQuestion=/\?/.test(title);
    const hasPowerWord=/melhor|pior|incrivel|segredo|nunca|sempre|como|por que|gratis|dinheiro|rico|viral|best|worst|secret|never|how|why|free|money|amazing|shocking/i.test(title);
    const hasEmoji=/[^\x00-\x7F]/.test(title),titleWords=title.split(' ').length;
    let titleScore=50;
    if(titleLen>=40&&titleLen<=70)titleScore+=15;if(hasNumber)titleScore+=10;if(hasYear)titleScore+=5;if(hasQuestion)titleScore+=10;if(hasPowerWord)titleScore+=15;if(hasEmoji)titleScore+=5;if(titleWords>=5&&titleWords<=12)titleScore+=5;titleScore=Math.min(titleScore,99);
    let durationTip='';
    if(base.totalSeconds<=60)durationTip='Short/Reel - otimo para retencao';
    else if(base.totalSeconds<300)durationTip='Curto (1-5min) - alto CTR';
    else if(base.totalSeconds<900)durationTip='Medio (5-15min) - equilibrio ideal';
    else if(base.totalSeconds<1800)durationTip='Longo (15-30min) - boa monetizacao';
    else durationTip='Muito longo (+30min) - nicho especifico';
    const pubDate=new Date(v.snippet.publishedAt),dayNames=['Domingo','Segunda','Terca','Quarta','Quinta','Sexta','Sabado'];
    let viralScore=0;
    if(base.views>1000000)viralScore+=30;else if(base.views>100000)viralScore+=20;else if(base.views>10000)viralScore+=10;
    if(parseFloat(base.likeRatio)>5)viralScore+=20;else if(parseFloat(base.likeRatio)>2)viralScore+=10;
    viralScore+=Math.round(titleScore*0.3);viralScore=Math.min(viralScore,99);
    const tags=v.snippet.tags||[];
    res.json({...base,commentRatio:base.views>0?((base.comments/base.views)*100).toFixed(3):'0',viralScore,titleAnalysis:{score:titleScore,length:titleLen,wordCount:titleWords,hasNumber,hasYear,hasQuestion,hasPowerWord,hasEmoji},durationTip,pubDay:dayNames[pubDate.getDay()],pubHour:pubDate.getUTCHours(),tags,tagCount:tags.length,descriptionLength:(v.snippet.description||'').length});
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

// Comparar canais
app.get('/api/compare', async (req, res) => {
  try {
    const { a, b } = req.query;
    if (!a||!b) return res.status(400).json({ error: 'a e b obrigatorios' });
    const [dA,dB] = await Promise.all([
      poolFetch(POOLS.yt_main, `https://${POOLS.yt_main.host}/channels?part=snippet%2Cstatistics&id=${encodeURIComponent(a)}`),
      poolFetch(POOLS.yt_main, `https://${POOLS.yt_main.host}/channels?part=snippet%2Cstatistics&id=${encodeURIComponent(b)}`),
    ]);
    const chA=dA.items?.[0],chB=dB.items?.[0];
    if(!chA||!chB) return res.status(404).json({ error: 'Canal nao encontrado' });
    res.json({ a: mapChannel(chA), b: mapChannel(chB) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Pesquisa avançada
app.get('/api/search', async (req, res) => {
  try {
    const { q='', max=16, nicho='', subnicho='', idioma='', periodo='', videos='', order='relevance', publishedAfter='', publishedBefore='' } = req.query;
    const parts=[];
    if(q.trim()) parts.push(q.trim());
    if(subnicho) parts.push(subnicho);
    else if(nicho) parts.push(nicho);
    const finalQ=parts.join(' ')||'youtube';
    const params=new URLSearchParams({ part:'snippet', q:finalQ, maxResults:Math.min(parseInt(max)||16,50), type:'video', order });
    if(idioma) params.set('relevanceLanguage',idioma);
    if(videos==='short')  params.set('videoDuration','short');
    if(videos==='medium') params.set('videoDuration','medium');
    if(videos==='long')   params.set('videoDuration','long');
    if(publishedAfter)  params.set('publishedAfter', new Date(publishedAfter).toISOString());
    if(publishedBefore) params.set('publishedBefore', new Date(publishedBefore).toISOString());
    else if(periodo&&!publishedAfter){
      const now=new Date(),map={today:1,week:7,'2weeks':14,month:30,'3months':90,'6months':180,year:365};
      const days=map[periodo];
      if(days){const d=new Date(now-days*864e5);params.set('publishedAfter',d.toISOString());}
    }
    const data = await poolFetch(POOLS.yt_main, `https://${POOLS.yt_main.host}/search?${params.toString()}`);
    res.json((data.items||[]).map(item=>({ videoId:item.id.videoId, title:item.snippet.title, channelTitle:item.snippet.channelTitle, thumbnail:item.snippet.thumbnails?.high?.url, publishedAt:item.snippet.publishedAt })));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Trending — filtro REAL de shorts/longos via contentDetails
app.get('/api/trending', async (req, res) => {
  try {
    const { region='BR', max=20, category='', videoType='' } = req.query;
    // Sempre busca 50 quando há filtro de tipo para ter margem de filtragem
    const fetchMax = videoType ? 50 : Math.min(parseInt(max)||20, 50);
    const params=new URLSearchParams({ part:'snippet,statistics,contentDetails', chart:'mostPopular', regionCode:region, maxResults:fetchMax });
    if(category) params.set('videoCategoryId', category);
    const data = await poolFetch(POOLS.yt_main, `https://${POOLS.yt_main.host}/videos?${params.toString()}`);
    let items = (data.items||[]).map(v => {
      const totalSec = parseDuration(v.contentDetails?.duration);
      return {
        videoId: v.id, title: v.snippet.title, channelTitle: v.snippet.channelTitle,
        thumbnail: v.snippet.thumbnails?.high?.url,
        views: v.statistics.viewCount, likes: v.statistics.likeCount,
        publishedAt: v.snippet.publishedAt, categoryId: v.snippet.categoryId,
        totalSeconds: totalSec,
      };
    });
    // Filtro real: short = até 60s, long = acima de 60s
    if(videoType === 'short') items = items.filter(v => v.totalSeconds > 0 && v.totalSeconds <= 60);
    if(videoType === 'long')  items = items.filter(v => v.totalSeconds > 60);
    res.json(items.slice(0, parseInt(max)||20));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Download
app.get('/api/download', async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id obrigatorio' });
    let data = null;
    const endpoints = [
      `https://${POOLS.downloader.host}/v2/video/details?videoId=${encodeURIComponent(id)}`,
      `https://${POOLS.downloader.host}/v3/video/details?videoId=${encodeURIComponent(id)}`,
      `https://${POOLS.downloader.host}/v2/video?videoId=${encodeURIComponent(id)}`,
    ];
    let lastErr = '';
    for (const url of endpoints) {
      try { data = await poolFetch(POOLS.downloader, url); if(data&&(data.videos||data.audios||data.formats||data.title)) break; }
      catch(e) { lastErr = e.message; data = null; }
    }
    if (!data) return res.status(500).json({ error: `Downloader indisponível: ${lastErr}` });
    const formats = [];
    (data.videos?.items||[]).slice(0,8).forEach(f=>{if(!f.url)return;formats.push({type:'video',quality:f.quality||f.qualityLabel||f.resolution||'?',ext:f.extension||f.ext||'mp4',url:f.url,size:f.sizeText||f.size||null});});
    (data.audios?.items||[]).slice(0,4).forEach(f=>{if(!f.url)return;formats.push({type:'audio',quality:f.quality||f.bitrate||'MP3',ext:f.extension||f.ext||'mp3',url:f.url,size:f.sizeText||f.size||null});});
    (data.formats||[]).forEach(f=>{if(!f.url)return;const type=(f.hasVideo||f.vcodec)?'video':'audio';formats.push({type,quality:f.qualityLabel||f.quality||f.resolution||'?',ext:f.ext||f.extension||'mp4',url:f.url,size:null});});
    if(!formats.length) return res.status(500).json({ error: 'Nenhum formato disponível.' });
    const thumb = data.thumbnail?.url||data.thumbnails?.[0]?.url||data.thumbnail||null;
    res.json({ title:data.title, thumbnail:thumb, duration:data.duration, formats });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════
//  MISTRAL AI
// ═══════════════════════════════════════════════════════
const MISTRAL_KEY = process.env.MISTRAL_API_KEY || '';

async function mistral(system, user, maxTokens=1400) {
  if (!MISTRAL_KEY) throw new Error('MISTRAL_API_KEY não configurada no Railway.');
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MISTRAL_KEY}` },
    body: JSON.stringify({ model:'mistral-small-latest', temperature:0.8, max_tokens:maxTokens, messages:[{role:'system',content:system},{role:'user',content:user}] }),
  });
  if (!res.ok) { let msg=`Mistral ${res.status}`; try{const j=await res.json();msg=j?.message||j?.error?.message||msg;}catch{} throw new Error(msg); }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

// IA — Títulos
app.post('/api/ia/titulos', async (req, res) => {
  try {
    const { tema, nicho='geral', estilo='viral' } = req.body;
    if (!tema) return res.status(400).json({ error: 'tema obrigatorio' });
    const raw = await mistral(
      `Especialista em títulos virais para YouTube em português. Responda SOMENTE com JSON array válido: [{"text":"título","score":85},...]`,
      `10 títulos para: Tema=${tema} | Nicho=${nicho} | Estilo=${estilo}. 40-70 chars, palavras de poder, emojis estratégicos.`
    );
    res.json({ titles: JSON.parse(raw.replace(/```json|```/g,'').trim()) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// IA — Descrição SEO
app.post('/api/ia/descricao', async (req, res) => {
  try {
    const { titulo, pontos='', canal='', nicho='geral' } = req.body;
    if (!titulo) return res.status(400).json({ error: 'titulo obrigatorio' });
    const desc = await mistral(
      `SEO expert para YouTube. Responda APENAS com a descrição pronta, sem explicações.`,
      `Descrição para: "${titulo}" | Nicho: ${nicho}${pontos?'\nPontos: '+pontos:''}${canal?'\nCanal: '+canal:''}. Inclua timestamps, CTA, hashtags. Mín 300 palavras.`,
      1600
    );
    res.json({ description: desc });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// IA — Roteiro
app.post('/api/ia/roteiro', async (req, res) => {
  try {
    const { tema, formato='medio', estilo='educativo' } = req.body;
    if (!tema) return res.status(400).json({ error: 'tema obrigatorio' });
    const durations = { curto:'5-8min', medio:'10-15min', longo:'20-30min', short:'60s' };
    const raw = await mistral(
      `Roteirista YouTube experiente. Responda SOMENTE com JSON array: [{"title":"seção","content":"texto"},...]`,
      `Roteiro para: "${tema}" | Duração: ${durations[formato]} | Estilo: ${estilo}. Escreva o que o criador vai FALAR, com hook, dev e CTA.`,
      1800
    );
    res.json({ sections: JSON.parse(raw.replace(/```json|```/g,'').trim()) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// IA — Análise de vídeo completa (NOVA)
app.post('/api/ia/analisar-video', async (req, res) => {
  try {
    const { videoData } = req.body;
    if (!videoData) return res.status(400).json({ error: 'videoData obrigatorio' });
    const raw = await mistral(
      `Analista estratégico de YouTube. Responda SOMENTE com JSON válido:
{"resumo":"2-3 frases","pontos_fortes":["..."],"pontos_fracos":["..."],"score_geral":75,"score_titulo":80,"score_engajamento":65,"score_seo":70,"recomendacoes":["...","...","...","..."],"veredicto":"ALTO/MÉDIO/BAIXO — conclusão"}`,
      `Analise: ${videoData.title}
Canal: ${videoData.channelTitle} | Views: ${videoData.views} | Likes: ${videoData.likes} | Comentários: ${videoData.comments}
Engajamento: ${videoData.engagement}% | Like Ratio: ${videoData.likeRatio}% | Duração: ${videoData.duration||'N/A'}
Tags: ${(videoData.tags||[]).slice(0,15).join(', ')||'Nenhuma'} | Desc: ${videoData.descriptionLength||0} chars
Score viral: ${videoData.viralScore||0}/99 | Publicado: ${videoData.publishedAt}
O que funcionou, o que não funcionou, scores e recomendações práticas.`,
      1600
    );
    res.json({ analysis: JSON.parse(raw.replace(/```json|```/g,'').trim()) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// IA — Análise de canal (NOVA)
app.post('/api/ia/analisar-canal', async (req, res) => {
  try {
    const { channelData } = req.body;
    if (!channelData) return res.status(400).json({ error: 'channelData obrigatorio' });
    const raw = await mistral(
      `Analista estratégico de YouTube. Responda SOMENTE com JSON:
{"resumo":"análise geral","pontos_fortes":["..."],"pontos_fracos":["..."],"oportunidades":["..."],"recomendacoes":["..."],"score_canal":75,"veredicto":"conclusão"}`,
      `Canal: ${channelData.title} | Inscritos: ${channelData.subscribers} | Views: ${channelData.views} | Vídeos: ${channelData.videoCount}
Média views/vídeo: ${channelData.avgViewsPerVideo||'N/A'} | Eng médio: ${channelData.avgEngagement||'N/A'}%
Freq upload: ${channelData.uploadFreqDays||'N/A'} dias | Tendência: ${channelData.trend||'N/A'}
Melhor dia: ${channelData.bestDay||'N/A'} | Melhor hora: ${channelData.bestHour||'N/A'}
Desc: ${(channelData.description||'').substring(0,200)}`,
      1600
    );
    res.json({ analysis: JSON.parse(raw.replace(/```json|```/g,'').trim()) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Fallback
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Umbra v5 rodando na porta ${PORT}`));
