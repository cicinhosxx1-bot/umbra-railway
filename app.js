// Umbra YouTube Analytics — Frontend JS
// Todas as chamadas vão para o backend /api/*

async function api(path) {
  const res = await fetch(path);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
  return data;
}

// ── Pool Status ───────────────────────────────────────────────────────────────
async function fetchStatus() {
  try {
    const { pools } = await api('/api/status');
    const total = pools.reduce((s, p) => s + p.totalUsage, 0);
    document.getElementById('totalReq').textContent = total;
    document.getElementById('poolsGrid').innerHTML = pools.map(p => {
      const pct  = Math.round((p.currentUsage / p.limit) * 100);
      const color = p.aliveKeys === 0 ? '#ff4444' : p.aliveKeys <= 3 ? '#ffd93d' : '#6bcb77';
      const dots  = p.keys.map(k => {
        let bg = 'rgba(255,255,255,0.12)';
        if (k.active && !k.dead) bg = '#6bcb77';
        else if (k.dead)         bg = 'rgba(255,80,80,0.5)';
        else if (k.usage > 0)    bg = '#ffd93d';
        return `<div class="kdot" style="background:${bg}" title="KEY_${k.n}: ${k.usage}/${p.limit}"></div>`;
      }).join('');
      return `<div class="pool-card">
        <div class="pool-card-header">
          <span class="pool-card-name" style="color:${color}">${p.name}</span>
          <span class="pool-card-keys">${p.aliveKeys}/10</span>
        </div>
        <div class="pool-progress">
          <div class="pool-track"><div class="pool-fill" style="width:${pct}%;background:${color}"></div></div>
          <span class="pool-usage">${p.currentUsage}/${p.limit}</span>
        </div>
        <div class="pool-dots">${dots}</div>
      </div>`;
    }).join('');
  } catch(e) {
    document.getElementById('poolsGrid').innerHTML = `<div style="color:rgba(255,80,80,.6);font-size:11px;font-family:var(--mono)">⚠ Servidor offline</div>`;
  }
}
function refreshStatus() { setTimeout(fetchStatus, 600); }

// ── Utils ─────────────────────────────────────────────────────────────────────
const fmtNum = n => {
  if (!n) return '0';
  const v = parseInt(n);
  if (v >= 1e9) return (v/1e9).toFixed(1)+'B';
  if (v >= 1e6) return (v/1e6).toFixed(1)+'M';
  if (v >= 1e3) return (v/1e3).toFixed(1)+'K';
  return v.toLocaleString('pt-BR');
};
const fmtDate = iso => !iso ? '—' : new Date(iso).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'});
const fmtDur  = iso => {
  if (!iso) return '—';
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return iso;
  const h = m[1] ? `${m[1]}:` : '';
  return `${h}${(m[2]||'0').padStart(h?2:1,'0')}:${(m[3]||'0').padStart(2,'0')}`;
};
const extractVideoId = s => { const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/); return m ? m[1] : s.trim(); };
const isUCId = s => /^UC[\w-]{21,}$/.test(s);
const loading = id => document.getElementById(id).innerHTML = `<div class="loading-row"><svg class="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>Carregando...</div>`;
const errBox  = (id, msg) => document.getElementById(id).innerHTML = `<div class="alert alert-err">⚠ ${msg}</div>`;
const statCard = (icon, label, value, color) => `<div class="card"><div style="color:${color};opacity:.9;margin-bottom:6px">${icon}</div><div class="stat-val">${value}</div><div class="stat-label">${label}</div><div class="card-glow" style="background:${color}"></div></div>`;

const ICON_USERS = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
const ICON_EYE   = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>';
const ICON_VID   = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><polygon points="10,9 16,12 10,15" fill="currentColor" stroke="none"/></svg>';
const ICON_HEART = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>';
const ICON_MSG   = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
const ICON_TREND = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>';
const ICON_DL    = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12m0 0-4-4m4 4 4-4"/><path d="M3 18h18"/></svg>';

