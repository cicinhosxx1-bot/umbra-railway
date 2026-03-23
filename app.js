// ═══════════════════════════════════════════
//  UMBRA v5 — Frontend JS
// ═══════════════════════════════════════════

// ── API ───────────────────────────────────────────────────────────────────────
async function api(path, opts={}) {
  const res = await fetch(path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
  return data;
}

// ── Status / Pool ─────────────────────────────────────────────────────────────
async function fetchStatus() {
  try {
    const { pools } = await api('/api/status');
    const total = pools.reduce((s,p) => s + p.totalUsage, 0);
    document.getElementById('totalReq').textContent = total;

    // Topbar pills
    document.getElementById('poolPills').innerHTML = pools.map(p => {
      const color = p.aliveKeys===0?'#ff4444':p.aliveKeys<=3?'#ffd93d':'#4ade80';
      return `<div class="pool-pill" style="border-color:${color}33;color:${color}">
        <div style="width:5px;height:5px;border-radius:50%;background:${color}"></div>
        ${p.name} ${p.currentUsage}/${p.limit}
      </div>`;
    }).join('');

    // Dashboard pool status
    const dashEl = document.getElementById('dashPoolStatus');
    if (dashEl) dashEl.innerHTML = pools.map(p => {
      const pct = Math.round((p.currentUsage/p.limit)*100);
      const color = p.aliveKeys===0?'#ff4444':p.aliveKeys<=3?'#ffd93d':'#4ade80';
      const dots = p.keys.map(k => {
        let bg='rgba(255,255,255,0.1)';
        if(k.active&&!k.dead)bg='#4ade80'; else if(k.dead)bg='rgba(255,80,80,0.5)'; else if(k.usage>0)bg='#ffd93d';
        return `<span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:${bg};margin:0 1px" title="KEY_${k.n}: ${k.usage}/${p.limit}"></span>`;
      }).join('');
      return `<div class="card" style="padding:12px 14px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span style="font-size:10px;font-family:var(--mono);color:${color};text-transform:uppercase;letter-spacing:1px;font-weight:700">${p.name}</span>
          <span style="font-size:9px;font-family:var(--mono);color:var(--dim)">${p.aliveKeys}/10 chaves</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <div style="flex:1;height:3px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${color};border-radius:2px;transition:width .5s"></div>
          </div>
          <span style="font-size:9px;font-family:var(--mono);color:var(--dim)">${p.currentUsage}/${p.limit}</span>
        </div>
        <div>${dots}</div>
      </div>`;
    }).join('');
  } catch(e) {
    document.getElementById('statusLabel').textContent = 'Offline';
  }
}
function refreshStatus() { setTimeout(fetchStatus, 600); }

// ── Utils ─────────────────────────────────────────────────────────────────────
const fmtNum = n => { if(!n)return'0';const v=parseInt(n);if(v>=1e9)return(v/1e9).toFixed(1)+'B';if(v>=1e6)return(v/1e6).toFixed(1)+'M';if(v>=1e3)return(v/1e3).toFixed(1)+'K';return v.toLocaleString('pt-BR'); };
const fmtDate = iso => !iso?'—':new Date(iso).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'});
const fmtDur  = iso => { if(!iso)return'—';const m=iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);if(!m)return iso;const h=m[1]?`${m[1]}:`:'';return`${h}${(m[2]||'0').padStart(h?2:1,'0')}:${(m[3]||'0').padStart(2,'0')}`; };
const extractVideoId = s => { const m=s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);return m?m[1]:s.trim(); };
const isUCId = s => /^UC[\w-]{21,}$/.test(s);
const loading = id => { const el=document.getElementById(id); if(el) el.innerHTML=`<div class="loading-row"><svg class="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>Carregando...</div>`; };
const errBox  = (id,msg) => { const el=document.getElementById(id); if(el) el.innerHTML=`<div class="alert alert-err">⚠ ${msg}</div>`; };
const statCard = (icon,label,value,color) => `<div class="card"><div class="stat-icon" style="color:${color}">${icon}</div><div class="stat-val">${value}</div><div class="stat-label">${label}</div><div class="card-accent" style="background:${color}"></div></div>`;

const ICO = {
  users:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  eye:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>',
  vid:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><polygon points="10,9 16,12 10,15" fill="currentColor" stroke="none"/></svg>',
  heart:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>',
  msg:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  trend:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>',
  dl:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12m0 0-4-4m4 4 4-4"/><path d="M3 18h18"/></svg>',
};

async function resolveChannel(val) {
  if (isUCId(val)) return val;
  const urlMatch = val.match(/channel\/(UC[\w-]{21,})/);
  if (urlMatch) return urlMatch[1];
  const q = val.replace(/^@/,'').replace(/.*\//,'').trim();
  const { channelId } = await api(`/api/resolve-channel?q=${encodeURIComponent(q)}`);
  return channelId;
}

// ── Sidebar Navigation ────────────────────────────────────────────────────────
const PAGE_TITLES = {
  dashboard:'Dashboard', discover:'Descobrir', canal:'Análise de Canal',
  'canal-deep':'Análise Profunda', video:'Análise de Vídeo', 'eng-reversa':'Engenharia Reversa',
  comparar:'Comparar Canais', historico:'Histórico de Vídeos',
  'ia-titulos':'Gerador de Títulos', 'ia-descricao':'Descrição SEO', 'ia-roteiro':'Gerador de Roteiro',
  'seo-tags':'Tags & SEO', pesquisa:'Pesquisa', download:'Download',
  cpm:'CPM / Ganhos', favoritos:'Favoritos', exportar:'Exportar PDF',
};

function navTo(page) {
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const panel = document.getElementById('panel-'+page);
  const nav   = document.getElementById('nav-'+page);
  if (panel) panel.classList.add('active');
  if (nav)   nav.classList.add('active');
  document.getElementById('topbarTitle').textContent = PAGE_TITLES[page] || page;
  closeSidebar();
  // Auto-load discover
  if (page === 'discover' && document.getElementById('feedGrid').children.length <= 1) loadFeed();
}

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebarOverlay');
  const isOpen = sb.classList.toggle('open');
  ov.classList.toggle('visible', isOpen);
}
function closeSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebarOverlay');
  sb.classList.remove('open');
  ov.classList.remove('visible');
}

// ── Dashboard Hero Video ──────────────────────────────────────────────────────
// Vídeo fixo — troque o ID abaixo para mudar o vídeo do dashboard
const HERO_VIDEO_ID = 'I8d3gktU_gk';   // <- coloque aqui o ID do vídeo (ex: 'dQw4w9WgXcQ')

