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
  if (type === 'love') color = '#ff69b4';

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

function countExtendedFingers(landmarks, w, h) {
  const wrist = landmarks[0];
  let extendedCount = 0;
  
  const tips = [8, 12, 16, 20];
  const pips = [6, 10, 14, 18];
  
  for(let i = 0; i < 4; i++) {
    const dTip = getDistance(landmarks[tips[i]], wrist, w, h);
    const dPip = getDistance(landmarks[pips[i]], wrist, w, h);
    if(dTip > dPip) {
      extendedCount++;
    }
  }
  
  const thumbTip = landmarks[4];
  const thumbIp = landmarks[3];
  const indexMcp = landmarks[5];
  const dThumb = getDistance(thumbTip, indexMcp, w, h);
  const dThumbIp = getDistance(thumbIp, indexMcp, w, h);
  if(dThumb > dThumbIp) {
    extendedCount++;
  }
  
  return extendedCount;
}

function detectSpecificGesture(landmarks, w, h) {
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];
  const wrist = landmarks[0];

  const extCount = countExtendedFingers(landmarks, w, h);

  const dIndex = getDistance(indexTip, wrist, w, h);
  const dMiddle = getDistance(middleTip, wrist, w, h);
  const dRing = getDistance(ringTip, wrist, w, h);
  const dPinky = getDistance(pinkyTip, wrist, w, h);

  if (extCount === 1 && dIndex > dMiddle && dIndex > dRing && dIndex > dPinky) {
    return 'GESTURE_1';
  }
  if (extCount === 2 && dIndex > dRing && dMiddle > dRing) {
    return 'GESTURE_2';
  }
  if (extCount === 3) {
    return 'GESTURE_3';
  }
  if (extCount === 4 && countExtendedFingers(landmarks, w, h) === 4) {
    return 'GESTURE_4';
  }
  if (extCount === 5) {
    return 'GESTURE_5';
  }

  if (extCount === 1 && thumbTip.y < landmarks[3].y && indexTip.y > landmarks[6].y) {
    if (thumbTip.y < wrist.y) return 'LIKE';
    else return 'DISLIKE';
  }

  if (extCount === 1 && middleTip.y < landmarks[10].y && indexTip.y > landmarks[6].y && ringTip.y > landmarks[14].y) {
    return 'FUCK';
  }

  return null;
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

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    if (results.multiHandLandmarks.length === 2) {
      const hand1 = results.multiHandLandmarks[0];
      const hand2 = results.multiHandLandmarks[1];
      
      const thumbDist = getDistance(hand1[4], hand2[4], sw, sh);
      const indexDist = getDistance(hand1[8], hand2[8], sw, sh);

      if (thumbDist < 40 && indexDist < 40) {
        currentGesture = 'LOVE_SIGN';
      }
    }

    if (currentGesture !== 'LOVE_SIGN') {
      const landmarks = results.multiHandLandmarks[0];
      currentGesture = detectSpecificGesture(landmarks, sw, sh) || 'TRACKING';

      window.drawConnectors(canvasCtx, landmarks, window.HAND_CONNECTIONS, {
        color: '#4fc1ff',
        lineWidth: 2
      });
      window.drawLandmarks(canvasCtx, landmarks, {
        color: '#dcdcaa',
        lineWidth: 1,
        radius: 3
      });
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
    if (currentGesture === 'GESTURE_1') {
      printTerminal('const count = 1;', 'info');
    } else if (currentGesture === 'GESTURE_2') {
      printTerminal('const count = 2;', 'info');
    } else if (currentGesture === 'GESTURE_3') {
      printTerminal('const count = 3;', 'info');
    } else if (currentGesture === 'GESTURE_4') {
      printTerminal('const count = 4;', 'info');
    } else if (currentGesture === 'GESTURE_5') {
      printTerminal('const count = 5; // Full array length', 'info');
    } else if (currentGesture === 'LIKE') {
      printTerminal('console.log("Feedback: APPROVED");', 'success');
    } else if (currentGesture === 'DISLIKE') {
      printTerminal('console.warn("Feedback: REJECTED");', 'warn');
    } else if (currentGesture === 'FUCK') {
      printTerminal('throw new Error("Access Forbidden by Gesture");', 'error');
    } else if (currentGesture === 'LOVE_SIGN') {
      printTerminal('npm install @nephyy/love --save', 'love');
    } else {
      printTerminal('SYS: AWAITING GESTURE...', 'normal');
    }
    lastGesture = currentGesture;
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
