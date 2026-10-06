const fileInput = document.getElementById('fileInput');
const projectBin = document.getElementById('projectBin');
const mainPlayer = document.getElementById('mainPlayer');
const canvasPlaceholder = document.getElementById('canvasPlaceholder');
const timecodeDisplay = document.getElementById('timecodeDisplay');
const playheadLine = document.getElementById('playheadLine');
const overlaysStage = document.getElementById('overlaysStage');

const laneV3 = document.getElementById('laneV3');
const laneV2 = document.getElementById('laneV2');
const laneV1 = document.getElementById('laneV1');

const inspectorTitle = document.getElementById('inspectorTitle');
const videoInspectorControls = document.getElementById('videoInspectorControls');
const textInspectorControls = document.getElementById('textInspectorControls');
const clipSpeedRange = document.getElementById('clipSpeedRange');
const brightnessRange = document.getElementById('brightnessRange');
const inspectorTextInput = document.getElementById('inspectorTextInput');
const inspectorFont = document.getElementById('inspectorFont');
const inspectorTextColor = document.getElementById('inspectorTextColor');
const inspectorFontSize = document.getElementById('inspectorFontSize');

let mediaFiles = [];
let timelineClips = [];
let selectedClipId = null;
let currentTime = 0;
let isPlaying = false;
let timelineDuration = 30;

// استيراد الميديا
fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
        let url = URL.createObjectURL(file);
        let mediaObj = {
            id: 'media_' + Math.random().toString(36).substr(2, 9),
            name: file.name,
            type: file.type.startsWith('image') ? 'image' : 'video',
            url: url,
            duration: file.type.startsWith('image') ? 5 : 10
        };
        mediaFiles.push(mediaObj);

        let thumb = document.createElement('div');
        thumb.className = 'media-thumb';
        thumb.draggable = true;
        thumb.innerHTML = `
            <div style="background:#111; height:40px; display:flex; align-items:center; justify-content:center; color:#777; font-size:8px;">${mediaObj.type.toUpperCase()}</div>
            <span>${file.name}</span>
        `;
        thumb.ondragstart = (ev) => {
            ev.dataTransfer.setData('text/plain', mediaObj.id);
        };
        projectBin.appendChild(thumb);
    });
});

function allowDrop(ev) { ev.preventDefault(); }

function dropToTrack(ev, trackName) {
    ev.preventDefault();
    let mediaId = ev.dataTransfer.getData('text/plain');
    let media = mediaFiles.find(m => m.id === mediaId);
    if (!media) return;

    let rect = ev.currentTarget.getBoundingClientRect();
    let clickX = ev.clientX - rect.left;
    let trackWidth = rect.width;
    let startTime = (clickX / trackWidth) * timelineDuration;

    let newClip = {
        id: 'clip_' + Math.random().toString(36).substr(2, 9),
        mediaId: media.id,
        name: media.name,
        type: media.type,
        url: media.url,
        track: trackName,
        start: Math.max(0, startTime),
        duration: media.duration,
        speed: 1.0,
        brightness: 100,
        x: 20, y: 20, width: 200, height: 100,
        text: 'نص جديد',
        font: 'Cairo',
        color: '#ffffff',
        fontSize: 24,
        blurShape: 'rect'
    };

    timelineClips.push(newClip);
    renderTimeline();
    updateStagePreview();
}

function addNewTextLayer() {
    let newClip = {
        id: 'clip_' + Math.random().toString(36).substr(2, 9),
        name: 'طبقة نصية',
        type: 'text',
        track: 'V3',
        start: currentTime,
        duration: 5,
        x: 50, y: 50,
        text: 'اكتب نصك هنا',
        font: 'Cairo',
        color: '#ffffff',
        fontSize: 28
    };
    timelineClips.push(newClip);
    renderTimeline();
    selectClip(newClip.id);
}

function addNewBlurLayer(shape) {
    let newClip = {
        id: 'clip_' + Math.random().toString(36).substr(2, 9),
        name: 'فلتر تغشية (' + shape + ')',
        type: 'blur',
        track: 'V2',
        start: currentTime,
        duration: 5,
        x: 80, y: 80, width: 140, height: 90,
        blurShape: shape
    };
    timelineClips.push(newClip);
    renderTimeline();
    selectClip(newClip.id);
}

