const videoElement = document.getElementById('videoElement');
const canvasElement = document.getElementById('canvasElement');
const canvasCtx = canvasElement.getContext('2d');
const statusElement = document.getElementById('status');
const statusText = document.getElementById('statusText');
const startButton = document.getElementById('startButton');

function onResults(results) {
  if (statusElement.style.display !== 'none') {
    statusElement.style.display = 'none';
  }
  
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    if (results.multiHandLandmarks.length === 2) {
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
      canvasCtx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
      canvasCtx.lineWidth = 4;
      canvasCtx.stroke();
      
      canvasCtx.beginPath();
      canvasCtx.arc(x1, y1, 10, 0, 2 * Math.PI);
      canvasCtx.fillStyle = 'rgba(255, 0, 0, 0.9)';
      canvasCtx.fill();
      
      canvasCtx.beginPath();
      canvasCtx.moveTo(x2, y2);
      canvasCtx.lineTo(midX, midY);
      canvasCtx.strokeStyle = 'rgba(0, 100, 255, 0.6)';
      canvasCtx.lineWidth = 4;
      canvasCtx.stroke();
      
      canvasCtx.beginPath();
      canvasCtx.arc(x2, y2, 10, 0, 2 * Math.PI);
      canvasCtx.fillStyle = 'rgba(0, 100, 255, 0.9)';
      canvasCtx.fill();
      
      const gradient = canvasCtx.createRadialGradient(midX, midY, orbRadius * 0.1, midX, midY, orbRadius);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.3, 'rgba(148, 0, 211, 0.9)');
      gradient.addColorStop(1, 'rgba(148, 0, 211, 0)');
      
      canvasCtx.beginPath();
      canvasCtx.arc(midX, midY, orbRadius, 0, 2 * Math.PI);
      canvasCtx.fillStyle = gradient;
      canvasCtx.fill();
    }
    
    for (const landmarks of results.multiHandLandmarks) {
      window.drawConnectors(canvasCtx, landmarks, window.HAND_CONNECTIONS, {
        color: 'rgba(0, 255, 0, 0.3)',
        lineWidth: 2
      });
      window.drawLandmarks(canvasCtx, landmarks, {
        color: 'rgba(255, 0, 0, 0.3)',
        lineWidth: 1,
        radius: 2
      });
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
  statusText.style.display = 'block';
  
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
      
      async function detectionFrame() {
        if (!videoElement.paused && !videoElement.ended) {
          await hands.send({ image: videoElement });
        }
        requestAnimationFrame(detectionFrame);
      }
      
      detectionFrame();
    };
  } catch (err) {
    statusText.innerText = `Akses kamera gagal: ${err.message}`;
    statusElement.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
  }
});
