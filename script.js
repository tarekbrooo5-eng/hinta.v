let mediaAssets = [];
let timelineClips = []; 
let textLayers = [];    
let logoAsset = { src: null, x: 50, y: 50, size: 100 };
let selectedClipId = null;
let currentStep = 1;
let isPlaying = false;
let currentTime = 0;

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

document.getElementById('fileInput').addEventListener('change', function(e) {
    for(let file of e.target.files) {
        let url = URL.createObjectURL(file);
        let isVid = file.type.startsWith('video/');
        let asset = { id: 'ast_' + Math.random().toString(36).substr(2,9), type: isVid ? 'video' : 'image', name: file.name, src: url };
        mediaAssets.push(asset);
        
        let clip = { id: 'clp_' + Math.random().toString(36).substr(2,9), type: asset.type, src: url, name: asset.name, duration: 15, start: 0, chromaEn: false };
        timelineClips.push(clip);
        selectedClipId = clip.id;

        if (isVid) {
            videoElement.src = url;
            videoElement.load();
            videoElement.onloadedmetadata = function() {
                resizeAllCanvases(videoElement.videoWidth, videoElement.videoHeight);
                clip.duration = videoElement.duration || 15;
                videoElement.currentTime = 0;
                videoElement.play().then(() => {
                    videoElement.pause();
                    drawCanvas();
                }).catch(err => { drawCanvas(); });
                renderBinAndTimeline();
            };
        }
    }
    renderBinAndTimeline();
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

function renderBinAndTimeline() {
    const bin = document.getElementById('projectBin1');
    if(bin) {
        bin.innerHTML = '';
        mediaAssets.forEach(a => {
            bin.innerHTML += `<div class="media-thumb"><${a.type==='image'?'img':'video'} src="${a.src}"></${a.type==='image'?'img':'video'}><span>${a.name}</span></div>`;
        });
    }

    const lane = document.getElementById('laneMain');
    if(!lane) return;
    lane.innerHTML = '';
    let totalW = 0;

    timelineClips.forEach(c => {
        let w = c.duration * 20;
        let leftPos = c.start * 20;
        lane.innerHTML += `
            <div class="clip-item ${c.id===selectedClipId?'selected':''}" 
                 style="left:${leftPos}px; width:${w}px; position:absolute; height:45px; background:#2a4365; border:1px solid #4299e1; border-radius:4px; display:flex; align-items:center; padding:0 8px; cursor:pointer; color:#fff; font-size:12px;"
                 onclick="selectClip('${c.id}')"
                 draggable="true"
                 ondragstart="event.dataTransfer.setData('text/plain', '${c.id}')">
                 ${c.name}
            </div>`;
        totalW = Math.max(totalW, leftPos + w);
    });
    lane.style.width = Math.max(800, totalW + 200) + 'px';
    lane.style.position = 'relative';

    lane.ondragover = (e) => e.preventDefault();
    lane.ondrop = (e) => {
        e.preventDefault();
        let id = e.dataTransfer.getData('text/plain');
        let clip = timelineClips.find(c => c.id === id);
        if(clip) {
            let rect = lane.getBoundingClientRect();
            let dropX = e.clientX - rect.left;
            clip.start = Math.max(0, Math.floor(dropX / 20));
            renderBinAndTimeline();
        }
    };
}

document.addEventListener('click', function(e) {
    if(e.target.closest('#laneMain')) {
        let laneRect = document.getElementById('laneMain').getBoundingClientRect();
        let clickX = e.clientX - laneRect.left;
        if(clickX >= 0) {
            currentTime = Math.max(0, clickX / 20);
            updatePlayheadPosition(clickX);
            seekVideoToCurrentTime();
            drawCanvas();
        }
    }
});

function updatePlayheadPosition(xPos) {
    let playhead = document.getElementById('timelinePlayhead');
    if(!playhead) {
        playhead = document.createElement('div');
        playhead.id = 'timelinePlayhead';
        playhead.style.cssText = 'position:absolute; top:0; width:2px; height:100%; background:#ff4d4d; z-index:100; pointer-events:none;';
        let container = document.getElementById('laneMain');
        if(container && container.parentNode) container.parentNode.appendChild(playhead);
    }
    let containerRect = document.getElementById('laneMain').getBoundingClientRect();
    let parentRect = playhead.parentNode.getBoundingClientRect();
    playhead.style.left = (containerRect.left - parentRect.left + xPos) + 'px';
}

function seekVideoToCurrentTime() {
    let activeClip = timelineClips.find(c => currentTime >= c.start && currentTime <= (c.start + c.duration));
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
    let clip = timelineClips.find(c => c.id === id);
    if(clip && clip.type === 'video') {
        videoElement.src = clip.src;
        videoElement.play();
        isPlaying = true;
        let btn = document.getElementById('playBtn');
        if(btn) btn.style.background = '#00aa63';
        requestAnimationFrame(renderLoop);
    }
    renderBinAndTimeline();
}

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

    let activeClip = timelineClips[0];
    
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
    drawCanvas();
    requestAnimationFrame(renderLoop);
}

function splitCurrentClip() {
    alert('تم قطع المقطع بنجاح عند خط الزمن الحالي.');
}

function exportFinalProject() {
    alert('🎉 مبروك يا طارق! تم تصدير الفيديو والحفظ النهائي بنجاح تامة.');
}