async function resolveChannel(val) {
  if (isUCId(val)) return val;
  const urlMatch = val.match(/channel\/(UC[\w-]{21,})/);
  if (urlMatch) return urlMatch[1];
  const q = val.replace(/^@/, '').replace(/.*\//, '').trim();
  const { channelId } = await api(`/api/resolve-channel?q=${encodeURIComponent(q)}`);
  return channelId;
}

// ── Tab Navigation ────────────────────────────────────────────────────────────
function setTab(id) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active-analise','active-tools','active-extra'));
  document.getElementById('panel-'+id).classList.add('active');
  const btn = document.getElementById('tab-'+id);
  btn.classList.add('active-'+btn.dataset.group);
}

// ── 1. Canal ──────────────────────────────────────────────────────────────────
async function analyzeChannel() {
  const val = document.getElementById('channelInput').value.trim();
  if (!val) return;
  loading('channelResult');
  try {
    const channelId = await resolveChannel(val);
    const ch = await api(`/api/channel?id=${encodeURIComponent(channelId)}`);
    document.getElementById('channelResult').innerHTML = `
      <div class="gap-col">
        <div class="ch-header">
          ${ch.thumbnail ? `<img class="ch-avatar" src="${ch.thumbnail}" alt="">` : ''}
          <div><div class="ch-name">${ch.title}</div>
          <div class="ch-meta">${ch.country?`📍 ${ch.country} · `:''}Criado em ${fmtDate(ch.publishedAt)}</div></div>
        </div>
        <div class="stats-grid">
          ${statCard(ICON_USERS,'Inscritos',fmtNum(ch.subscribers),'#ff6b6b')}
          ${statCard(ICON_EYE,'Views totais',fmtNum(ch.views),'#ffd93d')}
          ${statCard(ICON_VID,'Vídeos',fmtNum(ch.videoCount),'#6bcb77')}
        </div>
        ${ch.description?`<div class="desc-box"><p>${ch.description.substring(0,500).replace(/\n/g,'<br>')}</p></div>`:''}
      </div>`;
    refreshStatus();
  } catch(e) { errBox('channelResult', e.message); }
}

// ── 2. Vídeo ──────────────────────────────────────────────────────────────────
async function analyzeVideo() {
  const val = document.getElementById('videoInput').value.trim();
  if (!val) return;
  loading('videoResult');
  try {
    const v = await api(`/api/video?id=${encodeURIComponent(extractVideoId(val))}`);
    document.getElementById('videoResult').innerHTML = `
      <div class="gap-col">
        ${v.thumbnail?`<img class="thumb" src="${v.thumbnail}" alt="">`:''}
        <div><div style="font-size:16px;font-weight:800;line-height:1.4">${v.title}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:6px">${v.channelTitle} · ${fmtDate(v.publishedAt)} · ⏱ ${fmtDur(v.duration)}</div></div>
        <div class="stats-grid">
          ${statCard(ICON_EYE,'Views',fmtNum(v.views),'#ffd93d')}
          ${statCard(ICON_HEART,'Likes',fmtNum(v.likes),'#ff6b6b')}
          ${statCard(ICON_MSG,'Comentários',fmtNum(v.comments),'#6bcb77')}
          ${statCard(ICON_TREND,'Engajamento',v.engagement+'%','#4ecdc4')}
        </div>
      </div>`;
    refreshStatus();
  } catch(e) { errBox('videoResult', e.message); }
}