function renderHeroVideo(id) {
  const el = document.getElementById('heroVideoInner');
  if (!el) return;
  if (!id) {
    el.innerHTML = '<div class="video-hero-placeholder"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,51,51,0.4)" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16" fill="rgba(255,51,51,0.4)" stroke="none"/></svg><span>Nenhum vídeo configurado</span></div>';
    return;
  }
  el.innerHTML = '<iframe src="https://www.youtube.com/embed/' + id + '?rel=0" frameborder="0" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>';
}



// ── Discover Feed ─────────────────────────────────────────────────────────────
let feedRegion = 'BR', feedCategory = '', feedQty = 50, feedType = 'all';

function setFeedFilter(region, cat, el) {
  feedRegion = region;
  feedCategory = cat || '';
  document.querySelectorAll('.feed-filters .feed-filter-btn').forEach(b=>b.classList.remove('active'));
  if (el) el.classList.add('active');
  loadFeed();
}
function setFeedQty(qty, el) {
  feedQty = qty;
  document.querySelectorAll('[id^="qty-"]').forEach(b=>b.classList.remove('active'));
  if (el) el.classList.add('active');
  loadFeed();
}
function setFeedType(type, el) {
  feedType = type;
  document.querySelectorAll('[id^="type-"]').forEach(b=>b.classList.remove('active'));
  if (el) el.classList.add('active');
  loadFeed();
}
async function loadFeed() {
  const grid = document.getElementById('feedGrid');
  grid.innerHTML = `<div class="loading-row"><svg class="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>Carregando ${feedQty} vídeos...</div>`;
  try {
    // API max is 50 per call — batch if needed
    const batchSize = 50;
    const batches = Math.ceil(feedQty / batchSize);
    let items = [];
    for (let i = 0; i < batches; i++) {
      const thisMax = Math.min(batchSize, feedQty - items.length);
      const params = new URLSearchParams({ region: feedRegion, max: thisMax });
      if (feedCategory) params.set('category', feedCategory);
      if (feedType === 'long') params.set('videoDuration', 'long');
      if (feedType === 'short') params.set('videoDuration', 'short');
      const batch = await api(`/api/trending?${params.toString()}`);
      items = items.concat(batch);
      if (batch.length < thisMax) break; // API returned less than asked
    }
    if (!items.length) { grid.innerHTML = `<div class="alert alert-info">Nenhum vídeo encontrado.</div>`; return; }
    grid.innerHTML = items.map(v => {
      const views = parseInt(v.views||0);
      const likes = parseInt(v.likes||0);
      const likeR = views>0 ? ((likes/views)*100).toFixed(1) : '0';
      let viralScore = 0;
      if(views>1000000)viralScore+=40; else if(views>100000)viralScore+=25; else if(views>10000)viralScore+=10;
      if(parseFloat(likeR)>5)viralScore+=30; else if(parseFloat(likeR)>2)viralScore+=15;
      viralScore = Math.min(viralScore+20, 99);
      const viralColor = viralScore>=70?'#ff3333':viralScore>=40?'#ffd93d':'#4ade80';
      return `<div class="video-card">
        ${v.thumbnail?`<img class="video-card-thumb" src="${v.thumbnail}" alt="" loading="lazy" onerror="this.style.display='none'">`:`<div class="video-card-thumb-placeholder">🎬</div>`}
        <div class="video-card-body">
          <div class="video-card-title">${v.title}</div>
          <div class="video-card-ch">${v.channelTitle}</div>
          <div class="video-card-stats">
            <span class="video-card-stat">${fmtNum(v.views)} views</span>
            <span class="video-card-stat">${fmtDate(v.publishedAt)}</span>
          </div>
          <div class="video-card-scores">
            <span class="score-pill score-viral" style="border-color:${viralColor}33;color:${viralColor}">🔥 ${viralScore}</span>
            <span class="score-pill score-seo">👍 ${likeR}%</span>
          </div>
          <div class="video-card-actions">
            <button class="vc-btn vc-btn-primary" onclick="quickAnalyze('${v.videoId}')">Analisar</button>
            <a class="vc-btn vc-btn-ghost" href="https://youtube.com/watch?v=${v.videoId}" target="_blank" rel="noopener">↗ YT</a>
          </div>
        </div>
      </div>`;
    }).join('');
    refreshStatus();
  } catch(e) {
    document.getElementById('feedGrid').innerHTML = `<div class="alert alert-err">⚠ ${e.message}</div>`;
  }
}

function quickAnalyze(videoId) {
  navTo('eng-reversa');
  document.getElementById('reverseInput').value = videoId;
  reverseEngineer();
}

// ── Canal ─────────────────────────────────────────────────────────────────────
async function analyzeChannel() {
  const val = document.getElementById('channelInput').value.trim(); if(!val)return;
  loading('channelResult');
  try {
    const channelId = await resolveChannel(val);
    const ch = await api(`/api/channel?id=${encodeURIComponent(channelId)}`);
    document.getElementById('channelResult').innerHTML = `<div class="gap-col">
      <div class="ch-header">
        ${ch.thumbnail?`<img class="ch-avatar" src="${ch.thumbnail}" alt="">`:''}
        <div><div class="ch-name">${ch.title}</div><div class="ch-meta">${ch.country?`📍 ${ch.country} · `:''}Criado em ${fmtDate(ch.publishedAt)}</div></div>
      </div>
      <div class="grid-auto">
        ${statCard(ICO.users,'Inscritos',fmtNum(ch.subscribers),'#ff6b6b')}
        ${statCard(ICO.eye,'Views totais',fmtNum(ch.views),'#ffd93d')}
        ${statCard(ICO.vid,'Vídeos',fmtNum(ch.videoCount),'#4ade80')}
      </div>
      ${ch.description?`<div class="desc-box"><p>${ch.description.substring(0,500).replace(/\n/g,'<br>')}</p></div>`:''}
    </div>`;
    refreshStatus();
  } catch(e) { errBox('channelResult',e.message); }
}

