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

function drawInspectorStatic(ctx, x, y, w, h) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  ctx.filter = 'sepia(100%) hue-rotate(180deg) saturate(200%)';
  ctx.drawImage(canvasElement, 0, 0);
  ctx.filter = 'none';

  ctx.strokeStyle = 'rgba(86, 156, 214, 0.8)';
  ctx.lineWidth = 1;
  
  for (let i = 0; i < w; i += 15) {
    ctx.beginPath();
    ctx.moveTo(x + i, y);
    ctx.lineTo(x + i, y + h);
    ctx.stroke();
  }
  
  for (let j = 0; j < h; j += 15) {
    ctx.beginPath();
    ctx.moveTo(x, y + j);
    ctx.lineTo(x + w, y + j);
    ctx.stroke();
  }

  ctx.strokeStyle = '#4fc1ff';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  
  ctx.fillStyle = '#4fc1ff';
  ctx.font = '10px Consolas';
  ctx.fillText('<div>', x + 5, y + 15);
  ctx.fillText('</div>', x + 5, y + h - 5);
  ctx.restore();
}

function drawBlueprintGrid(ctx, w, h) {
  ctx.strokeStyle = 'rgba(79, 193, 255, 0.2)';
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

function drawSocketLink(ctx, x1, y1, x2, y2, time) {
  ctx.save();
  ctx.strokeStyle = '#ce9178';
  ctx.lineWidth = 2;
  
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x1, y1, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#dcdcaa';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x2, y2, 6, 0, Math.PI * 2);
  ctx.fill();

  const dx = x2 - x1;
  const dy = y2 - y1;
  const progress = (time % 100) / 100;
  
  const px = x1 + dx * progress;
  const py = y1 + dy * progress;

  ctx.fillStyle = '#4fc1ff';
  ctx.beginPath();
  ctx.arc(px, py, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = '10px Consolas';
  ctx.fillStyle = '#ce9178';
  ctx.fillText('ws://localhost:3000', x1 + 15, y1 - 10);
  ctx.fillText('connected', x2 + 15, y2 - 10);

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

  let currentGesture = 'IDLE';
  const time = performance.now() * 0.05;

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    if (results.multiHandLandmarks.length === 2) {
      const hand1 = results.multiHandLandmarks[0];
      const hand2 = results.multiHandLandmarks[1];

      const pinch1 = getDistance(hand1[4], hand1[8], sw, sh);
      const pinch2 = getDistance(hand2[4], hand2[8], sw, sh);

      if (pinch1 < 30 && pinch2 < 30) {
        currentGesture = 'WEBSOCKET_LINK';
        
        const p1x = sx + ((hand1[4].x + hand1[8].x) / 2) * sw;
        const p1y = sy + ((hand1[4].y + hand1[8].y) / 2) * sh;
        const p2x = sx + ((hand2[4].x + hand2[8].x) / 2) * sw;
        const p2y = sy + ((hand2[4].y + hand2[8].y) / 2) * sh;

        drawSocketLink(canvasCtx, p1x, p1y, p2x, p2y, time);
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
          currentGesture = 'INSPECTOR_MODE';
          drawInspectorStatic(canvasCtx, minX, minY, w, h);
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
        currentGesture = 'EXCEPTION_ERROR';
        canvasCtx.fillStyle = 'rgba(244, 71, 71, 0.2)';
        canvasCtx.fillRect(0, 0, cw, ch);
        canvasCtx.fillStyle = '#f44747';
        canvasCtx.font = '14px Consolas';
        canvasCtx.fillText('Uncaught TypeError', 10, 20);
      } else if (dIndexBase > 100 && dMidBase > 100) {
        currentGesture = 'DEBUG_MODE';
        canvasCtx.fillStyle = 'rgba(79, 193, 255, 0.05)';
        canvasCtx.fillRect(0, 0, cw, ch);
        drawBlueprintGrid(canvasCtx, cw, ch);
        
        landmarks.forEach((lm, idx) => {
          const px = sx + lm.x * sw;
          const py = sy + lm.y * sh;
          canvasCtx.fillStyle = '#dcdcaa';
          canvasCtx.fillRect(px - 2, py - 2, 4, 4);
          if (idx === 8) {
            canvasCtx.fillStyle = '#9cdcfe';
            canvasCtx.fillText(`{ x: ${px.toFixed(0)}, y: ${py.toFixed(0)} }`, px + 10, py);
          }
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
    if (currentGesture === 'EXCEPTION_ERROR') {
      printTerminal('Uncaught TypeError: Cannot read properties of undefined (reading "hand")', 'error');
    } else if (currentGesture === 'DEBUG_MODE') {
      printTerminal('console.log("Analyzing coordinate matrices...");', 'info');
    } else if (currentGesture === 'INSPECTOR_MODE') {
      printTerminal('[webpack-dev-server] App updated. Hot Module Replacement enabled.', 'success');
    } else if (currentGesture === 'WEBSOCKET_LINK') {
      printTerminal('WebSocket connection to "wss://localhost:3000/" established.', 'success');
    } else {
      printTerminal('Compiling...', 'warn');
      setTimeout(() => {
        if(lastGesture === 'IDLE') printTerminal('Compiled successfully in 125ms', 'success');
      }, 500);
    }
    lastGesture = currentGesture;
  } else {
    if (Math.random() < 0.03 && currentGesture === 'IDLE') {
      const funcs = [
        'npm run build',
        'info  - ready on http://localhost:3000',
        'event - compiled client and server successfully',
        'wait  - compiling...',
        '[nodemon] restarting due to changes...'
      ];
      printTerminal(funcs[Math.floor(Math.random() * funcs.length)], 'normal');
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
  statusText.innerText = 'Starting development server...';
  
  printTerminal('> hand-landmark-maker@1.0.0 dev', 'info');
  printTerminal('> vite', 'normal');
  
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
      
      printTerminal('VITE v5.0.0  ready in 350 ms', 'success');
      printTerminal('➜  Local:   http://localhost:3000/', 'info');
      
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
    statusText.innerText = `Error: ${err.message}`;
    printTerminal(`Error accessing media devices: ${err.message}`, 'error');
  }
});