// ── 3. Comparar ───────────────────────────────────────────────────────────────
async function compareChannels() {
  const a = document.getElementById('compareA').value.trim();
  const b = document.getElementById('compareB').value.trim();
  if (!a||!b) { errBox('compareResult','Preencha os dois canais.'); return; }
  loading('compareResult');
  try {
    const [idA, idB] = await Promise.all([resolveChannel(a), resolveChannel(b)]);
    const { a: chA, b: chB } = await api(`/api/compare?a=${encodeURIComponent(idA)}&b=${encodeURIComponent(idB)}`);
    const metrics = [{label:'Inscritos',key:'subscribers',color:'#ff6b6b'},{label:'Views totais',key:'views',color:'#ffd93d'},{label:'Vídeos',key:'videoCount',color:'#6bcb77'}];
    const bars = metrics.map(m => {
      const vA=parseInt(chA[m.key]||0), vB=parseInt(chB[m.key]||0), pA=((vA/(vA+vB||1))*100).toFixed(1), win=vA>=vB?'a':'b';
      return `<div class="compare-bar-row"><div class="bar-header">
        <span class="bar-val" style="color:${win==='a'?m.color:'rgba(255,255,255,.4)'}">${win==='a'?'👑 ':''}${fmtNum(vA)}</span>
        <span class="bar-label">${m.label}</span>
        <span class="bar-val" style="color:${win==='b'?m.color:'rgba(255,255,255,.4)'}">${win==='b'?'👑 ':''}${fmtNum(vB)}</span>
      </div><div class="bar-track"><div class="bar-a" style="width:${pA}%"></div><div class="bar-b"></div></div></div>`;
    }).join('');
    document.getElementById('compareResult').innerHTML = `<div class="gap-col">
      <div class="compare-grid">
        <div class="compare-ch">${chA.thumbnail?`<img src="${chA.thumbnail}" style="width:42px;height:42px;border-radius:50%;border:2px solid rgba(255,80,80,.4)">`:''}
          <div><div style="font-size:13px;font-weight:700">${chA.title}</div>${chA.country?`<div style="font-size:10px;color:var(--muted)">📍${chA.country}</div>`:''}</div></div>
        <div class="vs-label">VS</div>
        <div class="compare-ch right">${chB.thumbnail?`<img src="${chB.thumbnail}" style="width:42px;height:42px;border-radius:50%;border:2px solid rgba(78,205,196,.4)">`:''}
          <div style="text-align:right"><div style="font-size:13px;font-weight:700">${chB.title}</div>${chB.country?`<div style="font-size:10px;color:var(--muted)">📍${chB.country}</div>`:''}</div></div>
      </div>${bars}</div>`;
    refreshStatus();
  } catch(e) { errBox('compareResult', e.message); }
}

// ── 4. Histórico ──────────────────────────────────────────────────────────────
let historyVideos=[], histSort='date';
async function loadHistory() {
  const val = document.getElementById('historyInput').value.trim();
  if (!val) return;
  loading('historyResult');
  try {
    const channelId = await resolveChannel(val);
    historyVideos = await api(`/api/channel-videos?id=${encodeURIComponent(channelId)}&max=20`);
    renderHistory();
    refreshStatus();
  } catch(e) { errBox('historyResult', e.message); }
}
function renderHistory() {
  const sorted = [...historyVideos].sort((a,b)=>{
    if(histSort==='views') return b.views-a.views;
    if(histSort==='likes') return b.likes-a.likes;
    if(histSort==='engagement') return parseFloat(b.engagement)-parseFloat(a.engagement);
    return new Date(b.publishedAt)-new Date(a.publishedAt);
  });
  const maxV = Math.max(...sorted.map(v=>v.views),1);
  const btns = [['date','Recentes'],['views','Views'],['likes','Likes'],['engagement','Eng%']].map(([v,l])=>`<button class="sort-btn${histSort===v?' active':''}" onclick="histSort='${v}';renderHistory()">${l}</button>`).join('');
  const items = sorted.map(v=>`<a class="vid-item" href="https://youtube.com/watch?v=${v.videoId}" target="_blank" rel="noopener">
    ${v.thumbnail?`<img class="vid-thumb" src="${v.thumbnail}" alt="">`:''}
    <div style="flex:1;min-width:0"><div class="vid-title">${v.title}</div>
      <div class="vid-stats">
        <span class="vid-stat" style="color:#ffd93d">${fmtNum(v.views)} views</span>
        <span class="vid-stat" style="color:#ff6b6b">${fmtNum(v.likes)} likes</span>
        <span class="vid-stat" style="color:#6bcb77">${v.engagement}% eng</span>
        <span class="vid-stat" style="color:var(--dim)">${fmtDur(v.duration)}</span>
      </div>
      <div class="vid-perf"><div class="vid-perf-fill" style="width:${(v.views/maxV*100).toFixed(0)}%"></div></div>
    </div>
    <div class="vid-date">${fmtDate(v.publishedAt)}</div>
  </a>`).join('');
  document.getElementById('historyResult').innerHTML = `<div class="gap-col"><div class="sort-row">${btns}</div><div class="vid-list">${items}</div></div>`;
}