// ── Análise Profunda ──────────────────────────────────────────────────────────
async function deepAnalysis() {
  const val = document.getElementById('deepInput').value.trim(); if(!val)return;
  loading('deepResult');
  try {
    const channelId = await resolveChannel(val);
    const d = await api(`/api/channel-deep?id=${encodeURIComponent(channelId)}`);
    const trendCls = d.trend.includes('crescendo')?'trend-up':d.trend.includes('caindo')?'trend-down':'trend-stable';
    const trendIcon = d.trend.includes('crescendo')?'↑':d.trend.includes('caindo')?'↓':'→';
    const cards = [
      {icon:'📊',label:'Média views/vídeo',val:fmtNum(d.avgViewsPerVideo),color:'#ffd93d'},
      {icon:'💬',label:'Engajamento médio',val:d.avgEngagement+'%',color:'#22d3ee'},
      {icon:'📅',label:'Freq. de upload',val:d.uploadFreqDays?`${d.uploadFreqDays} dias`:'—',color:'#a78bfa'},
      {icon:'📆',label:'Melhor dia',val:d.bestDay||'—',color:'#4ade80'},
      {icon:'⏰',label:'Melhor hora (UTC)',val:d.bestHour||'—',color:'#fb923c'},
    ].map(c=>`<div class="deep-card"><div class="deep-icon">${c.icon}</div><div class="deep-val" style="color:${c.color}">${c.val}</div><div class="deep-lbl">${c.label}</div></div>`).join('');
    const bestVid = d.bestVideo?`<a class="highlight-vid" href="https://youtube.com/watch?v=${d.bestVideo.videoId}" target="_blank" rel="noopener">${d.bestVideo.thumbnail?`<img src="${d.bestVideo.thumbnail}" alt="">`:''}<div><div class="hv-title">${d.bestVideo.title}</div><div style="font-size:10px;font-family:var(--mono);color:#ffd93d;margin-top:4px">${fmtNum(d.bestVideo.views)} views</div></div></a>`:'';
    const worstVid = d.worstVideo?`<a class="highlight-vid" href="https://youtube.com/watch?v=${d.worstVideo.videoId}" target="_blank" rel="noopener">${d.worstVideo.thumbnail?`<img src="${d.worstVideo.thumbnail}" alt="">`:''}<div><div class="hv-title">${d.worstVideo.title}</div><div style="font-size:10px;font-family:var(--mono);color:#ff6b6b;margin-top:4px">${fmtNum(d.worstVideo.views)} views</div></div></a>`:'';
    document.getElementById('deepResult').innerHTML = `<div class="gap-col">
      <div class="ch-header">
        ${d.thumbnail?`<img class="ch-avatar" src="${d.thumbnail}" alt="">`:''}
        <div><div class="ch-name">${d.title}</div><div style="margin-top:8px"><span class="trend-badge ${trendCls}">${trendIcon} ${d.trend}</span></div></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px">${cards}</div>
      ${bestVid?`<div><div class="field-label" style="margin-bottom:8px">🏆 Melhor vídeo recente</div>${bestVid}</div>`:''}
      ${worstVid?`<div><div class="field-label" style="margin-bottom:8px">📉 Menor performance</div>${worstVid}</div>`:''}
    </div>`;
    refreshStatus();
  } catch(e) { errBox('deepResult',e.message); }
}

// ── Vídeo ─────────────────────────────────────────────────────────────────────
async function analyzeVideo() {
  const val = document.getElementById('videoInput').value.trim(); if(!val)return;
  loading('videoResult');
  try {
    const v = await api(`/api/video?id=${encodeURIComponent(extractVideoId(val))}`);
    document.getElementById('videoResult').innerHTML = `<div class="gap-col">
      ${v.thumbnail?`<img class="thumb" src="${v.thumbnail}" alt="">`:''}
      <div><div style="font-size:16px;font-weight:800;line-height:1.4">${v.title}</div><div style="font-size:11px;color:var(--muted);margin-top:6px">${v.channelTitle} · ${fmtDate(v.publishedAt)} · ⏱ ${fmtDur(v.duration)}</div></div>
      <div class="grid-auto">
        ${statCard(ICO.eye,'Views',fmtNum(v.views),'#ffd93d')}
        ${statCard(ICO.heart,'Likes',fmtNum(v.likes),'#ff6b6b')}
        ${statCard(ICO.msg,'Comentários',fmtNum(v.comments),'#4ade80')}
        ${statCard(ICO.trend,'Engajamento',v.engagement+'%','#22d3ee')}
      </div>
    </div>`;
    refreshStatus();
  } catch(e) { errBox('videoResult',e.message); }
}

// ── Engenharia Reversa ────────────────────────────────────────────────────────
async function reverseEngineer() {
  const val = document.getElementById('reverseInput').value.trim(); if(!val)return;
  loading('reverseResult');
  try {
    const d = await api(`/api/reverse-engineer?id=${encodeURIComponent(extractVideoId(val))}`);
    const viralColor = d.viralScore>=70?'#ff3333':d.viralScore>=40?'#ffd93d':'#4ade80';
    const titleColor = d.titleAnalysis.score>=70?'#4ade80':d.titleAnalysis.score>=40?'#ffd93d':'#ff6b6b';
    const checks = [
      {label:'Tem número',ok:d.titleAnalysis.hasNumber},{label:'Tem ano (202x)',ok:d.titleAnalysis.hasYear},
      {label:'É pergunta (?)',ok:d.titleAnalysis.hasQuestion},{label:'Power word',ok:d.titleAnalysis.hasPowerWord},
      {label:'Emoji no título',ok:d.titleAnalysis.hasEmoji},{label:'5-12 palavras',ok:d.titleAnalysis.wordCount>=5&&d.titleAnalysis.wordCount<=12},
      {label:'40-70 chars',ok:d.titleAnalysis.length>=40&&d.titleAnalysis.length<=70},{label:'Descrição longa',ok:d.descriptionLength>200},
    ].map(c=>`<div class="check-item"><span style="color:${c.ok?'var(--green)':'rgba(255,255,255,.25)'}">${c.ok?'✓':'✗'}</span><span style="color:${c.ok?'var(--text)':'var(--muted)'}">${c.label}</span></div>`).join('');
    document.getElementById('reverseResult').innerHTML = `<div class="gap-col">
      ${d.thumbnail?`<div class="re-hero"><img src="${d.thumbnail}" alt=""><div class="re-hero-overlay"><div class="re-hero-title">${d.title}</div><div class="re-hero-ch">${d.channelTitle} · ${fmtDate(d.publishedAt)}</div></div></div>`:''}
      <div class="re-stats">
        <div class="re-stat"><div class="re-stat-val" style="color:#ffd93d">${fmtNum(d.views)}</div><div class="re-stat-lbl">Views</div></div>
        <div class="re-stat"><div class="re-stat-val" style="color:#ff6b6b">${fmtNum(d.likes)}</div><div class="re-stat-lbl">Likes</div></div>
        <div class="re-stat"><div class="re-stat-val" style="color:#4ade80">${d.likeRatio}%</div><div class="re-stat-lbl">Like ratio</div></div>
        <div class="re-stat"><div class="re-stat-val" style="color:#22d3ee">${d.engagement}%</div><div class="re-stat-lbl">Engajamento</div></div>
      </div>
      <div class="score-row">
        <div class="viral-ring" style="border-color:${viralColor}"><div style="font-size:22px;font-weight:800;font-family:var(--mono);color:${viralColor}">${d.viralScore}</div><div style="font-size:8px;color:var(--muted)">VIRAL</div></div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:700">${d.pubDay} · ${d.pubHour}h UTC · ${fmtDur(d.duration)}</div>
          <div style="margin-top:8px"><span class="dur-badge">${d.durationTip}</span></div>
        </div>
      </div>
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <div class="field-label">Análise do Título <span style="color:${titleColor};margin-left:8px">${d.titleAnalysis.score}/99</span></div>
        </div>
        <div class="title-checks">${checks}</div>
      </div>
      ${d.tags.length>0?`<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><div class="field-label">Tags (${d.tagCount})</div><button onclick="navigator.clipboard.writeText('${d.tags.join(', ')}');this.textContent='Copiado!';setTimeout(()=>this.textContent='Copiar',1500)" class="btn btn-ghost" style="padding:5px 11px;font-size:11px">Copiar</button></div><div>${d.tags.slice(0,20).map(t=>`<span class="tag-chip">${t}</span>`).join('')}</div></div>`:''}
    </div>`;
    refreshStatus();
  } catch(e) { errBox('reverseResult',e.message); }
}

