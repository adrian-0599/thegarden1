import { buildPrompt } from './detect.js';

const FOREST_PALETTE = {
  deep: [15, 26, 20],
  mid: [45, 74, 56],
  sage: [139, 168, 136],
  earth: [139, 115, 85],
  gold: [196, 168, 130],
  cream: [232, 228, 220],
};

export async function stylizeImage(sourceCanvas, analysis) {
  const prompt = buildPrompt(analysis);

  try {
    const apiResult = await tryServerStylize(sourceCanvas, prompt, analysis);
    if (apiResult) return apiResult;
  } catch {
    /* fall through to local stylization */
  }

  return localForestStylize(sourceCanvas, analysis);
}

async function tryServerStylize(canvas, prompt, analysis) {
  const blob = await canvasToBlob(canvas);
  const form = new FormData();
  form.append('image', blob, 'capture.jpg');
  form.append('prompt', prompt);
  form.append('sceneType', analysis.sceneType);
  form.append('subject', analysis.subject || '');

  const response = await fetch('/api/stylize', {
    method: 'POST',
    body: form,
  });

  if (!response.ok) return null;

  const data = await response.json();
  if (!data.imageUrl) return null;

  return loadImage(data.imageUrl);
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.92);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function localForestStylize(sourceCanvas, analysis) {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  if (analysis.isEmpty) {
    drawForestScene(ctx, w, h);
    return Promise.resolve(canvas);
  }

  ctx.drawImage(sourceCanvas, 0, 0, w, h);
  applyForestGrade(ctx, w, h);
  drawLightRays(ctx, w, h);
  drawVignette(ctx, w, h);
  drawForestBorder(ctx, w, h);

  if (analysis.sceneType === 'pet') {
    drawOasisOverlay(ctx, w, h, analysis.subject);
  }

  return Promise.resolve(canvas);
}

function drawForestScene(ctx, w, h) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, rgb(FOREST_PALETTE.deep));
  grad.addColorStop(0.4, rgb(FOREST_PALETTE.mid));
  grad.addColorStop(1, rgb(FOREST_PALETTE.deep));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 12; i++) {
    const x = (w / 12) * i + Math.random() * 40;
    drawTreeSilhouette(ctx, x, h, 0.4 + Math.random() * 0.6);
  }

  drawLightRays(ctx, w, h);
  drawTableSetting(ctx, w, h);
  drawVignette(ctx, w, h);
}

function drawTreeSilhouette(ctx, x, h, scale) {
  const treeH = h * 0.55 * scale;
  const treeW = 60 * scale;
  ctx.fillStyle = `rgba(26, 46, 34, ${0.5 + Math.random() * 0.3})`;
  ctx.beginPath();
  ctx.moveTo(x, h * 0.35);
  ctx.lineTo(x - treeW, h * 0.35 + treeH);
  ctx.lineTo(x + treeW, h * 0.35 + treeH);
  ctx.closePath();
  ctx.fill();
}

function drawTableSetting(ctx, w, h) {
  const cx = w / 2;
  const cy = h * 0.72;

  ctx.fillStyle = 'rgba(139, 115, 85, 0.3)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.35, h * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(232, 228, 220, 0.15)';
  ctx.beginPath();
  ctx.ellipse(cx, cy - 20, w * 0.08, h * 0.04, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = `${Math.round(w * 0.035)}px "Cormorant Garamond", serif`;
  ctx.fillStyle = 'rgba(232, 228, 220, 0.5)';
  ctx.textAlign = 'center';
  ctx.fillText('The Garden', cx, cy - 60);
}

function applyForestGrade(ctx, w, h) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];

    d[i] = r * 0.75 + 15 * 0.25;
    d[i + 1] = g * 0.85 + 45 * 0.15;
    d[i + 2] = b * 0.7 + 20 * 0.3;

    const lum = (d[i] + d[i + 1] + d[i + 2]) / 3;
    const satBoost = lum > 128 ? 1.05 : 0.95;
    d[i] = clamp(d[i] * satBoost);
    d[i + 1] = clamp(d[i + 1] * (satBoost + 0.05));
  }

  ctx.putImageData(imageData, 0, 0);

  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = 'rgba(74, 107, 82, 0.18)';
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
}

function drawLightRays(ctx, w, h) {
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  for (let i = 0; i < 5; i++) {
    const x = w * (0.2 + i * 0.15);
    const grad = ctx.createLinearGradient(x, 0, x + 80, h);
    grad.addColorStop(0, 'rgba(196, 168, 130, 0.08)');
    grad.addColorStop(0.5, 'rgba(196, 168, 130, 0.03)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(x - 40, 0, 120, h);
  }
  ctx.restore();
}

function drawVignette(ctx, w, h) {
  const grad = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.75);
  grad.addColorStop(0, 'transparent');
  grad.addColorStop(1, 'rgba(15, 26, 20, 0.55)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function drawForestBorder(ctx, w, h) {
  const grad = ctx.createLinearGradient(0, 0, 0, h * 0.15);
  grad.addColorStop(0, 'rgba(26, 46, 34, 0.4)');
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h * 0.15);

  const bottomGrad = ctx.createLinearGradient(0, h * 0.85, 0, h);
  bottomGrad.addColorStop(0, 'transparent');
  bottomGrad.addColorStop(1, 'rgba(15, 26, 20, 0.5)');
  ctx.fillStyle = bottomGrad;
  ctx.fillRect(0, h * 0.85, w, h * 0.15);
}

function drawOasisOverlay(ctx, w, h, subject) {
  const label = subject === 'cat' ? '🐱' : subject === 'dog' ? '🐕' : '🌿';
  ctx.font = `${Math.round(w * 0.04)}px serif`;
  ctx.fillStyle = 'rgba(232, 228, 220, 0.6)';
  ctx.textAlign = 'center';
  ctx.fillText(`${label} in The Garden`, w / 2, h * 0.08);
}

function rgb([r, g, b]) {
  return `rgb(${r}, ${g}, ${b})`;
}

function clamp(v) {
  return Math.max(0, Math.min(255, v));
}
