const videoElement = document.getElementById('videoElement');
const canvasElement = document.getElementById('canvasElement');
const canvasCtx = canvasElement.getContext('2d');
const startButton = document.getElementById('startButton');
const statusText = document.getElementById('statusText');
const ui = document.getElementById('ui');

function resizeCanvas() {
  canvasElement.width = window.innerWidth;
  canvasElement.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function drawCyberFrame(ctx, x, y, w, h) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const cornerLength = Math.min(w, h) * 0.15;

  ctx.lineWidth = 4;
  ctx.strokeStyle = '#00ff88';

  ctx.beginPath();
  ctx.moveTo(x, y + cornerLength);
  ctx.lineTo(x, y);
  ctx.lineTo(x + cornerLength, y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + w - cornerLength, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + cornerLength);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x, y + h - cornerLength);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x + cornerLength, y + h);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + w - cornerLength, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w, y + h - cornerLength);
  ctx.stroke();

  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(0, 255, 136, 0.4)';
  ctx.beginPath();
  ctx.moveTo(cx, y);
  ctx.lineTo(cx, y + h);
  ctx.moveTo(x, cy);
  ctx.lineTo(x + w, cy);
  ctx.stroke();

  ctx.font = '14px monospace';
  ctx.fillStyle = '#00ff88';
  ctx.fillText(`[REC] TGT_LOCK`, x + 10, y + 25);
  ctx.fillText(`COORD: ${Math.round(x)},${Math.round(y)}`, x + 10, y + h - 10);
  
  const timeStr = new Date().toISOString().substring(11, 23);
  ctx.fillText(`SYS.T: ${timeStr}`, x + w - 160, y + 25);
}

function onResults(results) {
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  const vw = videoElement.videoWidth;
  const vh = videoElement.videoHeight;
  const cw = canvasElement.width;
  const ch = canvasElement.height;

  const scale = Math.max(cw / vw, ch / vh);
  const sw = vw * scale;
  const sh = vh * scale;
  const sx = (cw - sw) / 2;
  const sy = (ch - sh) / 2;

  canvasCtx.drawImage(videoElement, sx, sy, sw, sh);

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let validHands = false;

    results.multiHandLandmarks.forEach(landmarks => {
      [4, 8].forEach(index => {
        const px = sx + landmarks[index].x * sw;
        const py = sy + landmarks[index].y * sh;

        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
        
        validHands = true;
      });
    });

    if (validHands) {
      const padding = 40;
      minX -= padding;
      minY -= padding;
      maxX += padding;
      maxY += padding;

      const w = maxX - minX;
      const h = maxY - minY;

      if (w > 50 && h > 50) {
        canvasCtx.save();
        canvasCtx.beginPath();
        canvasCtx.rect(minX, minY, w, h);
        canvasCtx.clip();

        canvasCtx.filter = 'sepia(100%) hue-rotate(270deg) saturate(300%) contrast(150%) invert(10%)';
        canvasCtx.drawImage(videoElement, sx, sy, sw, sh);
        
        canvasCtx.restore();

        canvasCtx.fillStyle = 'rgba(0, 255, 136, 0.1)';
        canvasCtx.fillRect(minX, minY, w, h);

        drawCyberFrame(canvasCtx, minX, minY, w, h);
      }
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
  statusText.innerText = 'MEMUAT SISTEM...';
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      }
    });
    
    videoElement.srcObject = stream;
    
    videoElement.onloadedmetadata = () => {
      videoElement.play();
      ui.style.opacity = '0';
      setTimeout(() => { ui.style.display = 'none'; }, 500);
      
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
    statusText.innerText = `AKSES GAGAL: ${err.message}`;
  }
});