// ── Comparar ──────────────────────────────────────────────────────────────────
async function compareChannels() {
  const a=document.getElementById('compareA').value.trim(), b=document.getElementById('compareB').value.trim();
  if(!a||!b){errBox('compareResult','Preencha os dois canais.');return;}
  loading('compareResult');
  try {
    const [idA,idB] = await Promise.all([resolveChannel(a),resolveChannel(b)]);
    const {a:chA,b:chB} = await api(`/api/compare?a=${encodeURIComponent(idA)}&b=${encodeURIComponent(idB)}`);
    const metrics=[{label:'Inscritos',key:'subscribers',color:'#ff6b6b'},{label:'Views totais',key:'views',color:'#ffd93d'},{label:'Vídeos',key:'videoCount',color:'#4ade80'}];
    const bars = metrics.map(m=>{
      const vA=parseInt(chA[m.key]||0),vB=parseInt(chB[m.key]||0),pA=((vA/(vA+vB||1))*100).toFixed(1),win=vA>=vB?'a':'b';
      return `<div class="compare-bar-row"><div class="bar-header">
        <span class="bar-val" style="color:${win==='a'?m.color:'rgba(255,255,255,.3)'}">${win==='a'?'👑 ':''}${fmtNum(vA)}</span>
        <span class="bar-lbl">${m.label}</span>
        <span class="bar-val" style="color:${win==='b'?m.color:'rgba(255,255,255,.3)'}">${win==='b'?'👑 ':''}${fmtNum(vB)}</span>
      </div><div class="bar-track"><div class="bar-a" style="width:${pA}%"></div><div class="bar-b"></div></div></div>`;
    }).join('');
    document.getElementById('compareResult').innerHTML = `<div class="gap-col">
      <div class="compare-grid">
        <div class="compare-ch">${chA.thumbnail?`<img src="${chA.thumbnail}" style="width:40px;height:40px;border-radius:50%;border:2px solid rgba(255,51,51,.4)">`:''}
          <div><div style="font-size:13px;font-weight:700">${chA.title}</div>${chA.country?`<div style="font-size:10px;color:var(--muted)">📍${chA.country}</div>`:''}</div></div>
        <div class="vs-label">VS</div>
        <div class="compare-ch right">${chB.thumbnail?`<img src="${chB.thumbnail}" style="width:40px;height:40px;border-radius:50%;border:2px solid rgba(34,211,238,.4)">`:''}
          <div style="text-align:right"><div style="font-size:13px;font-weight:700">${chB.title}</div>${chB.country?`<div style="font-size:10px;color:var(--muted)">📍${chB.country}</div>`:''}</div></div>
      </div>${bars}</div>`;
    refreshStatus();
  } catch(e) { errBox('compareResult',e.message); }
}

// ── Histórico ─────────────────────────────────────────────────────────────────
let histVideos=[], histSort='date';
async function loadHistory() {
  const val=document.getElementById('historyInput').value.trim(); if(!val)return;
  loading('historyResult');
  try {
    const channelId=await resolveChannel(val);
    histVideos=await api(`/api/channel-videos?id=${encodeURIComponent(channelId)}&max=20`);
    renderHistory(); refreshStatus();
  } catch(e) { errBox('historyResult',e.message); }
}
function renderHistory() {
  const sorted=[...histVideos].sort((a,b)=>{ if(histSort==='views')return b.views-a.views;if(histSort==='likes')return b.likes-a.likes;if(histSort==='engagement')return parseFloat(b.engagement)-parseFloat(a.engagement);return new Date(b.publishedAt)-new Date(a.publishedAt); });
  const maxV=Math.max(...sorted.map(v=>v.views),1);
  const btns=[['date','Recentes'],['views','Views'],['likes','Likes'],['engagement','Eng%']].map(([v,l])=>`<button class="sort-btn${histSort===v?' active':''}" onclick="histSort='${v}';renderHistory()">${l}</button>`).join('');
  document.getElementById('historyResult').innerHTML = `<div class="gap-col"><div class="sort-row">${btns}</div><div class="vid-list">${sorted.map(v=>`
    <a class="vid-item" href="https://youtube.com/watch?v=${v.videoId}" target="_blank" rel="noopener">
      ${v.thumbnail?`<img class="vid-thumb" src="${v.thumbnail}" alt="">`:''}
      <div style="flex:1;min-width:0"><div class="vid-title">${v.title}</div>
        <div class="vid-stats">
          <span class="vid-stat" style="color:#ffd93d">${fmtNum(v.views)} views</span>
          <span class="vid-stat" style="color:#ff6b6b">${fmtNum(v.likes)} likes</span>
          <span class="vid-stat" style="color:#4ade80">${v.engagement}%</span>
          <span class="vid-stat" style="color:var(--dim)">${fmtDur(v.duration)}</span>
        </div>
        <div class="vid-perf"><div class="vid-perf-fill" style="width:${(v.views/maxV*100).toFixed(0)}%"></div></div>
      </div>
      <div class="vid-date">${fmtDate(v.publishedAt)}</div>
    </a>`).join('')}</div></div>`;
}

