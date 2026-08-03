const videoElement = document.getElementById('videoElement');
const canvasElement = document.getElementById('canvasElement');
const canvasCtx = canvasElement.getContext('2d');
const statusOverlay = document.getElementById('statusOverlay');
const statusText = document.getElementById('statusText');
const startButton = document.getElementById('startButton');
const spinner = document.querySelector('.spinner');

let shockwaves = [];
let handStates = {};

function resizeCanvas() {
  canvasElement.width = videoElement.videoWidth || 640;
  canvasElement.height = videoElement.videoHeight || 480;
}

function getDistance(p1, p2, w, h) {
  return Math.hypot((p1.x - p2.x) * w, (p1.y - p2.y) * h);
}

function onResults(results) {
  if (statusOverlay.style.display !== 'none') {
    statusOverlay.style.display = 'none';
    resizeCanvas();
  }
  
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.globalCompositeOperation = 'screen';
  
  const time = performance.now() * 0.001;
  const w = canvasElement.width;
  const h = canvasElement.height;
  
  for (let i = shockwaves.length - 1; i >= 0; i--) {
    const sw = shockwaves[i];
    sw.radius += 25;
    sw.alpha -= 0.03;
    if (sw.alpha <= 0) {
      shockwaves.splice(i, 1);
    } else {
      canvasCtx.beginPath();
      canvasCtx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      canvasCtx.strokeStyle = `rgba(0, 255, 255, ${sw.alpha})`;
      canvasCtx.lineWidth = 15 * sw.alpha;
      canvasCtx.stroke();
    }
  }
  
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    results.multiHandLandmarks.forEach((landmarks, index) => {
      const base = landmarks[0];
      const midMCP = landmarks[9];
      const thumbTip = landmarks[4];
      const indexTip = landmarks[8];
      const middleTip = landmarks[12];
      const ringTip = landmarks[16];
      const pinkyTip = landmarks[20];
      
      const palmX = midMCP.x * w;
      const palmY = midMCP.y * h;
      
      const dIndexBase = getDistance(indexTip, base, w, h);
      const dThumbPinky = getDistance(thumbTip, pinkyTip, w, h);
      const dMidBase = getDistance(middleTip, base, w, h);
      
      let mode = 'standby';
      let pColor = 'rgba(0, 255, 255,';
      let sColor = 'rgba(0, 150, 255,';
      let rSpeed = 1;
      
      if (dIndexBase < 100 && dMidBase < 100) {
        mode = 'fist';
      } else if (dIndexBase > 200 && dThumbPinky > 200) {
        mode = 'charging';
        pColor = 'rgba(255, 60, 0,';
        sColor = 'rgba(255, 120, 0,';
        rSpeed = 6;
      }
      
      const handId = `hand_${index}`;
      if (!handStates[handId]) handStates[handId] = 'standby';
      
      if (mode === 'fist' && handStates[handId] !== 'fist') {
        shockwaves.push({ x: palmX, y: palmY, radius: 20, alpha: 1 });
      }
      handStates[handId] = mode;
      
      if (mode === 'fist') return;
      
      const angle = Math.atan2(midMCP.y - base.y, midMCP.x - base.x) + Math.PI / 2;
      
      canvasCtx.save();
      canvasCtx.translate(palmX, palmY);
      canvasCtx.rotate(angle);
      
      canvasCtx.shadowColor = `${pColor} 1)`;
      canvasCtx.shadowBlur = mode === 'charging' ? 50 : 20;
      canvasCtx.fillStyle = `${pColor} 0.95)`;
      canvasCtx.beginPath();
      canvasCtx.arc(0, 0, mode === 'charging' ? 30 : 18, 0, Math.PI * 2);
      canvasCtx.fill();
      
      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = `${pColor} 0.8)`;
      
      canvasCtx.save();
      canvasCtx.rotate(time * rSpeed);
      canvasCtx.setLineDash([15, 15]);
      canvasCtx.beginPath();
      canvasCtx.arc(0, 0, 55, 0, Math.PI * 2);
      canvasCtx.stroke();
      canvasCtx.restore();
      
      canvasCtx.save();
      canvasCtx.rotate(-time * rSpeed * 1.5);
      canvasCtx.setLineDash([40, 20, 10, 20]);
      canvasCtx.lineWidth = 4;
      canvasCtx.beginPath();
      canvasCtx.arc(0, 0, 80, 0, Math.PI * 2);
      canvasCtx.stroke();
      canvasCtx.restore();
      
      canvasCtx.save();
      canvasCtx.rotate(time * rSpeed * 0.5);
      canvasCtx.setLineDash([2, 8]);
      canvasCtx.lineWidth = 12;
      canvasCtx.strokeStyle = `${sColor} 0.4)`;
      canvasCtx.beginPath();
      canvasCtx.arc(0, 0, 100, 0, Math.PI * 2);
      canvasCtx.stroke();
      canvasCtx.restore();
      
      canvasCtx.font = "10px monospace";
      canvasCtx.fillStyle = `${pColor} 0.9)`;
      canvasCtx.shadowBlur = 0;
      canvasCtx.fillText(`SYS.ON // T:${time.toFixed(1)}`, 70, -70);
      canvasCtx.fillText(`X:${Math.round(palmX)} Y:${Math.round(palmY)}`, 70, -55);
      canvasCtx.fillText(mode === 'charging' ? "STATUS: OVERRIDE" : "STATUS: STABLE", -110, 95);
      
      canvasCtx.restore();
      
      const drawTargetNode = (tip) => {
        const tx = tip.x * w;
        const ty = tip.y * h;
        
        canvasCtx.beginPath();
        canvasCtx.moveTo(palmX, palmY);
        canvasCtx.lineTo(tx, ty);
        canvasCtx.strokeStyle = `${pColor} 0.2)`;
        canvasCtx.lineWidth = 1;
        canvasCtx.setLineDash([4, 4]);
        canvasCtx.stroke();
        canvasCtx.setLineDash([]);
        
        canvasCtx.strokeStyle = `${pColor} 0.9)`;
        canvasCtx.lineWidth = 2;
        const s = 6;
        canvasCtx.beginPath();
        canvasCtx.moveTo(tx - s, ty - s);
        canvasCtx.lineTo(tx + s, ty - s);
        canvasCtx.lineTo(tx + s, ty + s);
        canvasCtx.lineTo(tx - s, ty + s);
        canvasCtx.closePath();
        canvasCtx.stroke();
      };
      
      drawTargetNode(thumbTip);
      drawTargetNode(indexTip);
      drawTargetNode(middleTip);
      drawTargetNode(ringTip);
      drawTargetNode(pinkyTip);
    });
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
  statusText.innerText = 'Mengkalibrasi Sistem...';
  
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
    statusText.innerText = `Sistem Gagal: ${err.message}`;
    statusText.style.color = '#ff3333';
  }
});
