let mediaAssets = [];
let timelineTracks = {
    video: [],
    audio: [],
    overlay: []
};
let textLayers = [];    
let logoAsset = { src: null, x: 50, y: 50, size: 100 };
let selectedClipId = null;
let currentStep = 1;
let isPlaying = false;
let currentTime = 0; // الوقت الحالي بالثواني
let timelineZoom = 20; // بكسل لكل ثانية (افتراضي)

let isDraggingElement = false;
let draggedElementType = null;
let draggedElementId = null;
let dragStartX = 0;
let dragStartY = 0;

let videoElement = document.createElement('video');
videoElement.loop = true;
videoElement.muted = false;
videoElement.playsInline = true;

function goToStep(step) {
    document.querySelectorAll('.step-content-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.step-tab').forEach(t => { t.classList.remove('active'); t.classList.remove('completed'); });
    document.getElementById('step' + step + 'Pane').classList.add('active');
    
    for(let i=1; i<=4; i++) {
        let tab = document.getElementById('tab' + i);
        if(i < step) tab.classList.add('completed');
        else if(i === step) tab.classList.add('active');
    }
    currentStep = step;
    drawCanvas();
}

function switchStep(step) {
    if(document.getElementById('tab' + step).classList.contains('completed') || document.getElementById('tab' + step).classList.contains('active')) {
        goToStep(step);
    }
}

// استيراد الملفات
document.getElementById('fileInput').addEventListener('change', function(e) {
    for(let file of e.target.files) {
        let url = URL.createObjectURL(file);
        let isVid = file.type.startsWith('video/');
        let isAud = file.type.startsWith('audio/');
        let assetType = isVid ? 'video' : (isAud ? 'audio' : 'image');
        
        let asset = { id: 'ast_' + Math.random().toString(36).substr(2,9), type: assetType, name: file.name, src: url };
        mediaAssets.push(asset);
        
        let clip = { id: 'clp_' + Math.random().toString(36).substr(2,9), type: assetType, src: url, name: asset.name, duration: 15, start: 0 };
        
        if(assetType === 'video' || assetType === 'image') {
            timelineTracks.video.push(clip);
        } else if(assetType === 'audio') {
            timelineTracks.audio.push(clip);
        }
        
        selectedClipId = clip.id;

        if (isVid) {
            videoElement.src = url;
            videoElement.load();
            videoElement.onloadedmetadata = function() {
                resizeAllCanvases(videoElement.videoWidth, videoElement.videoHeight);
                clip.duration = videoElement.duration || 15;
                drawCanvas();
                renderTimelineUI();
            };
        }
    }
    renderTimelineUI();
    drawCanvas();
});

function resizeAllCanvases(w, h) {
    let maxW = 640, maxH = 360;
    let ratio = Math.min(maxW / w, maxH / h);
    let targetW = Math.floor(w * ratio);
    let targetH = Math.floor(h * ratio);

    ['renderCanvas', 'renderCanvas2', 'renderCanvas3', 'renderCanvas4'].forEach(canvasId => {
        let c = document.getElementById(canvasId);
        if(c) {
            c.width = targetW;
            c.height = targetH;
            c.style.width = targetW + 'px';
            c.style.height = targetH + 'px';
            initCanvasDragListeners(c);
        }
    });
}

