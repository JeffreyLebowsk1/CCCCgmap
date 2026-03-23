/**
 * CCCC Campus Map – Google Maps JavaScript API v3
 * Central Carolina Community College
 *
 * Protocol compliance notes:
 *  - Uses the official inline bootstrap loader (per Maps JS API docs, 2024).
 *  - Uses AdvancedMarkerElement + PinElement (google.maps.Marker is deprecated
 *    as of February 2024; see https://developers.google.com/maps/deprecations).
 *  - mapId is required for AdvancedMarkerElement (register in Cloud Console).
 *  - DirectionsService + DirectionsRenderer for in-map turn-by-turn navigation.
 *  - google.maps.places.Autocomplete for address search.
 *  - All async libraries loaded via google.maps.importLibrary() (v=beta/weekly).
 *  - No inline event handlers; CSP-safe.
 */

'use strict';

/* ============================================================
   CONFIGURATION  –  Replace with your Cloud Console values
   ============================================================
   1. Create a project at https://console.cloud.google.com/
   2. Enable "Maps JavaScript API", "Places API", "Directions API".
   3. Create an API key and restrict it to those three APIs + your domain.
   4. Create a Map ID at:
        Cloud Console > Google Maps Platform > Map Management > Create Map ID
      Select Map type: JavaScript, choose a colour scheme, then copy the ID.
   5. Paste both values below.

   AI VISION (optional):
   6. Visit https://aistudio.google.com/app/apikey and create a free Gemini API key.
   7. Paste it as geminiApiKey below to enable the "🔍 Identify Buildings with AI" button.
      Restrict the key to the Gemini API and your domain via Google Cloud Console.
   ============================================================ */
const CONFIG = {
  apiKey: 'YOUR_GOOGLE_MAPS_API_KEY',
  mapId:  'YOUR_MAP_ID',          // Required for AdvancedMarkerElement
  version: 'weekly',              // Tracks the current stable release
  region:  'US',
  language: 'en',
  geminiApiKey: 'YOUR_GEMINI_API_KEY', // Optional – enables AI building identification
};

/* ============================================================
   BUILDING-TYPE METADATA
   ============================================================ */
const BUILDING_TYPES = {
  academic:   { label: 'Academic',    emoji: '🎓', color: '#003087' },
  services:   { label: 'Services',    emoji: '🏢', color: '#0077CC' },
  library:    { label: 'Library',     emoji: '📚', color: '#5B2D8E' },
  trades:     { label: 'Trades',      emoji: '🔧', color: '#7C4010' },
  recreation: { label: 'Recreation',  emoji: '⚽', color: '#007A33' },
  event:      { label: 'Events',      emoji: '🎭', color: '#C8102E' },
  parking:    { label: 'Parking',     emoji: '🅿',  color: '#555555' },
};

/* ============================================================
   MODULE STATE
   ============================================================ */
let map              = null;   // google.maps.Map instance
let infoWindow       = null;   // shared google.maps.InfoWindow
let directionsRenderer = null; // google.maps.DirectionsRenderer
let directionsService  = null; // google.maps.DirectionsService
let autocomplete       = null; // google.maps.places.Autocomplete

let campusData       = [];     // loaded from data/campuses.json
let allMarkers       = [];     // { marker, building, campus } objects
let activeFilter     = 'all';
let activeCampusId   = null;

/* ============================================================
   STEP 1 – LOAD CAMPUS DATA
   ============================================================ */
async function loadCampusData() {
  const response = await fetch('data/campuses.json');
  if (!response.ok) throw new Error(`Failed to load campus data: ${response.status}`);
  const json = await response.json();
  return json.campuses;
}

/* ============================================================
   STEP 2 – BOOTSTRAP THE MAPS API
   Implements the official inline bootstrap loader pattern from
   https://developers.google.com/maps/documentation/javascript/load-maps-js-api
   ============================================================ */
