const videoElement = document.getElementById('videoElement');
const canvasElement = document.getElementById('canvasElement');
const canvasCtx = canvasElement.getContext('2d');
const startButton = document.getElementById('startButton');
const statusText = document.getElementById('statusText');
const ui = document.getElementById('ui');
const cameraWrapper = document.getElementById('camera-wrapper');
const terminalOutput = document.getElementById('terminal-output');

const terminalLogs = [];
const maxLogs = Math.floor(window.innerHeight / 20);
let lastGesture = '';

function printTerminal(text) {
  const timestamp = new Date().toISOString().substring(11, 23);
  terminalLogs.push(`[${timestamp}] ${text}`);
  if (terminalLogs.length > maxLogs) {
    terminalLogs.shift();
  }
  terminalOutput.innerHTML = terminalLogs.map(log => `<p>${log}</p>`).join('');
}

function resizeCanvas() {
  const rect = cameraWrapper.getBoundingClientRect();
  canvasElement.width = rect.width;
  canvasElement.height = rect.height;
}

window.addEventListener('resize', resizeCanvas);

function getDistance(p1, p2, w, h) {
  return Math.hypot((p1.x - p2.x) * w, (p1.y - p2.y) * h);
}

function drawGlitchStatic(ctx, x, y, w, h) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  ctx.filter = 'grayscale(100%) contrast(250%) brightness(80%)';
  ctx.drawImage(canvasElement, 0, 0);
  ctx.filter = 'none';

  for (let i = 0; i < 15; i++) {
    const lineY = y + Math.random() * h;
    const lineH = Math.random() * 4 + 1;
    const alpha = Math.random() * 0.5 + 0.1;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fillRect(x, lineY, w, lineH);
  }
  
  for (let i = 0; i < 20; i++) {
    const lineY = y + Math.random() * h;
    const lineH = Math.random() * 2 + 1;
    const alpha = Math.random() * 0.3 + 0.1;
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.fillRect(x, lineY, w, lineH);
  }

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  
  ctx.fillStyle = '#fff';
  ctx.font = '10px monospace';
  ctx.fillText('SIG_LOST', x + 5, y + 15);
  ctx.restore();
}

function drawGrid(ctx, w, h) {
  ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
  ctx.lineWidth = 1;
  for (let i = 0; i < w; i += 20) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, h);
    ctx.stroke();
  }
  for (let j = 0; j < h; j += 20) {
    ctx.beginPath();
    ctx.moveTo(0, j);
    ctx.lineTo(w, j);
    ctx.stroke();
  }
}

function onResults(results) {
  if (canvasElement.width === 0) resizeCanvas();
  
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  const vw = videoElement.videoWidth;
  const vh = videoElement.videoHeight;
  const cw = canvasElement.width;
  const ch = canvasElement.height;
  
  if (vw === 0 || vh === 0) return;

  const scale = Math.max(cw / vw, ch / vh);
  const sw = vw * scale;
  const sh = vh * scale;
  const sx = (cw - sw) / 2;
  const sy = (ch - sh) / 2;

  canvasCtx.drawImage(videoElement, sx, sy, sw, sh);

  let currentGesture = 'SCANNING...';

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    if (results.multiHandLandmarks.length === 2) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      
      results.multiHandLandmarks.forEach(landmarks => {
        [4, 8].forEach(index => {
          const px = sx + landmarks[index].x * sw;
          const py = sy + landmarks[index].y * sh;
          if (px < minX) minX = px;
          if (px > maxX) maxX = px;
          if (py < minY) minY = py;
          if (py > maxY) maxY = py;
        });
      });

      const w = maxX - minX;
      const h = maxY - minY;

      if (w > 30 && h > 30) {
        currentGesture = 'SIGNAL_INTERFERENCE';
        drawGlitchStatic(canvasCtx, minX, minY, w, h);
      }
    } else if (results.multiHandLandmarks.length === 1) {
      const landmarks = results.multiHandLandmarks[0];
      const base = landmarks[0];
      const indexTip = landmarks[8];
      const middleTip = landmarks[12];
      
      const dIndexBase = getDistance(indexTip, base, sw, sh);
      const dMidBase = getDistance(middleTip, base, sw, sh);
      
      if (dIndexBase < 50 && dMidBase < 50) {
        currentGesture = 'ACCESS_DENIED';
        canvasCtx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        canvasCtx.fillRect(0, 0, cw, ch);
        canvasCtx.fillStyle = '#f00';
        canvasCtx.font = '16px monospace';
        canvasCtx.fillText('SECURITY ALERT', 10, 20);
      } else if (dIndexBase > 100 && dMidBase > 100) {
        currentGesture = 'DATA_INTERCEPT';
        canvasCtx.fillStyle = 'rgba(0, 255, 0, 0.1)';
        canvasCtx.fillRect(0, 0, cw, ch);
        drawGrid(canvasCtx, cw, ch);
        
        landmarks.forEach(lm => {
          const px = sx + lm.x * sw;
          const py = sy + lm.y * sh;
          canvasCtx.fillStyle = '#0f0';
          canvasCtx.fillRect(px - 2, py - 2, 4, 4);
        });
      }
    }
  }

  if (currentGesture !== lastGesture) {
    if (currentGesture === 'ACCESS_DENIED') {
      printTerminal('ERR: UNAUTHORIZED CLOSURE DETECTED. SYSTEM LOCKDOWN INITIATED.');
    } else if (currentGesture === 'DATA_INTERCEPT') {
      printTerminal('SYS: INTERCEPTING PACKETS... NODE CONNECTION ESTABLISHED.');
    } else if (currentGesture === 'SIGNAL_INTERFERENCE') {
      printTerminal('WARN: ANOMALY DETECTED. VIDEO SIGNAL DEGRADATION.');
    } else {
      printTerminal('SYS: AWAITING INPUT ALGORITHM...');
    }
    lastGesture = currentGesture;
  } else {
    if (Math.random() < 0.05) {
      printTerminal(`SYS: STREAMING HEX_DUMP [0x${Math.floor(Math.random()*16777215).toString(16)}]`);
    }
  }
}

const hands = new window.Hands({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
  }
});

hands.setOptions({
  maxNumHands: 2,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});

hands.onResults(onResults);

startButton.addEventListener('click', async () => {
  startButton.style.display = 'none';
  statusText.innerText = 'EXECUTING BOOT SEQ...';
  
  printTerminal('SYS: INITIALIZING KERNEL...');
  printTerminal('SYS: MOUNTING VIRTUAL CAMERA...');
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user'
      }
    });
    
    videoElement.srcObject = stream;
    
    videoElement.onloadedmetadata = () => {
      videoElement.play();
      ui.style.display = 'none';
      cameraWrapper.style.display = 'block';
      resizeCanvas();
      
      printTerminal('SYS: CAMERA FEED ACTIVE.');
      printTerminal('SYS: HAND TRACKING ENGINE ONLINE.');
      
      async function detectionFrame() {
        if (!videoElement.paused && !videoElement.ended) {
          await hands.send({ image: videoElement });
        }
        requestAnimationFrame(detectionFrame);
      }
      
      detectionFrame();
    };
  } catch (err) {
    startButton.style.display = 'block';
    statusText.innerText = `ERR: ${err.message}`;
    printTerminal(`ERR: HARDWARE FAILURE - ${err.message}`);
  }
});