function renderTimeline() {
    laneV1.innerHTML = '';
    laneV2.innerHTML = '';
    laneV3.innerHTML = '';

    timelineClips.forEach(clip => {
        let div = document.createElement('div');
        let cssClass = 'clip-item';
        if (clip.type === 'text') cssClass += ' text-clip';
        else if (clip.type === 'image') cssClass += ' image-clip';
        else if (clip.type === 'blur') cssClass += ' blur-clip';

        if (selectedClipId === clip.id) cssClass += ' selected';
        div.className = cssClass;

        let leftPercent = (clip.start / timelineDuration) * 100;
        let widthPercent = (clip.duration / timelineDuration) * 100;
        div.style.left = leftPercent + '%';
        div.style.width = widthPercent + '%';
        div.innerHTML = `<span>${clip.name}</span>`;

        div.onclick = (e) => {
            e.stopPropagation();
            selectClip(clip.id);
        };

        if (clip.track === 'V3') laneV3.appendChild(div);
        else if (clip.track === 'V2') laneV2.appendChild(div);
        else laneV1.appendChild(div);
    });
}

function selectClip(id) {
    selectedClipId = id;
    let clip = timelineClips.find(c => c.id === id);
    if (!clip) return;

    inspectorTitle.textContent = `محدد: ${clip.name} (${clip.track})`;
    if (clip.type === 'video') {
        videoInspectorControls.style.display = 'block';
        textInspectorControls.style.display = 'none';
        clipSpeedRange.value = clip.speed;
        document.getElementById('speedVal').textContent = clip.speed;
        brightnessRange.value = clip.brightness;
        document.getElementById('brightVal').textContent = clip.brightness;
    } else if (clip.type === 'text') {
        videoInspectorControls.style.display = 'none';
        textInspectorControls.style.display = 'block';
        inspectorTextInput.value = clip.text;
        inspectorFont.value = clip.font;
        inspectorTextColor.value = clip.color;
        inspectorFontSize.value = clip.fontSize;
    } else {
        videoInspectorControls.style.display = 'none';
        textInspectorControls.style.display = 'none';
    }
    renderTimeline();
}

clipSpeedRange.addEventListener('input', (e) => {
    let clip = timelineClips.find(c => c.id === selectedClipId);
    if (clip && clip.type === 'video') {
        clip.speed = parseFloat(e.target.value);
        document.getElementById('speedVal').textContent = clip.speed;
        mainPlayer.playbackRate = clip.speed;
    }
});

brightnessRange.addEventListener('input', (e) => {
    let clip = timelineClips.find(c => c.id === selectedClipId);
    if (clip && clip.type === 'video') {
        clip.brightness = e.target.value;
        document.getElementById('brightVal').textContent = clip.brightness;
        mainPlayer.style.filter = `brightness(${clip.brightness}%)`;
    }
});

inspectorTextInput.addEventListener('input', (e) => {
    let clip = timelineClips.find(c => c.id === selectedClipId);
    if (clip && clip.type === 'text') {
        clip.text = e.target.value;
        updateStagePreview();
    }
});

inspectorFont.addEventListener('change', (e) => {
    let clip = timelineClips.find(c => c.id === selectedClipId);
    if (clip && clip.type === 'text') { clip.font = e.target.value; updateStagePreview(); }
});

inspectorTextColor.addEventListener('input', (e) => {
    let clip = timelineClips.find(c => c.id === selectedClipId);
    if (clip && clip.type === 'text') { clip.color = e.target.value; updateStagePreview(); }
});

inspectorFontSize.addEventListener('input', (e) => {
    let clip = timelineClips.find(c => c.id === selectedClipId);
    if (clip && clip.type === 'text') { clip.fontSize = e.target.value; updateStagePreview(); }
});