function bootstrapMapsApi() {
  return new Promise((resolve, reject) => {
    /* Inject the official Google Maps bootstrap snippet.
       The snippet creates google.maps.importLibrary() which lazy-loads
       each library only when first requested (bandwidth-efficient). */
    (g => {
      let h, a, k;
      const p  = 'The Google Maps JavaScript API';
      const c  = 'google';
      const l  = 'importLibrary';
      const q  = '__ib__';
      const m  = document;
      let b    = window;
      b        = b[c] || (b[c] = {});
      const d  = b.maps || (b.maps = {});
      const r  = new Set();
      const e  = new URLSearchParams();
      const u  = () =>
        h || (h = new Promise(async (f, n) => {
          a = m.createElement('script');
          e.set('libraries', [...r] + '');
          for (k in g) {
            e.set(k.replace(/[A-Z]/g, t => '_' + t[0].toLowerCase()), g[k]);
          }
          e.set('callback', c + '.maps.' + q);
          a.src = `https://maps.${c}apis.com/maps/api/js?` + e;
          // Forward any CSP nonce present on existing scripts
          a.nonce = m.querySelector('script[nonce]')?.nonce || '';
          d[q] = f;
          a.onerror = () => (h = n(new Error(p + ' could not load.')));
          m.head.append(a);
        }));
      d[l]
        ? console.warn(p + ' only loads once. Ignoring:', g)
        : (d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n)));
    })({
      key:      CONFIG.apiKey,
      v:        CONFIG.version,
      region:   CONFIG.region,
      language: CONFIG.language,
    });

    /* Wait for the core Maps library to confirm successful load */
    google.maps.importLibrary('maps').then(resolve).catch(reject);
  });
}

/* ============================================================
   STEP 3 – INITIALISE MAP
   ============================================================ */
async function initMap() {
  try {
    /* Load campus data and Maps API in parallel */
    [campusData] = await Promise.all([
      loadCampusData(),
      bootstrapMapsApi(),
    ]);

    /* Import all required libraries */
    const { Map: GMap, InfoWindow } = await google.maps.importLibrary('maps');
    const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary('marker');
    const { DirectionsService, DirectionsRenderer, TravelMode } =
      await google.maps.importLibrary('routes');
    const { Autocomplete } = await google.maps.importLibrary('places');

    /* ----------------------------------------------------------
       Create the Map
       mapId is REQUIRED for AdvancedMarkerElement.
       Register your Map ID in Cloud Console → Map Management.
    ---------------------------------------------------------- */
    map = new GMap(document.getElementById('map-container'), {
      center:           { lat: 35.56, lng: -79.13 },  // centred on CCCC region
      zoom:             9,
      mapId:            CONFIG.mapId,
      // Disable the default UI POI click behaviour so our custom
      // InfoWindows remain the primary interaction surface.
      clickableIcons:   false,
      // Google Maps Platform recommends these for campus/institution maps:
      mapTypeControl:     true,
      mapTypeControlOptions: {
        style:    google.maps.MapTypeControlStyle.DROPDOWN_MENU,
        position: google.maps.ControlPosition.TOP_LEFT,
      },
      fullscreenControl:     true,
      streetViewControl:     true,
      zoomControl:           true,
      zoomControlOptions: {
        position: google.maps.ControlPosition.RIGHT_CENTER,
      },
    });

    /* ----------------------------------------------------------
       Shared InfoWindow (one instance reused across markers –
       the recommended pattern to avoid z-index/stacking issues)
    ---------------------------------------------------------- */
    infoWindow = new InfoWindow({
      maxWidth: 320,
      // ariaLabel required for accessibility per Maps JS API a11y guide
      ariaLabel: 'Building information',
    });

    /* ----------------------------------------------------------
       Directions
    ---------------------------------------------------------- */
    directionsService  = new DirectionsService();
    directionsRenderer = new DirectionsRenderer({
      map,
      suppressMarkers:    false,
      preserveViewport:   false,
      panel:              document.getElementById('directions-steps'),
    });

    /* ----------------------------------------------------------
       Places Autocomplete on the header search box
    ---------------------------------------------------------- */
    autocomplete = new Autocomplete(document.getElementById('search-input'), {
      types:  ['establishment', 'geocode'],
      fields: ['name', 'geometry', 'formatted_address'],
      componentRestrictions: { country: 'us' },
    });

    autocomplete.addListener('place_changed', onAutocompleteSelected);

    /* ----------------------------------------------------------
       Build sidebar UI and place markers
    ---------------------------------------------------------- */
    buildSidebar(AdvancedMarkerElement, PinElement);
    buildLegend();
    wireToolbarButtons();
    wireAiVisionModal();
    hideSplashScreen();
    showApiKeyBannerIfNeeded();

  } catch (err) {
    console.error('CCCC Map init error:', err);
    showMapError(err);
  }
}

/* ============================================================
   BUILD SIDEBAR + MARKERS
   ============================================================ */
