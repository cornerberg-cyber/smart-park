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

// Navigation Elements
const navHome = document.getElementById('nav-home');
const navMap = document.getElementById('nav-map');
const navHistory = document.getElementById('nav-history');
const viewMap = document.getElementById('view-map');
const allViews = [viewDashboard, viewScanning, viewResult, viewMap];
const navBtns = [navHome, navMap, navHistory];

// Map State
let map = null;
let userMarker = null;

// State
let currentPosition = null;
let currentImageDataUrl = null;

// API Key (Hardcoded as requested)
const apiKey = 'AIzaSyDFSWIiO2_gxz42TFXZIq8AiPxXPdDn40M';

// --- Initialization ---
function init() {
  requestGPS();
  setupNavigation();
}

function setupNavigation() {
  navHome.addEventListener('click', () => showView('view-dashboard'));
  navMap.addEventListener('click', () => {
    showView('view-map');
    initMap();
  });
  navHistory.addEventListener('click', () => {
    // History not implemented yet, just show placeholder or stay on current
    alert("Historik kommer snart!");
  });
}

function showView(viewId) {
  allViews.forEach(view => {
    if (view) view.classList.add('hidden');
  });
  const activeView = document.getElementById(viewId);
  if (activeView) {
    activeView.classList.remove('hidden');
    activeView.classList.add('view-enter');
  }
  
  // Update nav button colors
  navBtns.forEach(btn => {
    if (btn.id === `nav-${viewId.replace('view-', '')}`) {
      btn.classList.add('text-primary');
      btn.classList.remove('text-textMuted');
    } else {
      btn.classList.remove('text-primary');
      btn.classList.add('text-textMuted');
    }
  });
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
  showView('view-dashboard');
  
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

// --- Map Logic ---
function initMap() {
  if (map) {
    // Map already initialized, just refresh layout
    setTimeout(() => map.invalidateSize(), 100);
    return;
  }

  // Default to Stockholm if no GPS
  const lat = currentPosition ? currentPosition.coords.latitude : 59.3293;
  const lng = currentPosition ? currentPosition.coords.longitude : 18.0686;

  map = L.map('map', {
    zoomControl: false,
    attributionControl: false
  }).setView([lat, lng], 15);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19
  }).addTo(map);

  // Add User Marker
  userMarker = L.circleMarker([lat, lng], {
    radius: 8,
    fillColor: "#3b82f6",
    color: "#fff",
    weight: 2,
    opacity: 1,
    fillOpacity: 1
  }).addTo(map);

  // Fetch real parking data
  fetchParkingData(lat, lng);
}

async function fetchParkingData(lat, lng) {
  // Overpass API Query: Get all parking within 500m
  const query = `[out:json];(node["amenity"="parking"](around:500,${lat},${lng});way["amenity"="parking"](around:500,${lat},${lng}););out center;`;
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    
    data.elements.forEach(el => {
      const pLat = el.lat || el.center.lat;
      const pLng = el.lon || el.center.lon;
      const name = el.tags.name || "Parkering";
      const parkingType = el.tags.parking || "Okänd typ";
      const fee = el.tags.fee === "yes" ? "Avgift" : el.tags.fee === "no" ? "Gratis" : "Info saknas";

      L.circle([pLat, pLng], {
        color: el.tags.fee === "yes" ? '#ef4444' : '#22c55e',
        fillColor: el.tags.fee === "yes" ? '#ef4444' : '#22c55e',
        fillOpacity: 0.3,
        radius: 30
      }).addTo(map).bindPopup(`
        <div class="p-1">
          <b class="text-sm">${name}</b><br>
          <span class="text-xs">Typ: ${parkingType}</span><br>
          <span class="text-xs font-bold">${fee}</span>
        </div>
      `);
    });
  } catch (error) {
    console.error("Kunde inte hämta parkeringsdata", error);
  }
}

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

// Smart App Launcher
window.openApp = function(scheme, fallbackUrl) {
  const start = Date.now();
  
  // Försök öppna app-schemat
  window.location.href = scheme;
  
  // Om vi fortfarande är kvar i webbläsaren efter 1.5 sekunder, öppna fallback
  setTimeout(() => {
    if (Date.now() - start < 2000) {
      window.open(fallbackUrl, '_blank');
    }
  }, 1500);
};

// Start
init();

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('SW registered: ', registration);
    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}
