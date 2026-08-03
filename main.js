const videoElement = document.getElementById('videoElement');
const canvasElement = document.getElementById('canvasElement');
const canvasCtx = canvasElement.getContext('2d');
const startButton = document.getElementById('startButton');
const statusText = document.getElementById('statusText');
const ui = document.getElementById('ui');
const cameraWrapper = document.getElementById('camera-wrapper');
const terminalOutput = document.getElementById('terminal-output');

const terminalLogs = [];
const maxLogs = Math.floor(window.innerHeight / 25);
let lastGesture = '';

function printTerminal(text, type = 'normal') {
  const time = new Date().toISOString().substring(11, 23);
  let color = '#d4d4d4';
  
  if (type === 'error') color = '#f44747';
  if (type === 'warn') color = '#cca700';
  if (type === 'success') color = '#4caf50';
  if (type === 'info') color = '#569cd6';

  terminalLogs.push(`<span style="color: #6a9955">[${time}]</span> <span style="color: ${color}">${text}</span>`);
  if (terminalLogs.length > maxLogs) {
    terminalLogs.shift();
  }
  terminalOutput.innerHTML = terminalLogs.map(log => `<p>${log}</p>`).join('');
}

function resizeCanvas() {
  const rect = cameraWrapper.getBoundingClientRect();
  canvasElement.width = rect.width;
  canvasElement.height = rect.height - 25;
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

function drawSecureLink(ctx, x1, y1, x2, y2, time) {
  ctx.save();
  ctx.strokeStyle = '#00ffff';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#00ffff';
  ctx.shadowBlur = 10;
  
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x1, y1, 8, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x2, y2, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const dx = x2 - x1;
  const dy = y2 - y1;
  const progress = (time % 100) / 100;
  
  const px = x1 + dx * progress;
  const py = y1 + dy * progress;

  ctx.fillStyle = '#fff';
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(px, py, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = '10px monospace';
  ctx.fillStyle = '#00ffff';
  ctx.shadowBlur = 0;
  ctx.fillText('ENC_KEY_EXCHANGE', x1 + 15, y1 - 10);
  ctx.fillText('ESTABLISHED', x2 + 15, y2 - 10);

  ctx.restore();
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
  const time = performance.now() * 0.05;

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    if (results.multiHandLandmarks.length === 2) {
      const hand1 = results.multiHandLandmarks[0];
      const hand2 = results.multiHandLandmarks[1];

      const pinch1 = getDistance(hand1[4], hand1[8], sw, sh);
      const pinch2 = getDistance(hand2[4], hand2[8], sw, sh);

      if (pinch1 < 30 && pinch2 < 30) {
        currentGesture = 'SECURE_LINK';
        
        const p1x = sx + ((hand1[4].x + hand1[8].x) / 2) * sw;
        const p1y = sy + ((hand1[4].y + hand1[8].y) / 2) * sh;
        const p2x = sx + ((hand2[4].x + hand2[8].x) / 2) * sw;
        const p2y = sy + ((hand2[4].y + hand2[8].y) / 2) * sh;

        drawSecureLink(canvasCtx, p1x, p1y, p2x, p2y, time);
      } else {
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

  canvasCtx.save();
  canvasCtx.translate(cw, 0);
  canvasCtx.scale(-1, 1);
  canvasCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  canvasCtx.font = '12px Consolas';
  canvasCtx.textAlign = 'right';
  canvasCtx.fillText('Handtracker by Nephyy', cw - 10, ch - 10);
  canvasCtx.restore();

  if (currentGesture !== lastGesture) {
    if (currentGesture === 'ACCESS_DENIED') {
      printTerminal('ERR: UNAUTHORIZED CLOSURE DETECTED. SYSTEM LOCKDOWN INITIATED.', 'error');
    } else if (currentGesture === 'DATA_INTERCEPT') {
      printTerminal('SYS: INTERCEPTING PACKETS... NODE CONNECTION ESTABLISHED.', 'info');
    } else if (currentGesture === 'SIGNAL_INTERFERENCE') {
      printTerminal('WARN: ANOMALY DETECTED. VIDEO SIGNAL DEGRADATION.', 'warn');
    } else if (currentGesture === 'SECURE_LINK') {
      printTerminal('SYS: INITIATING SECURE P2P TUNNEL... KEY EXCHANGE COMPLETE.', 'success');
    } else {
      printTerminal('SYS: AWAITING INPUT ALGORITHM...', 'normal');
    }
    lastGesture = currentGesture;
  } else {
    if (Math.random() < 0.05) {
      printTerminal(`SYS: STREAMING HEX_DUMP [0x${Math.floor(Math.random()*16777215).toString(16)}]`, 'normal');
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
  
  printTerminal('SYS: INITIALIZING KERNEL...', 'info');
  printTerminal('SYS: MOUNTING VIRTUAL CAMERA...', 'normal');
  
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
      cameraWrapper.style.display = 'flex';
      resizeCanvas();
      
      printTerminal('SYS: CAMERA FEED ACTIVE.', 'success');
      printTerminal('SYS: HAND TRACKING ENGINE ONLINE.', 'info');
      
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
    printTerminal(`ERR: HARDWARE FAILURE - ${err.message}`, 'error');
  }
});
