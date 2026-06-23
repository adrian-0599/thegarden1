let logoImage = null;

export async function loadLogo() {
  if (logoImage) return logoImage;
  logoImage = await loadImage('assets/logo.svg');
  return logoImage;
}

export async function applyWatermark(sourceImage) {
  const logo = await loadLogo();
  const w = sourceImage.width || sourceImage.naturalWidth;
  const h = sourceImage.height || sourceImage.naturalHeight;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(sourceImage, 0, 0, w, h);
  drawWatermark(ctx, logo, w, h);

  return canvas;
}

export async function composeFinalImage(sourceImage, surveyAnswers) {
  const logo = await loadLogo();
  const w = sourceImage.width || sourceImage.naturalWidth;
  const h = sourceImage.height || sourceImage.naturalHeight;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(sourceImage, 0, 0, w, h);
  drawWatermark(ctx, logo, w, h);
  drawSurveyOverlay(ctx, surveyAnswers, w, h);

  return canvas;
}

function drawWatermark(ctx, logo, w, h) {
  const logoW = w * 0.28;
  const logoH = (logo.height / logo.width) * logoW;
  const x = (w - logoW) / 2;
  const y = h * 0.04;

  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.drawImage(logo, x, y, logoW, logoH);
  ctx.restore();
}

function drawSurveyOverlay(ctx, answers, w, h) {
  const lines = [
    `口味 · ${answers.taste || '—'}`,
    `最爱 · ${answers.dish || '—'}`,
    `评分 · ${answers.rating || '—'} / 5`,
  ];

  const fontSize = Math.max(11, Math.round(w * 0.028));
  const lineHeight = fontSize * 1.55;
  const paddingX = 14;
  const paddingY = 10;
  const boxW = Math.max(...lines.map((l) => measureText(ctx, l, fontSize))) + paddingX * 2;
  const boxH = lines.length * lineHeight + paddingY * 2 - 4;

  const margin = w * 0.04;
  const boxX = w - boxW - margin;
  const boxY = h - boxH - margin;

  ctx.save();
  ctx.fillStyle = 'rgba(15, 26, 20, 0.72)';
  roundRect(ctx, boxX, boxY, boxW, boxH, 8);
  ctx.fill();

  ctx.strokeStyle = 'rgba(139, 168, 136, 0.35)';
  ctx.lineWidth = 1;
  roundRect(ctx, boxX, boxY, boxW, boxH, 8);
  ctx.stroke();

  ctx.font = `${fontSize}px "Noto Serif SC", serif`;
  ctx.fillStyle = 'rgba(232, 228, 220, 0.92)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  lines.forEach((line, i) => {
    ctx.fillText(line, boxX + paddingX, boxY + paddingY + i * lineHeight);
  });

  ctx.restore();
}

function measureText(ctx, text, fontSize) {
  ctx.font = `${fontSize}px "Noto Serif SC", serif`;
  return ctx.measureText(text).width;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function downloadCanvas(canvas, filename = 'the-garden-memory.jpg') {
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/jpeg', 0.92);
}

export function setupLongPressSave(element, canvas) {
  let timer = null;

  const start = () => {
    timer = setTimeout(() => {
      downloadCanvas(canvas);
    }, 600);
  };

  const cancel = () => {
    if (timer) clearTimeout(timer);
  };

  element.addEventListener('touchstart', start, { passive: true });
  element.addEventListener('touchend', cancel);
  element.addEventListener('touchmove', cancel);
  element.addEventListener('touchcancel', cancel);
}