// ── IA: Títulos ───────────────────────────────────────────────────────────────
async function generateTitles() {
  const tema  = document.getElementById('iaTituloTema').value.trim();
  const nicho = document.getElementById('iaTituloNicho').value;
  const estilo= document.getElementById('iaTituloEstilo').value;
  if (!tema) { errBox('iaTitulosResult','Digite o tema do vídeo.'); return; }
  loading('iaTitulosResult');
  try {
    const { titles } = await api('/api/ia/titulos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tema, nicho, estilo }),
    });
    document.getElementById('iaTitulosResult').innerHTML = `<div class="ia-result">
      <div class="ia-result-label">✨ ${titles.length} Títulos gerados pela Mistral AI — clique para copiar</div>
      ${titles.map((t,i) => {
        const sc = t.score>=80?'#4ade80':t.score>=60?'#ffd93d':'#ff6b6b';
        const safe = t.text.replace(/'/g,"&#39;").replace(/"/g,'&quot;');
        return `<div class="ia-title-item">
          <span class="ia-title-num">${i+1}</span>
          <span class="ia-title-text">${t.text}</span>
          <span class="ia-title-score" style="color:${sc}">${t.score}</span>
          <button class="ia-copy-btn" onclick="navigator.clipboard.writeText(this.dataset.t);this.textContent='✓';setTimeout(()=>this.textContent='Copiar',1500)" data-t="${safe}">Copiar</button>
        </div>`;
      }).join('')}
    </div>`;
    refreshStatus();
  } catch(e) { errBox('iaTitulosResult', e.message); }
}

// ── IA: Descrição ─────────────────────────────────────────────────────────────
async function generateDescription() {
  const titulo = document.getElementById('iaDescTitulo').value.trim();
  const pontos = document.getElementById('iaDescPontos').value.trim();
  const canal  = document.getElementById('iaDescCanal').value.trim();
  const nicho  = document.getElementById('iaDescNicho').value;
  if (!titulo) { errBox('iaDescResult','Título é obrigatório.'); return; }
  loading('iaDescResult');
  try {
    const { description } = await api('/api/ia/descricao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo, pontos, canal, nicho }),
    });
    document.getElementById('iaDescResult').innerHTML = `<div class="ia-result">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div class="ia-result-label">✨ Descrição SEO gerada pela Mistral AI (${description.length} chars)</div>
        <button class="ia-copy-btn" onclick="navigator.clipboard.writeText(document.getElementById('descTextarea').value);this.textContent='✓ Copiado!';setTimeout(()=>this.textContent='📋 Copiar tudo',1500)" style="font-size:11px;padding:6px 12px">📋 Copiar tudo</button>
      </div>
      <textarea id="descTextarea" class="input" style="min-height:300px;font-size:11px;line-height:1.7;background:rgba(0,0,0,.3)">${description.replace(/</g,'&lt;')}</textarea>
    </div>`;
    refreshStatus();
  } catch(e) { errBox('iaDescResult', e.message); }
}

// ── IA: Roteiro ───────────────────────────────────────────────────────────────
async function generateRoteiro() {
  const tema    = document.getElementById('iaRoteiroTema').value.trim();
  const formato = document.getElementById('iaRoteiroFormato').value;
  const estilo  = document.getElementById('iaRoteiroEstilo').value;
  if (!tema) { errBox('iaRoteiroResult','Digite o tema do vídeo.'); return; }
  loading('iaRoteiroResult');
  try {
    const { sections } = await api('/api/ia/roteiro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tema, formato, estilo }),
    });
    const durations = { curto:'5-8 min', medio:'10-15 min', longo:'20-30 min', short:'60 segundos' };
    document.getElementById('iaRoteiroResult').innerHTML = `<div class="ia-result">
      <div class="ia-result-label">✨ Roteiro gerado pela Mistral AI — "${tema}" · ${durations[formato]||''} · ${estilo}</div>
      ${sections.map(s=>`<div style="margin-bottom:16px;border-bottom:1px solid var(--border);padding-bottom:16px">
        <div style="font-size:13px;font-weight:700;color:var(--red2);margin-bottom:8px">${s.title}</div>
        <div style="font-size:12px;color:rgba(255,255,255,.7);line-height:1.75;white-space:pre-wrap">${s.content}</div>
      </div>`).join('')}
      <div style="font-size:10px;color:var(--dim);font-family:var(--mono)">* Adapte à sua linguagem e estilo pessoal.</div>
    </div>`;
    refreshStatus();
  } catch(e) { errBox('iaRoteiroResult', e.message); }
}

// ── SEO Tags ──────────────────────────────────────────────────────────────────
function analyzeSEO() {
  const title=document.getElementById('seoTitle').value.trim(), desc=document.getElementById('seoDesc').value.trim(), cat=document.getElementById('seoCategory').value.trim();
  if(!title){errBox('seoResult','Título é obrigatório.');return;}
  const words=title.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w.length>2);
  const tags=[...new Set([...words,...cat.toLowerCase().split(/\s+/).filter(w=>w.length>2),title.toLowerCase(),cat.toLowerCase(),`${words[0]||''} ${words[1]||''}`.trim(),`best ${words[0]||''}`,`how to ${words[0]||''}`,`${cat||'youtube'} tips`,`${cat||'youtube'} 2025`,`${words[0]||''} guide`])].filter(t=>t.length>1).slice(0,20);
  let score=50; if(title.length>=40&&title.length<=70)score+=20; else if(title.length>=30)score+=10; if(/\d{4}/.test(title))score+=5; if(/how|best|top|guide|tutorial/i.test(title))score+=10; if(cat)score+=10; if(desc.length>50)score+=5; score=Math.min(score,98);
  const sc=score>=70?'#4ade80':score>=40?'#ffd93d':'#ff6b6b', opt=title.length<40?`${title} - Guia Completo ${new Date().getFullYear()}`:title;
  document.getElementById('seoResult').innerHTML=`<div class="gap-col">
    <div class="card" style="display:flex;align-items:center;gap:16px">
      <div class="seo-score-ring" style="border-color:${sc}"><div style="font-size:26px;font-weight:800;font-family:var(--mono);color:${sc}">${score}</div><div style="font-size:8px;color:var(--muted)">SCORE</div></div>
      <div style="flex:1"><div style="font-size:11px;color:var(--muted);margin-bottom:6px;font-family:var(--mono)">TÍTULO OTIMIZADO</div><div style="font-size:13px;color:#fff;line-height:1.5">${opt}</div></div>
    </div>
    <div class="card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><div class="field-label">Tags (${tags.length})</div><button onclick="navigator.clipboard.writeText('${tags.join(', ')}');this.textContent='Copiado!';setTimeout(()=>this.textContent='Copiar',1500)" class="btn btn-ghost" style="padding:5px 11px;font-size:11px">Copiar</button></div><div>${tags.map(t=>`<span class="tag-chip">${t}</span>`).join('')}</div></div>
    <div class="gap-col">${[title.length<40?'📝 Título curto. Mire entre 40-70 caracteres.':'✅ Comprimento do título está bom!',!/\d{4}/.test(title)?'📅 Adicione o ano para aumentar o CTR.':'✅ Título inclui o ano!',!cat?'🏷️ Defina uma categoria para melhor SEO.':'✅ Categoria definida!'].map(t=>`<div class="tip-item"><span>💡</span><span>${t}</span></div>`).join('')}</div>
  </div>`;
}

