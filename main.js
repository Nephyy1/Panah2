import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { Hands, HAND_CONNECTIONS } from '@mediapipe/hands';

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
  
  if (results.multiHandLandmarks) {
    for (const landmarks of results.multiHandLandmarks) {
      drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
        color: '#00FF00',
        lineWidth: 4
      });
      drawLandmarks(canvasCtx, landmarks, {
        color: '#FF0000',
        lineWidth: 2,
        radius: 3
      });
    }
  }
  canvasCtx.restore();
}

const hands = new Hands({
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