function buildSidebar(AdvancedMarkerElement, PinElement) {
  const tabContainer  = document.getElementById('campus-tabs');
  const campusInfo    = document.getElementById('campus-info');

  campusData.forEach((campus, idx) => {
    /* --- Campus tab button --- */
    const tab = document.createElement('button');
    tab.className    = 'campus-tab' + (idx === 0 ? ' active' : '');
    tab.textContent  = campus.name;
    tab.role         = 'tab';
    tab.id           = `tab-${campus.id}`;
    tab.setAttribute('aria-selected', idx === 0 ? 'true' : 'false');
    tab.setAttribute('aria-controls', `panel-${campus.id}`);
    tab.style.borderColor = campus.color;
    if (idx === 0) {
      tab.style.background = campus.color;
      tab.style.color      = '#fff';
    } else {
      tab.style.color = campus.color;
    }
    tab.addEventListener('click', () => selectCampus(campus.id));
    tabContainer.appendChild(tab);

    /* --- Place AdvancedMarkerElement markers for each building --- */
    campus.buildings.forEach(building => {
      /* Multi-building campuses use a labeled badge marker so buildings can
         be identified on the map and matched to the campus PDF map.
         Single-building campuses use the standard emoji pin. */
      let markerContent;
      if (campus.buildings.length > 1) {
        const labelEl = document.createElement('div');
        labelEl.className = 'building-marker-label';
        labelEl.style.setProperty('--campus-color', campus.color);
        labelEl.style.setProperty('--campus-border', shadeColor(campus.color, -30));
        labelEl.textContent = building.shortName;
        markerContent = labelEl;
      } else {
        const pin = new PinElement({
          background:  campus.color,
          borderColor: shadeColor(campus.color, -30),
          glyphColor:  '#ffffff',
          glyph:       (BUILDING_TYPES[building.type]?.emoji) ?? '📍',
          scale:       1.1,
        });
        markerContent = pin.element;
      }

      const marker = new AdvancedMarkerElement({
        map,
        position:  { lat: building.lat, lng: building.lng },
        title:     `${building.name} – ${campus.name}`,
        content:   markerContent,
        // gmpClickable is required for AdvancedMarkerElement click events
        gmpClickable: true,
      });

      /* InfoWindow on marker click */
      marker.addEventListener('gmp-click', () => {
        openBuildingInfoWindow(building, campus, marker);
        highlightSidebarItem(building.id);
      });

      allMarkers.push({ marker, building, campus });
    });

    /* --- Parking markers (subtle, no InfoWindow) --- */
    campus.parkingLots?.forEach(lot => {
      const parkPin = new PinElement({
        background:  '#555555',
        borderColor: '#333333',
        glyphColor:  '#ffffff',
        glyph:       '🅿',
        scale:       0.85,
      });
      new AdvancedMarkerElement({
        map,
        position:  { lat: lot.lat, lng: lot.lng },
        title:     lot.name,
        content:   parkPin.element,
        gmpClickable: false,
      });
    });
  });

  /* Select the first campus by default */
  activeCampusId = campusData[0].id;
  renderBuildingList(campusData[0]);
  renderCampusInfo(campusData[0], campusInfo);
}

/* ============================================================
   SELECT CAMPUS (tab click)
   ============================================================ */
function selectCampus(campusId) {
  activeCampusId = campusId;
  const campus   = campusData.find(c => c.id === campusId);
  if (!campus) return;

  /* Update tab styles */
  document.querySelectorAll('.campus-tab').forEach(tab => {
    const isActive = tab.id === `tab-${campusId}`;
    const c = campusData.find(c => `tab-${c.id}` === tab.id);
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
    if (c) {
      tab.style.background = isActive ? c.color : 'transparent';
      tab.style.color      = isActive ? '#fff'  : c.color;
    }
  });

  /* Fly map to campus */
  map.panTo({ lat: campus.lat, lng: campus.lng });
  map.setZoom(campus.zoom ?? 17);

  /* Update sidebar */
  activeFilter = 'all';
  renderBuildingList(campus);
  renderCampusInfo(campus, document.getElementById('campus-info'));

  /* Close any open InfoWindow */
  infoWindow.close();
}

/* ============================================================
   BUILDING LIST IN SIDEBAR
   ============================================================ */
