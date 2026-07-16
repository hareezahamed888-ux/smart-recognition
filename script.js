const MODEL_URL = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights';
const STORAGE_FACES = 'attendance_faces';
const STORAGE_LOG = 'attendance_log';
const video = document.getElementById('video');
const overlay = document.getElementById('overlay');
const startCameraBtn = document.getElementById('startCameraBtn');
const stopCameraBtn = document.getElementById('stopCameraBtn');
const recognizeBtn = document.getElementById('recognizeBtn');
const statusEl = document.getElementById('status');
const enrollForm = document.getElementById('enrollForm');
const attendanceTableBody = document.querySelector('#attendanceTable tbody');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const clearLogBtn = document.getElementById('clearLogBtn');

let faceMatcher = null;
let labeledDescriptors = [];
let attendanceLog = [];
let recognitionInterval = null;
let stream = null;
let isRecognizing = false;

window.addEventListener('DOMContentLoaded', async () => {
  await loadModels();
  loadSavedData();
  updateStatus('Ready. Enroll face profiles and start recognition.', 'good');
});

startCameraBtn.addEventListener('click', startCamera);
stopCameraBtn.addEventListener('click', stopCamera);
recognizeBtn.addEventListener('click', toggleRecognition);
enrollForm.addEventListener('submit', handleEnrollment);
exportCsvBtn.addEventListener('click', exportAttendanceCsv);
clearLogBtn.addEventListener('click', clearAttendanceLog);

async function loadModels() {
  try {
    updateStatus('Loading face detection models...', 'warn');
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
  } catch (error) {
    updateStatus('Failed to load models. Check your internet connection.', 'error');
    console.error(error);
  }
}

function updateStatus(message, type = '') {
  statusEl.textContent = message;
  statusEl.className = type ? `status ${type}` : 'status';
}

function loadSavedData() {
  const savedFaces = localStorage.getItem(STORAGE_FACES);
  const savedLog = localStorage.getItem(STORAGE_LOG);

  if (savedFaces) {
    try {
      const parsed = JSON.parse(savedFaces);
      labeledDescriptors = parsed.map(saved => new faceapi.LabeledFaceDescriptors(
        saved.label,
        saved.descriptors.map(d => new Float32Array(d))
      ));
      faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.55);
      updateStatus(`Loaded ${labeledDescriptors.length} enrolled face(s).`, 'good');
    } catch (error) {
      console.warn('Could not parse saved face enrollment data', error);
    }
  }

  if (savedLog) {
    try {
      attendanceLog = JSON.parse(savedLog);
    } catch (error) {
      attendanceLog = [];
    }
  }
  renderAttendanceLog();
}

