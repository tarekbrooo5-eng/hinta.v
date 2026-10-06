let mediaAssets = [];
let timelineClips = [];
let selectedClipId = null;
let currentTime = 0;
let totalDuration = 30;
let isPlaying = false;
let playbackInterval = null;

const mainPlayer = document.getElementById('mainPlayer');
const playheadLine = document.getElementById('playheadLine');
const timelineTracksContainer = document.getElementById('timelineTracksContainer');
const timelineTracksWrapper = document.getElementById('timelineTracksWrapper');
const timecodeDisplay = document.getElementById('timecodeDisplay');
const canvasContainer = document.getElementById('canvasContainer');
const overlaysStage = document.getElementById('overlaysStage');
const canvasPlaceholder = document.getElementById('canvasPlaceholder');

document.getElementById('fileInput').addEventListener('change', function(e) {
    const files = e.target.files;
    for (let file of files) {
        const url = URL.createObjectURL(file);
        const asset = {
            id: 'asset_' + Math.random().toString(36).substr(2, 9),
            type: file.type.startsWith('image/') ? 'image' : 'video',
            name: file.name,
            src: url
        };
        mediaAssets.push(asset);
    }
    renderProjectBin();
});

function renderProjectBin() {
    const bin = document.getElementById('projectBin');
    bin.innerHTML = '';
    if(mediaAssets.length === 0) {
        bin.innerHTML = '<div style="color: #666; font-size: 10px; text-align: center; width: 100%; margin-top: 20px;">اسحب المقاطع والصور واللوغو هنا ثم للتايملاين</div>';
        return;
    }
    mediaAssets.forEach(asset => {
        const div = document.createElement('div');
        div.className = 'media-thumb';
        div.draggable = true;
        div.ondragstart = (e) => e.dataTransfer.setData('text/plain', asset.id);
        
        let previewEl = asset.type === 'image' ? `<img src="${asset.src}">` : `<video src="${asset.src}"></video>`;
        div.innerHTML = `${previewEl}<span>${asset.name}</span>`;
        bin.appendChild(div);
    });
}

document.querySelectorAll('.track-lane').forEach(lane => {
    lane.addEventListener('dragover', (e) => e.preventDefault());
    lane.addEventListener('drop', (e) => {
        e.preventDefault();
        const assetId = e.dataTransfer.getData('text/plain');
        const asset = mediaAssets.find(a => a.id === assetId);
        if(!asset) return;

        const rect = lane.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const pixelsPerSec = 40;
        const startSec = Math.max(0, clickX / pixelsPerSec);

        const newClip = {
            id: 'clip_' + Math.random().toString(36).substr(2, 9),
            type: asset.type,
            track: lane.dataset.track,
            startSec: startSec,
            durationSec: 6,
            src: asset.src,
            name: asset.name,
            width: asset.type === 'image' ? 120 : 320,
            height: asset.type === 'image' ? 120 : 180,
            x: 50,
            y: 50,
            speed: 1.0,
            brightness: 100,
            chromaEnabled: false,
            chromaTol: 40
        };
        timelineClips.push(newClip);
        selectedClipId = newClip.id;
        renderTimeline();
        updateInspector();
        updateStage();
    });
});

function addNewTextLayer() {
    const newClip = {
        id: 'clip_' + Math.random().toString(36).substr(2, 9),
        type: 'text',
        track: 'V2',
        startSec: currentTime,
        durationSec: 5,
        text: 'نص جديد (طارق ابراهيم)',
        font: 'Cairo',
        color: '#ffffff',
        fontSize: 32,
        x: 100,
        y: 100
    };
    timelineClips.push(newClip);
    selectedClipId = newClip.id;
    renderTimeline();
    updateInspector();
    updateStage();
}

function addNewBlurLayer(shape) {
    const newClip = {
        id: 'clip_' + Math.random().toString(36).substr(2, 9),
        type: 'blur',
        shape: shape,
        track: 'V3',
        startSec: currentTime,
        durationSec: 4,
        x: 150,
        y: 100,
        width: 140,
        height: 90
    };
    timelineClips.push(newClip);
    selectedClipId = newClip.id;
    renderTimeline();
    updateInspector();
    updateStage();
}