function renderBuildingList(campus) {
  const list = document.getElementById('building-list');
  list.innerHTML = '';

  /* Filter bar */
  const types = [...new Set(campus.buildings.map(b => b.type))];
  renderFilterBar(types);

  const filtered = activeFilter === 'all'
    ? campus.buildings
    : campus.buildings.filter(b => b.type === activeFilter);

  if (filtered.length === 0) {
    const empty = document.createElement('li');
    empty.className   = 'search-no-results';
    empty.textContent = 'No buildings match this filter.';
    list.appendChild(empty);
    return;
  }

  filtered.forEach(building => {
    const item = document.createElement('li');
    item.className = 'building-item';
    item.id        = `list-item-${building.id}`;
    item.setAttribute('role', 'option');
    item.setAttribute('tabindex', '0');
    item.setAttribute('aria-label',
      `${building.name}, ${BUILDING_TYPES[building.type]?.label ?? building.type}`);

    const typeInfo = BUILDING_TYPES[building.type] ?? { emoji: '📍', color: '#555' };

    item.innerHTML = `
      <div class="bi-badge" style="background:${campus.color}" aria-hidden="true">
        ${building.shortName}
      </div>
      <div class="bi-text">
        <div class="bi-name">${escapeHtml(building.name)}</div>
        <div class="bi-type">${typeInfo.emoji} ${typeInfo.label ?? building.type}</div>
      </div>
      <span class="bi-arrow" aria-hidden="true">›</span>
    `;

    item.addEventListener('click',  () => focusBuilding(building, campus));
    item.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        focusBuilding(building, campus);
      }
    });

    list.appendChild(item);
  });
}

function renderFilterBar(types) {
  const bar = document.getElementById('filter-bar');
  bar.innerHTML = '';

  const allBtn = makeFilterBtn('all', 'All');
  bar.appendChild(allBtn);

  types.forEach(type => {
    const info = BUILDING_TYPES[type] ?? { label: type, emoji: '📍' };
    bar.appendChild(makeFilterBtn(type, `${info.emoji} ${info.label}`));
  });
}

function makeFilterBtn(type, label) {
  const btn = document.createElement('button');
  btn.className   = 'filter-btn' + (activeFilter === type ? ' active' : '');
  btn.textContent = label;
  btn.setAttribute('aria-pressed', String(activeFilter === type));
  btn.addEventListener('click', () => {
    activeFilter = type;
    const campus = campusData.find(c => c.id === activeCampusId);
    if (campus) renderBuildingList(campus);
    /* Update pressed state on all filter buttons */
    document.querySelectorAll('.filter-btn').forEach(b => {
      const isActive = b.textContent === label && type === activeFilter;
      b.classList.toggle('active', b === btn);
      b.setAttribute('aria-pressed', String(b === btn));
    });
  });
  return btn;
}

/* ============================================================
   CAMPUS INFO FOOTER
   ============================================================ */