// ── 5. Pesquisa / Trending ────────────────────────────────────────────────────
const SUBNICHOES = {
  'Automotivo':    ['Auto','Carros','Motos','Caminhões','Pickups','Trucks','Manufatura','Reconstrução'],
  'Culinária':     ['Receitas','Doces','Vegano','Churrasco','Confeitaria','Fitness Food'],
  'Documentário':  ['Dark Hollywood','Desastres meteorológicos','História de famílias','História industrial','História oculta','Histórias de empresas icônicas','Histórias Emocionantes','Storytelling Científico','Storytelling Histórico','Curiosidades - Real estate'],
  'Educação':      ['Ciência','Matemática','Idiomas','Vestibular','Concursos','Filosofia'],
  'Entretenimento':['Reacts','Compilações','Vlogs','Lifestyle','Humor'],
  'Esportes':      ['Futebol','NBA','UFC','F1','Natação','Esportes Radicais'],
  'Finanças':      ['Investimentos','Crypto','Renda Passiva','Empreendedorismo','Bolsa de Valores'],
  'Gaming':        ['Gameplay','Reviews de jogos','Esports','Tutoriais','Indie Games'],
  'História':      ['Batalhas','História Antiga','Segunda Guerra','Civilizações','Nostalgia'],
  'Humor':         ['Stand Up','Paródia','Sketches','Memes'],
  'Manufatura':    ['Processamento','Construção','Fábricas','Indústria'],
  'Música':        ['Clipes','Covers','Instrumentos','Making Of','Rankings'],
  'Negócios':      ['Marketing','Vendas','Startups','Gestão','Liderança'],
  'Nostalgia':     ['Anos 80','Anos 90','Retro Games','TV Antiga'],
  'Psicologia':    ['Psicologia junguiana moderna','Comportamento humano','Autoconhecimento','Motivação','Relacionamentos'],
  'Saúde':         ['Fitness','Dieta','Medicina','Saúde Mental','Yoga'],
  'Tecnologia':    ['AI','Programação','Gadgets','Reviews Tech','Cybersecurity'],
};

function onNichoChange() {
  const nicho = document.getElementById('filterNicho').value;
  const sub   = document.getElementById('filterSubnicho');
  sub.innerHTML = '<option value="">Todos</option>';
  if (nicho && SUBNICHOES[nicho]) {
    SUBNICHOES[nicho].forEach(s => {
      const opt = document.createElement('option');
      opt.value = s; opt.textContent = s; sub.appendChild(opt);
    });
  }
}

