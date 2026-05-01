import { CONFIG } from './config.js';
import { AppState } from './state.js';

const FIELD_LABELS = {
  provinsi: 'Provinsi',
  pulau: 'Pulau',
  jenis: 'Jenis',
  kategori: 'Kategori',
  kapasitas_mw: 'Kapasitas (MW)',
  tegangan_kv: 'Tegangan (kV)',
  zona_rtrw: 'Zona RTRW',
  pola_ruang: 'Pola Ruang',
  arahan_pemanfaatan: 'Arahan Pemanfaatan',
  kode_wiup: 'Kode WIUP',
  komoditas: 'Komoditas',
  status_izin: 'Status Izin',
  kelas_slope: 'Kelas Slope',
  rentang_persen: 'Rentang Lereng (%)',
  skor: 'Skor',
  kelas_lsd: 'Kelas LSD',
  deskripsi: 'Deskripsi',
  nama_kawasan: 'Nama Kawasan',
  fungsi_kawasan: 'Fungsi Kawasan',
  status_pengelolaan: 'Status Pengelolaan',
  kelas_banjir: 'Kelas Banjir',
  periode_ulang: 'Periode Ulang',
  sumber_informasi: 'Sumber Informasi',
  kelas_gerakan: 'Kelas Pergerakan Tanah',
  rekomendasi: 'Rekomendasi',
  potensi_likuefaksi: 'Potensi Likuefaksi',
  catatan_geologi: 'Catatan Geologi',
  status_clip: 'Status Clip',
  luas_clip_km2: 'Luas Clip (km²)',
  luas_clip_ha: 'Luas Clip (ha)',
  panjang_clip_km: 'Panjang Clip (km)',
  jumlah_titik: 'Jumlah Titik',

  // Field umum dari data kelistrikan/SHP hasil export.
  namaobj: 'Nama Objek',
  nama_obj: 'Nama Objek',
  namobj: 'Nama Objek',
  teggi: 'Tegangan',
  tegangan: 'Tegangan',
  kapgi: 'Kapasitas GI',
  thnopr: 'Tahun Operasi',
  alamat: 'Alamat',
  fcode: 'Kode Fitur',
  remark: 'Keterangan',
  statop: 'Status Operasi',
  statmlk: 'Status Kepemilikan',
  regpln: 'Region PLN',
  srs_id: 'SRS ID',
  metadata: 'Metadata',
  objectid: 'Object ID',
  fid: 'FID',
  id: 'ID'
};

const TITLE_KEYS = [
  'nama', 'namaobj', 'nama_obj', 'namobj', 'nama_kawasan', 'kode_wiup',
  'zona_rtrw', 'kelas_slope', 'kelas_lsd', 'kelas_banjir', 'kelas_gerakan',
  'potensi_likuefaksi', 'provinsi'
];

const SUBTITLE_KEYS = [
  'jenis', 'kategori', 'pola_ruang', 'komoditas', 'fungsi_kawasan',
  'status_izin', 'statop', 'statmlk', 'regpln', 'periode_ulang',
  'rekomendasi', 'catatan_geologi'
];

const SUMMARY_KEYS = [
  'nama', 'namaobj', 'nama_obj', 'namobj', 'teggi', 'tegangan_kv', 'tegangan',
  'kapgi', 'jenis', 'kategori', 'fungsi_kawasan', 'pola_ruang',
  'kelas_slope', 'kelas_lsd', 'kelas_banjir', 'kelas_gerakan', 'potensi_likuefaksi',
  'statop', 'alamat'
];

const HIDDEN_POPUP_KEYS = new Set([
  'luas_clip_km2',
  'luas_clip_ha',
  'panjang_clip_km',
  'kapasitas_mw'
]);

const LOW_PRIORITY_PATTERNS = [
  /^objectid/i,
  /^fid$/i,
  /^shape/i,
  /^globalid/i,
  /^metadata$/i,
  /^srs/i,
  /^created/i,
  /^edited/i,
  /^last_/i
];

function normalizeKey(key = '') {
  return String(key).trim().toLowerCase().replaceAll(/\s+/g, '_');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatNumber(value, digits = 2) {
  return new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0
  }).format(value);
}