function renderCampusInfo(campus, container) {
  const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${
    encodeURIComponent(campus.address)}&travelmode=driving`;

  const pdfLink = campus.campusPdf
    ? `<a class="ci-pdf-btn"
         href="${escapeHtml(campus.campusPdf)}"
         target="_blank"
         rel="noopener noreferrer"
         aria-label="Open campus map PDF for ${escapeHtml(campus.name)}">
        📄 Campus Map (PDF)
       </a>`
    : '';

  const aiBtn = campus.campusPdf
    ? `<button class="ci-ai-btn"
               data-campus-id="${escapeHtml(campus.id)}"
               aria-label="Identify buildings in the campus map PDF using AI vision for ${escapeHtml(campus.name)}">
        🔍 Identify Buildings with AI
       </button>`
    : '';

  container.innerHTML = `
    <div class="ci-name">${escapeHtml(campus.name)}</div>
    <div class="ci-address">${escapeHtml(campus.address)}</div>
    <div class="ci-phone">
      📞 <a href="tel:${campus.phone.replace(/\D/g, '')}"
            aria-label="Call ${campus.name}">
        ${escapeHtml(campus.phone)}
      </a>
    </div>
    <a class="ci-nav-btn"
       href="${navUrl}"
       target="_blank"
       rel="noopener noreferrer"
       aria-label="Get Google Maps directions to ${campus.name}">
      🧭 Get Directions
    </a>
    ${pdfLink}
    ${aiBtn}
  `;

  /* Wire AI button after innerHTML is set */
  const btn = container.querySelector('.ci-ai-btn');
  if (btn) {
    btn.addEventListener('click', () => showAiVisionModal(campus));
  }
}

/* ============================================================
   FOCUS A BUILDING (from sidebar click or search)
   ============================================================ */
function focusBuilding(building, campus) {
  /* Switch campus tab if needed */
  if (activeCampusId !== campus.id) selectCampus(campus.id);

  /* Pan / zoom */
  map.panTo({ lat: building.lat, lng: building.lng });
  map.setZoom(19);

  /* Find the marker and open its InfoWindow */
  const entry = allMarkers.find(
    m => m.building.id === building.id && m.campus.id === campus.id
  );
  if (entry) openBuildingInfoWindow(building, campus, entry.marker);

  highlightSidebarItem(building.id);
}

function highlightSidebarItem(buildingId) {
  document.querySelectorAll('.building-item').forEach(el => {
    el.classList.toggle('selected', el.id === `list-item-${buildingId}`);
  });
}

/* ============================================================
   INFO WINDOW CONTENT
   Google Maps Platform InfoWindow – populated with sanitised HTML.
   Navigation uses the Maps URLs API (directions intent):
     https://developers.google.com/maps/documentation/urls/get-started
   Street View uses the Street View Static / Embed API URL pattern.
   ============================================================ */
function openBuildingInfoWindow(building, campus, marker) {
  const typeInfo = BUILDING_TYPES[building.type] ?? { label: building.type, color: '#555' };

  /* Directions URL using the Maps URLs API (universal, no key needed).
     Coords are used directly; destination_place_id is omitted to avoid
     empty-parameter confusion per Maps URLs API spec. */
  const directionsUrl =
    `https://www.google.com/maps/dir/?api=1` +
    `&destination=${building.lat},${building.lng}` +
    `&travelmode=driving`;

  /* Street View URL */
  const streetViewUrl =
    `https://www.google.com/maps/@?api=1&map_action=pano` +
    `&viewpoint=${building.lat},${building.lng}`;

  const deptTags = (building.departments ?? [])
    .map(d => `<span class="iw-tag">${escapeHtml(d)}</span>`)
    .join('');

  const accessIcon = building.accessibility
    ? '<span title="Wheelchair accessible" aria-label="Wheelchair accessible">♿</span>'
    : '';

  /* Build InfoWindow HTML */
  const content = `
    <div class="iw-container" role="region" aria-label="${escapeHtml(building.name)} information">
      <div class="iw-header">
        <div class="iw-badge" style="background:${campus.color}" aria-hidden="true">
          ${escapeHtml(building.shortName)}
        </div>
        <div>
          <div class="iw-title">${escapeHtml(building.name)} ${accessIcon}</div>
          <div class="iw-campus">${escapeHtml(campus.name)}</div>
        </div>
      </div>
      <p class="iw-desc">${escapeHtml(building.description)}</p>
      ${deptTags ? `
        <div class="iw-departments">
          <div class="iw-dept-label">Departments &amp; Services</div>
          <div class="iw-dept-tags">${deptTags}</div>
        </div>` : ''}
      <p class="iw-hours">
        <span class="iw-hours-label">Hours: </span>
        ${escapeHtml(building.hours ?? 'Contact campus for hours')}
      </p>
      <div class="iw-actions">
        <a class="iw-btn iw-btn-nav"
           href="${directionsUrl}"
           target="_blank"
           rel="noopener noreferrer"
           aria-label="Get driving directions to ${escapeHtml(building.name)}">
          🧭 Directions
        </a>
        <a class="iw-btn iw-btn-street"
           href="${streetViewUrl}"
           target="_blank"
           rel="noopener noreferrer"
           aria-label="View ${escapeHtml(building.name)} in Street View">
          📷 Street View
        </a>
        <button class="iw-btn iw-btn-street"
                id="route-btn-${building.id}"
                aria-label="Route from my location to ${escapeHtml(building.name)}">
          📍 Route Here
        </button>
      </div>
    </div>
  `;

  infoWindow.setContent(content);

  /* AdvancedMarkerElement requires passing the marker as `anchor` */
  infoWindow.open({ anchor: marker, map, shouldFocus: true });

  /*
   * CSP-safe event binding: attach the "Route Here" button listener after
   * the InfoWindow DOM is injected, using the Maps API domready event.
   * This avoids inline onclick handlers which violate Content Security Policy.
   */
  google.maps.event.addListenerOnce(infoWindow, 'domready', () => {
    const routeBtn = document.getElementById(`route-btn-${building.id}`);
    if (routeBtn) {
      routeBtn.addEventListener('click', () => {
        window.ccccMap.routeFromHere(building.lat, building.lng, building.name);
      });
    }
  });
}

/* ============================================================
   DIRECTIONS via DirectionsService
   Called from "Route Here" button in InfoWindow.
   ============================================================ */