let searchMode = 'search';
function setSearchMode(mode, el) {
  searchMode = mode;
  document.querySelectorAll('#panel-search .sort-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  const isSearch = mode === 'search';
  document.getElementById('searchInputRow').style.display = isSearch ? 'flex' : 'none';
  document.getElementById('searchFilters').style.display  = isSearch ? 'flex' : 'none';
  document.getElementById('trendingBtn').style.display    = isSearch ? 'none' : 'block';
  document.getElementById('searchResult').innerHTML = '';
}

async function doSearch() {
  const q        = document.getElementById('searchInput').value.trim();
  const nicho    = document.getElementById('filterNicho').value;
  const subnicho = document.getElementById('filterSubnicho').value;
  const idioma   = document.getElementById('filterIdioma').value;
  const periodo  = document.getElementById('filterPeriodo').value;
  const videos   = document.getElementById('filterVideos').value;
  const order    = document.getElementById('filterOrder').value;

  if (!q && !nicho && !subnicho) { errBox('searchResult','Digite algo ou selecione um nicho.'); return; }
  loading('searchResult');
  try {
    const params = new URLSearchParams({ max: 16, order });
    if (q)        params.set('q', q);
    if (nicho)    params.set('nicho', nicho);
    if (subnicho) params.set('subnicho', subnicho);
    if (idioma)   params.set('idioma', idioma);
    if (periodo)  params.set('periodo', periodo);
    if (videos)   params.set('videos', videos);
    const results = await api(`/api/search?${params.toString()}`);
    renderSearchResults(results);
    refreshStatus();
  } catch(e) { errBox('searchResult', e.message); }
}

async function loadTrending() {
  loading('searchResult');
  try { renderSearchResults(await api('/api/trending?region=BR&max=12'), true); refreshStatus(); }
  catch(e) { errBox('searchResult', e.message); }
}

function renderSearchResults(items) {
  if (!items.length) { document.getElementById('searchResult').innerHTML=`<div class="alert alert-info">Nenhum resultado para os filtros selecionados.</div>`; return; }
  document.getElementById('searchResult').innerHTML = `<div class="gap-col">${items.map(item => `
    <a class="result-item" href="https://youtube.com/watch?v=${item.videoId}" target="_blank" rel="noopener">
      ${item.thumbnail ? `<img class="result-thumb" src="${item.thumbnail}" alt="">` : ''}
      <div style="flex:1;min-width:0">
        <div class="result-title">${item.title}</div>
        <div class="result-ch">${item.channelTitle}</div>
        <div class="result-views">${item.views ? fmtNum(item.views)+' views' : fmtDate(item.publishedAt)}</div>
      </div>
    </a>`).join('')}</div>`;
}

// ── 6. Download ───────────────────────────────────────────────────────────────
async function getDownload(){
  const val=document.getElementById('downloadInput').value.trim();if(!val)return;
  loading('downloadResult');
  try{
    const data=await api(`/api/download?id=${encodeURIComponent(extractVideoId(val))}`);
    if(!data.formats?.length){errBox('downloadResult','Nenhum formato disponível.');return;}
    const dlItem=(f,color)=>`<a class="dl-item" href="${f.url}" target="_blank" rel="noopener" onmouseover="this.style.borderColor='${color}55';this.style.background='${color}08'" onmouseout="this.style.borderColor='rgba(255,255,255,0.07)';this.style.background='rgba(255,255,255,0.03)'">
      <div><span class="dl-qual" style="color:${color}">${f.quality}</span><span class="dl-ext">.${f.ext}</span>${f.size?`<span class="dl-size">${f.size}</span>`:''}</div>
      <div class="dl-btn-label" style="color:${color}">${ICON_DL}Download</div></a>`;
    const vs=data.formats.filter(f=>f.type==='video'), as_=data.formats.filter(f=>f.type==='audio');
    let html=`<div class="gap-col">`;
    if(data.title)html+=`<div style="display:flex;gap:12px;align-items:center">${data.thumbnail?`<img src="${data.thumbnail}" style="width:80px;height:45px;object-fit:cover;border-radius:6px">`:''}
      <div><div style="font-size:13px;font-weight:700">${data.title}</div>${data.duration?`<div style="font-size:11px;color:var(--muted)">⏱ ${data.duration}</div>`:''}</div></div>`;
    if(vs.length)html+=`<div><div class="field-label" style="margin-bottom:10px">🎬 Vídeo</div><div class="gap-col" style="gap:8px">${vs.map(f=>dlItem(f,'#6bcb77')).join('')}</div></div>`;
    if(as_.length)html+=`<div><div class="field-label" style="margin-bottom:10px">🎵 Áudio</div><div class="gap-col" style="gap:8px">${as_.map(f=>dlItem(f,'#4ecdc4')).join('')}</div></div>`;
    html+=`</div>`;
    document.getElementById('downloadResult').innerHTML=html;
    refreshStatus();
  }catch(e){errBox('downloadResult',e.message);}
}

// ── 7. CPM ────────────────────────────────────────────────────────────────────
const NICHES=[{label:'Finance/Crypto',cpm:15},{label:'Tech/SaaS',cpm:12},{label:'Business',cpm:10},{label:'Education',cpm:8},{label:'Health/Fitness',cpm:7},{label:'Gaming',cpm:4},{label:'Entertainment',cpm:3},{label:'Music',cpm:2}];
const COUNTRIES=[{label:'🇺🇸 EUA',mult:1},{label:'🇬🇧 UK',mult:0.9},{label:'🇨🇦 Canadá',mult:0.85},{label:'🇦🇺 Austrália',mult:0.85},{label:'🇧🇷 Brasil',mult:0.25},{label:'🇮🇳 Índia',mult:0.15},{label:'🌍 Outros',mult:0.3}];
let selNiche=0,selCountry=0;
function buildCPMUI(){
  document.getElementById('nicheGrid').innerHTML=NICHES.map((n,i)=>`<button class="niche-btn${i===0?' active':''}" onclick="selNiche=${i};document.querySelectorAll('.niche-btn').forEach((b,j)=>b.classList.toggle('active',j===${i}));calcCPM()">${n.label}</button>`).join('');
  document.getElementById('countryGrid').innerHTML=COUNTRIES.map((c,i)=>`<button class="country-btn${i===0?' active':''}" onclick="selCountry=${i};document.querySelectorAll('.country-btn').forEach((b,j)=>b.classList.toggle('active',j===${i}));calcCPM()">${c.label}</button>`).join('');
  calcCPM();
}
function calcCPM(){
  const views=parseInt(document.getElementById('cpmViews').value)||0,ctr=parseInt(document.getElementById('cpmCTR').value)||40;
  const cpm=NICHES[selNiche].cpm*COUNTRIES[selCountry].mult,rpm=cpm*0.55,mon=views*(ctr/100),gross=(mon/1000)*cpm,net=(mon/1000)*rpm;
  document.getElementById('earningsCards').innerHTML=[
    {label:'CPM estimado',val:`$${cpm.toFixed(2)}`,color:'#ffd93d'},{label:'RPM (você recebe)',val:`$${rpm.toFixed(2)}`,color:'#6bcb77'},
    {label:'Views monetizadas',val:fmtNum(mon),color:'#4ecdc4'},{label:'Bruto / mês',val:`$${fmtNum(gross)}`,color:'#ff6b6b'},
    {label:'Líquido / mês',val:`$${fmtNum(net)}`,color:'#6bcb77'},{label:'Líquido / ano',val:`$${fmtNum(net*12)}`,color:'#c77dff'},
  ].map(c=>statCard('',c.label,c.val,c.color)).join('');
  document.getElementById('earningsNote').textContent=`* Estimativa para ${NICHES[selNiche].label} com público em ${COUNTRIES[selCountry].label}.`;
}

// ── 8. SEO ────────────────────────────────────────────────────────────────────
function analyzeSEO(){
  const title=document.getElementById('seoTitle').value.trim(),desc=document.getElementById('seoDesc').value.trim(),cat=document.getElementById('seoCategory').value.trim();
  if(!title){errBox('seoResult','Título é obrigatório.');return;}
  const words=title.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w.length>2);
  const tags=[...new Set([...words,...cat.toLowerCase().split(/\s+/).filter(w=>w.length>2),title.toLowerCase(),cat.toLowerCase(),`${words[0]||''} ${words[1]||''}`.trim(),`best ${words[0]||''}`,`how to ${words[0]||''}`,`${cat||'youtube'} tips`,`${cat||'youtube'} tutorial`,`${words[0]||''} 2025`,`${words[0]||''} guide`])].filter(t=>t.length>1).slice(0,20);
  let score=50;if(title.length>=40&&title.length<=70)score+=20;else if(title.length>=30)score+=10;if(/\d{4}/.test(title))score+=5;if(/how|best|top|guide|tutorial/i.test(title))score+=10;if(cat)score+=10;if(desc.length>50)score+=5;score=Math.min(score,98);
  const sc=score>=70?'#6bcb77':score>=40?'#ffd93d':'#ff6b6b';
  const opt=title.length<40?`${title} - Complete Guide ${new Date().getFullYear()}`:title;
  const tips=[title.length<40?'📝 Título curto. Mire entre 40-70 caracteres.':'✅ Comprimento do título está bom!',!/\d{4}/.test(title)?'📅 Adicione o ano ao título para aumentar o CTR.':'✅ Título inclui o ano!',!cat?'🏷️ Defina uma categoria para melhor recomendação.':'✅ Categoria definida!'];
  document.getElementById('seoResult').innerHTML=`<div class="gap-col">
    <div class="card" style="display:flex;align-items:center;gap:16px">
      <div class="seo-score-ring" style="border-color:${sc}"><div style="font-size:26px;font-weight:800;font-family:var(--mono);color:${sc}">${score}</div><div style="font-size:8px;color:var(--muted)">SCORE</div></div>
      <div style="flex:1"><div style="font-size:11px;color:var(--muted);margin-bottom:6px;font-family:var(--mono)">TÍTULO OTIMIZADO</div><div style="font-size:13px;color:#fff;line-height:1.5">${opt}</div></div>
    </div>
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div class="field-label">Tags (${tags.length})</div>
        <button onclick="navigator.clipboard.writeText('${tags.join(', ')}');this.textContent='✓ Copiado!';setTimeout(()=>this.textContent='📋 Copiar',1500)" class="btn btn-ghost" style="padding:5px 11px;font-size:11px">📋 Copiar</button>
      </div>
      <div>${tags.map(t=>`<span class="tag-chip">${t}</span>`).join('')}</div>
    </div>
    <div class="gap-col">${tips.map(t=>`<div class="tip-item"><span>💡</span><span>${t}</span></div>`).join('')}</div>
  </div>`;
}