function formatPopupValue(value) {
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

export function humanizeKey(key = '') {
  const normalized = normalizeKey(key);
  return FIELD_LABELS[normalized]
    || String(key)
      .replaceAll('_', ' ')
      .replaceAll(/([a-z])([A-Z])/g, '$1 $2')
      .replaceAll(/\b\w/g, (char) => char.toUpperCase());
}

export function getSourceLabel(sourceKey) {
  return CONFIG.dataSources[sourceKey]?.label || sourceKey || 'Lainnya';
}

function getPropertyByAliases(properties = {}, aliases = []) {
  const entries = Object.entries(properties);
  for (const alias of aliases) {
    const match = entries.find(([key, value]) => (
      normalizeKey(key) === normalizeKey(alias)
      && value !== null
      && value !== undefined
      && value !== ''
    ));
    if (match) {
      return match[1];
    }
  }
  return null;
}

function getFeatureTitle(properties = {}) {
  return getPropertyByAliases(properties, TITLE_KEYS) || 'Fitur Spasial';
}

function getFeatureSubtitle(properties = {}) {
  const chunks = [];

  SUBTITLE_KEYS.forEach((key) => {
    const value = getPropertyByAliases(properties, [key]);
    if (value && !chunks.includes(String(value))) {
      chunks.push(String(value));
    }
  });

  const tegangan = getPropertyByAliases(properties, ['tegangan_kv', 'teggi', 'tegangan']);
  if (tegangan && !String(tegangan).toLowerCase().includes('kv')) {
    chunks.push(`${formatPopupValue(tegangan)} kV`);
  } else if (tegangan) {
    chunks.push(formatPopupValue(tegangan));
  }


  return chunks.slice(0, 4).join(' • ');
}

function isInternalField(key = '') {
  return String(key).startsWith('__');
}

function isLowPriorityField(key = '') {
  const normalized = normalizeKey(key);
  return LOW_PRIORITY_PATTERNS.some((pattern) => pattern.test(normalized));
}

function getVisiblePropertyEntries(properties = {}) {
  return Object.entries(properties)
    .filter(([key]) => !isInternalField(key))
    .filter(([key]) => !HIDDEN_POPUP_KEYS.has(normalizeKey(key)))
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => ({
      key,
      normalizedKey: normalizeKey(key),
      label: humanizeKey(key),
      value
    }));
}

function splitEntriesForPopup(entries) {
  const prioritySet = new Set(SUMMARY_KEYS.map(normalizeKey));
  const summary = [];
  const detail = [];

  entries.forEach((entry) => {
    if (prioritySet.has(entry.normalizedKey) && summary.length < 7) {
      summary.push(entry);
      return;
    }

    detail.push(entry);
  });

  if (summary.length === 0) {
    const importantFallback = entries.filter((entry) => !isLowPriorityField(entry.key)).slice(0, 6);
    summary.push(...importantFallback);
  }

  const summaryKeys = new Set(summary.map((entry) => entry.key));
  const remaining = entries.filter((entry) => !summaryKeys.has(entry.key));

  const sortedDetail = remaining.sort((a, b) => {
    const aLow = isLowPriorityField(a.key) ? 1 : 0;
    const bLow = isLowPriorityField(b.key) ? 1 : 0;
    if (aLow !== bLow) return aLow - bLow;
    return a.label.localeCompare(b.label, 'id');
  });

  return {
    summary,
    detail: sortedDetail
  };
}

function buildRows(entries = []) {
  if (!entries.length) {
    return '<tr><td colspan="2" class="popup-empty">Tidak ada atribut yang dapat ditampilkan.</td></tr>';
  }

  return entries
    .map(({ label, value }) => `
      <tr>
        <th>${escapeHtml(label)}</th>
        <td title="${escapeHtml(formatPopupValue(value))}">${escapeHtml(formatPopupValue(value))}</td>
      </tr>
    `)
    .join('');
}