async function startCamera() {
  if (stream) {
    return;
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    video.srcObject = stream;
    video.play();
    stopCameraBtn.disabled = false;
    recognizeBtn.disabled = false;
    startCameraBtn.disabled = true;
    updateStatus('Camera started. Ready to recognize faces.', 'good');
  } catch (error) {
    updateStatus('Unable to access camera. Give permissions and try again.', 'error');
    console.error(error);
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  if (recognitionInterval) {
    clearInterval(recognitionInterval);
    recognitionInterval = null;
    isRecognizing = false;
    recognizeBtn.textContent = 'Start Recognition';
  }
  startCameraBtn.disabled = false;
  stopCameraBtn.disabled = true;
  updateStatus('Camera stopped.', 'warn');
}

function toggleRecognition() {
  if (!stream) {
    updateStatus('Start the camera first.', 'warn');
    return;
  }

  if (!labeledDescriptors.length) {
    updateStatus('Enroll at least one face profile before recognition.', 'warn');
    return;
  }

  if (isRecognizing) {
    clearInterval(recognitionInterval);
    recognitionInterval = null;
    isRecognizing = false;
    recognizeBtn.textContent = 'Start Recognition';
    updateStatus('Recognition paused.', 'warn');
    return;
  }

  isRecognizing = true;
  recognizeBtn.textContent = 'Stop Recognition';
  updateStatus('Recognition running. Move faces into view.', 'good');
  recognitionInterval = setInterval(processVideoFrame, 1200);
}

async function processVideoFrame() {
  if (!video || video.paused || video.readyState !== 4) {
    return;
  }

  const detections = await faceapi.detectAllFaces(video).withFaceLandmarks().withFaceDescriptors();
  overlay.getContext('2d').clearRect(0, 0, overlay.width, overlay.height);
  faceapi.matchDimensions(overlay, video);
  const resized = faceapi.resizeResults(detections, { width: video.videoWidth, height: video.videoHeight });

  resized.forEach(detection => {
    const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
    const box = detection.detection.box;
    const drawBox = new faceapi.draw.DrawBox(box, { label: bestMatch.toString(), boxColor: '#72d0ff' });
    drawBox.draw(overlay);

    if (bestMatch.label !== 'unknown') {
      markAttendance(bestMatch.label);
    }
  });
}

async function handleEnrollment(event) {
  event.preventDefault();
  const nameInput = document.getElementById('personName');
  const imageInput = document.getElementById('faceImage');
  const label = nameInput.value.trim();
  const file = imageInput.files[0];

  if (!label || !file) {
    updateStatus('Please enter a valid name and choose a photo.', 'warn');
    return;
  }

  try {
    const image = await faceapi.bufferToImage(file);
    const detection = await faceapi.detectSingleFace(image).withFaceLandmarks().withFaceDescriptor();

    if (!detection) {
      updateStatus('No face found in the uploaded image. Try a clearer photo.', 'warn');
      return;
    }

    const descriptor = detection.descriptor;
    const existingIndex = labeledDescriptors.findIndex(item => item.label === label);

    if (existingIndex >= 0) {
      labeledDescriptors[existingIndex] = new faceapi.LabeledFaceDescriptors(label, [descriptor]);
    } else {
      labeledDescriptors.push(new faceapi.LabeledFaceDescriptors(label, [descriptor]));
    }

    faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.55);
    saveFaces();
    nameInput.value = '';
    imageInput.value = '';
    recognizeBtn.disabled = false;
    updateStatus(`Enrolled face for ${label}. You can now start recognition.`, 'good');
  } catch (error) {
    console.error(error);
    updateStatus('Enrollment failed. Make sure the image contains a single face.', 'error');
  }
}

function saveFaces() {
  const serialized = labeledDescriptors.map(item => ({
    label: item.label,
    descriptors: item.descriptors.map(desc => Array.from(desc)),
  }));
  localStorage.setItem(STORAGE_FACES, JSON.stringify(serialized));
}

function markAttendance(label) {
  const todayKey = new Date().toISOString().slice(0, 10);
  const existing = attendanceLog.find(entry => entry.label === label && entry.date === todayKey);

  if (!existing) {
    const record = {
      id: attendanceLog.length + 1,
      label,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: todayKey,
      status: 'Present',
    };
    attendanceLog.unshift(record);
    saveAttendanceLog();
    renderAttendanceLog();
    updateStatus(`Attendance recorded: ${label}`, 'good');
  }
}

function saveAttendanceLog() {
  localStorage.setItem(STORAGE_LOG, JSON.stringify(attendanceLog));
}

function renderAttendanceLog() {
  attendanceTableBody.innerHTML = '';
  attendanceLog.forEach((entry, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${entry.label}</td>
      <td>${entry.time}</td>
      <td>${entry.status}</td>
    `;
    attendanceTableBody.appendChild(row);
  });
}

function exportAttendanceCsv() {
  if (!attendanceLog.length) {
    updateStatus('No attendance records available to export.', 'warn');
    return;
  }

  const headers = ['Index', 'Name', 'Time', 'Status'];
  const rows = attendanceLog.map((entry, index) => [index + 1, entry.label, entry.time, entry.status]);
  const csvContent = [headers, ...rows].map(r => r.map(cell => `"${cell}"`).join(',')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'attendance.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  updateStatus('Attendance exported as CSV file.', 'good');
}

function clearAttendanceLog() {
  if (!confirm('Clear all attendance records?')) {
    return;
  }
  attendanceLog = [];
  saveAttendanceLog();
  renderAttendanceLog();
  updateStatus('Attendance log cleared.', 'warn');
}