// ── 9. Favoritos ──────────────────────────────────────────────────────────────
let favType='channel';
function setFavType(t,el){favType=t;document.querySelectorAll('#panel-favorites .sort-btn').forEach(b=>b.classList.remove('active'));el.classList.add('active');document.getElementById('favId').placeholder={channel:'Channel ID ou @handle',video:'Video ID ou URL',search:'Termo de pesquisa'}[t];}
function loadFavs(){try{return JSON.parse(localStorage.getItem('umbra_favs')||'[]');}catch{return[];}}
function saveFavs(f){localStorage.setItem('umbra_favs',JSON.stringify(f));}
function addFavorite(){const n=document.getElementById('favName').value.trim(),i=document.getElementById('favId').value.trim();if(!n||!i)return;const f=loadFavs();f.unshift({id:Date.now(),name:n,resourceId:i,type:favType,addedAt:new Date().toISOString()});saveFavs(f);document.getElementById('favName').value='';document.getElementById('favId').value='';renderFavs();}
function removeFav(id){saveFavs(loadFavs().filter(f=>f.id!==id));renderFavs();}
function renderFavs(){
  const f=loadFavs(),tc={channel:'#ff6b6b',video:'#ffd93d',search:'#4ecdc4'},th={channel:id=>`https://youtube.com/channel/${id}`,video:id=>`https://youtube.com/watch?v=${id}`,search:id=>`https://youtube.com/results?search_query=${encodeURIComponent(id)}`};
  if(!f.length){document.getElementById('favList').innerHTML=`<div style="text-align:center;color:var(--dim);font-size:12px;font-family:var(--mono);padding:28px 0">Nenhum favorito salvo ainda</div>`;return;}
  document.getElementById('favList').innerHTML=`<div class="gap-col">${f.map(v=>`<div class="fav-item"><div style="color:${tc[v.type]||'#fff'}">⭐</div><div style="flex:1;min-width:0"><div class="fav-name">${v.name}</div><div class="fav-id"><span style="color:${tc[v.type]};font-size:9px;text-transform:uppercase;letter-spacing:1px;font-family:var(--mono)">${v.type}</span> · ${v.resourceId}</div></div><a class="fav-link" href="${th[v.type](v.resourceId)}" target="_blank" rel="noopener">↗</a><button class="fav-del" onclick="removeFav(${v.id})">🗑</button></div>`).join('')}</div>`;
}