window.ccccMap = {
  routeFromHere(destLat, destLng, destName) {
    if (!navigator.geolocation) {
      alert('Geolocation is not available in your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const request = {
          origin:      { lat: pos.coords.latitude, lng: pos.coords.longitude },
          destination: { lat: destLat, lng: destLng },
          travelMode:  google.maps.TravelMode.DRIVING,
          unitSystem:  google.maps.UnitSystem.IMPERIAL,
          provideRouteAlternatives: true,
        };
        directionsService.route(request, (result, status) => {
          if (status === google.maps.DirectionsStatus.OK) {
            directionsRenderer.setDirections(result);
            document.getElementById('directions-panel').hidden = false;
            document.getElementById('btn-clear-directions').hidden = false;
            infoWindow.close();
          } else {
            alert(`Could not get directions: ${status}`);
          }
        });
      },
      err => alert(`Could not get your location: ${err.message}`)
    );
  },
};

/* ============================================================
   PLACES AUTOCOMPLETE HANDLER
   ============================================================ */
function onAutocompleteSelected() {
  const place = autocomplete.getPlace();
  if (!place.geometry?.location) return;

  map.panTo(place.geometry.location);
  map.setZoom(17);

  /* Check if the selected place matches a known CCCC building */
  const query = (place.name ?? '').toLowerCase();
  const found = allMarkers.find(
    m => m.building.name.toLowerCase().includes(query)
  );

  if (found) {
    openBuildingInfoWindow(found.building, found.campus, found.marker);
  } else {
    /* Show a generic InfoWindow at the selected location */
    infoWindow.setContent(
      `<div class="iw-container">
         <div class="iw-title">${escapeHtml(place.name ?? 'Selected location')}</div>
         <p class="iw-desc">${escapeHtml(place.formatted_address ?? '')}</p>
       </div>`
    );
    infoWindow.setPosition(place.geometry.location);
    infoWindow.open({ map, shouldFocus: true });
  }
}

/* ============================================================
   CUSTOM SEARCH (building / department text search)
   Runs in addition to Places Autocomplete, searching our
   local campus data for building names and departments.
   ============================================================ */
(function wireCustomSearch() {
  const input    = document.getElementById('search-input');
  const results  = document.getElementById('search-results');
  const clearBtn = document.getElementById('search-clear');
  let debounceTimer;

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const q = input.value.trim();
    clearBtn.style.display = q ? 'block' : 'none';

    if (q.length < 2) {
      hideResults();
      return;
    }
    debounceTimer = setTimeout(() => showLocalResults(q), 150);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      clearSearch();
    }
  });

  clearBtn.addEventListener('click', clearSearch);

  document.addEventListener('click', e => {
    if (!e.target.closest('#search-wrap')) hideResults();
  });

  function showLocalResults(query) {
    const q = query.toLowerCase();
    const hits = [];

    campusData.forEach(campus => {
      campus.buildings.forEach(building => {
        const nameMatch = building.name.toLowerCase().includes(q);
        const deptMatch = (building.departments ?? []).some(
          d => d.toLowerCase().includes(q)
        );
        const descMatch = building.description.toLowerCase().includes(q);
        if (nameMatch || deptMatch || descMatch) {
          hits.push({ building, campus });
        }
      });
    });

    results.innerHTML = '';
    input.setAttribute('aria-expanded', 'true');

    if (hits.length === 0) {
      results.innerHTML =
        '<div class="search-no-results">No buildings found. Try a department name.</div>';
    } else {
      hits.slice(0, 10).forEach(({ building, campus }) => {
        const item = document.createElement('div');
        item.className  = 'search-result-item';
        item.setAttribute('role', 'option');
        item.setAttribute('tabindex', '0');
        item.setAttribute('aria-label',
          `${building.name}, ${campus.name}`);

        const typeInfo = BUILDING_TYPES[building.type] ?? { color: '#555' };
        item.innerHTML = `
          <div class="sri-icon" style="background:${campus.color}" aria-hidden="true">
            ${escapeHtml(building.shortName)}
          </div>
          <div class="sri-text">
            <div class="sri-name">${escapeHtml(building.name)}</div>
            <div class="sri-sub">${escapeHtml(campus.name)}</div>
          </div>
        `;

        const activate = () => {
          clearSearch();
          focusBuilding(building, campus);
        };
        item.addEventListener('click', activate);
        item.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
        });
        results.appendChild(item);
      });
    }

    results.classList.add('visible');
  }

  function hideResults() {
    results.classList.remove('visible');
    results.innerHTML = '';
    input.setAttribute('aria-expanded', 'false');
  }

  function clearSearch() {
    input.value = '';
    clearBtn.style.display = 'none';
    hideResults();
  }
})();

/* ============================================================
   MAP LEGEND
   ============================================================ */
