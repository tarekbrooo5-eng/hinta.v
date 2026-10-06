const fileInput = document.getElementById('fileInput');
const projectBin = document.getElementById('projectBin');
const mainPlayer = document.getElementById('mainPlayer');
const overlayPlayer = document.getElementById('overlayPlayer');
const placeholderText = document.getElementById('placeholderText');
const playPauseBtn = document.getElementById('playPauseBtn');
const timecodeDisplay = document.getElementById('timecodeDisplay');

const laneV1 = document.getElementById('laneV1');
const laneV2 = document.getElementById('laneV2');
const laneV3 = document.getElementById('laneV3');

const brightnessRange = document.getElementById('brightnessRange');
const opacityRange = document.getElementById('opacityRange');
const chromaKeySelect = document.getElementById('chromaKeySelect');
const customTextInput = document.getElementById('customTextInput');
const fontSizeRange = document.getElementById('fontSizeRange');
const textOverlay = document.getElementById('textOverlay');
const selectedTrackName = document.getElementById('selectedTrackName');

let currentActiveTrack = 'V1';
let clipsData = { V1: null, V2: null, V3: null };

// اختيار المسار النشط حالياً للتعديل والتقطيع
function selectActiveTrack(trackId) {
    currentActiveTrack = trackId;
    selectedTrackName.textContent = trackId;
    document.querySelectorAll('.track-label').forEach(lbl => lbl.classList.remove('active'));
    event.currentTarget.classList.add('active');
}

// استيراد الملفات وإضافتها لـ Project Bin
fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
        const url = URL.createObjectURL(file);
        const thumb = document.createElement('div');
        thumb.className = 'media-thumb';
        thumb.innerHTML = `
            <div style="background:#111; height:45px; display:flex; align-items:center; justify-content:center; color:#777; font-size:8px;">${file.type.includes('video') ? 'VIDEO' : 'IMAGE'}</div>
            <span>${file.name}</span>
        `;
        // النقر لإسقاط الملف فوراً في المسار النشط المحدد
        thumb.onclick = () => assignMediaToActiveTrack(file.name, url, file.type);
        projectBin.appendChild(thumb);
    });
});

function assignMediaToActiveTrack(name, url, type) {
    placeholderText.style.display = 'none';
    clipsData[currentActiveTrack] = { name, url, type, cutTime: 0 };

    let targetLane = currentActiveTrack === 'V1' ? laneV1 : (currentActiveTrack === 'V2' ? laneV2 : laneV3);
    let clipClass = currentActiveTrack === 'V1' ? 'clip-item' : 'clip-item clip-v2';

    targetLane.innerHTML = `<div class="${clipClass}" style="width: 100%;"><span>${name}</span></div>`;

    if (currentActiveTrack === 'V1') {
        mainPlayer.src = url;
        mainPlayer.style.display = 'block';
        mainPlayer.load();
    } else {
        overlayPlayer.src = url;
        overlayPlayer.style.display = 'block';
        overlayPlayer.load();
    }
}

// التشغيل والايقاف الشامل
function togglePlayPlayback() {
    if (mainPlayer.paused) {
        mainPlayer.play();
        if (overlayPlayer.src) overlayPlayer.play();
        playPauseBtn.textContent = "إيقاف مؤقت";
    } else {
        mainPlayer.pause();
        if (overlayPlayer.src) overlayPlayer.pause();
        playPauseBtn.textContent = "تشغيل / إيقاف";
    }
}

// التقديم والتأخير إطار بإطار دقيق
function stepFrame(frames) {
    if (mainPlayer.src) {
        mainPlayer.currentTime += frames * 0.04;
        if (overlayPlayer.src) overlayPlayer.currentTime = mainPlayer.currentTime;
    }
}

// تقطيع الفيديو عند التوقيت الحالي
function splitSelectedClip() {
    if (clipsData[currentActiveTrack]) {
        let currentTime = mainPlayer.currentTime;
        clipsData[currentActiveTrack].cutTime = currentTime;
        alert(`تم تقطيع مسار ${currentActiveTrack} عند التوقيت: ${currentTime.toFixed(2)} ثانية`);
    } else {
        alert('لا يوجد ملف في المسار النشط للتقطيع!');
    }
}

// تحديث العداد الزمني بدقة Timecode
mainPlayer.addEventListener('timeupdate', () => {
    if (!isNaN(mainPlayer.currentTime)) {
        const t = mainPlayer.currentTime;
        const hrs = String(Math.floor(t / 3600)).padStart(2, '0');
        const mins = String(Math.floor((t % 3600) / 60)).padStart(2, '0');
        const secs = String(Math.floor(t % 60)).padStart(2, '0');
        const frames = String(Math.floor((t % 1) * 25)).padStart(2, '0');
        timecodeDisplay.textContent = `${hrs}:${mins}:${secs}:${frames}`;
    }
});

// تأثيرات السطوع والشفافية والكروما
brightnessRange.addEventListener('input', (e) => {
    document.getElementById('brightVal').textContent = e.target.value;
    let target = currentActiveTrack === 'V1' ? mainPlayer : overlayPlayer;
    target.style.filter = `brightness(${e.target.value}%)`;
});

opacityRange.addEventListener('input', (e) => {
    document.getElementById('opacityVal').textContent = e.target.value;
    let target = currentActiveTrack === 'V1' ? mainPlayer : overlayPlayer;
    target.style.opacity = e.target.value / 100;
});

// محاكاة إزالة الكروما (الخضراء / الزرقاء)
chromaKeySelect.addEventListener('change', (e) => {
    let val = e.target.value;
    let target = currentActiveTrack === 'V1' ? mainPlayer : overlayPlayer;
    if (val === 'green') {
        target.style.filter += ' hue-rotate(90deg) contrast(120%)';
    } else if (val === 'blue') {
        target.style.filter += ' hue-rotate(180deg) contrast(120%)';
    } else {
        target.style.filter = 'none';
    }
});

// إدارة النص وتكبيره وتصميمه
customTextInput.addEventListener('input', (e) => {
    let val = e.target.value;
    if (val.trim() !== "") {
        textOverlay.textContent = val;
        textOverlay.style.display = 'block';
    } else {
        textOverlay.style.display = 'none';
    }
});

fontSizeRange.addEventListener('input', (e) => {
    let size = e.target.value;
    document.getElementById('fontSizeVal').textContent = size;
    textOverlay.style.fontSize = size + 'px';
});

// تفريغ التايملاين بالكامل
function clearTimeline() {
    mainPlayer.src = "";
    mainPlayer.style.display = 'none';
    overlayPlayer.src = "";
    overlayPlayer.style.display = 'none';
    laneV1.innerHTML = "";
    laneV2.innerHTML = "";
    laneV3.innerHTML = "";
    clipsData = { V1: null, V2: null, V3: null };
    placeholderText.style.display = 'block';
}