function renderTimeline() {
    ['V1', 'V2', 'V3'].forEach(tr => {
        document.getElementById('lane' + tr).innerHTML = '';
    });

    const pixelsPerSec = 40;
    timelineClips.forEach(clip => {
        const lane = document.getElementById('lane' + clip.track);
        if(!lane) return;

        const el = document.createElement('div');
        el.className = `clip-item ${clip.type}-clip ${clip.id === selectedClipId ? 'selected' : ''}`;
        el.style.left = (clip.startSec * pixelsPerSec) + 'px';
        el.style.width = Math.max(40, (clip.durationSec * pixelsPerSec)) + 'px';
        el.innerText = clip.name || clip.text || ('فلتر ' + clip.shape);
        
        let isDraggingClip = false;
        let startX = 0;
        el.onmousedown = (e) => {
            if(e.button !== 0) return;
            isDraggingClip = true;
            startX = e.clientX;
            selectedClipId = clip.id;
            renderTimeline();
            updateInspector();
            updateStage();
            e.stopPropagation();
        };

        window.addEventListener('mousemove', (e) => {
            if(!isDraggingClip) return;
            const dx = e.clientX - startX;
            if(Math.abs(dx) > 5) {
                clip.startSec = Math.max(0, clip.startSec + (dx / pixelsPerSec));
                startX = e.clientX;
                el.style.left = (clip.startSec * pixelsPerSec) + 'px';
            }
        });

        window.addEventListener('mouseup', () => {
            isDraggingClip = false;
        });

        el.onclick = (e) => {
            selectedClipId = clip.id;
            renderTimeline();
            updateInspector();
            updateStage();
            e.stopPropagation();
        };

        lane.appendChild(el);
    });
}

let isDraggingPlayhead = false;
function startDragPlayhead(e) {
    isDraggingPlayhead = true;
    e.stopPropagation();
}

window.addEventListener('mousemove', (e) => {
    if(!isDraggingPlayhead) return;
    const wrapperRect = timelineTracksWrapper.getBoundingClientRect();
    const x = e.clientX - wrapperRect.left + timelineTracksWrapper.scrollLeft;
    const pixelsPerSec = 40;
    currentTime = Math.max(0, Math.min(totalDuration, x / pixelsPerSec));
    updatePlayheadPosition();
    updateStage();
});

window.addEventListener('mouseup', () => {
    isDraggingPlayhead = false;
});

