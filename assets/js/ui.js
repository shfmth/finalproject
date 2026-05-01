import { CONFIG } from './config.js';
import { humanizeKey } from './layers.js';

const elements = {};

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getPositiveNumberValue(element, fallback) {
  const parsed = Number(element?.value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function formatNumber(value, digits = 2) {
  return new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0
  }).format(value);
}

function formatCellValue(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  if (typeof value === 'number') {
    return formatNumber(value);
  }

  if (Array.isArray(value) || typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

function getLayerLabel(layerKey) {
  return CONFIG.dataSources[layerKey]?.label || layerKey || 'Lainnya';
}

function formatGeometryType(geometryType = '') {
  if (!geometryType) {
    return '-';
  }

  return geometryType
    .replace('Multi', 'Multi ')
    .replace('LineString', 'Line')
    .replace('Polygon', 'Polygon')
    .replace('Point', 'Point');
}

function getOrderedPropertyKeys(features) {
  const priority = [
    'nama',
    'zona_rtrw',
    'kode_wiup',
    'nama_kawasan',
    'jenis',
    'komoditas',
    'provinsi',
    'kategori',
    'pola_ruang',
    'kelas_slope',
    'kelas_lsd',
    'kelas_banjir',
    'kelas_gerakan',
    'potensi_likuefaksi',
    'tegangan_kv',
    'kapasitas_mw',
    'status_clip',
    'luas_clip_ha',
    'panjang_clip_km'
  ];

  const keys = Array.from(new Set(features.flatMap((feature) =>
    Object.keys(feature.properties || {}).filter((key) => !key.startsWith('__'))
  )));

  const priorityKeys = priority.filter((key) => keys.includes(key));
  const remainingKeys = keys.filter((key) => !priority.includes(key)).sort();

  return [...priorityKeys, ...remainingKeys];
}

function getSwatchColor(sourceConfig) {
  return sourceConfig.markerStyle?.fillColor
    || sourceConfig.markerStyle?.color
    || sourceConfig.style?.fillColor
    || sourceConfig.style?.color
    || '#94a3b8';
}

function renderLayerList(callbacks) {
  if (!elements.layerList) {
    return;
  }

  const groupedSources = Object.entries(CONFIG.dataSources).reduce((accumulator, [key, config]) => {
    const group = config.group || 'Lainnya';
    if (!accumulator[group]) {
      accumulator[group] = [];
    }

    accumulator[group].push([key, config]);
    return accumulator;
  }, {});

  const markup = Object.entries(groupedSources)
    .map(([groupName, entries]) => {
      const rows = entries.map(([layerKey, sourceConfig]) => `
        <label class="check-row">
          <input type="checkbox" data-layer-toggle="${escapeHtml(layerKey)}" ${sourceConfig.visible ? 'checked' : ''} />
          <span class="layer-swatch" style="background:${escapeHtml(getSwatchColor(sourceConfig))}"></span>
          <span class="layer-texts">
            <span class="layer-name">${escapeHtml(sourceConfig.label)}</span>
            <span class="layer-desc">${escapeHtml(sourceConfig.description || sourceConfig.geometryType || '')}</span>
          </span>
        </label>
      `).join('');

      return `
        <div class="layer-group">
          <div class="layer-group-title">${escapeHtml(groupName)}</div>
          <div class="layer-group-items">${rows}</div>
        </div>
      `;
    })
    .join('');

  elements.layerList.innerHTML = markup;
  elements.layerCheckboxes = Array.from(document.querySelectorAll('[data-layer-toggle]'));

  elements.layerCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', (event) => {
      callbacks.onToggleLayer(event.target.dataset.layerToggle, event.target.checked);
    });
  });
}

function setAllLayerCheckboxes(isChecked) {
  elements.layerCheckboxes?.forEach((checkbox) => {
    checkbox.checked = isChecked;
  });
}

function restoreDefaultLayerCheckboxes() {
  elements.layerCheckboxes?.forEach((checkbox) => {
    const key = checkbox.dataset.layerToggle;
    checkbox.checked = Boolean(CONFIG.dataSources[key]?.visible);
  });
}

export function initUI(callbacks) {
  elements.bufferKm = document.getElementById('bufferKm');
  elements.statusBox = document.getElementById('statusBox');
  elements.resultSummary = document.getElementById('resultSummary');
  elements.resultTable = document.getElementById('resultTable');
  elements.layerList = document.getElementById('layerList');
  elements.btnEnableAllLayers = document.getElementById('btnEnableAllLayers');
  elements.btnRestoreDefaultLayers = document.getElementById('btnRestoreDefaultLayers');
  elements.btnBufferShape = document.getElementById('btnBufferShape');
  elements.btnResetAnalysis = document.getElementById('btnResetAnalysis');
  elements.btnDownloadPackage = document.getElementById('btnDownloadPackage');
  elements.btnDownloadCSV = document.getElementById('btnDownloadCSV');

  elements.bufferKm.value = CONFIG.analysis.defaultBufferKm;
  renderLayerList(callbacks);

  elements.btnEnableAllLayers?.addEventListener('click', () => {
    setAllLayerCheckboxes(true);
    callbacks.onToggleAllLayers(true);
  });

  elements.btnRestoreDefaultLayers?.addEventListener('click', () => {
    restoreDefaultLayerCheckboxes();
    callbacks.onRestoreDefaultLayers();
  });

  elements.btnBufferShape?.addEventListener('click', () => {
    callbacks.onBufferLastShape(getBufferInputValue(CONFIG.analysis.defaultBufferKm));
  });

  elements.btnResetAnalysis?.addEventListener('click', () => {
    callbacks.onResetAnalysis();
  });

  elements.btnDownloadPackage?.addEventListener('click', () => {
    callbacks.onDownloadClipPackage();
  });

  elements.btnDownloadCSV?.addEventListener('click', () => {
    callbacks.onDownloadCSV();
  });
}

