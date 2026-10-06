/* ================= STATE ================= */
const TRACKS = ['V2','V1','A1','A2'];
const TRACK_INFO = {
  V2:{type:'video',label:'V2'}, V1:{type:'video',label:'V1'},
  A1:{type:'audio',label:'A1'}, A2:{type:'audio',label:'A2'}
};

const state = {
  project: [], tracks:{V2:[],V1:[],A1:[],A2:[]},
  playhead:0, zoom:60, duration:60,
  selection:null, selectedAsset:null, tool:'select', playing:false,
  locked:{V2:false,V1:false,A1:false,A2:false},
  visible:{V2:true,V1:true,A1:true,A2:true},
  muted:{A1:false,A2:false}, solo:{A1:false,A2:false},
  chroma:{on:false,color:'#00ff00',tol:40},
  logo:{img:null,x:60,y:60,size:100},
  effects:{opacity:100,brightness:100,contrast:100,saturation:100}
};

const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const LOG = (...a) => console.log('[Pr]', ...a);

/* ================= VIDEO POOL ================= */
const videoPool = {};
function getVideo(src){
  if(!videoPool[src]){
    const v = document.createElement('video');
    v.src = src; v.preload = 'auto'; v.muted = true; v.playsInline = true;
    v.onerror = () => console.error('[Pr] video error:', src, v.error);
    videoPool[src] = v;
  }
  return videoPool[src];
}
const imageCache = {};
function getImage(src){
  if(!imageCache[src]){ const i = new Image(); i.src = src; imageCache[src] = i; }
  return imageCache[src];
}