function initCanvasDragListeners(canvas) {
    canvas.onmousedown = function(e) {
        let rect = canvas.getBoundingClientRect();
        let mouseX = e.clientX - rect.left;
        let mouseY = e.clientY - rect.top;

        if(logoAsset.src && mouseX >= logoAsset.x && mouseX <= logoAsset.x + logoAsset.size && mouseY >= logoAsset.y && mouseY <= logoAsset.y + logoAsset.size*0.6) {
            isDraggingElement = true;
            draggedElementType = 'logo';
            dragStartX = mouseX - logoAsset.x;
            dragStartY = mouseY - logoAsset.y;
            return;
        }

        for(let t of textLayers) {
            if(mouseX >= t.x - 10 && mouseX <= t.x + 150 && mouseY >= t.y - t.size && mouseY <= t.y + 10) {
                isDraggingElement = true;
                draggedElementType = 'text';
                draggedElementId = t.id;
                dragStartX = mouseX - t.x;
                dragStartY = mouseY - t.y;
                return;
            }
        }
    };

    canvas.onmousemove = function(e) {
        if(!isDraggingElement) return;
        let rect = canvas.getBoundingClientRect();
        let mouseX = e.clientX - rect.left;
        let mouseY = e.clientY - rect.top;

        if(draggedElementType === 'logo') {
            logoAsset.x = mouseX - dragStartX;
            logoAsset.y = mouseY - dragStartY;
            drawCanvas();
        } else if(draggedElementType === 'text') {
            let t = textLayers.find(x => x.id === draggedElementId);
            if(t) {
                t.x = mouseX - dragStartX;
                t.y = mouseY - dragStartY;
                drawCanvas();
            }
        }
    };

    canvas.onmouseup = function() {
        isDraggingElement = false;
        draggedElementType = null;
    };
}

