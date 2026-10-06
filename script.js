/* ================== الحالة العامة ================== */
let mediaAssets = [];
let timelineTracks = { video: [], audio: [], overlay: [] };
let textLayers = [];
let logoAsset = { src: null, x: 50, y: 50, size: 100 };
let selectedClipId = null;
let currentStep = 1;
let isPlaying = false;
let currentTime = 0;
let timelineZoom = 20;
let lastFrameTime = 0;

let isDraggingElement = false, draggedElementType = null,
    draggedElementId = null, dragStartX = 0, dragStartY = 0;

const videoElement = document.createElement('video');
videoElement.playsInline = true;
videoElement.muted = false;

const chromaCanvas = document.createElement('canvas');
const chromaCtx = chromaCanvas.getContext('2d', { willReadFrequently: true });

const canvasIds = ['renderCanvas', 'renderCanvas2', 'renderCanvas3', 'renderCanvas4'];
const getActiveCanvas = () => document.getElementById('renderCanvas' + (currentStep === 1 ? '' : currentStep));

/* ================== التنقل بين المراحل ================== */
function goToStep(step) {
  document.querySelectorAll('.step-content-pane').forEach(p => p.classList.remove('active'));
  document.getElementById('step' + step + 'Pane').classList.add('active');
  for (let i = 1; i <= 4; i++) {
    const tab = document.getElementById('tab' + i);
    tab.classList.toggle('active', i === step);
    tab.classList.toggle('completed', i < step);
  }
  currentStep = step;
  drawCanvas();
}
function switchStep(s) {
  const t = document.getElementById('tab' + s);
  if (t.classList.contains('completed') || t.classList.contains('active')) goToStep(s);
}

/* ================== استيراد الملفات ================== */
document.getElementById('fileInput').addEventListener('change', e => {
  for (const file of e.target.files) {
    const url = URL.createObjectURL(file);
    const isVid = file.type.startsWith('video/');
    const isAud = file.type.startsWith('audio/');
    const type = isVid ? 'video' : isAud ? 'audio' : 'image';
    const asset = { id: 'ast_' + Math.random().toString(36).slice(2, 11), type, name: file.name, src: url };
    mediaAssets.push(asset);

    if (isVid) {
      // نستخرج المدة والقياس قبل الإضافة
      const probe = document.createElement('video');
      probe.src = url;
      probe.onloadedmetadata = () => {
        resizeAllCanvases(probe.videoWidth, probe.videoHeight);
        addClipToTrack(asset, probe.duration || 15);
        renderTimelineUI();
        drawCanvas();
      };
    } else {
      addClipToTrack(asset, 5);
      renderTimelineUI();
      drawCanvas();
    }
    renderMediaBin();
  }
  e.target.value = '';
});

function addClipToTrack(asset, duration) {
  const trackName = asset.type === 'audio' ? 'audio' : 'video';
  const lane = timelineTracks[trackName];
  const lastEnd = lane.reduce((m, c) => Math.max(m, c.start + c.duration), 0);
  const clip = { id: 'clp_' + Math.random().toString(36).slice(2, 11), ...asset, duration, start: lastEnd };
  lane.push(clip);
  selectedClipId = clip.id;
  if (asset.type === 'video' && currentTime >= clip.start && currentTime <= clip.start + clip.duration) {
    videoElement.src = asset.src; videoElement.load();
  }
}

function renderMediaBin() {
  const bin = document.getElementById('projectBin1');
  bin.innerHTML = mediaAssets.map(a => `
    <div style="background:#222; padding:6px; border-radius:6px; border:1px solid #444; color:#fff; font-size:11px;">
      <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${a.name}</div>
      <div style="color:#666; font-size:10px;">${a.type}</div>
    </div>`).join('');
}

/* ================== تحجيم الكانفس ================== */
function resizeAllCanvases(w, h) {
  if (!w || !h) return;
  const maxW = 640, maxH = 360;
  const ratio = Math.min(maxW / w, maxH / h);
  const tw = Math.floor(w * ratio), th = Math.floor(h * ratio);
  canvasIds.forEach(id => {
    const c = document.getElementById(id);
    if (c) { c.width = tw; c.height = th; }
  });
}

