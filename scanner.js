let stream = null;
let scanning = false;

async function startScanner() {
  const container = document.getElementById("videoContainer");
  const video = document.getElementById("video");
  try {
    container.style.display = "block";
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    video.srcObject = stream;
    scanning = true;
    requestAnimationFrame(tick);
  } catch (e) { alert("Камера недоступна: " + e); }
}

function tick() {
  if (!scanning) return;
  const video = document.getElementById("video");
  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const qr = jsQR(imgData.data, imgData.width, imgData.height);
    if (qr) {
      window.processAndAdd(qr.data); // Вызываем функцию из app.js
      return stopScanner();
    }
  }
  requestAnimationFrame(tick);
}

function stopScanner() {
  scanning = false;
  if (stream) stream.getTracks().forEach(t => t.stop());
  document.getElementById("videoContainer").style.display = "none";
}

document.getElementById('startScan').onclick = startScanner;
document.getElementById('closeVideo').onclick = stopScanner;