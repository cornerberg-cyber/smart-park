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

// Search Element
const mapSearchInput = document.getElementById('map-search-input');
const mapSearchBtn = document.getElementById('map-search-btn');

// Map State
let map = null;
let userMarker = null;
let parkingLayer = null;

// State
let currentPosition = null;
let currentImageDataUrl = null;

// API Key (Hardcoded as requested)
const apiKey = 'AIzaSyDFSWIiO2_gxz42TFXZIq8AiPxXPdDn40M';

// --- Initialization ---
function init() {
  preloadParkingData();
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
    alert("Historik kommer snart!");
  });

  // Setup Search
  if (mapSearchInput) {
    mapSearchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        searchAddress(e.target.value);
      }
    });
  }
  if (mapSearchBtn) {
    mapSearchBtn.addEventListener('click', () => {
      searchAddress(mapSearchInput.value);
    });
  }
}

async function searchAddress(query) {
  if (!query) return;
  console.log("Söker efter:", query);
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'SmartParkApp/1.0'
      }
    });
    const data = await response.json();
    if (data && data.length > 0) {
      const { lat, lon } = data[0];
      const newLat = parseFloat(lat);
      const newLng = parseFloat(lon);
      console.log("Adress hittad:", newLat, newLng);
      map.setView([newLat, newLng], 16);
      fetchParkingData(newLat, newLng);
      fetchStreetParking(newLat, newLng);
    } else {
      alert("Hittade inte adressen. Prova att lägga till stad, t.ex. 'Gatan 1, Stockholm'.");
    }
  } catch (error) {
    console.error("Sökfel:", error);
    alert("Kunde inte söka just nu. Kontrollera din internetuppkoppling.");
  }
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

  parkingLayer = L.layerGroup().addTo(map);

  // Add User Marker
  userMarker = L.circleMarker([lat, lng], {
    radius: 8,
    fillColor: "#3b82f6",
    color: "#fff",
    weight: 2,
    opacity: 1,
    fillOpacity: 1
  }).addTo(map);

  // Fetch all types of parking data
  fetchParkingData(lat, lng);
  fetchStreetParking(lat, lng);

  // Re-fetch data when map is moved manually
  map.on('moveend', () => {
    const center = map.getCenter();
    fetchParkingData(center.lat, center.lng);
    fetchStreetParking(center.lat, center.lng);
  });
}
// Global data cache
let cachedParkingData = null;
let parkingMarkers = [];

// Load data once at startup
async function preloadParkingData() {
  try {
    const response = await fetch('/api_response.json');
    cachedParkingData = await response.json();
    console.log(`Laddat in ${cachedParkingData.length} parkeringar i minnet.`);
    
    // Trigger initial fetch if map is ready
    if (map) {
      const center = map.getCenter();
      fetchParkingData(center.lat, center.lng);
    }
  } catch (err) {
    console.error("Kunde inte ladda in p-data i minnet:", err);
  }
}