/* ================== سحب العناصر ================== */
function initCanvasDragListeners(canvas) {
  canvas.onmousedown = e => {
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;

    if (logoAsset.src && mx >= logoAsset.x && mx <= logoAsset.x + logoAsset.size &&
        my >= logoAsset.y && my <= logoAsset.y + logoAsset.size * 0.6) {
      isDraggingElement = true; draggedElementType = 'logo';
      dragStartX = mx - logoAsset.x; dragStartY = my - logoAsset.y; return;
    }
    for (const t of textLayers) {
      if (mx >= t.x - 10 && mx <= t.x + 220 && my >= t.y - t.size && my <= t.y + 10) {
        isDraggingElement = true; draggedElementType = 'text';
        draggedElementId = t.id;
        dragStartX = mx - t.x; dragStartY = my - t.y; return;
      }
    }
  };
  canvas.onmousemove = e => {
    if (!isDraggingElement) return;
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    if (draggedElementType === 'logo') {
      logoAsset.x = mx - dragStartX; logoAsset.y = my - dragStartY;
    } else if (draggedElementType === 'text') {
      const t = textLayers.find(x => x.id === draggedElementId);
      if (t) { t.x = mx - dragStartX; t.y = my - dragStartY; }
    }
    drawCanvas();
  };
  canvas.onmouseup = canvas.onmouseleave = () => {
    isDraggingElement = false; draggedElementType = null;
  };
}

/* ================== التايملاين ================== */
function renderTimelineUI() {
  const container = document.getElementById('timelineTracks');
  container.innerHTML = `
    <div style="padding:6px 12px; background:#18181b; color:#aaa; font-size:11px; display:flex; justify-content:space-between;">
      <span>تكبير: <input type="range" min="10" max="60" value="${timelineZoom}" oninput="changeTimelineZoom(this.value)" style="width:120px; vertical-align:middle;"></span>
    </div>
    <div id="timelineRuler" style="height:25px; background:#222; border-bottom:1px solid #444; position:relative; cursor:pointer; width:3000px;" onclick="seekTimelineByClick(event)">
      <div id="timelinePlayhead" style="position:absolute; top:0; width:3px; height:180px; background:#ff3b30; left:${currentTime * timelineZoom}px; pointer-events:none; z-index:5;"></div>
    </div>
    ${renderLane('video', 'فيديو')}
    ${renderLane('audio', 'صوت')}
    ${renderLane('overlay', 'إضافات')}`;
}

function renderLane(name, label) {
  const bg = name === 'video' ? '#1e1e24' : name === 'audio' ? '#1a231e' : '#221e24';
  const col = name === 'video' ? '#2563eb' : name === 'audio' ? '#059669' : '#d97706';
  const clips = timelineTracks[name].map(c => {
    const left = c.start * timelineZoom, width = Math.max(20, c.duration * timelineZoom);
    const sel = selectedClipId === c.id ? 'box-shadow:0 0 0 2px #ffcc00;' : '';
    return `<div onclick="selectClip('${c.id}')" style="position:absolute; left:${left}px; width:${width}px; top:4px; height:40px;
        background:${col}; border-radius:4px; padding:4px 8px; color:#fff; font-size:11px; cursor:pointer; ${sel}
        overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">${c.name}</div>`;
  }).join('');
  return `<div style="display:flex; height:50px; background:${bg}; border-bottom:1px solid #27272a; position:relative;">
    <div style="width:70px; background:#121215; color:#888; font-size:11px; display:flex; align-items:center; justify-content:center; position:sticky; left:0; z-index:10;">${label}</div>
    <div style="position:relative; height:100%; width:3000px;">${clips}</div>
  </div>`;
}

function changeTimelineZoom(v) { timelineZoom = +v; renderTimelineUI(); }

function seekTimelineByClick(e) {
  const rect = document.getElementById('timelineRuler').getBoundingClientRect();
  currentTime = Math.max(0, (e.clientX - rect.left) / timelineZoom);
  updatePlayheadPosition(); seekVideoToCurrentTime(); drawCanvas();
}
function updatePlayheadPosition() {
  const p = document.getElementById('timelinePlayhead');
  if (p) p.style.left = (currentTime * timelineZoom) + 'px';
}
function seekVideoToCurrentTime() {
  const clip = timelineTracks.video.find(c => currentTime >= c.start && currentTime <= c.start + c.duration);
  if (clip && clip.type === 'video') {
    if (videoElement.src !== clip.src) { videoElement.src = clip.src; videoElement.load(); }
    const t = currentTime - clip.start;
    if (videoElement.readyState >= 1 && Math.abs(videoElement.currentTime - t) > 0.15) {
      try { videoElement.currentTime = t; } catch (_) {}
    }
  }
}
function selectClip(id) { selectedClipId = id; renderTimelineUI(); }

