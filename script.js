const fileInputV1 = document.getElementById('fileInputV1');
const fileInputV2 = document.getElementById('fileInputV2');
const playerV1 = document.getElementById('playerV1');
const playerV2 = document.getElementById('playerV2');
const dragHint = document.getElementById('dragHint');
const trackV1 = document.getElementById('trackV1');
const trackV2 = document.getElementById('trackV2');
const playPauseBtn = document.getElementById('playPauseBtn');

const brightnessRange = document.getElementById('brightnessRange');
const opacityRange = document.getElementById('opacityRange');
const textInput = document.getElementById('textInput');
const textOverlay = document.getElementById('textOverlay');
const fontSelector = document.getElementById('fontSelector');
const textColor = document.getElementById('textColor');
const shadowColor = document.getElementById('shadowColor');

let blobUrlV1 = null;
let blobUrlV2 = null;

function loadTrackFile(file, trackId) {
    if (!file) return;

    const fileURL = URL.createObjectURL(file);

    if (trackId === 'V1') {
        if (blobUrlV1) URL.revokeObjectURL(blobUrlV1);
        blobUrlV1 = fileURL;
        playerV1.src = fileURL;
        playerV1.style.display = 'block';
        playerV1.load();
        trackV1.innerHTML = `<span>${file.name}</span> <button onclick="clearTrack('V1')" style="background: #172554; border: none; padding: 2px 6px; font-size: 10px; cursor: pointer; color:#fff;">حذف</button>`;
    } else {
        if (blobUrlV2) URL.revokeObjectURL(blobUrlV2);
        blobUrlV2 = fileURL;
        playerV2.src = fileURL;
        playerV2.style.display = 'block';
        playerV2.load();
        trackV2.innerHTML = `<span>${file.name}</span> <button onclick="clearTrack('V2')" style="background: #501026; border: none; padding: 2px 6px; font-size: 10px; cursor: pointer; color:#fff;">حذف</button>`;
    }

    dragHint.style.display = 'none';
}

fileInputV1.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) loadTrackFile(e.target.files[0], 'V1');
});

fileInputV2.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) loadTrackFile(e.target.files[0], 'V2');
});

window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => e.preventDefault());

const dropZone = document.getElementById('dropZone');
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        if (!playerV1.src || playerV1.src === window.location.href) {
            loadTrackFile(e.dataTransfer.files[0], 'V1');
        } else {
            loadTrackFile(e.dataTransfer.files[0], 'V2');
        }
    }
});

// التحكم بالتشغيل
function togglePlayPause() {
    if (playerV1.src && playerV1.src !== window.location.href) {
        if (playerV1.paused) {
            playerV1.play();
            if (playerV2.src && playerV2.src !== window.location.href) playerV2.play();
            playPauseBtn.textContent = "إيقاف مؤقت";
        } else {
            playerV1.pause();
            if (playerV2.src && playerV2.src !== window.location.href) playerV2.pause();
            playPauseBtn.textContent = "تشغيل";
        }
    } else {
        alert('الرجاء استيراد ملف فيديو في V1 أولاً.');
    }
}

function stepVideo(amount) {
    if (playerV1.src) {
        playerV1.currentTime = Math.max(0, playerV1.currentTime + amount);
        if (playerV2.src) playerV2.currentTime = playerV1.currentTime;
    }
}

// تفريغ المسارات
function clearTrack(trackId) {
    if (trackId === 'V1') {
        if (blobUrlV1) URL.revokeObjectURL(blobUrlV1);
        playerV1.src = "";
        playerV1.style.display = 'none';
        trackV1.innerHTML = '<span>لم يتم إدراج ملف في V1...</span>';
        blobUrlV1 = null;
    } else {
        if (blobUrlV2) URL.revokeObjectURL(blobUrlV2);
        playerV2.src = "";
        playerV2.style.display = 'none';
        trackV2.innerHTML = '<span>لم يتم إدراج ملف في V2...</span>';
        blobUrlV2 = null;
    }

    if ((!playerV1.src || playerV1.src === window.location.href) && (!playerV2.src || playerV2.src === window.location.href)) {
        dragHint.style.display = 'block';
    }
}

function clearAllTracks() {
    clearTrack('V1');
    clearTrack('V2');
}

// تحديث العداد الزمني
playerV1.addEventListener('timeupdate', () => {
    if (!isNaN(playerV1.currentTime)) {
        const currentTime = Math.floor(playerV1.currentTime);
        const mins = String(Math.floor(currentTime / 60)).padStart(2, '0');
        const secs = String(currentTime % 60).padStart(2, '0');
        document.getElementById('timecode').textContent = `التوقيت: 00:${mins}:${secs}`;
    }
});

// تأثيرات السطوع والشفافية
brightnessRange.addEventListener('input', (e) => {
    const val = e.target.value;
    document.getElementById('brightVal').textContent = val;
    playerV1.style.filter = `brightness(${val}%)`;
    playerV2.style.filter = `brightness(${val}%)`;
});

opacityRange.addEventListener('input', (e) => {
    const val = e.target.value;
    document.getElementById('opacityVal').textContent = val;
    playerV2.style.opacity = val / 100;
});

// إدارة النصوص وتخصيصها
textInput.addEventListener('input', (e) => {
    const val = e.target.value;
    if (val.trim() !== "") {
        textOverlay.textContent = val;
        textOverlay.style.display = 'block';
    } else {
        textOverlay.style.display = 'none';
    }
});

fontSelector.addEventListener('change', (e) => {
    textOverlay.style.fontFamily = e.target.value;
});

textColor.addEventListener('input', (e) => {
    textOverlay.style.color = e.target.value;
});

shadowColor.addEventListener('input', (e) => {
    const col = e.target.value;
    textOverlay.style.textShadow = `2px 2px 6px ${col}`;
});
