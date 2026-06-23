import { analyzeImage } from './detect.js';
import { stylizeImage } from './stylize.js';
import { composeFinalImage, applyWatermark, downloadCanvas, setupLongPressSave } from './composite.js';

const video = document.getElementById('video');
const captureCanvas = document.getElementById('captureCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const resultImage = document.getElementById('resultImage');

const phaseCamera = document.getElementById('phaseCamera');
const phaseProcessing = document.getElementById('phaseProcessing');
const phaseResult = document.getElementById('phaseResult');
const processingText = document.getElementById('processingText');

const captureBtn = document.getElementById('captureBtn');
const switchCameraBtn = document.getElementById('switchCameraBtn');
const completeSurveyBtn = document.getElementById('completeSurveyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const restartBtn = document.getElementById('restartBtn');
const survey = document.getElementById('survey');
const finalActions = document.getElementById('finalActions');

let currentStream = null;
let facingMode = 'environment';
let stylizedCanvas = null;
let finalCanvas = null;
const surveyAnswers = { taste: null, dish: null, rating: null };

function showPhase(phase) {
  [phaseCamera, phaseProcessing, phaseResult].forEach((el) => {
    el.classList.toggle('is-active', el === phase);
  });
}

function setProcessingMessage(msg) {
  processingText.textContent = msg;
}

async function startCamera() {
  if (currentStream) {
    currentStream.getTracks().forEach((t) => t.stop());
  }

  try {
    currentStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode, width: { ideal: 1280 }, height: { ideal: 960 } },
      audio: false,
    });
    video.srcObject = currentStream;
    video.classList.toggle('mirror', facingMode === 'user');
  } catch {
    if (facingMode === 'environment') {
      facingMode = 'user';
      return startCamera();
    }
    alert('请允许访问摄像头，以获得完整的 The Garden 互动体验。');
  }
}

function captureFrame() {
  if (!video.videoWidth) return null;

  captureCanvas.width = video.videoWidth;
  captureCanvas.height = video.videoHeight;
  const ctx = captureCanvas.getContext('2d');

  if (facingMode === 'user') {
    ctx.translate(captureCanvas.width, 0);
    ctx.scale(-1, 1);
  }

  ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);

  if (facingMode === 'user') {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  return captureCanvas;
}

function resetSurvey() {
  surveyAnswers.taste = null;
  surveyAnswers.dish = null;
  surveyAnswers.rating = null;
  document.querySelectorAll('.chip.is-selected').forEach((c) => c.classList.remove('is-selected'));
  completeSurveyBtn.disabled = true;
  survey.hidden = false;
  finalActions.hidden = true;
}

function checkSurveyComplete() {
  completeSurveyBtn.disabled = !(surveyAnswers.taste && surveyAnswers.dish && surveyAnswers.rating);
}

let longPressBound = false;

function bindLongPressSave() {
  if (longPressBound || !finalCanvas) return;
  setupLongPressSave(resultCanvas, finalCanvas);
  longPressBound = true;
}

function displayCanvas(canvas) {
  resultCanvas.width = canvas.width;
  resultCanvas.height = canvas.height;
  resultCanvas.getContext('2d').drawImage(canvas, 0, 0);
  resultCanvas.hidden = false;
  resultImage.hidden = true;
}

async function handleCapture() {
  const frame = captureFrame();
  if (!frame) return;

  if (currentStream) {
    currentStream.getTracks().forEach((t) => t.stop());
  }

  showPhase(phaseProcessing);
  setProcessingMessage('正在感知画面内容…');

  try {
    const analysis = await analyzeImage(frame);
    setProcessingMessage(
      analysis.sceneType === 'pet'
        ? `发现 ${analysis.subject === 'cat' ? '猫咪' : analysis.subject === 'dog' ? '狗狗' : '小伙伴'}，正在置入森林绿洲…`
        : analysis.isEmpty
          ? '为您创作专属森林绿洲艺术图…'
          : '正在将画面融入 The Garden 美学…'
    );

    stylizedCanvas = await stylizeImage(frame, analysis);
    stylizedCanvas = await applyWatermark(stylizedCanvas);

    showPhase(phaseResult);
    displayCanvas(stylizedCanvas);
    resetSurvey();
  } catch (err) {
    console.error(err);
    alert('图像处理出现问题，请重试。');
    showPhase(phaseCamera);
    startCamera();
  }
}

async function handleSurveyComplete() {
  completeSurveyBtn.disabled = true;
  setProcessingMessage('正在合成纪念图…');

  try {
    finalCanvas = await composeFinalImage(stylizedCanvas, surveyAnswers);
    displayCanvas(finalCanvas);
    survey.hidden = true;
    finalActions.hidden = false;
    bindLongPressSave();
  } catch (err) {
    console.error(err);
    completeSurveyBtn.disabled = false;
  }
}

function handleRestart() {
  stylizedCanvas = null;
  finalCanvas = null;
  longPressBound = false;
  resetSurvey();
  showPhase(phaseCamera);
  startCamera();
}

document.querySelectorAll('.survey__options').forEach((group) => {
  group.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;

    const question = group.dataset.question;
    group.querySelectorAll('.chip').forEach((c) => c.classList.remove('is-selected'));
    chip.classList.add('is-selected');
    surveyAnswers[question] = chip.dataset.value;
    checkSurveyComplete();
  });
});

captureBtn.addEventListener('click', handleCapture);
switchCameraBtn.addEventListener('click', () => {
  facingMode = facingMode === 'environment' ? 'user' : 'environment';
  startCamera();
});
completeSurveyBtn.addEventListener('click', handleSurveyComplete);
downloadBtn.addEventListener('click', () => {
  if (finalCanvas) downloadCanvas(finalCanvas);
});
restartBtn.addEventListener('click', handleRestart);

window.addEventListener('DOMContentLoaded', startCamera);