/* ================== النصوص ================== */
function addNewText() {
  textLayers.push({ id: 'txt_' + Math.random().toString(36).slice(2, 11), text: 'نص جديد', x: 100, y: 100, color: '#ffffff', size: 32 });
  renderTextControls(); drawCanvas();
}
function renderTextControls() {
  const box = document.getElementById('textControlsContainer');
  box.innerHTML = textLayers.map(t => `
    <div style="background:#151515; padding:8px; border-radius:4px; border:1px solid #333;">
      <input type="text" value="${t.text}" oninput="updateTextProp('${t.id}','text',this.value)" style="width:100%; background:#222; color:#fff; border:1px solid #445; padding:4px;">
      <div style="display:flex; gap:8px; margin-top:6px; align-items:center;">
        <input type="color" value="${t.color}" oninput="updateTextProp('${t.id}','color',this.value)" style="width:35px; height:25px; border:none;">
        <input type="range" min="14" max="72" value="${t.size}" oninput="updateTextProp('${t.id}','size',parseInt(this.value))" style="flex:1;">
      </div>
    </div>`).join('');
}
function updateTextProp(id, prop, val) {
  const t = textLayers.find(x => x.id === id);
  if (t) { t[prop] = val; drawCanvas(); }
}

/* ================== اللوغو ================== */
document.getElementById('logoInput').addEventListener('change', e => {
  if (e.target.files[0]) { logoAsset.src = URL.createObjectURL(e.target.files[0]); drawCanvas(); }
});
document.getElementById('logoSizeRange').addEventListener('input', e => { logoAsset.size = +e.target.value; drawCanvas(); });

/* ================== ربط الشرائح ================== */
function bindSlider(id, labelId) {
  const el = document.getElementById(id), lb = document.getElementById(labelId);
  if (!el || !lb) return;
  el.addEventListener('input', () => { lb.textContent = el.value; drawCanvas(); });
  lb.textContent = el.value;
}
bindSlider('valBrightness', 'brightVal');
bindSlider('valContrast', 'contrastVal');
bindSlider('valSaturation', 'satVal');
bindSlider('chromaTolRange', 'chromaTolVal');
document.getElementById('chromaToggle').addEventListener('change', drawCanvas);
document.getElementById('chromaColorPicker').addEventListener('input', drawCanvas);

/* ================== الكروما ================== */
function hexToRgb(hex) {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}
function drawVideoWithChroma(ctx, canvas) {
  const on = document.getElementById('chromaToggle').checked;
  if (!on || videoElement.readyState < 2) {
    if (videoElement.readyState >= 2) ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    return;
  }
  chromaCanvas.width = canvas.width; chromaCanvas.height = canvas.height;
  chromaCtx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
  const img = chromaCtx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  const [kr, kg, kb] = hexToRgb(document.getElementById('chromaColorPicker').value);
  const tol = +document.getElementById('chromaTolRange').value * 2.55;
  const tol2 = tol * tol;
  for (let i = 0; i < d.length; i += 4) {
    const dr = d[i] - kr, dg = d[i+1] - kg, db = d[i+2] - kb;
    if (dr*dr + dg*dg + db*db < tol2) d[i+3] = 0;
  }
  chromaCtx.putImageData(img, 0, 0);
  ctx.drawImage(chromaCanvas, 0, 0, canvas.width, canvas.height);
}

