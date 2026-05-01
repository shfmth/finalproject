import { CONFIG } from './config.js';
import { buildCoordinateLabel, formatCoordinate, resolveCoordinateInput } from './coordinates.js';
import { getBufferInputValue, setBufferInputValue } from './ui.js';

const elements = {};
let callbacksRef = {
  onUseCoordinates: null,
  onAnalyzeCoordinates: null
};

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getCoordinateFieldValue(element) {
  const parsed = Number(element?.value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getPositiveNumberValue(element, fallback) {
  const parsed = Number(element?.value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function setPopupFeedback(message, type = 'info') {
  if (!elements.feedback) {
    return;
  }

  elements.feedback.className = `coordinate-feedback ${type}`;
  elements.feedback.textContent = message;
}

function setCoordinateFields(lat, lng) {
  if (elements.coordinateInput && Number.isFinite(lat) && Number.isFinite(lng)) {
    elements.coordinateInput.value = buildCoordinateLabel({ lat, lng });
  }

  if (elements.latitudeInput) {
    elements.latitudeInput.value = Number.isFinite(lat) ? formatCoordinate(lat) : '';
  }

  if (elements.longitudeInput) {
    elements.longitudeInput.value = Number.isFinite(lng) ? formatCoordinate(lng) : '';
  }
}

function syncBufferFromSidebar() {
  if (!elements.bufferInput) {
    return;
  }

  elements.bufferInput.value = getBufferInputValue(CONFIG.analysis.defaultBufferKm);
}

function syncBufferToSidebar() {
  const bufferKm = getPositiveNumberValue(elements.bufferInput, CONFIG.analysis.defaultBufferKm);
  setBufferInputValue(bufferKm);
  return bufferKm;
}

function resolveCoordinatesFromPopup() {
  const resolved = resolveCoordinateInput({
    text: elements.coordinateInput?.value,
    lat: getCoordinateFieldValue(elements.latitudeInput),
    lng: getCoordinateFieldValue(elements.longitudeInput)
  });

  if (!resolved) {
    setPopupFeedback(
      'Koordinat tidak valid. Gunakan format latitude, longitude. Contoh: -6.917500, 107.619100.',
      'warning'
    );
    return null;
  }

  setCoordinateFields(resolved.lat, resolved.lng);

  if (resolved.swapped) {
    setPopupFeedback(
      'Input terdeteksi dalam format long, lat dan otomatis disesuaikan menjadi lat, long.',
      'warning'
    );
  } else {
    setPopupFeedback(`Koordinat siap dipakai: ${buildCoordinateLabel(resolved)}.`, 'success');
  }

  return resolved;
}

function setQuickStatus(message, type = 'info') {
  if (!elements.quickStatus) {
    return;
  }

  elements.quickStatus.className = `site-quick-status ${type}`;
  elements.quickStatus.innerHTML = message;
}

function openPopup() {
  syncBufferFromSidebar();
  elements.panel?.classList.remove('is-hidden');
  elements.trigger?.setAttribute('aria-expanded', 'true');

  if (!elements.coordinateInput?.value && !elements.latitudeInput?.value && !elements.longitudeInput?.value) {
    setPopupFeedback('Tempel titik koordinat site untuk memulai analisis yang lebih terarah.', 'info');
  }

  window.setTimeout(() => {
    elements.coordinateInput?.focus();
    elements.coordinateInput?.select();
  }, 10);
}

function closePopup() {
  elements.panel?.classList.add('is-hidden');
  elements.trigger?.setAttribute('aria-expanded', 'false');
}

function handleUseCoordinates() {
  const resolved = resolveCoordinatesFromPopup();
  if (!resolved) {
    return;
  }

  callbacksRef.onUseCoordinates?.({
    lat: resolved.lat,
    lng: resolved.lng,
    swapped: resolved.swapped
  });

  setQuickStatus(
    `<strong>Site aktif:</strong> ${escapeHtml(buildCoordinateLabel(resolved))}`,
    'success'
  );
  closePopup();
}

function handleAnalyzeCoordinates() {
  const resolved = resolveCoordinatesFromPopup();
  if (!resolved) {
    return;
  }

  const bufferKm = syncBufferToSidebar();

  callbacksRef.onAnalyzeCoordinates?.({
    lat: resolved.lat,
    lng: resolved.lng,
    swapped: resolved.swapped,
    bufferKm
  });

  setQuickStatus(
    `<strong>Site aktif:</strong> ${escapeHtml(buildCoordinateLabel(resolved))} <span>• Buffer ${escapeHtml(String(bufferKm))} km</span>`,
    'success'
  );
  closePopup();
}

function handleSourceInfoChange(event) {
  const detail = event?.detail || {};
  const hasCoordinates = Number.isFinite(detail.lat) && Number.isFinite(detail.lng);

  if (!hasCoordinates) {
    setQuickStatus('Tentukan site dari tombol koordinat atau toolbar gambar.', 'info');
    return;
  }

  const coordinateLabel = buildCoordinateLabel({ lat: detail.lat, lng: detail.lng });

  if (detail.mode === 'coordinates') {
    setCoordinateFields(detail.lat, detail.lng);
    setQuickStatus(`<strong>Site aktif:</strong> ${escapeHtml(coordinateLabel)}`, 'success');
    return;
  }

  setQuickStatus(
    `<strong>Site aktif dari shape:</strong> pusat ${escapeHtml(coordinateLabel)}`,
    'info'
  );
}

function renderMarkup() {
  return `
    <button id="sitePopupTrigger" class="site-popup-trigger" type="button" aria-expanded="false" aria-controls="sitePopupPanel">
      <span class="site-popup-trigger-icon">⌖</span>
      <span class="site-popup-trigger-texts">
        <strong>Site via Koordinat</strong>
        <span>Masukkan lat, long di dalam peta</span>
      </span>
    </button>

    <div id="siteQuickStatus" class="site-quick-status info">
      Tentukan site dari tombol koordinat atau toolbar gambar.
    </div>

    <section id="sitePopupPanel" class="site-popup-panel is-hidden" role="dialog" aria-modal="false" aria-labelledby="sitePopupTitle">
      <div class="site-popup-panel-header">
        <div>
          <span class="site-popup-eyebrow">Input Site Presisi</span>
          <h2 id="sitePopupTitle">Tentukan Site dari Koordinat</h2>
          <p>
            Popup ini ditempatkan langsung di antarmuka peta agar proses site analysis lebih mudah dipahami.
            Masukkan koordinat, cek titiknya, lalu jalankan buffer dan clip.
          </p>
        </div>
        <button id="sitePopupClose" class="site-popup-close" type="button" aria-label="Tutup popup koordinat">×</button>
      </div>

      <div class="site-popup-steps">
        <div class="site-popup-step"><span>1</span> Tempel koordinat site</div>
        <div class="site-popup-step"><span>2</span> Gunakan titik</div>
        <div class="site-popup-step"><span>3</span> Jalankan buffer</div>
      </div>

      <div class="form-group">
        <label for="sitePopupCoordinateInput">Tempel koordinat</label>
        <input id="sitePopupCoordinateInput" type="text" placeholder="Contoh: -6.917500, 107.619100" autocomplete="off" />
        <div class="field-help">
          Format utama: <strong>latitude, longitude</strong>. Bila tertukar menjadi <strong>long, lat</strong>, sistem akan mencoba menyesuaikan otomatis.
        </div>
      </div>

      <div class="coordinate-grid">
        <div class="form-group form-group-tight">
          <label for="sitePopupLatitudeInput">Latitude</label>
          <input id="sitePopupLatitudeInput" type="number" step="any" placeholder="-6.917500" />
        </div>
        <div class="form-group form-group-tight">
          <label for="sitePopupLongitudeInput">Longitude</label>
          <input id="sitePopupLongitudeInput" type="number" step="any" placeholder="107.619100" />
        </div>
      </div>

      <div class="form-group form-group-tight">
        <label for="sitePopupBufferInput">Buffer awal (km)</label>
        <input id="sitePopupBufferInput" type="number" min="0" step="0.1" value="${escapeHtml(String(CONFIG.analysis.defaultBufferKm))}" />
        <div class="field-help">Nilai ini akan disinkronkan dengan buffer utama pada panel kiri.</div>
      </div>

      <div id="sitePopupFeedback" class="coordinate-feedback info">
        Tempel titik koordinat site untuk memulai analisis yang lebih terarah.
      </div>

      <div class="action-grid">
        <button id="sitePopupUseCoordinates" class="btn btn-secondary" type="button">Gunakan Titik</button>
        <button id="sitePopupAnalyzeCoordinates" class="btn btn-primary" type="button">Analisis dari Koordinat</button>
      </div>
    </section>
  `;
}

export function initSiteCoordinatePopup({ containerId = 'sitePopupMount', onUseCoordinates, onAnalyzeCoordinates } = {}) {
  const container = document.getElementById(containerId);

  if (!container) {
    return;
  }

  callbacksRef = {
    onUseCoordinates,
    onAnalyzeCoordinates
  };

  container.innerHTML = renderMarkup();

  elements.trigger = document.getElementById('sitePopupTrigger');
  elements.quickStatus = document.getElementById('siteQuickStatus');
  elements.panel = document.getElementById('sitePopupPanel');
  elements.closeButton = document.getElementById('sitePopupClose');
  elements.coordinateInput = document.getElementById('sitePopupCoordinateInput');
  elements.latitudeInput = document.getElementById('sitePopupLatitudeInput');
  elements.longitudeInput = document.getElementById('sitePopupLongitudeInput');
  elements.bufferInput = document.getElementById('sitePopupBufferInput');
  elements.feedback = document.getElementById('sitePopupFeedback');
  elements.btnUseCoordinates = document.getElementById('sitePopupUseCoordinates');
  elements.btnAnalyzeCoordinates = document.getElementById('sitePopupAnalyzeCoordinates');

  syncBufferFromSidebar();
  setQuickStatus('Tentukan site dari tombol koordinat atau toolbar gambar.', 'info');

  elements.trigger?.addEventListener('click', () => {
    const isHidden = elements.panel?.classList.contains('is-hidden');
    if (isHidden) {
      openPopup();
      return;
    }

    closePopup();
  });

  elements.closeButton?.addEventListener('click', () => {
    closePopup();
  });

  elements.coordinateInput?.addEventListener('change', () => {
    resolveCoordinatesFromPopup();
  });

  [elements.latitudeInput, elements.longitudeInput].forEach((element) => {
    element?.addEventListener('change', () => {
      resolveCoordinatesFromPopup();
    });
  });

  elements.bufferInput?.addEventListener('change', () => {
    const bufferKm = syncBufferToSidebar();
    setPopupFeedback(`Buffer awal siap dipakai: ${bufferKm} km.`, 'info');
  });

  elements.btnUseCoordinates?.addEventListener('click', handleUseCoordinates);
  elements.btnAnalyzeCoordinates?.addEventListener('click', handleAnalyzeCoordinates);

  elements.panel?.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closePopup();
      elements.trigger?.focus();
      return;
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleAnalyzeCoordinates();
    }
  });

  document.addEventListener('siteanalysis:source-info-changed', handleSourceInfoChange);
}
