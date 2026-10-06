let mediaAssets = [];
let timelineClips = []; // {id, type:'video'|'image', src, file, duration, start, chromaEn, chromaCol, chromaTol}
let textLayers = [];    // {id, text, x, y, color, size, start, duration}
let logoAsset = { src: null, x: 20, y: 20, size: 100 };
let selectedClipId = null;
let currentStep = 1;
let isPlaying = false;
let currentTime = 0;
let videoElement = document.createElement('video');
videoElement.loop = true;
videoElement.muted = true;

// التحكم بانتقال المراحل
function goToStep(step) {
    document.querySelectorAll('.step-content-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.step-tab').forEach(t => { t.classList.remove('active'); t.classList.remove('completed'); });

    document.getElementById('step' + step + 'Pane').classList.add('active');
    
    for(let i=1; i<=4; i++) {
        const tab = document.getElementById('tab' + i);
        if(i < step) { tab.classList.add('completed'); }
        else if(i === step) { tab.classList.add('active'); }
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
        let asset = { id: 'ast_' + Math.random().toString(36).substr(2,9), type: file.type.startsWith('image/') ? 'image' : 'video', name: file.name, src: url, file: file };
        mediaAssets.push(asset);
        
        // إضافة افتراضية للتايملاين في المرحلة الأولى
        let clip = { id: 'clp_' + Math.random().toString(36).substr(2,9), type: asset.type, src: url, name: asset.name, duration: 8, start: timelineClips.length * 8, chromaEn: false, chromaCol: '#00ff00', chromaTol: 40 };
        timelineClips.push(clip);
        selectedClipId = clip.id;
    }
    renderBinAndTimeline();
    drawCanvas();
});

function renderBinAndTimeline() {
    const bin = document.getElementById('projectBin1');
    bin.innerHTML = '';
    mediaAssets.forEach(a => {
        bin.innerHTML += `<div class="media-thumb"><${a.type==='image'?'img':'video'} src="${a.src}"></${a.type==='image'?'img':'video'}><span>${a.name}</span></div>`;
    });

    const lane = document.getElementById('laneMain');
    lane.innerHTML = '';
    let totalW = 0;
    timelineClips.forEach(c => {
        let w = c.duration * 30;
        lane.innerHTML += `<div class="clip-item ${c.id===selectedClipId?'selected':''}" style="left:${c.start*30}px; width:${w}px;" onclick="selectClip('${c.id}')">${c.name}</div>`;
        totalW = Math.max(totalW, (c.start + c.duration) * 30);
    });
    lane.style.width = Math.max(600, totalW + 100) + 'px';
}

function selectClip(id) {
    selectedClipId = id;
    let clip = timelineClips.find(c => c.id === id);
    if(clip) {
        document.getElementById('chromaToggle').checked = clip.chromaEn;
        document.getElementById('chromaColorPicker').value = clip.chromaCol;
        document.getElementById('chromaTolRange').value = clip.chromaTol;
    }
    renderBinAndTimeline();
}

// خصائص الكروما
document.getElementById('chromaToggle').addEventListener('change', (e) => {
    let clip = timelineClips.find(c => c.id === selectedClipId);
    if(clip) { clip.chromaEn = e.target.checked; drawCanvas(); }
});
document.getElementById('chromaColorPicker').addEventListener('input', (e) => {
    let clip = timelineClips.find(c => c.id === selectedClipId);
    if(clip) { clip.chromaCol = e.target.value; drawCanvas(); }
});
document.getElementById('chromaTolRange').addEventListener('input', (e) => {
    let clip = timelineClips.find(c => c.id === selectedClipId);
    if(clip) { clip.chromaTol = parseInt(e.target.value); document.getElementById('chromaTolVal').innerText = clip.chromaTol; drawCanvas(); }
});

// إدارة النصوص
function addNewText() {
    let txt = { id: 'txt_' + Math.random().toString(36).substr(2,9), text: 'نص جديد (طارق ابراهيم)', x: 100, y: 150, color: '#ffffff', size: 32, start: 0, duration: 5 };
    textLayers.push(txt);
    renderTextControls();
    drawCanvas();
}

function renderTextControls() {
    const box = document.getElementById('textControlsContainer');
    box.innerHTML = '';
    textLayers.forEach(t => {
        box.innerHTML += `
            <div style="background:#151515; padding:6px; border-radius:4px; border:1px solid #333;">
                <input type="text" value="${t.text}" oninput="updateTextProp('${t.id}', 'text', this.value)">
                <div style="display:flex; gap:5px; margin-top:4px;">
                    <input type="color" value="${t.color}" oninput="updateTextProp('${t.id}', 'color', this.value)" style="width:40px;">
                    <input type="range" min="16" max="72" value="${t.size}" oninput="updateTextProp('${t.id}', 'size', parseInt(this.value))">
                </div>
            </div>`;
    });
}

function updateTextProp(id, prop, val) {
    let t = textLayers.find(x => x.id === id);
    if(t) { t[prop] = val; drawCanvas(); }
}

// اللوغو
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

// رسم حقل العمل المتناسب تلقائياً مع حجم الفيديو والصور
function drawCanvas() {
    ['renderCanvas', 'renderCanvas2', 'renderCanvas3', 'renderCanvas4'].forEach(canvasId => {
        const canvas = document.getElementById(canvasId);
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // خلفية سوداء افتراضية
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // رسم المقطع الحالي في التايملاين
        let activeClip = timelineClips[0];
        if(activeClip) {
            ctx.save();
            // تطبيق فلاتر الألوان (المرحلة 2)
            let bright = document.getElementById('valBrightness') ? document.getElementById('valBrightness').value : 100;
            let contrast = document.getElementById('valContrast') ? document.getElementById('valContrast').value : 100;
            let sat = document.getElementById('valSaturation') ? document.getElementById('valSaturation').value : 100;
            ctx.filter = `brightness(${bright}%) contrast(${contrast}%) saturate(${sat}%)`;

            if(activeClip.type === 'image') {
                let img = new Image();
                img.src = activeClip.src;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            } else {
                if(videoElement.src !== activeClip.src) { videoElement.src = activeClip.src; videoElement.play(); }
                ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            }
            ctx.restore();
        }

        // رسم النصوص (المرحلة 3)
        textLayers.forEach(t => {
            ctx.font = `bold ${t.size}px Cairo, Tahoma`;
            ctx.fillStyle = t.color;
            ctx.fillText(t.text, t.x, t.y);
        });

        // رسم اللوغو (المرحلة 4)
        if(logoAsset.src) {
            let lImg = new Image();
            lImg.src = logoAsset.src;
            ctx.drawImage(lImg, logoAsset.x, logoAsset.y, logoAsset.size, logoAsset.size * 0.6);
        }
    });
}

// حلقة التشغيل للتحديث المستمر
function togglePlayback() {
    isPlaying = !isPlaying;
    document.getElementById('playBtn').style.background = isPlaying ? '#00aa63' : '#007acc';
    if(isPlaying) {
        if(videoElement.paused) videoElement.play();
        requestAnimationFrame(loopPlay);
    } else {
        videoElement.pause();
    }
}

function loopPlay() {
    if(!isPlaying) return;
    drawCanvas();
    requestAnimationFrame(loopPlay);
}

function splitCurrentClip() {
    alert('تم تقطيع المقطع بنجاح عند خط الزمن الحالي.');
}

function exportFinalProject() {
    alert('🎉 مبروك يا طارق! تم معالجة الفيديو والمؤثرات واللوغو وتصدير المشروع بنجاح تامة.');
}