/* ================== الرسم ================== */
function drawCanvas() {
  const canvas = getActiveCanvas();
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const activeClip = timelineTracks.video.find(c => currentTime >= c.start && currentTime <= c.start + c.duration);
  const bright = document.getElementById('valBrightness').value;
  const contrast = document.getElementById('valContrast').value;
  const sat = document.getElementById('valSaturation').value;

  ctx.save();
  ctx.filter = `brightness(${bright}%) contrast(${contrast}%) saturate(${sat}%)`;

  if (activeClip) {
    if (activeClip.type === 'image') {
      const img = new Image();
      img.onload = () => { ctx.drawImage(img, 0, 0, canvas.width, canvas.height); };
      img.src = activeClip.src;
    } else if (videoElement.readyState >= 2) {
      drawVideoWithChroma(ctx, canvas);
    }
  }
  ctx.restore();

  ctx.textBaseline = 'alphabetic';
  textLayers.forEach(t => {
    ctx.font = `bold ${t.size}px Cairo, Tajawal, Tahoma`;
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  });

  if (logoAsset.src) {
    const l = new Image();
    l.onload = () => ctx.drawImage(l, logoAsset.x, logoAsset.y, logoAsset.size, logoAsset.size * 0.6);
    l.src = logoAsset.src;
  }
}

/* ================== التشغيل ================== */
function togglePlayback() {
  isPlaying = !isPlaying;
  const btn = document.getElementById('playBtn');
  if (btn) btn.textContent = isPlaying ? '⏸ إيقاف' : '▶ تشغيل';
  if (isPlaying) {
    seekVideoToCurrentTime();
    videoElement.play().catch(() => {});
    lastFrameTime = 0;
    requestAnimationFrame(renderLoop);
  } else {
    videoElement.pause();
  }
}
function renderLoop(ts) {
  if (!isPlaying) return;
  if (!lastFrameTime) lastFrameTime = ts;
  currentTime += (ts - lastFrameTime) / 1000;
  lastFrameTime = ts;

  const totalDuration = timelineTracks.video.reduce((m, c) => Math.max(m, c.start + c.duration), 0);
  if (totalDuration && currentTime >= totalDuration) { togglePlayback(); return; }

  updatePlayheadPosition();
  seekVideoToCurrentTime();
  drawCanvas();
  requestAnimationFrame(renderLoop);
}

/* ================== القص ================== */
function splitCurrentClip() {
  const idx = timelineTracks.video.findIndex(c => currentTime > c.start && currentTime < c.start + c.duration);
  if (idx < 0) { alert('ضع المؤشر داخل مقطع ثم اضغط تقطيع.'); return; }
  const c = timelineTracks.video[idx];
  const at = currentTime - c.start;
  const second = { ...c, id: 'clp_' + Math.random().toString(36).slice(2, 11), start: currentTime, duration: c.duration - at };
  c.duration = at;
  timelineTracks.video.splice(idx + 1, 0, second);
  renderTimelineUI(); drawCanvas();
}

/* ================== التصدير ================== */
function exportFinalProject() {
  const canvas = getActiveCanvas();
  const totalDuration = timelineTracks.video.reduce((m, c) => Math.max(m, c.start + c.duration), 0);
  if (!totalDuration) { alert('أضف مقاطع أولاً.'); return; }
  if (!confirm('سيتم تسجيل الفيديو من البداية حتى النهاية. المتابعة؟')) return;

  const stream = canvas.captureStream(30);
  try { if (videoElement.captureStream) videoElement.captureStream().getAudioTracks().forEach(t => stream.addTrack(t)); } catch (_) {}

  let mime = 'video/webm;codecs=vp9,opus';
  if (!MediaRecorder.isTypeSupported(mime)) mime = 'video/webm';
  const rec = new MediaRecorder(stream, { mimeType: mime });
  const chunks = [];
  rec.ondataavailable = e => e.data.size && chunks.push(e.data);
  rec.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tarek_project_' + Date.now() + '.webm';
    a.click();
    alert('✅ تم التصدير.');
  };

  currentTime = 0;
  seekVideoToCurrentTime();
  if (!isPlaying) togglePlayback();
  rec.start();
  setTimeout(() => { rec.stop(); if (isPlaying) togglePlayback(); }, totalDuration * 1000 + 300);
}

/* ================== التهيئة ================== */
window.addEventListener('DOMContentLoaded', () => {
  canvasIds.forEach(id => { const c = document.getElementById(id); if (c) initCanvasDragListeners(c); });
  renderTimelineUI();
  renderMediaBin();
  renderTextControls();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawCanvas);
  drawCanvas();
});