function buildLegend() {
  const legend = document.getElementById('legend');
  Object.entries(BUILDING_TYPES).forEach(([, info]) => {
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `
      <span class="legend-dot" style="background:${info.color}" aria-hidden="true"></span>
      <span class="legend-label">${info.emoji} ${info.label}</span>
    `;
    legend.appendChild(item);
  });
}

/* ============================================================
   TOOLBAR BUTTONS
   ============================================================ */
function wireToolbarButtons() {
  /* All-campuses overview */
  document.getElementById('btn-all-campuses').addEventListener('click', () => {
    map.panTo({ lat: 35.56, lng: -79.13 });
    map.setZoom(9);
    infoWindow.close();
    document.getElementById('directions-panel').hidden = true;
    document.getElementById('btn-clear-directions').hidden = true;
    directionsRenderer.setDirections({ routes: [] });
  });

  /* Clear directions */
  document.getElementById('btn-clear-directions').addEventListener('click', () => {
    directionsRenderer.setDirections({ routes: [] });
    document.getElementById('directions-panel').hidden = true;
    document.getElementById('btn-clear-directions').hidden = true;
  });

  /* Directions panel close button */
  document.getElementById('directions-close').addEventListener('click', () => {
    directionsRenderer.setDirections({ routes: [] });
    document.getElementById('directions-panel').hidden = true;
    document.getElementById('btn-clear-directions').hidden = true;
  });

  /* API key banner dismiss */
  document.getElementById('banner-dismiss')?.addEventListener('click', () => {
    document.getElementById('api-key-banner').hidden = true;
  });
}

/* ============================================================
   SPLASH / ERROR SCREENS
   ============================================================ */
function hideSplashScreen() {
  const loading = document.getElementById('map-loading');
  loading.style.opacity = '0';
  loading.style.transition = 'opacity 0.4s';
  setTimeout(() => { loading.hidden = true; }, 400);
}

function showMapError(err) {
  const loading = document.getElementById('map-loading');
  loading.innerHTML = `
    <div style="text-align:center;padding:32px;max-width:400px;">
      <div style="font-size:3rem;margin-bottom:12px;">⚠️</div>
      <h2 style="color:#003087;margin-bottom:8px;">Map could not load</h2>
      <p style="color:#555;margin-bottom:16px;">${escapeHtml(err.message)}</p>
      <p style="color:#777;font-size:0.85rem;">
        Make sure <strong>YOUR_GOOGLE_MAPS_API_KEY</strong> in
        <code>js/app.js</code> is replaced with a valid API key
        with the Maps JavaScript API, Places API, and Directions API enabled.
      </p>
    </div>
  `;
  loading.hidden  = false;
  loading.style.opacity = '1';
}

function showApiKeyBannerIfNeeded() {
  if (CONFIG.apiKey === 'YOUR_GOOGLE_MAPS_API_KEY' ||
      CONFIG.mapId  === 'YOUR_MAP_ID') {
    document.getElementById('api-key-banner').hidden = false;
  }
}

/* ============================================================
   AI VISION – PDF BUILDING IDENTIFICATION
   Uses PDF.js to render the campus map PDF to an image and then
   calls the Google Gemini Vision API to identify buildings.
   ============================================================ */

/**
 * Render the first page of a PDF to a base64-encoded JPEG string.
 * Requires PDF.js 4.x (loaded from CDN in index.html).
 * @param {string} pdfUrl - Relative or absolute URL of the PDF file.
 * @returns {Promise<string>} Base64-encoded JPEG (without data-URI prefix).
 */
async function renderPdfToImage(pdfUrl) {
  const lib = window.pdfjsLib;
  if (!lib) throw new Error('PDF.js library not loaded.');

  lib.GlobalWorkerOptions.workerSrc =
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/legacy/build/pdf.worker.min.js';

  const loadingTask = lib.getDocument(pdfUrl);
  const pdf         = await loadingTask.promise;
  const page        = await pdf.getPage(1);

  /* Render at 2× scale for better AI recognition quality */
  const viewport = page.getViewport({ scale: 2.0 });
  const canvas   = document.createElement('canvas');
  canvas.width   = viewport.width;
  canvas.height  = viewport.height;

  await page.render({
    canvasContext: canvas.getContext('2d'),
    viewport,
  }).promise;

  /* Return only the base64 payload (strip "data:image/jpeg;base64," prefix) */
  return canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
}

/**
 * Send a base64 image to the Google Gemini Vision API and return the
 * model's text response identifying buildings in the campus map.
 * @param {string} base64Image - JPEG image data (base64, no prefix).
 * @param {string} campusName  - Human-readable campus name for context.
 * @returns {Promise<string>} Plain-text AI response.
 */