// ── Pesquisa ──────────────────────────────────────────────────────────────────
const SUBNICHOES = {
  'Animais':['Cães','Gatos','Animais Selvagens','Aquários','Aves','Répteis','Fazenda'],
  'Arte e Design':['Desenho','Pintura','Design Gráfico','Fotografia','Escultura','Tatuagem','Origami'],
  'Automotivo':['Carros','Motos','Caminhões','Pickups','Trucks','Manufatura','Reconstrução','Modificações','Drift','Rally'],
  'Aventura':['Escalada','Trilhas','Mergulho','Camping','Sobrevivência','Parapente','Motocross'],
  'Cinema':['Análise de Filmes','Trailers','Bastidores','Críticas','Clássicos','Animação'],
  'Comédia':['Stand Up','Paródia','Sketches','Pegadinhas','Memes'],
  'Culinária':['Receitas','Doces','Vegano','Churrasco','Confeitaria','Fitness Food','Comida Japonesa','Confeitaria'],
  'Documentário':['Dark Hollywood','Desastres','História industrial','História oculta','Histórias de empresas','Storytelling Científico','True Crime','Mistérios'],
  'Educação':['Ciência','Matemática','Idiomas','Vestibular','Concursos','Filosofia','Astronomia'],
  'Empreendedorismo':['Startups','Marketing Digital','Dropshipping','Freelancer','Negócios Online'],
  'Entretenimento':['Reacts','Compilações','Vlogs','Lifestyle','Experimentos','Desafios'],
  'Esportes':['Futebol','NBA','UFC','F1','Natação','Esportes Radicais','Basquete','Tênis'],
  'Finanças':['Investimentos','Crypto','Renda Passiva','Bolsa de Valores','Imposto de Renda','Dívidas'],
  'Fitness':['Musculação','Crossfit','Yoga','Corrida','Nutrição Esportiva','Calistenia'],
  'Gaming':['Gameplay','Reviews de jogos','Esports','Tutoriais','Indie Games','RPG','FPS','Minecraft'],
  'História':['Batalhas','História Antiga','Segunda Guerra','Civilizações','Nostalgia','Imperadores'],
  'Humor':['Stand Up','Paródia','Sketches','Memes','Comédia Dramédia'],
  'Idiomas':['Inglês','Espanhol','Japonês','Coreano','Francês','Mandarim'],
  'Lifestyle':['Minimalismo','Rotina Matinal','Self Help','Desenvolvimento Pessoal','Produtividade'],
  'Manufatura':['Processamento','Construção','Fábricas','Indústria','Ferramentaria'],
  'Moda':['Looks','Tendências','Streetwear','Unboxing Roupas','Brechó'],
  'Motivação':['Mentalidade','Disciplina','Autoconhecimento','Liderança','Foco'],
  'Música':['Clipes','Covers','Instrumentos','Making Of','Rankings','Beat Making'],
  'Negócios':['Marketing','Vendas','Gestão','Liderança','B2B','Franquias'],
  'Nostalgia':['Anos 80','Anos 90','Retro Games','TV Antiga','Cultura Pop'],
  'Notícias':['Política','Economia','Internacional','Tecnologia','Meio Ambiente'],
  'Política':['Nacional','Internacional','Análise','Debates','Geopolítica'],
  'Psicologia':['Comportamento humano','Autoconhecimento','Motivação','Relacionamentos','Ansiedade','Narcisismo'],
  'Religião':['Espiritualidade','Bíblia','Filosofia Cristã','Budismo','Umbanda'],
  'Saúde':['Medicina','Saúde Mental','Dieta','Yoga','Bem-estar'],
  'Tecnologia':['AI','Programação','Gadgets','Reviews Tech','Cybersecurity','Linux','Robótica'],
  'True Crime':['Casos Reais','Serial Killers','Crimes Famosos','Documentários Criminais'],
  'TV e Séries':['Reviews','Análises','Bastidores','Rankings','Maratonas'],
  'Viagem':['Mochilão','Destinos Nacionais','Europa','Ásia','América Latina','Dicas de Viagem'],
};
function onNichoChange() {
  const nicho=document.getElementById('filterNicho').value, sub=document.getElementById('filterSubnicho');
  sub.innerHTML='<option value="">Todos</option>';
  if(nicho&&SUBNICHOES[nicho]) SUBNICHOES[nicho].forEach(s=>{const o=document.createElement('option');o.value=s;o.textContent=s;sub.appendChild(o);});
}

let searchMode='search';
function setSearchMode(mode,el){
  searchMode=mode;
  document.querySelectorAll('#panel-pesquisa .sort-btn').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('searchInputRow').style.display=mode==='search'?'flex':'none';
  document.getElementById('searchFilters').style.display=mode==='search'?'flex':'none';
  document.getElementById('trendingBtn').style.display=mode==='trending'?'block':'none';
  document.getElementById('searchResult').innerHTML='';
}

async function doSearch() {
  const q=document.getElementById('searchInput').value.trim(), nicho=document.getElementById('filterNicho').value, subnicho=document.getElementById('filterSubnicho').value, idioma=document.getElementById('filterIdioma').value, periodo=document.getElementById('filterPeriodo').value, videos=document.getElementById('filterVideos').value, order=document.getElementById('filterOrder').value;
  if(!q&&!nicho&&!subnicho){errBox('searchResult','Digite algo ou selecione um nicho.');return;}
  loading('searchResult');
  try {
    const p=new URLSearchParams({max:16,order});
    if(q)p.set('q',q);if(nicho)p.set('nicho',nicho);if(subnicho)p.set('subnicho',subnicho);if(idioma)p.set('idioma',idioma);if(periodo)p.set('periodo',periodo);if(videos)p.set('videos',videos);
    renderSearchResults(await api(`/api/search?${p.toString()}`)); refreshStatus();
  } catch(e){errBox('searchResult',e.message);}
}