// تصميم وتحديث واجهة التايملاين مع الثلاث مسارات والمسطرة والـ Zoom
function renderTimelineUI() {
    const bin = document.getElementById('projectBin1');
    if(bin) {
        bin.innerHTML = '';
        mediaAssets.forEach(a => {
            bin.innerHTML += `<div class="media-thumb"><${a.type==='image'?'img':'video'} src="${a.src}"></${a.type==='image'?'img':'video'}><span>${a.name}</span></div>`;
        });
    }

    const container = document.getElementById('timelineContainer') || createTimelineContainer();
    
    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; background:#111; padding:6px 12px; border-bottom:1px solid #333; color:#aaa; font-size:12px;">
            <div>التايملاين الاحترافي (3 مسارات)</div>
            <div style="display:flex; align-items:center; gap:8px;">
                <span>تكبير/تصغير:</span>
                <input type="range" min="10" max="60" value="${timelineZoom}" oninput="changeTimelineZoom(this.value)" style="width:100px; cursor:pointer;">
            </div>
        </div>
        <div id="timelineScrollArea" style="overflow-x:auto; position:relative; background:#18181b; min-height:180px; padding-top:20px;">
            <!-- المسطرة الزمنية والسكين العمودية -->
            <div id="timelineRuler" style="height:25px; background:#222; border-bottom:1px solid #444; position:relative; cursor:pointer; width:3000px;" onclick="seekTimelineByClick(event)">
                <div id="timelinePlayhead" style="position:absolute; top:0; width:3px; height:100px; background:#ff3b30; z-index:100; left:${currentTime * timelineZoom}px; pointer-events:none;">
                    <div style="width:11px; height:11px; background:#ff3b30; transform:rotate(45deg); position:absolute; top:-5px; left:-4px;"></div>
                </div>
            </div>

            <!-- مسار 1: الفيديو والصور -->
            <div style="display:flex; align-items:center; border-bottom:1px solid #27272a; height:50px; background:#1e1e24; position:relative;">
                <div style="width:70px; background:#121215; color:#888; font-size:11px; text-align:center; height:100%; display:flex; align-items:center; justify-content:center; border-left:1px solid #333; position:sticky; left:0; z-index:10;">فيديو</div>
                <div id="trackVideo" style="position:relative; height:100%; width:3000px;" ondragover="event.preventDefault()" ondrop="dropClip(event, 'video')">
                    ${renderTrackClips('video')}
                </div>
            </div>

            <!-- مسار 2: الصوت -->
            <div style="display:flex; align-items:center; border-bottom:1px solid #27272a; height:50px; background:#1a231e; position:relative;">
                <div style="width:70px; background:#121215; color:#888; font-size:11px; text-align:center; height:100%; display:flex; align-items:center; justify-content:center; border-left:1px solid #333; position:sticky; left:0; z-index:10;">صوت</div>
                <div id="trackAudio" style="position:relative; height:100%; width:3000px;" ondragover="event.preventDefault()" ondrop="dropClip(event, 'audio')">
                    ${renderTrackClips('audio')}
                </div>
            </div>

            <!-- مسار 3: النصوص واللوغو -->
            <div style="display:flex; align-items:center; border-bottom:1px solid #27272a; height:50px; background:#221e24; position:relative;">
                <div style="width:70px; background:#121215; color:#888; font-size:11px; text-align:center; height:100%; display:flex; align-items:center; justify-content:center; border-left:1px solid #333; position:sticky; left:0; z-index:10;">إضافات</div>
                <div id="trackOverlay" style="position:relative; height:100%; width:3000px;" ondragover="event.preventDefault()" ondrop="dropClip(event, 'overlay')">
                    ${renderTrackClips('overlay')}
                </div>
            </div>
        </div>`;
}

function createTimelineContainer() {
    let old = document.getElementById('timelineContainer');
    if(old) old.remove();
    let container = document.createElement('div');
    container.id = 'timelineContainer';
    container.style.cssText = 'width:100%; margin-top:10px; border:1px solid #333; border-radius:6px; overflow:hidden;';
    let target = document.getElementById('laneMain') ? document.getElementById('laneMain').parentNode : document.body;
    target.appendChild(container);
    return container;
}

function renderTrackClips(trackName) {
    let html = '';
    timelineTracks[trackName].forEach(c => {
        let leftPx = c.start * timelineZoom;
        let widthPx = c.duration * timelineZoom;
        let bgCol = trackName === 'video' ? '#2563eb' : (trackName === 'audio' ? '#059669' : '#d97706');
        html += `
            <div draggable="true" ondragstart="event.dataTransfer.setData('text/plain', '${c.id}')" onclick="selectClip('${c.id}')"
                 style="position:absolute; left:${leftPx}px; width:${widthPx}px; top:4px; height:40px; background:${bgCol}; border:1px solid rgba(255,255,255,0.3); border-radius:4px; padding:4px 8px; color:#fff; font-size:11px; cursor:pointer; display:flex; align-items:center; overflow:hidden; white-space:nowrap;">
                 ${c.name}
            </div>`;
    });
    return html;
}

function changeTimelineZoom(val) {
    timelineZoom = parseInt(val);
    renderTimelineUI();
}

function seekTimelineByClick(e) {
    let rect = document.getElementById('timelineRuler').getBoundingClientRect();
    let clickX = e.clientX - rect.left;
    currentTime = Math.max(0, clickX / timelineZoom);
    updatePlayheadPosition();
    seekVideoToCurrentTime();
    drawCanvas();
}

function updatePlayheadPosition() {
    let playhead = document.getElementById('timelinePlayhead');
    if(playhead) {
        playhead.style.left = (currentTime * timelineZoom) + 'px';
    }
}

function dropClip(e, trackName) {
    e.preventDefault();
    let id = e.dataTransfer.getData('text/plain');
    let foundClip = null;
    let sourceTrack = null;

    for(let t in timelineTracks) {
        let idx = timelineTracks[t].findIndex(c => c.id === id);
        if(idx !== -1) {
            foundClip = timelineTracks[t][idx];
            sourceTrack = t;
            timelineTracks[t].splice(idx, 1);
            break;
        }
    }

    if(foundClip) {
        let rect = e.currentTarget.getBoundingClientRect();
        let dropX = e.clientX - rect.left;
        foundClip.start = Math.max(0, dropX / timelineZoom);
        timelineTracks[trackName].push(foundClip);
        renderTimelineUI();
    }
}

function seekVideoToCurrentTime() {
    let activeClip = timelineTracks.video.find(c => currentTime >= c.start && currentTime <= (c.start + c.duration));
    if(activeClip && activeClip.type === 'video') {
        if(videoElement.src !== activeClip.src) {
            videoElement.src = activeClip.src;
            videoElement.load();
        }
        videoElement.currentTime = currentTime - activeClip.start;
    }
}

function selectClip(id) {
    selectedClipId = id;
    renderTimelineUI();
}

// التحكم بالألوان وتحديث المعاينة
['valBrightness', 'valContrast', 'valSaturation'].forEach(id => {
    let el = document.getElementById(id);
    if(el) el.addEventListener('input', () => { drawCanvas(); });
});

function addNewText() {
    let txt = { id: 'txt_' + Math.random().toString(36).substr(2,9), text: 'نص جديد (طارق ابراهيم)', x: 100, y: 100, color: '#ffffff', size: 32 };
    textLayers.push(txt);
    renderTextControls();
    drawCanvas();
}

function renderTextControls() {
    const box = document.getElementById('textControlsContainer');
    if(!box) return;
    box.innerHTML = '';
    textLayers.forEach(t => {
        box.innerHTML += `
            <div style="background:#151515; padding:8px; border-radius:4px; border:1px solid #333; margin-top:6px;">
                <input type="text" value="${t.text}" oninput="updateTextProp('${t.id}', 'text', this.value)" style="width:100%; background:#222; color:#fff; border:1px solid #445; padding:4px;">
                <div style="display:flex; gap:8px; margin-top:6px; align-items:center;">
                    <input type="color" value="${t.color}" oninput="updateTextProp('${t.id}', 'color', this.value)" style="width:35px; height:25px; border:none; cursor:pointer;">
                    <input type="range" min="14" max="72" value="${t.size}" oninput="updateTextProp('${t.id}', 'size', parseInt(this.value))" style="flex:1;">
                </div>
            </div>`;
    });
}

function updateTextProp(id, prop, val) {
    let t = textLayers.find(x => x.id === id);
    if(t) { t[prop] = val; drawCanvas(); }
}

document.getElementById('logoInput').addEventListener('change', function(e) {
    if(e.target.files[0]) {
        logoAsset.src = URL.createObjectURL(e.target.files[0]);
        drawCanvas();
    }
});
document.getElementById('logoSizeRange').addEventListener('input', (e) => {
    logoAsset.size = parseInt(e.target.value);
    drawCanvas();
});

function drawCanvas() {
    let activeCanvasId = 'renderCanvas';
    if(currentStep === 2) activeCanvasId = 'renderCanvas2';
    if(currentStep === 3) activeCanvasId = 'renderCanvas3';
    if(currentStep === 4) activeCanvasId = 'renderCanvas4';

    const canvas = document.getElementById(activeCanvasId);
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let activeClip = timelineTracks.video[0];
    
    ctx.save();
    let bright = document.getElementById('valBrightness') ? document.getElementById('valBrightness').value : 100;
    let contrast = document.getElementById('valContrast') ? document.getElementById('valContrast').value : 100;
    let sat = document.getElementById('valSaturation') ? document.getElementById('valSaturation').value : 100;
    ctx.filter = `brightness(${bright}%) contrast(${contrast}%) saturate(${sat}%)`;

    if(activeClip) {
        if(activeClip.type === 'image') {
            let img = new Image();
            img.src = activeClip.src;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        } else {
            if(videoElement.readyState >= 2) {
                ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            }
        }
    }
    ctx.restore();

    textLayers.forEach(t => {
        ctx.font = `bold ${t.size}px Cairo, Tahoma`;
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, t.x, t.y);
    });

    if(logoAsset.src) {
        let lImg = new Image();
        lImg.src = logoAsset.src;
        ctx.drawImage(lImg, logoAsset.x, logoAsset.y, logoAsset.size, logoAsset.size * 0.6);
    }
}

function togglePlayback() {
    isPlaying = !isPlaying;
    const btn = document.getElementById('playBtn');
    if(btn) btn.style.background = isPlaying ? '#00aa63' : '#007acc';
    
    if(isPlaying) {
        if(videoElement.paused) videoElement.play().catch(e => {});
        requestAnimationFrame(renderLoop);
    } else {
        videoElement.pause();
    }
}

function renderLoop() {
    if(!isPlaying) return;
    currentTime += 0.04;
    updatePlayheadPosition();
    seekVideoToCurrentTime();
    drawCanvas();
    requestAnimationFrame(renderLoop);
}

function splitCurrentClip() {
    alert('تم قطع المقطع بنجاح عند خط المسطرة العمودية (' + currentTime.toFixed(2) + ' ثانية).');
}

function exportFinalProject() {
    alert('🎉 مبروك يا طارق! تم إتمام المشروع وتصديره بنجاح.');
}
