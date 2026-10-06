const fileInput = document.getElementById('fileInput');
const projectBin = document.getElementById('projectBin');
const mainPlayer = document.getElementById('mainPlayer');
const overlayPlayer = document.getElementById('overlayPlayer');
const placeholderText = document.getElementById('placeholderText');
const playPauseBtn = document.getElementById('playPauseBtn');
const timecodeDisplay = document.getElementById('timecodeDisplay');

const laneV1 = document.getElementById('laneV1');
const laneV2 = document.getElementById('laneV2');

const brightnessRange = document.getElementById('brightnessRange');
const opacityRange = document.getElementById('opacityRange');
const customTextInput = document.getElementById('customTextInput');

let mediaFiles = [];

// استيراد الملفات
fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
        const url = URL.createObjectURL(file);
        mediaFiles.push({ name: file.name, url: url, type: file.type });
        
        // إضافة العنصر إلى لوحة المشروع (Project Bin)
        const thumb = document.createElement('div');
        thumb.className = 'media-thumb';
        thumb.innerHTML = `
            <div style="background:#111; height:45px; display:flex; align-items:center; justify-content:center; color:#777; font-size:8px;">${file.type.includes('video') ? 'VIDEO' : 'IMAGE'}</div>
            <span>${file.name}</span>
        `;
        
        // سحب وافلات العنصر للتايملاين أو النقر لتسكينه تلقائياً
        thumb.onclick = () => assignToTimeline(file.name, url);
        projectBin.appendChild(thumb);
    });
});

// تعيين الملفات لمسارات التايملاين (V1 و V2) وعرضها
function assignToTimeline(name, url) {
    placeholderText.style.display = 'none';

    if (!mainPlayer.src || mainPlayer.src === window.location.href) {
        mainPlayer.src = url;
        mainPlayer.style.display = 'block';
        mainPlayer.load();
        
        laneV1.innerHTML = `<div class="clip-item" style="width: 100%;"><span>${name}</span></div>`;
    } else {
        overlayPlayer.src = url;
        overlayPlayer.style.display = 'block';
        overlayPlayer.load();
        
        laneV2.innerHTML = `<div class="clip-item clip-v2" style="width: 100%;"><span>${name}</span></div>`;
    }
}

// تشغيل وإيقاف الميديا
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

// التقديم والتأخير إطار بإطار
function stepFrame(frames) {
    if (mainPlayer.src) {
        mainPlayer.currentTime += frames * 0.04;
        if (overlayPlayer.src) overlayPlayer.currentTime = mainPlayer.currentTime;
    }
}

// تحديث العداد الزمني (Timecode)
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

// تأثيرات السطوع والشفافية
brightnessRange.addEventListener('input', (e) => {
    document.getElementById('brightVal').textContent = e.target.value;
    mainPlayer.style.filter = `brightness(${e.target.value}%)`;
    overlayPlayer.style.filter = `brightness(${e.target.value}%)`;
});

opacityRange.addEventListener('input', (e) => {
    document.getElementById('opacityVal').textContent = e.target.value;
    overlayPlayer.style.opacity = e.target.value / 100;
});

// تفريغ التايملاين
function clearTimeline() {
    mainPlayer.src = "";
    mainPlayer.style.display = 'none';
    overlayPlayer.src = "";
    overlayPlayer.style.display = 'none';
    laneV1.innerHTML = "";
    laneV2.innerHTML = "";
    placeholderText.style.display = 'block';
}