async function callGeminiVision(base64Image, campusName) {
  const endpoint =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

  const prompt =
    `This is a campus map for ${campusName} (Central Carolina Community College). ` +
    `Please identify all buildings, facilities, and areas visible on this map. ` +
    `For each location list:\n` +
    `- Building name or label exactly as shown on the map\n` +
    `- Building or room number (if shown)\n` +
    `- A brief description of its likely purpose\n\n` +
    `Format your answer as a numbered list. ` +
    `If a label is partially legible, include it with a note.`;

  const response = await fetch(endpoint, {
    method:  'POST',
    headers: {
      'Content-Type':    'application/json',
      /* Send the key via header to avoid exposure in URLs, logs and history */
      'x-goog-api-key':  CONFIG.geminiApiKey,
    },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: prompt },
        ],
      }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gemini API error (HTTP ${response.status})`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ??
    'No buildings could be identified.';
}

/**
 * Open the AI Vision modal and run the identification pipeline for the given campus.
 * @param {object} campus - Campus object from campuses.json.
 */
async function showAiVisionModal(campus) {
  const modal   = document.getElementById('ai-vision-modal');
  const title   = document.getElementById('ai-modal-title');
  const status  = document.getElementById('ai-modal-status');
  const results = document.getElementById('ai-modal-results');

  title.textContent   = `AI Building Identification – ${campus.name}`;
  status.textContent  = '';
  results.innerHTML   = '';
  modal.hidden        = false;
  document.getElementById('ai-modal-close').focus();

  /* Guard: no PDF available */
  if (!campus.campusPdf) {
    results.innerHTML =
      '<p class="ai-error">No PDF map is available for this campus.</p>';
    return;
  }

  /* Guard: Gemini API key not configured */
  if (!CONFIG.geminiApiKey || CONFIG.geminiApiKey === 'YOUR_GEMINI_API_KEY') {
    results.innerHTML = `
      <div class="ai-setup-notice">
        <p>🔑 <strong>Gemini API key not configured.</strong></p>
        <p>To enable AI building identification:</p>
        <ol>
          <li>Visit <a href="https://aistudio.google.com/app/apikey"
                       target="_blank" rel="noopener noreferrer">Google AI Studio</a>
              and create a free API key.</li>
          <li>Open <code>js/app.js</code> and replace
              <code>YOUR_GEMINI_API_KEY</code> with the key you just created.</li>
          <li>Optionally restrict the key to the Gemini API and your domain
              in the <a href="https://console.cloud.google.com/"
                        target="_blank" rel="noopener noreferrer">Google Cloud Console</a>.</li>
        </ol>
      </div>`;
    return;
  }

  try {
    status.innerHTML =
      '<span class="ai-spinner" aria-hidden="true"></span> Rendering PDF page…';
    const base64Image = await renderPdfToImage(campus.campusPdf);

    status.innerHTML =
      '<span class="ai-spinner" aria-hidden="true"></span> Analysing with Gemini AI…';
    const text = await callGeminiVision(base64Image, campus.name);

    status.textContent = '';
    results.innerHTML  =
      `<div class="ai-results-text">${escapeHtml(text).replace(/\n/g, '<br>')}</div>`;
  } catch (err) {
    status.textContent = '';
    results.innerHTML  =
      `<div class="ai-error">⚠ ${escapeHtml(err.message)}</div>`;
  }
}

/** Close the AI Vision modal and return focus to the triggering element. */
function closeAiVisionModal() {
  const modal = document.getElementById('ai-vision-modal');
  modal.hidden = true;
  /* Return focus to the AI button in the sidebar if it exists */
  const activeAiBtn = document.querySelector('.ci-ai-btn');
  if (activeAiBtn) activeAiBtn.focus();
}

/** Wire up the AI Vision modal close button and backdrop click. */
function wireAiVisionModal() {
  document.getElementById('ai-modal-close').addEventListener('click', closeAiVisionModal);

  /* Close when clicking the backdrop */
  document.getElementById('ai-vision-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('ai-vision-modal')) closeAiVisionModal();
  });

  /* Close on Escape key */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.getElementById('ai-vision-modal').hidden) {
      closeAiVisionModal();
    }
  });
}

/* ============================================================
   HELPERS
   ============================================================ */

/** XSS-safe HTML escaping */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Darken/lighten a hex colour by `amount` (negative = darken) */
function shadeColor(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/* ============================================================
   BOOT
   ============================================================ */
document.addEventListener('DOMContentLoaded', initMap);