async function loadTrending(){loading('searchResult');try{renderSearchResults(await api('/api/trending?region=BR&max=12'),true);refreshStatus();}catch(e){errBox('searchResult',e.message);}}

function renderSearchResults(items){
  if(!items.length){document.getElementById('searchResult').innerHTML=`<div class="alert alert-info">Nenhum resultado para os filtros selecionados.</div>`;return;}
  document.getElementById('searchResult').innerHTML=`<div class="gap-col">${items.map(item=>`
    <a class="result-item" href="https://youtube.com/watch?v=${item.videoId}" target="_blank" rel="noopener">
      ${item.thumbnail?`<img class="result-thumb" src="${item.thumbnail}" alt="" loading="lazy">`:''}
      <div style="flex:1;min-width:0">
        <div class="result-title">${item.title}</div>
        <div class="result-ch">${item.channelTitle}</div>
        <div class="result-meta">${item.views?fmtNum(item.views)+' views':fmtDate(item.publishedAt)}</div>
      </div>
    </a>`).join('')}</div>`;
}

// ── Download ──────────────────────────────────────────────────────────────────
async function getDownload(){
  const val=document.getElementById('downloadInput').value.trim(); if(!val)return;
  loading('downloadResult');
  try{
    const data=await api(`/api/download?id=${encodeURIComponent(extractVideoId(val))}`);
    if(!data.formats?.length){errBox('downloadResult','Nenhum formato disponível para este vídeo. Tente outro ID.');return;}
    const dlItem=(f,color)=>`<a class="dl-item" href="${f.url}" target="_blank" rel="noopener" onmouseover="this.style.borderColor='${color}55';this.style.background='${color}08'" onmouseout="this.style.borderColor='rgba(255,255,255,0.08)';this.style.background='rgba(255,255,255,0.04)'">
      <div><span class="dl-qual" style="color:${color}">${f.quality}</span><span class="dl-ext">.${f.ext}</span>${f.size?`<span class="dl-size">${f.size}</span>`:''}</div>
      <div class="dl-label" style="color:${color}">${ICO.dl}Download</div></a>`;
    const vs=data.formats.filter(f=>f.type==='video'), as_=data.formats.filter(f=>f.type==='audio');
    let html=`<div class="gap-col">`;
    if(data.title)html+=`<div style="display:flex;gap:12px;align-items:center">${data.thumbnail?`<img src="${data.thumbnail}" style="width:80px;height:45px;object-fit:cover;border-radius:7px" onerror="this.style.display='none'">`:''}
      <div><div style="font-size:13px;font-weight:700">${data.title}</div>${data.duration?`<div style="font-size:11px;color:var(--muted)">⏱ ${data.duration}</div>`:''}</div></div>`;
    if(vs.length)html+=`<div><div class="field-label" style="margin-bottom:10px">🎬 Vídeo</div><div class="gap-col" style="gap:8px">${vs.map(f=>dlItem(f,'#4ade80')).join('')}</div></div>`;
    if(as_.length)html+=`<div><div class="field-label" style="margin-bottom:10px">🎵 Áudio</div><div class="gap-col" style="gap:8px">${as_.map(f=>dlItem(f,'#22d3ee')).join('')}</div></div>`;
    if(!vs.length&&!as_.length)html+=`<div class="alert alert-err">⚠ A API retornou dados mas sem URLs de download. Tente outro vídeo.</div>`;
    html+=`</div>`;
    document.getElementById('downloadResult').innerHTML=html; refreshStatus();
  }catch(e){errBox('downloadResult',e.message);}
}

// ── CPM ───────────────────────────────────────────────────────────────────────
const NICHES=[{label:'Finance/Crypto',cpm:15},{label:'Tech/SaaS',cpm:12},{label:'Business',cpm:10},{label:'Education',cpm:8},{label:'Health/Fitness',cpm:7},{label:'Gaming',cpm:4},{label:'Entertainment',cpm:3},{label:'Music',cpm:2}];
const COUNTRIES=[{label:'🇺🇸 EUA',mult:1},{label:'🇬🇧 UK',mult:0.9},{label:'🇨🇦 Canadá',mult:0.85},{label:'🇦🇺 Austrália',mult:0.85},{label:'🇧🇷 Brasil',mult:0.25},{label:'🇮🇳 Índia',mult:0.15},{label:'🌍 Outros',mult:0.3}];
let selNiche=0,selCountry=0;
function buildCPMUI(){
  document.getElementById('nicheGrid').innerHTML=NICHES.map((n,i)=>`<button class="niche-btn${i===0?' active':''}" onclick="selNiche=${i};document.querySelectorAll('.niche-btn').forEach((b,j)=>b.classList.toggle('active',j===${i}));calcCPM()">${n.label}</button>`).join('');
  document.getElementById('countryGrid').innerHTML=COUNTRIES.map((c,i)=>`<button class="country-btn${i===0?' active':''}" onclick="selCountry=${i};document.querySelectorAll('.country-btn').forEach((b,j)=>b.classList.toggle('active',j===${i}));calcCPM()">${c.label}</button>`).join('');
  calcCPM();
}
function calcCPM(){
  const views=parseInt(document.getElementById('cpmViews').value)||0, ctr=parseInt(document.getElementById('cpmCTR').value)||40;
  const cpm=NICHES[selNiche].cpm*COUNTRIES[selCountry].mult, rpm=cpm*.55, mon=views*(ctr/100), gross=(mon/1000)*cpm, net=(mon/1000)*rpm;
  document.getElementById('earningsCards').innerHTML=[
    {label:'CPM estimado',val:`$${cpm.toFixed(2)}`,color:'#ffd93d'},{label:'RPM (você recebe)',val:`$${rpm.toFixed(2)}`,color:'#4ade80'},
    {label:'Views monetizadas',val:fmtNum(mon),color:'#22d3ee'},{label:'Bruto / mês',val:`$${fmtNum(gross)}`,color:'#ff6b6b'},
    {label:'Líquido / mês',val:`$${fmtNum(net)}`,color:'#4ade80'},{label:'Líquido / ano',val:`$${fmtNum(net*12)}`,color:'#a78bfa'},
  ].map(c=>statCard('',c.label,c.val,c.color)).join('');
  document.getElementById('earningsNote').textContent=`* Estimativa para ${NICHES[selNiche].label} com público em ${COUNTRIES[selCountry].label}.`;
}

