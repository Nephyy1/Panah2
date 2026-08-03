const videoElement = document.getElementById('videoElement');
const canvasElement = document.getElementById('canvasElement');
const canvasCtx = canvasElement.getContext('2d');
const statusOverlay = document.getElementById('statusOverlay');
const statusText = document.getElementById('statusText');
const startButton = document.getElementById('startButton');
const spinner = document.querySelector('.spinner');
const toggleSkeleton = document.getElementById('toggleSkeleton');
const toggleEffect = document.getElementById('toggleEffect');

let showSkeleton = false;
let showEffect = true;

toggleSkeleton.textContent = 'Kerangka: OFF';
toggleSkeleton.classList.remove('active');

toggleSkeleton.addEventListener('click', () => {
  showSkeleton = !showSkeleton;
  toggleSkeleton.textContent = `Kerangka: ${showSkeleton ? 'ON' : 'OFF'}`;
  toggleSkeleton.classList.toggle('active', showSkeleton);
});

toggleEffect.addEventListener('click', () => {
  showEffect = !showEffect;
  toggleEffect.textContent = `Efek Visual: ${showEffect ? 'ON' : 'OFF'}`;
  toggleEffect.classList.toggle('active', showEffect);
});

function resizeCanvas() {
  canvasElement.width = videoElement.videoWidth || 640;
  canvasElement.height = videoElement.videoHeight || 480;
}

function drawGlowSphere(ctx, x, y, radius, color, glowColor) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = radius * 2;
  ctx.fill();
  ctx.shadowBlur = 0;
}

function onResults(results) {
  if (statusOverlay.style.display !== 'none') {
    statusOverlay.style.display = 'none';
    resizeCanvas();
  }
  
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    if (showEffect && results.multiHandLandmarks.length === 2) {
      canvasCtx.globalCompositeOperation = 'screen';
      
      const tip1 = results.multiHandLandmarks[0][8];
      const tip2 = results.multiHandLandmarks[1][8];
      
      const xA = tip1.x * canvasElement.width;
      const yA = tip1.y * canvasElement.height;
      const xB = tip2.x * canvasElement.width;
      const yB = tip2.y * canvasElement.height;
      
      const leftX = xA < xB ? xA : xB;
      const leftY = xA < xB ? yA : yB;
      const rightX = xA < xB ? xB : xA;
      const rightY = xA < xB ? yB : yA;
      
      const dist = Math.hypot(rightX - leftX, rightY - leftY);
      
      if (dist < 250) {
        const midX = (leftX + rightX) / 2;
        const midY = (leftY + rightY) / 2;
        const intensity = Math.max(0, 250 - dist) / 250;
        
        drawGlowSphere(canvasCtx, leftX, leftY, 20 + (intensity * 10), 'rgba(255, 100, 100, 0.8)', 'red');
        drawGlowSphere(canvasCtx, rightX, rightY, 20 + (intensity * 10), 'rgba(100, 150, 255, 0.8)', 'blue');
        
        const purpleRadius = 30 + (intensity * 120);
        const gradient = canvasCtx.createRadialGradient(midX, midY, purpleRadius * 0.1, midX, midY, purpleRadius);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.2, 'rgba(200, 100, 255, 0.9)');
        gradient.addColorStop(0.6, 'rgba(138, 43, 226, 0.5)');
        gradient.addColorStop(1, 'rgba(138, 43, 226, 0)');
        
        canvasCtx.beginPath();
        canvasCtx.arc(midX, midY, purpleRadius, 0, 2 * Math.PI);
        canvasCtx.fillStyle = gradient;
        canvasCtx.fill();
        
      } else {
        const angle = Math.atan2(rightY - leftY, rightX - leftX);
        const bowRadius = 80;
        
        canvasCtx.shadowColor = 'rgba(0, 255, 255, 0.8)';
        canvasCtx.shadowBlur = 20;
        canvasCtx.strokeStyle = 'rgba(150, 255, 255, 0.9)';
        canvasCtx.lineWidth = 6;
        
        canvasCtx.beginPath();
        canvasCtx.arc(leftX, leftY, bowRadius, angle - Math.PI/2.5, angle + Math.PI/2.5);
        canvasCtx.stroke();
        
        const topX = leftX + Math.cos(angle - Math.PI/2.5) * bowRadius;
        const topY = leftY + Math.sin(angle - Math.PI/2.5) * bowRadius;
        const botX = leftX + Math.cos(angle + Math.PI/2.5) * bowRadius;
        const botY = leftY + Math.sin(angle + Math.PI/2.5) * bowRadius;
        
        canvasCtx.lineWidth = 2;
        canvasCtx.beginPath();
        canvasCtx.moveTo(topX, topY);
        canvasCtx.lineTo(rightX, rightY);
        canvasCtx.lineTo(botX, botY);
        canvasCtx.stroke();
        
        canvasCtx.shadowColor = 'rgba(255, 200, 0, 0.9)';
        canvasCtx.strokeStyle = 'rgba(255, 255, 150, 1)';
        canvasCtx.lineWidth = 5;
        
        const arrowLen = dist + 50;
        const arrowTipX = rightX - Math.cos(angle) * arrowLen;
        const arrowTipY = rightY - Math.sin(angle) * arrowLen;
        
        canvasCtx.beginPath();
        canvasCtx.moveTo(rightX, rightY);
        canvasCtx.lineTo(arrowTipX, arrowTipY);
        canvasCtx.stroke();
        
        canvasCtx.fillStyle = 'rgba(255, 255, 150, 1)';
        canvasCtx.beginPath();
        canvasCtx.moveTo(arrowTipX, arrowTipY);
        canvasCtx.lineTo(arrowTipX + Math.cos(angle - 0.5) * 20, arrowTipY + Math.sin(angle - 0.5) * 20);
        canvasCtx.lineTo(arrowTipX + Math.cos(angle + 0.5) * 20, arrowTipY + Math.sin(angle + 0.5) * 20);
        canvasCtx.closePath();
        canvasCtx.fill();
        
        canvasCtx.shadowBlur = 0;
      }
      
      canvasCtx.globalCompositeOperation = 'source-over';
    }
    
    if (showSkeleton) {
      for (const landmarks of results.multiHandLandmarks) {
        window.drawConnectors(canvasCtx, landmarks, window.HAND_CONNECTIONS, {
          color: 'rgba(0, 255, 128, 0.4)',
          lineWidth: 2
        });
        window.drawLandmarks(canvasCtx, landmarks, {
          color: 'rgba(255, 50, 50, 0.6)',
          lineWidth: 1,
          radius: 2
        });
      }
    }
  }
  canvasCtx.restore();
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
  spinner.style.display = 'block';
  statusText.innerText = 'Menghubungkan ke kamera & memuat model...';
  
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
      
      async function detectionFrame() {
        if (!videoElement.paused && !videoElement.ended) {
          await hands.send({ image: videoElement });
        }
        requestAnimationFrame(detectionFrame);
      }
      
      detectionFrame();
    };
  } catch (err) {
    spinner.style.display = 'none';
    statusText.innerText = `Akses gagal: ${err.message}`;
    statusText.style.color = '#ff4d4d';
  }
});