// Fetch parking data from cache
function fetchParkingData(lat, lng) {
  if (!map || !cachedParkingData) return;

  // Clear existing markers
  parkingMarkers.forEach(marker => map.removeLayer(marker));
  parkingMarkers = [];

  // Filter markers in memory (fast!)
  const radiusKm = 1.0;
  const nearParking = cachedParkingData.filter(p => {
    if (!p.AdressLatitud || !p.AdressLongitud) return false;
    const dist = getDistance(lat, lng, p.AdressLatitud, p.AdressLongitud);
    return dist <= radiusKm;
  });

  nearParking.forEach(p => {
    const isGarage = p.Anlaggningstyp === "Garage";
    const color = isGarage ? '#8B5CF6' : '#10B981'; 
    
    // Clean up prices - avoid duplicates and messy overlap
    let uniquePrices = [];
    if (p.BesokstaxaCollection) {
        // Group by price to show "Standard: X kr"
        const seen = new Set();
        p.BesokstaxaCollection.forEach(t => {
            const key = `${t.Taxa}-${t.Galler}`;
            if (!seen.has(key) && uniquePrices.length < 3) {
                uniquePrices.push(t);
                seen.add(key);
            }
        });
    }

    let priceHtml = uniquePrices.map(t => 
      `<div class="flex justify-between items-center py-1 border-b border-white/5 last:border-0">
        <span class="text-[10px] text-slate-400 font-medium">${t.Galler}</span>
        <span class="text-sm font-bold text-white">${t.Taxa} ${p.Tidsenhet || 'kr/h'}</span>
      </div>`
    ).join('') || '<div class="text-xs italic text-slate-500 py-2">Prisinfo saknas</div>';

    const popupContent = `
      <div class="p-4 bg-slate-900 rounded-3xl" style="min-width: 220px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
        <div class="flex items-start justify-between mb-3">
          <div class="flex-1">
            <h3 class="text-white font-bold text-base leading-tight mb-1">${p.Name}</h3>
            <p class="text-slate-400 text-[11px]">${p.Adress || 'Stockholm'}</p>
          </div>
          <div class="px-2 py-1 rounded-lg bg-white/10 text-[10px] font-bold text-white uppercase tracking-wider">
            ${isGarage ? 'Garage' : 'Yta'}
          </div>
        </div>
        
        <div class="bg-white/5 rounded-2xl p-3 mb-4">
          <div class="text-[9px] uppercase tracking-widest text-primary font-bold mb-2">Taxa & Öppettider</div>
          ${priceHtml}
        </div>

        ${p.AntalLaddplatserBesokBil > 0 ? `
          <div class="flex items-center gap-2 mb-4 p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <span class="text-sm">⚡</span>
            <span class="text-[11px] font-bold text-blue-400">${p.AntalLaddplatserBesokBil} laddplatser tillgängliga</span>
          </div>
        ` : ''}

        <button onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${p.AdressLatitud},${p.AdressLongitud}')" 
                class="w-full py-3 bg-primary text-white text-xs font-bold rounded-2xl active:scale-[0.97] transition-all shadow-lg shadow-primary/30">
          STARTA NAVIGERING
        </button>
      </div>
    `;

    const marker = L.circleMarker([p.AdressLatitud, p.AdressLongitud], {
      radius: 12,
      fillColor: color,
      color: "#fff",
      weight: 3,
      opacity: 0.6,
      fillOpacity: 0.9
    }).addTo(map);

    marker.bindPopup(popupContent, {
      className: 'custom-popup',
      maxWidth: 280,
      closeButton: false
    });
    
    parkingMarkers.push(marker);
  });
}

// Helper: Calculate distance in km (Haversine formula)
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Fetch street parking (cleaning days / zones) from Stockholm City (Trafikkontoret)
async function fetchStreetParking(lat, lng) {
    if (!map) return;
    
    // We use a bbox (bounding box) around the user to limit data
    const offset = 0.005; // ~500m
    const bbox = `${lng-offset},${lat-offset},${lng+offset},${lat+offset}`;
    
    // URL to Stockholm City Open Data WFS (GeoJSON format)
    // We try 'tk:Parkeringsplatser_Servicetider' which is a more stable layer for this info
    const url = `https://openstreetgs.stockholm.se/geoservice/wfs?service=wfs&version=1.1.0&request=GetFeature&typeName=tk:Parkeringsplatser_Servicetider&maxFeatures=50&outputFormat=json&srsName=EPSG:4326&bbox=${bbox},EPSG:4326`;

    try {
        console.log("Hämtar gatuparkering (städdagar)...");
        const response = await fetch(url);
        const data = await response.json();

        // Display street segments as lines
        if (data.features) {
            data.features.forEach(feature => {
                const coords = feature.geometry.coordinates.map(c => [c[1], c[0]]);
                const props = feature.properties;
                
                // Show blue lines for street parking
                const polyline = L.polyline(coords, {
                    color: '#3B82F6',
                    weight: 5,
                    opacity: 0.6
                }).addTo(map);

                polyline.bindPopup(`
                    <div class="p-2 text-slate-900">
                        <div class="font-bold mb-1 border-b pb-1">Gatuparkering</div>
                        <div class="text-xs mb-1"><b>Städdag:</b> ${props.STÄDDAG || 'Okänd'}</div>
                        <div class="text-xs mb-1"><b>Tid:</b> ${props.TID || 'Hela dygnet'}</div>
                        <div class="text-xs opacity-70">Zon: ${props.TAXEOMRÅDE || 'Okänd'}</div>
                    </div>
                `);
                
                parkingMarkers.push(polyline);
            });
        }
    } catch (error) {
        console.error("Kunde inte hämta gatuparkering:", error);
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
