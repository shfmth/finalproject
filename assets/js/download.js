import { AppState } from './state.js';
import { updateStatus } from './ui.js';

function buildTimestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');

  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '-',
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds())
  ].join('');
}

function triggerDownload(filename, content, mimeType) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvValue(value) {
  const stringValue = value === null || value === undefined ? '' : String(value);
  const escapedValue = stringValue.replaceAll('"', '""');
  return `"${escapedValue}"`;
}

function cleanProperties(properties = {}) {
  const cleanedEntries = Object.entries(properties)
    .filter(([key]) => !key.startsWith('__'));

  const cleaned = Object.fromEntries(cleanedEntries);
  const sourceLabel = properties.__sourceLabel || properties.__sourceLayer || 'Lainnya';

  return {
    ...cleaned,
    layer_sumber: sourceLabel
  };
}

function buildAnalysisMetadata() {
  return {
    label_analisis: AppState.analysis.currentLabel,
    buffer_km: AppState.analysis.bufferKm,
    mode_input: AppState.analysis.sourceInfo?.mode || 'draw',
    koordinat_site: AppState.analysis.sourceInfo?.lat !== null && AppState.analysis.sourceInfo?.lng !== null
      ? {
          latitude: AppState.analysis.sourceInfo.lat,
          longitude: AppState.analysis.sourceInfo.lng
        }
      : null
  };
}

function getCleanFeatureCollection() {
  return {
    type: 'FeatureCollection',
    features: (AppState.analysis.selectedFeatures?.features || []).map((feature) => ({
      ...feature,
      properties: cleanProperties(feature.properties)
    }))
  };
}

function groupFeaturesByLayer(features) {
  return features.reduce((accumulator, feature) => {
    const layerKey = feature.properties?.__sourceLayer || 'lainnya';
    if (!accumulator[layerKey]) {
      accumulator[layerKey] = [];
    }

    accumulator[layerKey].push({
      ...feature,
      properties: cleanProperties(feature.properties)
    });
    return accumulator;
  }, {});
}

export async function downloadClipPackage() {
  const features = AppState.analysis.selectedFeatures?.features || [];

  if (!features.length) {
    updateStatus('Belum ada hasil clip yang bisa diunduh.', 'warning');
    return;
  }

  if (!window.JSZip) {
    const fallbackCollection = getCleanFeatureCollection();
    triggerDownload(
      `hasil_clip_site_analysis_${buildTimestamp()}.geojson`,
      JSON.stringify(fallbackCollection, null, 2),
      'application/geo+json'
    );
    updateStatus('JSZip tidak tersedia. Sistem mengunduh GeoJSON gabungan sebagai fallback.', 'warning');
    return;
  }

  const zip = new window.JSZip();
  const grouped = groupFeaturesByLayer(features);
  const timestamp = buildTimestamp();
  const analysisMetadata = buildAnalysisMetadata();

  zip.file(
    '00_ringkasan_analisis.json',
    JSON.stringify({
      ...analysisMetadata,
      waktu_ekspor: new Date().toISOString(),
      total_fitur: features.length,
      metrik: AppState.analysis.metrics,
      layer: Object.fromEntries(
        Object.entries(grouped).map(([layerKey, layerFeatures]) => [layerKey, layerFeatures.length])
      )
    }, null, 2)
  );

  if (AppState.analysis.currentArea) {
    zip.file(
      '01_area_buffer.geojson',
      JSON.stringify({
        type: 'FeatureCollection',
        features: [
          {
            ...AppState.analysis.currentArea,
            properties: {
              nama: AppState.analysis.currentLabel || 'Area Analisis',
              ...analysisMetadata
            }
          }
        ]
      }, null, 2)
    );
  }

  zip.file(
    '02_hasil_clip_gabungan.geojson',
    JSON.stringify(getCleanFeatureCollection(), null, 2)
  );

  Object.entries(grouped).forEach(([layerKey, layerFeatures], index) => {
    const safeName = String(layerKey).replaceAll(/[^a-zA-Z0-9_-]/g, '_');
    zip.file(
      `layers/${String(index + 3).padStart(2, '0')}_${safeName}_clip.geojson`,
      JSON.stringify({
        type: 'FeatureCollection',
        features: layerFeatures
      }, null, 2)
    );
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  triggerDownload(`hasil_clip_site_analysis_${timestamp}.zip`, blob, 'application/zip');
  updateStatus('Paket ZIP hasil clip berhasil diunduh.', 'success');
}

export function downloadCSV() {
  const features = AppState.analysis.selectedFeatures?.features || [];

  if (!features.length) {
    updateStatus('Belum ada hasil analisis yang bisa diunduh sebagai CSV.', 'warning');
    return;
  }

  const analysisMetadata = buildAnalysisMetadata();
  const rows = features.map((feature) => ({
    ...cleanProperties(feature.properties),
    ...analysisMetadata,
    geometry_type: feature.geometry?.type || '',
    coordinates: JSON.stringify(feature.geometry?.coordinates || null)
  }));

  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const csvLines = [headers.join(',')];

  rows.forEach((row) => {
    const line = headers.map((header) => escapeCsvValue(row[header])).join(',');
    csvLines.push(line);
  });

  triggerDownload(
    `hasil_clip_site_analysis_${buildTimestamp()}.csv`,
    csvLines.join('\n'),
    'text/csv;charset=utf-8'
  );
  updateStatus('File CSV hasil clip berhasil diunduh.', 'success');
}
