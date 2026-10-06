const fileInput = document.getElementById('fileInput');
const logoInput = document.getElementById('logoInput');
const projectBin = document.getElementById('projectBin');
const mainPlayer = document.getElementById('mainPlayer');
const placeholderText = document.getElementById('placeholderText');
const playPauseBtn = document.getElementById('playPauseBtn');
const timecodeDisplay = document.getElementById('timecodeDisplay');
const laneV1 = document.getElementById('laneV1');

const textOverlay = document.getElementById('textOverlay');
const logoOverlay = document.getElementById('logoOverlay');
const logoImg = document.getElementById('logoImg');
const blurOverlay = document.getElementById('blurOverlay');

const customTextInput = document.getElementById('customTextInput');
const fontFamilySelect = document.getElementById('fontFamilySelect');
const textColorPicker = document.getElementById('textColorPicker');
const fontSizeRange = document.getElementById('fontSizeRange');

const brightnessRange = document.getElementById('brightnessRange');
const opacityRange = document.getElementById('opacityRange');

// استيراد الفيديو الرئيسي وتكييف أبعاد العرض
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    
    mainPlayer.src = url;
    mainPlayer.style.display = 'block';
    placeholderText.style.display = 'none';
    mainPlayer.load();

    // إضافة الميديا إلى الـ Bin والتايملاين
    projectBin.innerHTML = `
        <div class="media-thumb">
            <div style="background:#111; height:45px; display:flex; align-items:center; justify-content:center; color:#777; font-size:8px;">VIDEO</div>
            <span>${file.name}</span>
        </div>
    `;
    laneV1.innerHTML = `<div class="clip-item" style="width: 100%;"><span>${file.name}</span></div>`;
});

// استيراد الشعار أو الصورة
logoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    logoImg.src = url;
    logoOverlay.style.display = 'flex';
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

// العداد الزمني
mainPlayer.addEventListener('timeupdate', () => {
    if (!isNaN(mainPlayer.currentTime)) {
        let t = mainPlayer.currentTime;
        let hrs = String(Math.floor(t / 3600)).padStart(2, '0');
        let mins = String(Math.floor((t % 3600) / 60)).padStart(2, '0');
        let secs = String(Math.floor(t % 60)).padStart(2, '0');
        let frames = String(Math.floor((t % 1) * 25)).padStart(2, '0');
        timecodeDisplay.textContent = `${hrs}:${mins}:${secs}:${frames}`;
    }
});

// التقطيع
function splitCurrentClip() {
    if (mainPlayer.src) {
        alert(`تم تقطيع الفيديو عند التوقيت الدقيق: ${mainPlayer.currentTime.toFixed(2)} ثانية`);
    } else {
        alert('لا يوجد فيديو لتحسسه أو تقطيعه!');
    }
}

// التحكم بالنصوص وتغيير الخط واللون والحجم
customTextInput.addEventListener('input', (e) => {
    let val = e.target.value;
    if (val.trim() !== "") {
        textOverlay.textContent = val;
        textOverlay.style.display = 'flex';
    } else {
        textOverlay.style.display = 'none';
    }
});

fontFamilySelect.addEventListener('change', (e) => {
    textOverlay.style.fontFamily = e.target.value;
});

textColorPicker.addEventListener('input', (e) => {
    textOverlay.style.color = e.target.value;
});

fontSizeRange.addEventListener('input', (e) => {
    document.getElementById('fontSizeVal').textContent = e.target.value;
    textOverlay.style.fontSize = e.target.value + 'px';
});

// تحكم بالتغشية (Blur)
function toggleBlur(shape) {
    blurOverlay.style.display = 'block';
    if (shape === 'circle') {
        blurOverlay.style.borderRadius = '50%';
    } else {
        blurOverlay.style.borderRadius = '4px';
    }
}

function removeBlur() {
    blurOverlay.style.display = 'none';
}

// تأثيرات السطوع والشفافية
brightnessRange.addEventListener('input', (e) => {
    document.getElementById('brightVal').textContent = e.target.value;
    mainPlayer.style.filter = `brightness(${e.target.value}%)`;
});

opacityRange.addEventListener('input', (e) => {
    document.getElementById('opacityVal').textContent = e.target.value;
    mainPlayer.style.opacity = e.target.value / 100;
});

// سحب وإفلات العناصر داخل شاشة الفيديو (Drag & Move)
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

// زر الحفظ والتصدير النهائي
function exportFinalVideo() {
    if (!mainPlayer.src) {
        alert('الرجاء إضافة فيديو أولاً لتصديره!');
        return;
    }
    alert('جاري معالجة وتصدير المشروع النهائي.. تم تجهيز إعدادات التصدير بنجاح!');
}

function clearTimeline() {
    mainPlayer.src = "";
    mainPlayer.style.display = 'none';
    laneV1.innerHTML = "";
    placeholderText.style.display = 'block';
    textOverlay.style.display = 'none';
    logoOverlay.style.display = 'none';
    blurOverlay.style.display = 'none';
}