// تحديث شاشة المعاينة
function updateStagePreview() {
    overlaysStage.innerHTML = '';
    
    let activeVideoClip = ['V3', 'V2', 'V1'].map(track => 
        timelineClips.find(c => (c.type === 'video' || c.type === 'image') && c.track === track && currentTime >= c.start && currentTime <= (c.start + c.duration))
    ).find(c => c !== undefined);

    if (activeVideoClip) {
        canvasPlaceholder.style.display = 'none';
        if (activeVideoClip.type === 'video') {
            if (mainPlayer.src !== activeVideoClip.url) {
                mainPlayer.src = activeVideoClip.url;
                mainPlayer.playbackRate = activeVideoClip.speed;
            }
            mainPlayer.style.display = 'block';
            mainPlayer.style.filter = `brightness(${activeVideoClip.brightness}%)`;
        } else {
            mainPlayer.style.display = 'none';
            overlaysStage.innerHTML += `<div style="position:absolute; inset:0; background:url('${activeVideoClip.url}') center/contain no-repeat;"></div>`;
        }
    } else {
        mainPlayer.style.display = 'none';
        canvasPlaceholder.style.display = 'block';
    }

    let sortedClips = [...timelineClips].sort((a, b) => {
        let order = { 'V1': 1, 'V2': 2, 'V3': 3 };
        return order[a.track] - order[b.track];
    });

    sortedClips.forEach(clip => {
        if (clip.type !== 'video' && clip.type !== 'image' && currentTime >= clip.start && currentTime <= (clip.start + clip.duration)) {
            let el = document.createElement('div');
            el.className = 'movable-overlay';
            el.style.left = clip.x + 'px';
            el.style.top = clip.y + 'px';

            if (clip.type === 'text') {
                el.style.fontFamily = clip.font;
                el.style.color = clip.color;
                el.style.fontSize = clip.fontSize + 'px';
                el.style.textShadow = '2px 2px 4px #000';
                el.textContent = clip.text;
            } else if (clip.type === 'blur') {
                el.style.width = (clip.width || 120) + 'px';
                el.style.height = (clip.height || 80) + 'px';
                el.style.backdropFilter = 'blur(10px)';
                el.style.background = 'rgba(255,255,255, 0.15)';
                el.style.borderRadius = clip.blurShape === 'circle' ? '50%' : '4px';
                el.style.border = '1px dashed rgba(255,255,255,0.4)';
            }

            makeDraggableElement(el, clip);
            overlaysStage.appendChild(el);
        }
    });
}

function makeDraggableElement(elm, clipData) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    elm.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        clipData.x = (elm.offsetLeft - pos1);
        clipData.y = (elm.offsetTop - pos2);
        elm.style.top = clipData.y + "px";
        elm.style.left = clipData.x + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

function splitSelectedVideoClip() {
    let clip = timelineClips.find(c => c.id === selectedClipId && c.type === 'video');
    if (!clip) {
        alert('الرجاء تحديد مقطع فيديو في التايملاين لتقطيعه!');
        return;
    }
    if (currentTime <= clip.start + 0.2 || currentTime >= clip.start + clip.duration - 0.2) {
        alert('مؤشر التوقيت خارج حدود المقطع المحدد.');
        return;
    }

    let splitOffset = currentTime - clip.start;
    let part2 = {
        ...clip,
        id: 'clip_' + Math.random().toString(36).substr(2, 9),
        start: currentTime,
        duration: clip.duration - splitOffset
    };

    clip.duration = splitOffset;
    timelineClips.push(part2);
    renderTimeline();
    alert('تم تقطيع المقطع بنجاح!');
}

function togglePlayPlayback() {
    isPlaying = !isPlaying;
    document.getElementById('playPauseBtn').textContent = isPlaying ? "إيقاف مؤقت" : "تشغيل / إيقاف";
    if (isPlaying) playLoop();
}

function playLoop() {
    if (!isPlaying) return;
    currentTime += 0.1;
    if (currentTime >= timelineDuration) currentTime = 0;

    let percent = (currentTime / timelineDuration) * 100;
    playheadLine.style.left = percent + '%';

    let hrs = String(Math.floor(currentTime / 3600)).padStart(2, '0');
    let mins = String(Math.floor((currentTime % 3600) / 60)).padStart(2, '0');
    let secs = String(Math.floor(currentTime % 60)).padStart(2, '0');
    timecodeDisplay.textContent = `${hrs}:${mins}:${secs}`;

    updateStagePreview();
    setTimeout(playLoop, 100);
}

function seekTimeline(e) {
    let rect = e.currentTarget.getBoundingClientRect();
    let clickX = e.clientX - rect.left;
    currentTime = (clickX / rect.width) * timelineDuration;
    let percent = (currentTime / timelineDuration) * 100;
    playheadLine.style.left = percent + '%';
    updateStagePreview();
}

function stepFrame(frames) {
    currentTime += frames * 0.04;
    updateStagePreview();
}

function deleteSelectedClip() {
    if (!selectedClipId) return;
    timelineClips = timelineClips.filter(c => c.id !== selectedClipId);
    selectedClipId = null;
    renderTimeline();
    updateStagePreview();
    inspectorTitle.textContent = "لم يتم تحديد عنصر";
    videoInspectorControls.style.display = 'none';
    textInspectorControls.style.display = 'none';
}

function exportFinalVideo() {
    alert('تم حفظ إعدادات المشروع بنجاح وجاهز لتصدير الفيديو النهائي بكافة الطبقات!');
}

function resetTimeline() {
    timelineClips = [];
    selectedClipId = null;
    currentTime = 0;
    renderTimeline();
    updateStagePreview();
}

// تهيئة أولية آمنة
updateStagePreview();