// ── 10. Export PDF ────────────────────────────────────────────────────────────
async function exportPDF(){
  const val=document.getElementById('exportInput').value.trim();if(!val)return;
  loading('exportResult');
  try{
    const channelId=await resolveChannel(val);
    const ch=await api(`/api/channel?id=${encodeURIComponent(channelId)}`);
    const {jsPDF}=window.jspdf;const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});const W=210,H=297;
    doc.setFillColor(10,10,12);doc.rect(0,0,W,H,'F');
    doc.setFillColor(20,8,8);doc.rect(0,0,W,44,'F');
    doc.setFillColor(200,30,30);doc.rect(0,42,W,2,'F');
    doc.setTextColor(255,255,255);doc.setFontSize(24);doc.setFont('helvetica','bold');doc.text('UMBRA',20,22);
    doc.setFontSize(8);doc.setTextColor(200,80,80);doc.text('YOUTUBE ANALYTICS REPORT',20,30);
    doc.setFontSize(7);doc.setTextColor(80,80,80);doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`,W-18,30,{align:'right'});
    doc.setFontSize(20);doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.text(ch.title||'',20,60);
    doc.setFontSize(9);doc.setFont('helvetica','normal');doc.setTextColor(150,150,150);
    const meta=[ch.country?`País: ${ch.country}`:'',ch.publishedAt?`Criado: ${new Date(ch.publishedAt).getFullYear()}`:''].filter(Boolean).join(' · ');
    if(meta)doc.text(meta,20,68);
    [{label:'INSCRITOS',value:fmtNum(ch.subscribers),color:[255,107,107]},{label:'VIEWS',value:fmtNum(ch.views),color:[255,217,61]},{label:'VÍDEOS',value:fmtNum(ch.videoCount),color:[107,203,119]}].forEach((st,i)=>{const x=20+i*62;doc.setFillColor(22,22,26);doc.roundedRect(x,76,57,30,3,3,'F');doc.setFillColor(...st.color);doc.roundedRect(x,76,57,2,1,1,'F');doc.setFontSize(17);doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.text(st.value,x+28.5,90,{align:'center'});doc.setFontSize(7);doc.setTextColor(...st.color);doc.text(st.label,x+28.5,98,{align:'center'});});
    if(ch.description){doc.setFontSize(10);doc.setTextColor(180,60,60);doc.setFont('helvetica','bold');doc.text('SOBRE O CANAL',20,118);doc.setFontSize(9);doc.setTextColor(160,160,160);doc.setFont('helvetica','normal');doc.text(doc.splitTextToSize(ch.description.substring(0,600),W-40).slice(0,10),20,128);}
    doc.setFillColor(16,16,18);doc.rect(0,H-16,W,16,'F');doc.setFillColor(200,30,30);doc.rect(0,H-16,W,.8,'F');doc.setFontSize(7);doc.setTextColor(70,70,70);doc.text('Umbra YouTube Analytics · Railway',W/2,H-6,{align:'center'});
    const fn=`umbra-${(ch.title||'canal').replace(/\s+/g,'-').toLowerCase().substring(0,30)}.pdf`;doc.save(fn);
    document.getElementById('exportResult').innerHTML=`<div class="alert alert-ok">✓ PDF <strong>${fn}</strong> baixado!</div>`;
    refreshStatus();
  }catch(e){errBox('exportResult',e.message);}
}

// ── Init ──────────────────────────────────────────────────────────────────────
buildCPMUI();
renderFavs();
fetchStatus();
setInterval(fetchStatus, 30000);