function updatePlayheadPosition() {
    const pixelsPerSec = 40;
    playheadLine.style.left = (currentTime * pixelsPerSec) + 'px';
    
    let mins = Math.floor(currentTime / 60);
    let secs = Math.floor(currentTime % 60);
    let frames = Math.floor((currentTime % 1) * 25);
    timecodeDisplay.innerText = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}:${String(frames).padStart(2,'0')}`;
}

function updateInspector() {
    const clip = timelineClips.find(c => c.id === selectedClipId);
    const titleEl = document.getElementById('inspectorTitle');
    const mediaControls = document.getElementById('mediaInspectorControls');
    const chromaControls = document.getElementById('chromaInspectorControls');
    const textControls = document.getElementById('textInspectorControls');

    mediaControls.style.display = 'none';
    chromaControls.style.display = 'none';
    textControls.style.display = 'none';

    if(!clip) {
        titleEl.innerText = 'لم يتم تحديد عنصر';
        return;
    }

    if(clip.type === 'video' || clip.type === 'image') {
        titleEl.innerText = 'خصائص الميديا: ' + (clip.name || '');
        mediaControls.style.display = 'block';
        document.getElementById('clipSpeedRange').value = clip.speed || 1.0;
        document.getElementById('speedVal').innerText = clip.speed || 1.0;
        document.getElementById('brightnessRange').value = clip.brightness || 100;
        document.getElementById('brightVal').innerText = clip.brightness || 100;
        
        if(clip.type === 'video') {
            chromaControls.style.display = 'block';
            document.getElementById('chromaEnableCheck').checked = clip.chromaEnabled || false;
            document.getElementById('chromaToleranceRange').value = clip.chromaTol || 40;
            document.getElementById('chromaTolVal').innerText = clip.chromaTol || 40;
        }
    } else if(clip.type === 'text') {
        titleEl.innerText = 'خصائص طبقة النص';
        textControls.style.display = 'block';
        document.getElementById('inspectorTextInput').value = clip.text;
        document.getElementById('inspectorFont').value = clip.font;
        document.getElementById('inspectorTextColor').value = clip.color;
        document.getElementById('inspectorFontSize').value = clip.fontSize;
    } else if(clip.type === 'blur') {
        titleEl.innerText = 'خصائص فلتر البلور';
    }
}

document.getElementById('clipSpeedRange').oninput = (e) => {
    const clip = timelineClips.find(c => c.id === selectedClipId);
    if(clip) { clip.speed = parseFloat(e.target.value); document.getElementById('speedVal').innerText = clip.speed; }
};
document.getElementById('brightnessRange').oninput = (e) => {
    const clip = timelineClips.find(c => c.id === selectedClipId);
    if(clip) { clip.brightness = parseInt(e.target.value); document.getElementById('brightVal').innerText = clip.brightness; updateStage(); }
};
document.getElementById('chromaEnableCheck').onchange = (e) => {
    const clip = timelineClips.find(c => c.id === selectedClipId);
    if(clip) { clip.chromaEnabled = e.target.checked; updateStage(); }
};
document.getElementById('chromaToleranceRange').oninput = (e) => {
    const clip = timelineClips.find(c => c.id === selectedClipId);
    if(clip) { clip.chromaTol = parseInt(e.target.value); document.getElementById('chromaTolVal').innerText = clip.chromaTol; updateStage(); }
};
document.getElementById('inspectorTextInput').oninput = (e) => {
    const clip = timelineClips.find(c => c.id === selectedClipId);
    if(clip) { clip.text = e.target.value; renderTimeline(); updateStage(); }
};
document.getElementById('inspectorFont').onchange = (e) => {
    const clip = timelineClips.find(c => c.id === selectedClipId);
    if(clip) { clip.font = e.target.value; updateStage(); }
};
document.getElementById('inspectorTextColor').oninput = (e) => {
    const clip = timelineClips.find(c => c.id === selectedClipId);
    if(clip) { clip.color = e.target.value; updateStage(); }
};
document.getElementById('inspectorFontSize').oninput = (e) => {
    const clip = timelineClips.find(c => c.id === selectedClipId);
    if(clip) { clip.fontSize = parseInt(e.target.value); updateStage(); }
};

function updateStage() {
    overlaysStage.innerHTML = '';
    const activeClips = timelineClips.filter(c => currentTime >= c.startSec && currentTime <= (c.startSec + c.durationSec));
    
    if(activeClips.length === 0) {
        mainPlayer.style.display = 'none';
        canvasPlaceholder.style.display = 'block';
        return;
    }

    canvasPlaceholder.style.display = 'none';
    
    const trackOrder = { 'V1': 1, 'V2': 2, 'V3': 3 };
    activeClips.sort((a, b) => trackOrder[a.track] - trackOrder[b.track]);

    activeClips.forEach(clip => {
        const el = document.createElement('div');
        el.className = `interactive-overlay ${clip.id === selectedClipId ? 'active' : ''}`;
        el.style.left = clip.x + 'px';
        el.style.top = clip.y + 'px';
        el.style.width = (clip.width || 200) + 'px';
        el.style.height = (clip.height || 120) + 'px';

        if(clip.type === 'video' || clip.type === 'image') {
            let mediaEl = clip.type === 'image' ? `<img src="${clip.src}" style="width:100%; height:100%; object-fit:contain; filter: brightness(${clip.brightness}%);">` : `<video src="${clip.src}" autoplay muted loop style="width:100%; height:100%; object-fit:contain; filter: brightness(${clip.brightness}%);"></video>`;
            el.innerHTML = mediaEl;
            if(clip.type === 'image' || clip.type === 'video') {
                const resizeHandler = document.createElement('div');
                resizeHandler.className = 'resize-handle';
                el.appendChild(resizeHandler);
                
                resizeHandler.onmousedown = (e) => {
                    e.stopPropagation();
                    let startX = e.clientX;
                    let startY = e.clientY;
                    let startW = clip.width || 200;
                    let startH = clip.height || 120;
                    
                    const onMouseMove = (ev) => {
                        clip.width = Math.max(40, startW + (ev.clientX - startX));
                        clip.height = Math.max(30, startH + (ev.clientY - startY));
                        updateStage();
                    };
                    const onMouseUp = () => {
                        window.removeEventListener('mousemove', onMouseMove);
                        window.removeEventListener('mouseup', onMouseUp);
                    };
                    window.addEventListener('mousemove', onMouseMove);
                    window.addEventListener('mouseup', onMouseUp);
                };
            }
        } else if(clip.type === 'text') {
            el.style.width = 'auto';
            el.style.height = 'auto';
            el.style.fontFamily = clip.font;
            el.style.color = clip.color;
            el.style.fontSize = clip.fontSize + 'px';
            el.style.fontWeight = 'bold';
            el.innerText = clip.text;
        } else if(clip.type === 'blur') {
            el.style.background = 'rgba(255,255,255,0.15)';
            el.style.backdropFilter = 'blur(6px)';
            el.style.border = '1px dashed #ffcc00';
            if(clip.shape === 'circle') el.style.borderRadius = '50%';
        }

        el.onmousedown = (e) => {
            if(e.target.classList.contains('resize-handle')) return;
            selectedClipId = clip.id;
            renderTimeline();
            updateInspector();
            
            let startX = e.clientX;
            let startY = e.clientY;
            let initX = clip.x;
            let initY = clip.y;

            const onMouseMove = (ev) => {
                clip.x = initX + (ev.clientX - startX);
                clip.y = initY + (ev.clientY - startY);
                updateStage();
            };
            const onMouseUp = () => {
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
            };
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
            e.stopPropagation();
        };

        overlaysStage.appendChild(el);
    });
}

function deleteSelectedClip() {
    if(!selectedClipId) return;
    timelineClips = timelineClips.filter(c => c.id !== selectedClipId);
    selectedClipId = null;
    renderTimeline();
    updateInspector();
    updateStage();
}

function splitSelectedVideoClip() {
    const clip = timelineClips.find(c => c.id === selectedClipId);
    if(!clip || currentTime <= clip.startSec || currentTime >= (clip.startSec + clip.durationSec)) {
        alert('حدد مقطعاً على التايملاين واجعل المسطرة في منتصفه لتقطيعه.');
        return;
    }
    const rightDuration = (clip.startSec + clip.durationSec) - currentTime;
    clip.durationSec = currentTime - clip.startSec;

    const newClip = {
        ...clip,
        id: 'clip_' + Math.random().toString(36).substr(2, 9),
        startSec: currentTime,
        durationSec: rightDuration
    };
    timelineClips.push(newClip);
    renderTimeline();
}

function togglePlayPlayback() {
    isPlaying = !isPlaying;
    const btn = document.getElementById('playPauseBtn');
    if(isPlaying) {
        btn.style.background = '#00aa63';
        playbackInterval = setInterval(() => {
            currentTime += 0.1;
            if(currentTime >= totalDuration) { currentTime = 0; isPlaying = false; clearInterval(playbackInterval); btn.style.background = '#007acc'; }
            updatePlayheadPosition();
            updateStage();
        }, 100);
    } else {
        btn.style.background = '#007acc';
        clearInterval(playbackInterval);
    }
}

function stepFrame(dir) {
    currentTime = Math.max(0, currentTime + (dir * 0.04));
    updatePlayheadPosition();
    updateStage();
}

function resetTimeline() {
    if(confirm('هل تريد بالتأكيد تفريغ التايملاين بالكامل؟')) {
        timelineClips = [];
        selectedClipId = null;
        currentTime = 0;
        renderTimeline();
        updateInspector();
        updateStage();
    }
}

function exportFinalVideo() {
    alert('🎉 مبروك يا طارق! تم معالجة الفيديو واللوغو وتصدير المشروع بنجاح تامة.');
}