export function getBufferInputValue(fallback = CONFIG.analysis.defaultBufferKm) {
  return getPositiveNumberValue(elements.bufferKm, fallback);
}

export function setBufferInputValue(value) {
  if (!elements.bufferKm) {
    return;
  }

  const nextValue = Number.isFinite(Number(value)) ? Number(value) : CONFIG.analysis.defaultBufferKm;
  elements.bufferKm.value = String(nextValue);
}

export function updateStatus(message, type = 'info') {
  if (!elements.statusBox) {
    return;
  }

  elements.statusBox.className = `status-box ${type}`;
  elements.statusBox.textContent = message;
}

export function renderResultSummary(label, featureCollection, metrics = null) {
  if (!elements.resultSummary) {
    return;
  }

  const features = featureCollection?.features || [];

  if (!features.length) {
    elements.resultSummary.innerHTML = `
      <strong>${escapeHtml(label)}</strong><br>
      Belum ada hasil clip dari layer aktif.
    `;
    return;
  }

  const summaryByLayer = features.reduce((accumulator, feature) => {
    const sourceLayer = feature.properties?.__sourceLayer || 'lainnya';
    accumulator[sourceLayer] = (accumulator[sourceLayer] || 0) + 1;
    return accumulator;
  }, {});

  const list = Object.entries(summaryByLayer)
    .map(([layerName, count]) => `<li>${escapeHtml(getLayerLabel(layerName))}: ${formatNumber(count, 0)} fitur</li>`)
    .join('');

  const metricCards = metrics
    ? `
      <div class="summary-grid">
        <div class="metric-card">
          <span class="metric-label">Total fitur</span>
          <span class="metric-value">${formatNumber(metrics.totalFeatures, 0)}</span>
        </div>
        <div class="metric-card">
          <span class="metric-label">Area buffer</span>
          <span class="metric-value">${formatNumber(metrics.areaSqKm)} km²</span>
        </div>
        <div class="metric-card">
          <span class="metric-label">Panjang line</span>
          <span class="metric-value">${formatNumber(metrics.lineLengthKm)} km</span>
        </div>
        <div class="metric-card">
          <span class="metric-label">Area polygon</span>
          <span class="metric-value">${formatNumber(metrics.polygonAreaSqKm)} km²</span>
        </div>
        <div class="metric-card metric-card-wide">
          <span class="metric-label">Layer terdampak</span>
          <span class="metric-value">${formatNumber(metrics.affectedLayers, 0)} layer</span>
        </div>
      </div>
    `
    : '';

  elements.resultSummary.innerHTML = `
    <strong>${escapeHtml(label)}</strong><br>
    Hasil clip berhasil diperbarui dan siap diunduh untuk analisis lanjutan.
    ${metricCards}
    <ul class="summary-list">${list}</ul>
  `;
}

export function renderResultTable(featureCollection) {
  if (!elements.resultTable) {
    return;
  }

  const features = featureCollection?.features || [];

  if (!features.length) {
    elements.resultTable.className = 'result-table-empty';
    elements.resultTable.innerHTML = 'Belum ada fitur hasil clip yang dapat ditampilkan.';
    return;
  }

  const previewLimit = CONFIG.analysis.tablePreviewLimit;
  const visibleFeatures = features.slice(0, previewLimit);
  const propertyKeys = getOrderedPropertyKeys(visibleFeatures);
  const headers = ['Layer', 'Tipe Geometri', ...propertyKeys];

  const headerMarkup = headers
    .map((header) => `<th>${escapeHtml(humanizeKey(header))}</th>`)
    .join('');

  const bodyMarkup = visibleFeatures
    .map((feature) => {
      const cells = [
        `<td><span class="cell-layer">${escapeHtml(getLayerLabel(feature.properties?.__sourceLayer))}</span></td>`,
        `<td>${escapeHtml(formatGeometryType(feature.geometry?.type))}</td>`,
        ...propertyKeys.map((key) => {
          const value = formatCellValue(feature.properties?.[key]);
          const cellClass = key === 'nama' || key === 'zona_rtrw' || key === 'kode_wiup' || key === 'nama_kawasan'
            ? 'cell-strong'
            : '';
          return `<td class="${cellClass}">${escapeHtml(value)}</td>`;
        })
      ];

      return `<tr>${cells.join('')}</tr>`;
    })
    .join('');

  const metaText = visibleFeatures.length === features.length
    ? `Menampilkan ${formatNumber(features.length, 0)} fitur hasil clip.`
    : `Menampilkan ${formatNumber(visibleFeatures.length, 0)} dari ${formatNumber(features.length, 0)} fitur hasil clip.`;

  elements.resultTable.className = '';
  elements.resultTable.innerHTML = `
    <div class="result-table-meta">${escapeHtml(metaText)}</div>
    <div class="result-table-wrapper">
      <table class="result-table">
        <thead>
          <tr>${headerMarkup}</tr>
        </thead>
        <tbody>${bodyMarkup}</tbody>
      </table>
    </div>
  `;
}