/* ================= TIMECODE ================= */
const pad2 = n => String(n).padStart(2,'0');
function tc(sec){
  sec = Math.max(0, sec||0);
  const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60),
        s = Math.floor(sec%60),   f = Math.floor((sec%1)*30);
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}:${pad2(f)}`;
}

/* ============================================================
   IMPORT — يقرأ الملفات من زر أو من السحب والإفلات
   ============================================================ */
function detectKind(file){
  if(file.type.startsWith('video/')) return 'video';
  if(file.type.startsWith('audio/')) return 'audio';
  if(file.type.startsWith('image/')) return 'image';
  // fallback بالامتداد
  const ext = (file.name.split('.').pop()||'').toLowerCase();
  if(['mp4','webm','mov','mkv','avi','m4v','ogv'].includes(ext)) return 'video';
  if(['mp3','wav','ogg','m4a','aac','flac'].includes(ext)) return 'audio';
  if(['png','jpg','jpeg','gif','webp','bmp','svg'].includes(ext)) return 'image';
  return null;
}

async function probeVideoDuration(src){
  return new Promise(resolve => {
    const v = document.createElement('video');
    v.preload = 'metadata'; v.muted = true; v.playsInline = true;
    let done = false;
    const finish = (dur, thumb) => {
      if(done) return; done = true;
      clearTimeout(timer);
      resolve({ duration: dur || 5, thumb: thumb || null });
    };
    const timer = setTimeout(() => {
      console.warn('[Pr] probe timeout for', src);
      finish(5, null);
    }, 5000);

    v.onloadedmetadata = () => {
      const dur = isFinite(v.duration) && v.duration > 0 ? v.duration : 5;
      try { v.currentTime = Math.min(0.5, dur/2); } catch(_) {}
      // إذا لم يعمل seeked خلال ثانية، نأخذ المدة بدون صورة
      setTimeout(() => finish(dur, null), 1200);
    };
    v.onseeked = () => {
      try {
        const c = document.createElement('canvas');
        c.width = 80; c.height = 45;
        c.getContext('2d').drawImage(v, 0, 0, 80, 45);
        finish(v.duration || 5, c.toDataURL('image/jpeg', .6));
      } catch(_) { finish(v.duration || 5, null); }
    };
    v.onerror = e => {
      console.error('[Pr] probe error', v.error, src);
      finish(5, null);
    };
    v.src = src;
  });
}

async function probeAudioDuration(src){
  return new Promise(resolve => {
    const a = document.createElement('audio');
    a.preload = 'metadata';
    let done = false;
    const finish = dur => { if(done) return; done=true; clearTimeout(timer); resolve(dur||5); };
    const timer = setTimeout(()=>finish(5), 4000);
    a.onloadedmetadata = () => finish(a.duration);
    a.onerror = () => finish(5);
    a.src = src;
  });
}

async function importFiles(files){
  if(!files || !files.length){ LOG('no files'); return; }
  LOG('importing', files.length, 'files');
  for(const f of files){
    const kind = detectKind(f);
    LOG('  file:', f.name, 'type:', f.type, '→ kind:', kind);
    if(!kind){ console.warn('[Pr] unsupported:', f.name, f.type); continue; }

    const src = URL.createObjectURL(f);
    const asset = {
      id:'a_'+Math.random().toString(36).slice(2,9),
      name:f.name, src, kind, duration:5, thumb:null, status:'loading'
    };

    if(kind === 'image'){
      asset.duration = 5;
      asset.thumb = src;
      asset.status = 'ready';
    } else if(kind === 'video'){
      const { duration, thumb } = await probeVideoDuration(src);
      asset.duration = duration;
      asset.thumb = thumb;
      asset.status = 'ready';
      LOG('  → duration:', duration.toFixed(2), 'thumb:', !!thumb);
    } else {
      asset.duration = await probeAudioDuration(src);
      asset.status = 'ready';
    }
    state.project.push(asset);
    renderProject();
  }
  LOG('project size:', state.project.length);
}

/* --- ربط زر Import --- */
const fileInput = $('#fileInput');
$('#importBtn').onclick = () => {
  LOG('Import clicked');
  fileInput.value = '';
  fileInput.click();
};
fileInput.addEventListener('change', e => {
  LOG('change event — files:', e.target.files.length);
  importFiles([...e.target.files]);
});

/* --- السحب والإفلات من سطح المكتب --- */
function setupDesktopDrop(){
  const panel = $('#projList').closest('.panel');
  panel.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    panel.style.outline = '2px dashed #4a9eff';
    panel.style.outlineOffset = '-4px';
  });
  panel.addEventListener('dragleave', () => { panel.style.outline = ''; });
  panel.addEventListener('drop', e => {
    e.preventDefault();
    panel.style.outline = '';
    LOG('drop — files:', e.dataTransfer.files.length);
    importFiles([...e.dataTransfer.files]);
  });
  // منع المتصفح من فتح الملف إذا أفلته في مكان آخر
  document.addEventListener('dragover', e => e.preventDefault());
  document.addEventListener('drop', e => e.preventDefault());
}

/* ================= PROJECT PANEL ================= */
function renderProject(){
  const list = $('#projList');
  list.innerHTML = '';
  if(!state.project.length){
    list.innerHTML = `<div style="padding:20px;text-align:center;color:#666;font-size:11px;line-height:1.8">
      اسحب ملفات الفيديو هنا<br>أو اضغط <b style="color:#4a9eff">Import</b>
    </div>`;
    return;
  }
  state.project.forEach(a => {
    const row = document.createElement('div');
    row.className = 'proj-item' + (state.selectedAsset===a.id?' selected':'');
    const icon = a.kind==='audio' ? '♫' : a.kind==='image' ? '🖼' : '🎬';
    row.innerHTML = `
      <div class="proj-thumb">${a.thumb?`<img src="${a.thumb}">`:icon}</div>
      <div class="proj-name" title="${a.name}">${a.name}</div>
      <div class="proj-dur">${a.status==='loading'?'…':tc(a.duration)}</div>`;
    row.onclick = () => { state.selectedAsset = a.id; showInSource(a); renderProject(); };
    row.ondblclick = () => { LOG('dblclick add', a.name); addAssetToTimeline(a); };
    row.oncontextmenu = e => {
      e.preventDefault();
      state.selectedAsset = a.id;
      addAssetToTimeline(a);
    };
    list.appendChild(row);
  });
}

$('#addToTLBtn').onclick = () => {
  const a = state.project.find(x=>x.id===state.selectedAsset) || state.project[0];
  if(!a){ alert('لا يوجد ملف في المشروع — استورد أولاً'); return; }
  addAssetToTimeline(a);
};
$('#deleteBtn').onclick = () => {
  state.project = state.project.filter(x=>x.id!==state.selectedAsset);
  state.selectedAsset = null;
  renderProject();
};
$('#newBinBtn').onclick = () => alert('Bin جديد (قريبًا)');

/* ================= SOURCE MONITOR ================= */
function showInSource(asset){
  $('#sourceTitle').textContent = asset.name;
  const c = $('#sourceCanvas'), ctx = c.getContext('2d');
  ctx.fillStyle='#000'; ctx.fillRect(0,0,c.width,c.height);
  if(asset.kind==='image'){
    const img = getImage(asset.src);
    const draw = () => drawContain(ctx, img, c.width, c.height);
    img.complete ? draw() : img.onload = draw;
  } else if(asset.kind==='video'){
    const v = getVideo(asset.src);
    v.onseeked = () => { if(v.readyState>=2) drawContain(ctx,v,c.width,c.height); };
    v.currentTime = 0;
  } else {
    ctx.fillStyle='#666'; ctx.font='14px Tahoma'; ctx.textAlign='center';
    ctx.fillText('♪ '+asset.name, c.width/2, c.height/2);
  }
  $('#srcTC').textContent = tc(0);
}
function drawContain(ctx, src, W, H){
  ctx.fillStyle='#000'; ctx.fillRect(0,0,W,H);
  const sw = src.videoWidth||src.width, sh = src.videoHeight||src.height;
  if(!sw||!sh) return;
  const r = Math.min(W/sw, H/sh);
  const w = sw*r, h = sh*r;
  ctx.drawImage(src, (W-w)/2, (H-h)/2, w, h);
}

/* ================= ADD TO TIMELINE ================= */
function addAssetToTimeline(asset){
  if(!asset){ console.warn('addAssetToTimeline: no asset'); return; }
  const trackName = asset.kind==='audio'
    ? (state.tracks.A1.length<=state.tracks.A2.length?'A1':'A2')
    : asset.kind==='image' ? 'V2' : 'V1';
  const lane = state.tracks[trackName];
  const start = lane.reduce((m,c)=>Math.max(m, c.start+c.duration), 0);
  const clip = {
    id:'c_'+Math.random().toString(36).slice(2,9),
    assetId:asset.id, name:asset.name, src:asset.src, kind:asset.kind,
    start, duration: asset.duration || 5
  };
  lane.push(clip);
  state.selection = clip.id;
  LOG('added clip to', trackName, clip.name, 'duration:', clip.duration.toFixed(2));
  renderTimeline(); renderProgram();
}

/* ================= TIMELINE ================= */
function renderTimeline(){
  const thCol = $('#thCol');
  thCol.innerHTML = '<div class="th-spacer"></div>';
  TRACKS.forEach(name => {
    const info = TRACK_INFO[name];
    const h = document.createElement('div');
    h.className = 'th ' + info.type; h.style.height='50px';
    const eye = info.type==='video'
      ? `<button class="mini-btn ${state.visible[name]?'on':''}" data-act="eye" data-t="${name}">👁</button>` : '';
    const lock = `<button class="mini-btn ${state.locked[name]?'on':''}" data-act="lock" data-t="${name}">🔒</button>`;
    const mute = info.type==='audio'
      ? `<button class="mini-btn ${state.muted[name]?'mute-on':''}" data-act="mute" data-t="${name}">M</button>` : '';
    const solo = info.type==='audio'
      ? `<button class="mini-btn ${state.solo[name]?'on':''}" data-act="solo" data-t="${name}">S</button>` : '';
    h.innerHTML = `<span class="name">${info.label}</span><span class="spacer"></span>${eye}${lock}${mute}${solo}`;
    thCol.appendChild(h);
  });
  thCol.querySelectorAll('.mini-btn').forEach(b => {
    b.onclick = () => {
      const { act, t } = b.dataset;
      if(act==='eye')  state.visible[t]=!state.visible[t];
      if(act==='lock') state.locked[t] =!state.locked[t];
      if(act==='mute') state.muted[t]  =!state.muted[t];
      if(act==='solo') state.solo[t]   =!state.solo[t];
      renderTimeline(); renderProgram();
    };
  });

  renderRuler();

  const tracks = $('#tracks');
  tracks.innerHTML = '';
  TRACKS.forEach(name => {
    const info = TRACK_INFO[name];
    const lane = document.createElement('div');
    lane.className = 'lane ' + (info.type==='audio'?'audio':'');
    lane.style.height = '50px';
    lane.dataset.track = name;
    if(state.locked[name]) lane.classList.add('locked');

    state.tracks[name].forEach(clip => {
      const el = document.createElement('div');
      el.className = 'clip ' + (info.type==='audio'?'audio':'video');
      el.dataset.id = clip.id;
      el.style.left  = (clip.start * state.zoom) + 'px';
      el.style.width = Math.max(6, clip.duration * state.zoom) + 'px';
      if(state.selection===clip.id) el.classList.add('selected');
      el.innerHTML = `
        <div class="clip-name">${clip.name}</div>
        <div class="${info.type==='audio'?'waveform':'frames'}"></div>`;
      bindClipEvents(el, clip, name);
      lane.appendChild(el);
    });

    // استقبال السحب من Project Panel
    lane.ondragover = e => { e.preventDefault(); };
    lane.ondrop = e => {
      e.preventDefault();
      const a = state.project.find(x=>x.id===state.selectedAsset) || state.project[0];
      if(a) addAssetToTimelineAt(a, name, e);
    };
    tracks.appendChild(lane);
  });

  updatePlayhead(); updateTC();
}

function addAssetToTimelineAt(asset, trackName, e){
  const lane = state.tracks[trackName];
  const rect = $('#tracks').getBoundingClientRect();
  const start = Math.max(0, (e.clientX - rect.left) / state.zoom);
  lane.push({
    id:'c_'+Math.random().toString(36).slice(2,9),
    assetId:asset.id, name:asset.name, src:asset.src, kind:asset.kind,
    start, duration: asset.duration || 5
  });
  renderTimeline(); renderProgram();
}

function renderRuler(){
  const ruler = $('#ruler');
  const w = Math.max(state.duration * state.zoom + 400, 3000);
  ruler.style.width = w + 'px';
  ruler.innerHTML = '';
  const step = state.zoom>=80?1 : state.zoom>=40?2 : state.zoom>=20?5 : 10;
  for(let s=0; s<=w/state.zoom; s+=step){
    const t = document.createElement('div');
    t.className = 'tick' + (s%(step*5)===0?' major':'');
    t.style.left = (s*state.zoom)+'px';
    if(s%(step*5)===0) t.textContent = tc(s);
    ruler.appendChild(t);
  }
}

/* ================= CLIP DRAG (بدون تسريب مستمعين) ================= */
let activeDrag = null;
document.addEventListener('mousemove', e => {
  if(!activeDrag) return;
  const dx = e.clientX - activeDrag.startX;
  activeDrag.clip.start = Math.max(0, activeDrag.origStart + dx/state.zoom);
  renderTimeline();
});
document.addEventListener('mouseup', () => {
  if(activeDrag){ activeDrag = null; document.body.style.cursor=''; }
});

function bindClipEvents(el, clip, trackName){
  el.onmousedown = e => {
    if(state.locked[trackName]) return;
    e.stopPropagation();
    if(state.tool==='razor'){ splitClip(trackName, clip, e); return; }
    state.selection = clip.id;
    activeDrag = { clip, startX:e.clientX, origStart:clip.start };
    renderTimeline();
    document.body.style.cursor = 'grabbing';
  };
}

function splitClip(trackName, clip, e){
  const rect = e.target.closest('.clip').getBoundingClientRect();
  const localX = e.clientX - rect.left;
  const at = clip.start + localX/state.zoom;
  if(at <= clip.start + 0.05 || at >= clip.start + clip.duration - 0.05) return;
  const first  = { ...clip, duration: at - clip.start };
  const second = { ...clip, id:'c_'+Math.random().toString(36).slice(2,9),
                   start: at, duration: clip.duration - (at - clip.start) };
  const lane = state.tracks[trackName];
  const i = lane.findIndex(c => c.id===clip.id);
  lane.splice(i, 1, first, second);
  state.selection = second.id;
  renderTimeline();
}

/* ================= RULER / PLAYHEAD ================= */
const ruler = $('#ruler');
let scrubbing = false;
ruler.addEventListener('mousedown', e => {
  scrubbing = true;
  const rect = ruler.getBoundingClientRect();
  seekToPx(e.clientX - rect.left);
});
window.addEventListener('mousemove', e => {
  if(!scrubbing) return;
  const rect = ruler.getBoundingClientRect();
  seekToPx(e.clientX - rect.left);
});
window.addEventListener('mouseup', () => { scrubbing = false; });

function seekToPx(px){
  state.playhead = Math.max(0, px / state.zoom);
  updatePlayhead(); updateTC(); renderProgram();
}
function updatePlayhead(){
  $('#playhead').style.left = (state.playhead * state.zoom) + 'px';
}
function updateTC(){
  $('#progTC').textContent = tc(state.playhead);
}

/* ================= TOOLS ================= */
function setTool(t){
  state.tool = t;
  $$('.tool-btn').forEach(b => b.classList.toggle('active', b.dataset.tool===t));
}
$$('.tool-btn').forEach(b => b.onclick = () => setTool(b.dataset.tool));
document.addEventListener('keydown', e => {
  if(e.target.matches('input,textarea')) return;
  if(e.key==='v'||e.key==='V') setTool('select');
  if(e.key==='c'||e.key==='C') setTool('razor');
  if(e.key==='h'||e.key==='H') setTool('hand');
  if(e.key===' '){ e.preventDefault(); togglePlay(); }
  if(e.key==='Delete'){
    if(state.selection){
      TRACKS.forEach(n => state.tracks[n] = state.tracks[n].filter(c=>c.id!==state.selection));
      state.selection = null;
      renderTimeline(); renderProgram();
    }
  }
});

/* ================= ZOOM ================= */
$('#zoomRange').oninput = e => {
  state.zoom = +e.target.value;
  renderTimeline();
};

/* ================= PROGRAM MONITOR ================= */
const progCanvas = $('#programCanvas');
const progCtx = progCanvas.getContext('2d');
const chromaCanvas = document.createElement('canvas');
const chromaCtx = chromaCanvas.getContext('2d', { willReadFrequently:true });

function renderProgram(){
  const W = progCanvas.width, H = progCanvas.height;
  progCtx.fillStyle='#000'; progCtx.fillRect(0,0,W,H);

  const active = state.tracks.V2.concat(state.tracks.V1)
    .filter(c => state.visible[c.kind==='audio'?'V1':'V1'] !== false)
    .find(c => state.playhead >= c.start && state.playhead <= c.start + c.duration);
  if(!active) return;

  progCtx.save();
  const fx = state.effects;
  progCtx.globalAlpha = fx.opacity / 100;
  progCtx.filter = `brightness(${fx.brightness}%) contrast(${fx.contrast}%) saturate(${fx.saturation}%)`;

  if(active.kind==='image'){
    const img = getImage(active.src);
    if(img.complete) drawContain(progCtx, img, W, H);
    else img.onload = () => drawContain(progCtx, img, W, H);
  } else if(active.kind==='video'){
    const v = getVideo(active.src);
    const local = state.playhead - active.start;
    if(v.readyState >= 1 && Math.abs(v.currentTime - local) > 0.15){
      try { v.currentTime = local; } catch(_) {}
    }
    if(v.readyState >= 2){
      if(state.chroma.on) drawWithChroma(progCtx, v, W, H);
      else drawContain(progCtx, v, W, H);
    }
  }
  progCtx.restore();

  if(state.logo.img){
    const L = state.logo;
    progCtx.drawImage(L.img, L.x, L.y, L.size, L.size*0.6);
  }
}

function drawWithChroma(ctx, video, W, H){
  chromaCanvas.width = W; chromaCanvas.height = H;
  chromaCtx.drawImage(video, 0, 0, W, H);
  const frame = chromaCtx.getImageData(0, 0, W, H);
  const d = frame.data;
  const [kr,kg,kb] = [parseInt(state.chroma.color.slice(1,3),16),
                     parseInt(state.chroma.color.slice(3,5),16),
                     parseInt(state.chroma.color.slice(5,7),16)];
  const tol = state.chroma.tol * 2.55, tol2 = tol*tol;
  for(let i=0;i<d.length;i+=4){
    const dr=d[i]-kr, dg=d[i+1]-kg, db=d[i+2]-kb;
    if(dr*dr+dg*dg+db*db < tol2) d[i+3]=0;
  }
  chromaCtx.putImageData(frame, 0, 0);
  ctx.drawImage(chromaCanvas, 0, 0, W, H);
}

/* ================= EFFECTS ================= */
function bindEff(id, valId, key, suffix){
  const el = $(id), v = $(valId); if(!el) return;
  el.oninput = () => {
    state.effects[key] = +el.value;
    if(v) v.textContent = el.value + (suffix||'');
    renderProgram();
  };
  if(v) v.textContent = el.value + (suffix||'');
}
bindEff('#effOpacity','#effOpacityVal','opacity','%');
bindEff('#effBright','#effBrightVal','brightness','');
bindEff('#effContrast','#effContrastVal','contrast','');
bindEff('#effSat','#effSatVal','saturation','');

$('#chromaToggle').onchange = e => { state.chroma.on = e.target.checked; renderProgram(); };
$('#chromaColorPicker').oninput = e => { state.chroma.color = e.target.value; renderProgram(); };
$('#chromaTolRange').oninput = e => {
  state.chroma.tol = +e.target.value;
  $('#chromaTolVal').textContent = e.target.value;
  renderProgram();
};

$('#logoBtn').onclick = () => $('#logoInput').click();
$('#logoInput').onchange = e => {
  const f = e.target.files[0]; if(!f) return;
  const img = new Image();
  img.onload = () => { state.logo.img = img; renderProgram(); };
  img.src = URL.createObjectURL(f);
};
$('#logoSizeRange').oninput = e => {
  state.logo.size = +e.target.value;
  $('#logoSizeVal').textContent = e.target.value;
  renderProgram();
};

/* ================= PLAYBACK ================= */
let rafId = null, lastT = 0;
function togglePlay(){
  state.playing = !state.playing;
  $('#progPlay').textContent = state.playing ? '⏸' : '▶';
  if(state.playing){
    const active = state.tracks.V2.concat(state.tracks.V1)
      .find(c => state.playhead >= c.start && state.playhead <= c.start + c.duration);
    if(active && active.kind==='video') getVideo(active.src).play().catch(()=>{});
    lastT = performance.now();
    rafId = requestAnimationFrame(loop);
  } else {
    Object.values(videoPool).forEach(v => v.pause());
    if(rafId) cancelAnimationFrame(rafId);
  }
}
function loop(t){
  if(!state.playing) return;
  const dt = (t - lastT)/1000; lastT = t;
  state.playhead += dt;
  updatePlayhead(); updateTC(); renderProgram();
  const maxEnd = TRACKS.flatMap(n => state.tracks[n].map(c=>c.start+c.duration))
                       .reduce((a,b)=>Math.max(a,b),0);
  if(maxEnd && state.playhead >= maxEnd){ togglePlay(); return; }
  rafId = requestAnimationFrame(loop);
}
$('#progPlay').onclick = togglePlay;

/* ================= INIT ================= */
renderProject();
renderTimeline();
renderProgram();
setupDesktopDrop();
LOG('app ready');
