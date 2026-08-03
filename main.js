const videoElement = document.getElementById('videoElement');
const canvasElement = document.getElementById('canvasElement');
const canvasCtx = canvasElement.getContext('2d');
const statusOverlay = document.getElementById('statusOverlay');
const statusText = document.getElementById('statusText');
const startButton = document.getElementById('startButton');
const spinner = document.querySelector('.spinner');
const toggleSkeleton = document.getElementById('toggleSkeleton');
const toggleEffect = document.getElementById('toggleEffect');

let showSkeleton = true;
let showEffect = true;

toggleSkeleton.addEventListener('click', () => {
  showSkeleton = !showSkeleton;
  toggleSkeleton.textContent = `Kerangka: ${showSkeleton ? 'ON' : 'OFF'}`;
  toggleSkeleton.classList.toggle('active', showSkeleton);
});

toggleEffect.addEventListener('click', () => {
  showEffect = !showEffect;
  toggleEffect.textContent = `Efek Hollow: ${showEffect ? 'ON' : 'OFF'}`;
  toggleEffect.classList.toggle('active', showEffect);
});

function resizeCanvas() {
  canvasElement.width = videoElement.videoWidth || 640;
  canvasElement.height = videoElement.videoHeight || 480;
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
      const hand1 = results.multiHandLandmarks[0];
      const hand2 = results.multiHandLandmarks[1];
      
      const indexTip1 = hand1[8];
      const indexTip2 = hand2[8];
      
      const x1 = indexTip1.x * canvasElement.width;
      const y1 = indexTip1.y * canvasElement.height;
      const x2 = indexTip2.x * canvasElement.width;
      const y2 = indexTip2.y * canvasElement.height;
      
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const distance = Math.hypot(x2 - x1, y2 - y1);
      const orbRadius = distance * 0.4;
      
      canvasCtx.beginPath();
      canvasCtx.moveTo(x1, y1);
      canvasCtx.lineTo(midX, midY);
      canvasCtx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
      canvasCtx.lineWidth = 5;
      canvasCtx.stroke();
      
      canvasCtx.beginPath();
      canvasCtx.arc(x1, y1, 12, 0, 2 * Math.PI);
      canvasCtx.fillStyle = 'rgba(255, 0, 0, 1)';
      canvasCtx.fill();
      
      canvasCtx.beginPath();
      canvasCtx.moveTo(x2, y2);
      canvasCtx.lineTo(midX, midY);
      canvasCtx.strokeStyle = 'rgba(0, 100, 255, 0.8)';
      canvasCtx.lineWidth = 5;
      canvasCtx.stroke();
      
      canvasCtx.beginPath();
      canvasCtx.arc(x2, y2, 12, 0, 2 * Math.PI);
      canvasCtx.fillStyle = 'rgba(0, 100, 255, 1)';
      canvasCtx.fill();
      
      const gradient = canvasCtx.createRadialGradient(midX, midY, orbRadius * 0.1, midX, midY, orbRadius);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.2, 'rgba(148, 0, 211, 0.9)');
      gradient.addColorStop(1, 'rgba(148, 0, 211, 0)');
      
      canvasCtx.beginPath();
      canvasCtx.arc(midX, midY, orbRadius, 0, 2 * Math.PI);
      canvasCtx.fillStyle = gradient;
      canvasCtx.fill();
    }
    
    if (showSkeleton) {
      for (const landmarks of results.multiHandLandmarks) {
        window.drawConnectors(canvasCtx, landmarks, window.HAND_CONNECTIONS, {
          color: 'rgba(0, 255, 128, 0.6)',
          lineWidth: 3
        });
        window.drawLandmarks(canvasCtx, landmarks, {
          color: 'rgba(255, 50, 50, 0.8)',
          lineWidth: 1,
          radius: 3
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
