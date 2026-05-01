import { CONFIG } from './config.js';
import {
  analyzeFromCoordinates,
  bufferLastDrawnShape,
  handleShapeCreated,
  handleShapeDeleted,
  handleShapeEdited,
  placeCoordinatePoint,
  resetAnalysis
} from './analysis.js';
import { downloadClipPackage, downloadCSV } from './download.js';
import { getSourceLabel, loadThematicLayers, toggleLayer } from './layers.js';
import { initMap, initDrawControl, zoomToVisibleThematicLayers } from './map.js';
import { initSiteCoordinatePopup } from './site-popup.js';
import { initUI, updateStatus } from './ui.js';

function applyLayerVisibilityMap(visibilityMap) {
  Object.entries(CONFIG.dataSources).forEach(([layerKey, sourceConfig]) => {
    const isVisible = visibilityMap?.[layerKey] ?? Boolean(sourceConfig.visible);
    toggleLayer(layerKey, isVisible);
  });
}

async function bootstrap() {
  initUI({
    onBufferLastShape: bufferLastDrawnShape,
    onResetAnalysis: resetAnalysis,
    onDownloadClipPackage: downloadClipPackage,
    onDownloadCSV: downloadCSV,
    onToggleLayer: (layerKey, isVisible) => {
      toggleLayer(layerKey, isVisible);
      updateStatus(`Layer ${getSourceLabel(layerKey)} ${isVisible ? 'ditampilkan' : 'disembunyikan'}.`, 'info');
    },
    onToggleAllLayers: (isVisible) => {
      const visibilityMap = Object.fromEntries(
        Object.keys(CONFIG.dataSources).map((layerKey) => [layerKey, isVisible])
      );
      applyLayerVisibilityMap(visibilityMap);
      updateStatus(isVisible ? 'Semua layer diaktifkan.' : 'Semua layer disembunyikan.', 'info');
    },
    onRestoreDefaultLayers: () => {
      applyLayerVisibilityMap();
      updateStatus('Visibilitas layer dikembalikan ke konfigurasi default.', 'info');
    }
  });

  initMap();
  initSiteCoordinatePopup({
    onUseCoordinates: ({ lat, lng }) => {
      placeCoordinatePoint(lat, lng);
    },
    onAnalyzeCoordinates: ({ lat, lng, bufferKm }) => {
      analyzeFromCoordinates(lat, lng, bufferKm);
    }
  });

  updateStatus('Memuat layer peta, basemap Google Satellite, dan dummy data site analysis...', 'info');

  await loadThematicLayers();
  zoomToVisibleThematicLayers();

  initDrawControl(handleShapeCreated, handleShapeEdited, handleShapeDeleted);

  updateStatus(
    'Layer berhasil dimuat. Tentukan site dari popup koordinat di dalam peta atau gambar shape, lalu jalankan buffer untuk menghimpun parameter sekitar lokasi.',
    'success'
  );
}

document.addEventListener('DOMContentLoaded', () => {
  bootstrap().catch((error) => {
    console.error(error);
    updateStatus('Terjadi kesalahan saat memulai aplikasi. Periksa console browser.', 'error');
  });
});