export function buildPopupContent(feature) {
  const properties = feature?.properties || {};
  const entries = getVisiblePropertyEntries(properties);
  const { summary, detail } = splitEntriesForPopup(entries);
  const sourceLabel = properties.__sourceLabel || getSourceLabel(properties.__sourceLayer);
  const title = getFeatureTitle(properties);
  const subtitle = getFeatureSubtitle(properties);
  const detailCount = detail.length;

  return `
    <article class="popup-card popup-card-human">
      <header class="popup-header">
        <div class="popup-chip-row">
          <span class="popup-chip">${escapeHtml(sourceLabel)}</span>
          <span class="popup-mini-label">Site Analysis</span>
        </div>
        <h3 class="popup-title">${escapeHtml(title)}</h3>
        ${subtitle ? `<p class="popup-subtitle">${escapeHtml(subtitle)}</p>` : ''}
      </header>

      <section class="popup-section">
        <div class="popup-section-title">Informasi utama</div>
        <table class="popup-table popup-table-primary">
          <tbody>${buildRows(summary)}</tbody>
        </table>
      </section>

      ${detailCount ? `
        <details class="popup-detail-drawer">
          <summary>Lihat ${detailCount} atribut lainnya</summary>
          <table class="popup-table popup-table-detail">
            <tbody>${buildRows(detail)}</tbody>
          </table>
        </details>
      ` : ''}
    </article>
  `;
}

function decorateGeoJSON(sourceKey, geojson) {
  const sourceLabel = getSourceLabel(sourceKey);
  const safeGeoJSON = geojson?.type === 'FeatureCollection'
    ? geojson
    : { type: 'FeatureCollection', features: [] };

  const features = (safeGeoJSON.features || []).map((feature, index) => ({
    ...feature,
    id: feature.id || `${sourceKey}-${index + 1}`,
    properties: {
      ...(feature.properties || {}),
      __sourceLayer: sourceKey,
      __sourceLabel: sourceLabel
    }
  }));

  return {
    ...safeGeoJSON,
    features
  };
}

function createLayer(sourceConfig, geojson) {
  return L.geoJSON(geojson, {
    style: () => sourceConfig.style || {},
    pointToLayer: (_, latlng) => L.circleMarker(latlng, sourceConfig.markerStyle || {}),
    onEachFeature: (feature, layer) => {
      layer.bindPopup(buildPopupContent(feature), {
        maxWidth: 460,
        minWidth: 300,
        autoPan: true,
        autoPanPadding: [26, 26],
        keepInView: true,
        closeButton: true,
        className: 'human-feature-popup'
      });
    }
  });
}

async function loadGeoJSON(path) {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn(`Gagal memuat ${path}`, error);
    return { type: 'FeatureCollection', features: [] };
  }
}

export async function loadThematicLayers() {
  const entries = Object.entries(CONFIG.dataSources);

  const layerPayloads = await Promise.all(entries.map(async ([sourceKey, sourceConfig]) => {
    const json = await loadGeoJSON(sourceConfig.path);
    return {
      sourceKey,
      sourceConfig,
      decoratedGeoJSON: decorateGeoJSON(sourceKey, json)
    };
  }));

  layerPayloads.forEach(({ sourceKey, sourceConfig, decoratedGeoJSON }) => {
    const layer = createLayer(sourceConfig, decoratedGeoJSON);

    AppState.rawData[sourceKey] = decoratedGeoJSON;
    AppState.thematicLayers[sourceKey] = layer;

    if (sourceConfig.visible) {
      layer.addTo(AppState.map);
    }
  });
}

export function toggleLayer(sourceKey, isVisible) {
  const layer = AppState.thematicLayers[sourceKey];

  if (!layer) {
    return;
  }

  if (isVisible) {
    layer.addTo(AppState.map);
  } else {
    layer.removeFrom(AppState.map);
  }
}

export function getActiveLayerKeys() {
  return Object.entries(AppState.thematicLayers)
    .filter(([, layer]) => AppState.map.hasLayer(layer))
    .map(([key]) => key);
}

export function getFeaturesFromActiveLayers() {
  return getActiveLayerKeys().flatMap((key) => AppState.rawData[key]?.features || []);
}
