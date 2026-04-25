import './style.css';

// DOM Elements
const btnDashboardScan = document.getElementById('btn-dashboard-scan');
const cameraInput = document.getElementById('camera-input');
const viewDashboard = document.getElementById('view-dashboard');
const viewScanning = document.getElementById('view-scanning');
const viewResult = document.getElementById('view-result');
const imagePreview = document.getElementById('image-preview');
const btnBack = document.getElementById('btn-back');

// GPS Elements
const gpsStatusDot = document.getElementById('gps-status-dot');
const gpsLocationText = document.getElementById('gps-location-text');

// State
let currentPosition = null;
let currentImageDataUrl = null;

// API Key (Hardcoded as requested)
const apiKey = 'AIzaSyDFSWIiO2_gxz42TFXZIq8AiPxXPdDn40M';

// --- Initialization ---
function init() {
  requestGPS();
}

// --- GPS Geolocation ---
function requestGPS() {
  if (!navigator.geolocation) {
    gpsLocationText.textContent = "GPS ej tillgängligt";
    gpsStatusDot.classList.replace('bg-yellow-500', 'bg-red-500');
    gpsStatusDot.classList.remove('animate-pulse');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      currentPosition = position;
      gpsLocationText.textContent = `Pos: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
      gpsStatusDot.classList.replace('bg-yellow-500', 'bg-green-500');
      gpsStatusDot.classList.remove('animate-pulse');
    },
    (error) => {
      gpsLocationText.textContent = "GPS nekad";
      gpsStatusDot.classList.replace('bg-yellow-500', 'bg-red-500');
      gpsStatusDot.classList.remove('animate-pulse');
      console.error("GPS Error", error);
    },
    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
  );
}

// --- UI Transitions ---
// --- UI Transitions ---
function showResultView() {
  viewScanning.classList.add('hidden');
  viewResult.classList.remove('hidden');
  viewResult.classList.add('view-enter');
}

function showDashboardView() {
  viewResult.classList.add('hidden');
  viewScanning.classList.add('hidden');
  viewDashboard.classList.remove('hidden');
  viewDashboard.classList.add('view-enter');
  
  // Reset
  imagePreview.src = '';
  currentImageDataUrl = null;
}

// --- Camera Handling ---
btnDashboardScan.addEventListener('click', () => {
  cameraInput.click();
});

cameraInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    currentImageDataUrl = event.target.result;
    
    // Switch to scanning view
    viewDashboard.classList.add('hidden');
    viewScanning.classList.remove('hidden');
    
    // Show image preview
    imagePreview.src = currentImageDataUrl;

    // Simulate network/AI delay or call actual AI
    analyzeImage(currentImageDataUrl);
  };
  reader.readAsDataURL(file);
});

btnBack.addEventListener('click', showDashboardView);

// --- AI Analysis ---
async function analyzeImage(base64Image) {
  if (!apiKey) {
    // MOCK RESPONSE
    setTimeout(() => {
      populateResult({
        title: "Tillåtet",
        subtitle: "Mock-data (Ingen API-nyckel)",
        zone: "1122",
        fee: "15kr",
        maxTime: "4h",
        special: "P-skiva",
        isWarning: false
      });
      finishAnalysis();
    }, 2500);
    return;
  }

  // REAL GEMINI API CALL
  try {
    const mimeTypeMatch = base64Image.match(/data:(.*?);/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
    const base64Data = base64Image.split(',')[1];
    
    const now = new Date();
    const days = ['söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag'];
    const currentDay = days[now.getDay()];
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const requestBody = {
      contents: [{
        parts: [
          {
            text: `Du är en svensk parkeringsassistent. Titta på denna parkeringsskylt. 
            Det är idag ${currentDay} klockan ${currentTime}.
            Besvara EXAKT följande struktur i ren JSON-format utan kodblock eller markdown:
            {
              "title": "Kort! T.ex. 'Tillåtet' eller 'P-Förbud'",
              "subtitle": "Kort! T.ex. 'Fram till kl 18:00'",
              "zone": "1234 eller '-'",
              "fee": "Ja, Nej eller pris",
              "maxTime": "1h, 2h, 24h etc.",
              "special": "P-skiva, Boende etc.",
              "isWarning": true eller false
            }`
          },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.2,
      }
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini Error Response:", errorText);
      throw new Error(`API Request failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    let textResponse = data.candidates[0].content.parts[0].text;
    
    // Clean up markdown json block if Gemini returns it despite instructions
    textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const parsed = JSON.parse(textResponse);
    populateResult(parsed);

  } catch (error) {
    console.error("Gemini Error:", error);
    populateResult({
      title: "Något gick fel",
      subtitle: "Kunde inte tolka bilden",
      zone: "-",
      fee: "-",
      maxTime: "-",
      special: "-",
      isWarning: true
    });
  }

  finishAnalysis();
}

function finishAnalysis() {
  showResultView();
}

function populateResult(res) {
  document.getElementById('result-title').textContent = res.title;
  document.getElementById('result-subtitle').textContent = res.subtitle;
  
  const iconWrap = document.getElementById('status-icon-large');
  if (res.isWarning) {
    iconWrap.className = 'w-32 h-32 rounded-full bg-danger/20 text-danger flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(239,68,68,0.3)] transition-all duration-500 transform scale-0';
    iconWrap.innerHTML = `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
  } else {
    iconWrap.className = 'w-32 h-32 rounded-full bg-success/20 text-success flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(34,197,94,0.3)] transition-all duration-500 transform scale-0';
    iconWrap.innerHTML = `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  }
  
  // Re-trigger animation
  iconWrap.style.animation = 'none';
  iconWrap.offsetHeight; /* trigger reflow */
  iconWrap.style.animation = 'scaleIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards 0.2s';

  document.getElementById('res-zone').textContent = res.zone;
  document.getElementById('res-fee').textContent = res.fee;
  document.getElementById('res-maxtime').textContent = res.maxTime;
  document.getElementById('res-special').textContent = res.special;
}

// Start
init();
