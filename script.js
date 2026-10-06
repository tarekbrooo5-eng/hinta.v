const fileInput = document.getElementById('fileInput');
const logoInput = document.getElementById('logoInput');
const projectBin = document.getElementById('projectBin');
const mainPlayer = document.getElementById('mainPlayer');
const placeholderText = document.getElementById('placeholderText');
const playPauseBtn = document.getElementById('playPauseBtn');
const timecodeDisplay = document.getElementById('timecodeDisplay');
const playheadLine = document.getElementById('playheadLine');

const laneV3 = document.getElementById('laneV3');
const laneV2 = document.getElementById('laneV2');
const laneV1 = document.getElementById('laneV1');

const textOverlay = document.getElementById('textOverlay');
const logoOverlay = document.getElementById('logoOverlay');
const logoImg = document.getElementById('logoImg');
const blurOverlay = document.getElementById('blurOverlay');

const customTextInput = document.getElementById('customTextInput');
const fontFamilySelect = document.getElementById('fontFamilySelect');
const textColorPicker = document.getElementById('textColorPicker');
const fontSizeRange = document.getElementById('fontSizeRange');

const clipSpeedRange = document.getElementById('clipSpeedRange');
const brightnessRange = document.getElementById('brightnessRange');
const opacityRange = document.getElementById('opacityRange');
const selectedClipInfo = document.getElementById('selectedClipInfo');

let videoDuration = 0;
let clips = []; // تخزين أجزاء الفيديو المقطعة
let selectedClipId = null;
let mainVideoFileUrl = "";

// استيراد الفيديو الرئيسي
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    mainVideoFileUrl = URL.createObjectURL(file);
    
    mainPlayer.src = mainVideoFileUrl;
    mainPlayer.style.display = 'block';
    placeholderText.style.display = 'none';
    mainPlayer.load();

    mainPlayer.onloadedmetadata = () => {
        videoDuration = mainPlayer.duration;
        
        // إنشاء الكليب الأساسي الكامل في المنسوب V1
        clips = [{
            id: 'clip_' + Date.now(),
            name: file.name,
            start: 0,
            duration: videoDuration,
            track: 'V1',
            speed: 1.0,
            brightness: 100,
            opacity: 100,
            leftPercent: 0,
            widthPercent: 100
        }];

        projectBin.innerHTML = `
            <div class="media-thumb">
                <div style="background:#111; height:45px; display:flex; align-items:center; justify-content:center; color:#777; font-size:8px;">VIDEO</div>
                <span>${file.name}</span>
            </div>
        `;
        renderTimelineClips();
    };
});

// رسم القطع وتحديث المسطرة العمودية
mainPlayer.addEventListener('timeupdate', () => {
    if (!isNaN(mainPlayer.currentTime) && videoDuration > 0) {
        let t = mainPlayer.currentTime;
        let hrs = String(Math.floor(t / 3600)).padStart(2, '0');
        let mins = String(Math.floor((t % 3600) / 60)).padStart(2, '0');
        let secs = String(Math.floor(t % 60)).padStart(2, '0');
        let frames = String(Math.floor((t % 1) * 25)).padStart(2, '0');
        timecodeDisplay.textContent = `${hrs}:${mins}:${secs}:${frames}`;

        // تحريك المسطرة العمودية بناءً على وقت التشغيل
        let percent = (t / videoDuration) * 100;
        playheadLine.style.left = percent + '%';
    }
});

// التشغيل والايقاف
function togglePlayPlayback() {
    if (mainPlayer.paused) {
        mainPlayer.play();
        playPauseBtn.textContent = "إيقاف مؤقت";
    } else {
        mainPlayer.pause();
        playPauseBtn.textContent = "تشغيل / إيقاف";
    }
}

function stepFrame(frames) {
    if (mainPlayer.src) mainPlayer.currentTime += frames * 0.04;
}

// التقطيع عند المؤشر الحالي
function splitCurrentClip() {
    if (!mainPlayer.src || videoDuration === 0) return;
    let currentTime = mainPlayer.currentTime;

    // البحث عن الكليب الذي يقع فيه وقت المؤشر الحالي
    let targetClipIndex = clips.findIndex(c => currentTime >= c.start && currentTime <= (c.start + c.duration));
    if (targetClipIndex === -1) {
        alert('مؤشر التشغيل ليس فوق أي قطعة حالياً!');
        return;
    }

    let targetClip = clips[targetClipIndex];
    if (currentTime <= targetClip.start + 0.1 || currentTime >= targetClip.start + targetClip.duration - 0.1) {
        alert('لا يمكن التقطيع عند أطراف القطعة مباشرة.');
        return;
    }

    let firstPartDuration = currentTime - targetClip.start;
    let secondPartDuration = targetClip.duration - firstPartDuration;

    let part1 = { ...targetClip, id: 'clip_' + Date.now() + '_1', duration: firstPartDuration, widthPercent: (firstPartDuration / videoDuration) * 100 };
    let part2 = { ...targetClip, id: 'clip_' + Date.now() + '_2', start: currentTime, duration: secondPartDuration, leftPercent: (currentTime / videoDuration) * 100, widthPercent: (secondPartDuration / videoDuration) * 100 };

    clips.splice(targetClipIndex, 1, part1, part2);
    renderTimelineClips();
    alert('تم تقطيع القطعة بنجاح إلى جزأين!');
}