// ── Favoritos ─────────────────────────────────────────────────────────────────
let favType='channel';
function setFavType(t,el){favType=t;document.querySelectorAll('#panel-favoritos .sort-btn').forEach(b=>b.classList.remove('active'));el.classList.add('active');document.getElementById('favId').placeholder={channel:'Channel ID ou @handle',video:'Video ID ou URL',search:'Termo de pesquisa'}[t];}
function loadFavs(){try{return JSON.parse(localStorage.getItem('umbra_favs')||'[]');}catch{return[];}}
function saveFavs(f){localStorage.setItem('umbra_favs',JSON.stringify(f));}
function addFavorite(){const n=document.getElementById('favName').value.trim(),i=document.getElementById('favId').value.trim();if(!n||!i)return;const f=loadFavs();f.unshift({id:Date.now(),name:n,resourceId:i,type:favType,addedAt:new Date().toISOString()});saveFavs(f);document.getElementById('favName').value='';document.getElementById('favId').value='';renderFavs();}
function removeFav(id){saveFavs(loadFavs().filter(f=>f.id!==id));renderFavs();}
function renderFavs(){
  const f=loadFavs(),tc={channel:'#ff6b6b',video:'#ffd93d',search:'#22d3ee'},th={channel:id=>`https://youtube.com/channel/${id}`,video:id=>`https://youtube.com/watch?v=${id}`,search:id=>`https://youtube.com/results?search_query=${encodeURIComponent(id)}`};
  if(!f.length){document.getElementById('favList').innerHTML=`<div style="text-align:center;color:var(--dim);font-size:12px;font-family:var(--mono);padding:28px 0">Nenhum favorito ainda</div>`;return;}
  document.getElementById('favList').innerHTML=`<div class="gap-col">${f.map(v=>`<div class="fav-item"><div style="color:${tc[v.type]||'#fff'}">⭐</div><div style="flex:1;min-width:0"><div class="fav-name">${v.name}</div><div class="fav-id"><span style="color:${tc[v.type]};font-size:9px;text-transform:uppercase;letter-spacing:1px;font-family:var(--mono)">${v.type}</span> · ${v.resourceId}</div></div><a class="fav-link" href="${th[v.type](v.resourceId)}" target="_blank" rel="noopener">↗</a><button class="fav-del" onclick="removeFav(${v.id})">🗑</button></div>`).join('')}</div>`;
}

// ── Export PDF ────────────────────────────────────────────────────────────────
async function exportPDF(){
  const val=document.getElementById('exportInput').value.trim(); if(!val)return;
  loading('exportResult');
  try{
    const channelId=await resolveChannel(val);
    const ch=await api(`/api/channel?id=${encodeURIComponent(channelId)}`);
    const {jsPDF}=window.jspdf; const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'}); const W=210,H=297;
    doc.setFillColor(8,8,15);doc.rect(0,0,W,H,'F');
    doc.setFillColor(16,8,8);doc.rect(0,0,W,44,'F');
    doc.setFillColor(200,30,30);doc.rect(0,42,W,2,'F');
    doc.setTextColor(255,255,255);doc.setFontSize(24);doc.setFont('helvetica','bold');doc.text('UMBRA',20,22);
    doc.setFontSize(8);doc.setTextColor(200,80,80);doc.text('YOUTUBE ANALYTICS REPORT',20,30);
    doc.setFontSize(7);doc.setTextColor(80,80,80);doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`,W-18,30,{align:'right'});
    doc.setFontSize(20);doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.text(ch.title||'',20,60);
    doc.setFontSize(9);doc.setFont('helvetica','normal');doc.setTextColor(150,150,150);
    const meta=[ch.country?`País: ${ch.country}`:'',ch.publishedAt?`Criado: ${new Date(ch.publishedAt).getFullYear()}`:''].filter(Boolean).join(' · ');
    if(meta)doc.text(meta,20,68);
    [{label:'INSCRITOS',value:fmtNum(ch.subscribers),color:[255,107,107]},{label:'VIEWS',value:fmtNum(ch.views),color:[255,217,61]},{label:'VÍDEOS',value:fmtNum(ch.videoCount),color:[74,222,128]}].forEach((st,i)=>{const x=20+i*62;doc.setFillColor(20,20,30);doc.roundedRect(x,76,57,30,3,3,'F');doc.setFillColor(...st.color);doc.roundedRect(x,76,57,2,1,1,'F');doc.setFontSize(17);doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.text(st.value,x+28.5,90,{align:'center'});doc.setFontSize(7);doc.setTextColor(...st.color);doc.text(st.label,x+28.5,98,{align:'center'});});
    if(ch.description){doc.setFontSize(10);doc.setTextColor(180,60,60);doc.setFont('helvetica','bold');doc.text('SOBRE O CANAL',20,118);doc.setFontSize(9);doc.setTextColor(160,160,160);doc.setFont('helvetica','normal');doc.text(doc.splitTextToSize(ch.description.substring(0,600),W-40).slice(0,10),20,128);}
    doc.setFillColor(16,16,24);doc.rect(0,H-16,W,16,'F');doc.setFillColor(200,30,30);doc.rect(0,H-16,W,.8,'F');doc.setFontSize(7);doc.setTextColor(70,70,70);doc.text('Umbra YouTube Analytics v5 · Railway',W/2,H-6,{align:'center'});
    const fn=`umbra-${(ch.title||'canal').replace(/\s+/g,'-').toLowerCase().substring(0,30)}.pdf`; doc.save(fn);
    document.getElementById('exportResult').innerHTML=`<div class="alert alert-ok">✓ PDF <strong>${fn}</strong> baixado!</div>`;
    refreshStatus();
  }catch(e){errBox('exportResult',e.message);}
}

// ── Swipe to open/close sidebar (mobile) ─────────────────────────────────────
(function initSwipe() {
  let startX = 0, startY = 0;
  const THRESHOLD = 50, EDGE = 30;

  document.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = Math.abs(e.changedTouches[0].clientY - startY);
    if (dy > 60) return; // vertical scroll — ignore
    const sb = document.getElementById('sidebar');
    // Swipe right from left edge → open
    if (dx > THRESHOLD && startX < EDGE && !sb.classList.contains('open')) {
      toggleSidebar();
    }
    // Swipe left when open → close
    if (dx < -THRESHOLD && sb.classList.contains('open')) {
      closeSidebar();
    }
  }, { passive: true });
})();

// ── Init ──────────────────────────────────────────────────────────────────────
(function init() {
  buildCPMUI();
  renderFavs();
  fetchStatus();
  setInterval(fetchStatus, 30000);
  // Hero video fixo (definido na constante HERO_VIDEO_ID acima)
  renderHeroVideo(HERO_VIDEO_ID);
})();