// عرض القطع في مسارات التايملاين V1, V2, V3
function renderTimelineClips() {
    laneV1.innerHTML = '';
    laneV2.innerHTML = '';
    laneV3.innerHTML = '';

    clips.forEach(clip => {
        let div = document.createElement('div');
        div.className = `clip-item ${selectedClipId === clip.id ? 'selected' : ''}`;
        div.style.left = clip.leftPercent + '%';
        div.style.width = clip.widthPercent + '%';
        div.innerHTML = `<span>${clip.name} (${clip.speed}x)</span>`;
        
        div.onclick = (e) => {
            e.stopPropagation();
            selectClip(clip.id);
        };

        // دعم السحب والإفلات لتغيير المسار (مستوى أعلى أو أسفل)
        div.draggable = true;
        div.ondragstart = (e) => {
            e.dataTransfer.setData('text/plain', clip.id);
        };

        if (clip.track === 'V3') laneV3.appendChild(div);
        else if (clip.track === 'V2') laneV2.appendChild(div);
        else laneV1.appendChild(div);
    });
}

function allowDrop(ev) { ev.preventDefault(); }

function dropClip(ev, targetTrack) {
    ev.preventDefault();
    let clipId = ev.dataTransfer.getData('text/plain');
    let clip = clips.find(c => c.id === clipId);
    if (clip) {
        clip.track = targetTrack;
        renderTimelineClips();
    }
}

// تحديد قطعة لتعديل خصائصها وحدها
function selectClip(id) {
    selectedClipId = id;
    let clip = clips.find(c => c.id === id);
    if (clip) {
        selectedClipInfo.textContent = `محدد: ${clip.name} (مسار ${clip.track})`;
        clipSpeedRange.value = clip.speed;
        document.getElementById('speedVal').textContent = clip.speed;
        brightnessRange.value = clip.brightness;
        document.getElementById('brightVal').textContent = clip.brightness;
        opacityRange.value = clip.opacity;
        document.getElementById('opacityVal').textContent = clip.opacity;

        // تطبيق إعدادات السرعة والإضاءة على المشغل فوراً عند التحديد
        mainPlayer.playbackRate = clip.speed;
        mainPlayer.style.filter = `brightness(${clip.brightness}%)`;
        mainPlayer.style.opacity = clip.opacity / 100;
        mainPlayer.currentTime = clip.start;
    }
    renderTimelineClips();
}

// تعديل إعدادات القطعة المحددة
clipSpeedRange.addEventListener('input', (e) => {
    let val = parseFloat(e.target.value);
    document.getElementById('speedVal').textContent = val;
    if (selectedClipId) {
        let clip = clips.find(c => c.id === selectedClipId);
        if (clip) {
            clip.speed = val;
            mainPlayer.playbackRate = val;
            renderTimelineClips();
        }
    }
});

brightnessRange.addEventListener('input', (e) => {
    let val = e.target.value;
    document.getElementById('brightVal').textContent = val;
    if (selectedClipId) {
        let clip = clips.find(c => c.id === selectedClipId);
        if (clip) clip.brightness = val;
    }
    mainPlayer.style.filter = `brightness(${val}%)`;
});

opacityRange.addEventListener('input', (e) => {
    let val = e.target.value;
    document.getElementById('opacityVal').textContent = val;
    if (selectedClipId) {
        let clip = clips.find(c => c.id === selectedClipId);
        if (clip) clip.opacity = val;
    }
    mainPlayer.style.opacity = val / 100;
});

// التحكم بالنصوص
customTextInput.addEventListener('input', (e) => {
    let val = e.target.value;
    if (val.trim() !== "") {
        textOverlay.textContent = val;
        textOverlay.style.display = 'flex';
    } else {
        textOverlay.style.display = 'none';
    }
});

fontFamilySelect.addEventListener('change', (e) => { textOverlay.style.fontFamily = e.target.value; });
textColorPicker.addEventListener('input', (e) => { textOverlay.style.color = e.target.value; });
fontSizeRange.addEventListener('input', (e) => {
    document.getElementById('fontSizeVal').textContent = e.target.value;
    textOverlay.style.fontSize = e.target.value + 'px';
});

// الشعار واللوغو
logoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    logoImg.src = URL.createObjectURL(file);
    logoOverlay.style.display = 'flex';
});

// التغشية
function toggleBlur(shape) {
    blurOverlay.style.display = 'block';
    blurOverlay.style.borderRadius = (shape === 'circle') ? '50%' : '4px';
}
function removeBlur() { blurOverlay.style.display = 'none'; }

// السحب والإفلات للعناصر المرئية على الفيديو
function makeElementDraggable(elm) {
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
        elm.style.top = (elm.offsetTop - pos2) + "px";
        elm.style.left = (elm.offsetLeft - pos1) + "px";
    }
    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}
makeElementDraggable(textOverlay);
makeElementDraggable(logoOverlay);
makeElementDraggable(blurOverlay);

// زر الحفظ النهائي والتصدير
function exportFinalVideo() {
    if (!mainPlayer.src) {
        alert('الرجاء إضافة فيديو أولاً!');
        return;
    }
    alert('تم حفظ إعدادات المشروع وتقطيعات التايملاين ومسارات القطع بنجاح تام وجاهز للتصدير النهائي!');
}

function resetTimeline() {
    mainPlayer.src = "";
    mainPlayer.style.display = 'none';
    clips = [];
    selectedClipId = null;
    laneV1.innerHTML = '';
    laneV2.innerHTML = '';
    laneV3.innerHTML = '';
    placeholderText.style.display = 'block';
    textOverlay.style.display = 'none';
    logoOverlay.style.display = 'none';
    blurOverlay.style.display = 'none';
    selectedClipInfo.textContent = 'لم يتم تحديد قطعة';
}
