import { CONFIG } from './config.js';
import { AppState } from './state.js';
import { getFeaturesFromActiveLayers } from './layers.js';
import { focusMapOnLatLng, zoomToGeoJSON } from './map.js';
import { renderResultSummary, renderResultTable, updateStatus } from './ui.js';

function roundValue(value, digits = 3) {
  return Number(Number(value).toFixed(digits));
}

function isPolygonGeometry(type = '') {
  return type === 'Polygon' || type === 'MultiPolygon';
}

function isLineGeometry(type = '') {
  return type === 'LineString' || type === 'MultiLineString';
}

function isPointGeometry(type = '') {
  return type === 'Point' || type === 'MultiPoint';
}

function buildEmptyFeatureCollection() {
  return {
    type: 'FeatureCollection',
    features: []
  };
}

function cleanFeatureCoordinates(feature) {
  try {
    return turf.cleanCoords(feature);
  } catch (error) {
    return feature;
  }
}

function buildFeatureWithSourceProperties(sourceFeature, geometry, extras = {}) {
  return {
    type: 'Feature',
    properties: {
      ...(sourceFeature.properties || {}),
      ...extras
    },
    geometry
  };
}

function emitSourceInfoChange() {
  if (typeof document === 'undefined') {
    return;
  }

  document.dispatchEvent(new CustomEvent('siteanalysis:source-info-changed', {
    detail: {
      ...AppState.analysis.sourceInfo
    }
  }));
}

function clearAnalysisOutputs(summaryLabel = 'Menunggu analisis') {
  AppState.analysis.currentArea = null;
  AppState.analysis.currentLabel = '';
  AppState.analysis.metrics = null;
  AppState.analysis.selectedFeatures = buildEmptyFeatureCollection();

  AppState.analysis.searchAreaLayer?.clearLayers();
  AppState.analysis.resultLayer?.clearLayers();

  renderResultSummary(summaryLabel, AppState.analysis.selectedFeatures);
  renderResultTable(AppState.analysis.selectedFeatures);
}

function setSourceInfo(mode, lat = null, lng = null) {
  AppState.analysis.sourceInfo = {
    mode,
    lat: Number.isFinite(lat) ? roundValue(lat, 6) : null,
    lng: Number.isFinite(lng) ? roundValue(lng, 6) : null
  };

  emitSourceInfoChange();
}

function setSourceInfoFromFeature(feature, mode = 'draw') {
  const geometryType = feature?.geometry?.type || '';

  if (geometryType === 'Point') {
    const [lng, lat] = feature.geometry.coordinates || [];
    setSourceInfo(mode, lat, lng);
    return;
  }

  try {
    const centerFeature = turf.center(feature);
    const [lng, lat] = centerFeature.geometry.coordinates || [];
    setSourceInfo(mode, lat, lng);
  } catch (error) {
    setSourceInfo(mode, null, null);
  }
}

function convertLeafletLayerToFeature(layer) {
  if (layer instanceof L.Circle) {
    const center = layer.getLatLng();
    const radiusKm = layer.getRadius() / 1000;

    return turf.circle([center.lng, center.lat], radiusKm, {
      steps: CONFIG.analysis.circleSteps,
      units: 'kilometers',
      properties: {
        source: 'draw-circle',
        radius_km: roundValue(radiusKm, 2)
      }
    });
  }

  const geojson = layer.toGeoJSON();
  const feature = geojson.type === 'Feature'
    ? geojson
    : {
        type: 'Feature',
        properties: {},
        geometry: geojson
      };

  return cleanFeatureCoordinates(feature);
}

function pointIsInsideArea(pointFeature, areaFeature) {
  try {
    return turf.booleanPointInPolygon(pointFeature, areaFeature, { ignoreBoundary: false });
  } catch (error) {
    try {
      return turf.booleanIntersects(areaFeature, pointFeature);
    } catch (secondError) {
      return false;
    }
  }
}

function geometryIntersectsArea(areaFeature, feature) {
  try {
    return turf.booleanIntersects(areaFeature, feature);
  } catch (error) {
    return false;
  }
}

function collectPolygonCoordinates(feature) {
  if (!feature?.geometry) {
    return [];
  }

  if (feature.geometry.type === 'Polygon') {
    return [feature.geometry.coordinates];
  }

  if (feature.geometry.type === 'MultiPolygon') {
    return feature.geometry.coordinates;
  }

  return [];
}

function samplePointOnLine(lineFeature) {
  try {
    const lineLength = turf.length(lineFeature, { units: 'kilometers' });
    if (lineLength > 0) {
      return turf.along(lineFeature, lineLength / 2, { units: 'kilometers' });
    }
  } catch (error) {
    // fallback below
  }

  const coordinates = lineFeature?.geometry?.coordinates || [];
  if (coordinates.length < 2) {
    return null;
  }

  try {
    return turf.midpoint(
      turf.point(coordinates[0]),
      turf.point(coordinates[coordinates.length - 1])
    );
  } catch (error) {
    return null;
  }
}

function addClipMetricsForPoint(feature, pointCount = 1) {
  return buildFeatureWithSourceProperties(feature, feature.geometry, {
    status_clip: 'inside',
    jumlah_titik: pointCount
  });
}

function clipPointFeature(areaFeature, feature) {
  if (!geometryIntersectsArea(areaFeature, feature)) {
    return null;
  }

  if (feature.geometry.type === 'Point') {
    return pointIsInsideArea(feature, areaFeature)
      ? addClipMetricsForPoint(feature)
      : null;
  }

  const selectedPoints = [];
  turf.flattenEach(feature, (flattenedPoint) => {
    if (pointIsInsideArea(flattenedPoint, areaFeature)) {
      selectedPoints.push(flattenedPoint.geometry.coordinates);
    }
  });

  if (!selectedPoints.length) {
    return null;
  }

  const geometry = selectedPoints.length === 1
    ? { type: 'Point', coordinates: selectedPoints[0] }
    : { type: 'MultiPoint', coordinates: selectedPoints };

  return buildFeatureWithSourceProperties(feature, geometry, {
    status_clip: 'inside',
    jumlah_titik: selectedPoints.length
  });
}

function clipLineFeature(areaFeature, feature) {
  if (!geometryIntersectsArea(areaFeature, feature)) {
    return null;
  }

  let boundary;
  try {
    boundary = turf.polygonToLine(areaFeature);
  } catch (error) {
    boundary = null;
  }

  const keptSegments = [];

  turf.flattenEach(feature, (flattenedLine) => {
    let splitCollection;

    if (boundary) {
      try {
        splitCollection = turf.lineSplit(flattenedLine, boundary);
      } catch (error) {
        splitCollection = null;
      }
    }

    const segments = splitCollection?.features?.length
      ? splitCollection.features
      : [flattenedLine];

    segments.forEach((segment) => {
      const cleanedSegment = cleanFeatureCoordinates(segment);
      const coordinates = cleanedSegment?.geometry?.coordinates || [];

      if (coordinates.length < 2) {
        return;
      }

      const samplePoint = samplePointOnLine(cleanedSegment);
      const isInside = samplePoint
        ? pointIsInsideArea(samplePoint, areaFeature)
        : geometryIntersectsArea(areaFeature, cleanedSegment);

      if (isInside) {
        keptSegments.push(cleanedSegment.geometry.coordinates);
      }
    });
  });

  if (!keptSegments.length) {
    return null;
  }

  const geometry = keptSegments.length === 1
    ? { type: 'LineString', coordinates: keptSegments[0] }
    : { type: 'MultiLineString', coordinates: keptSegments };

  const resultFeature = buildFeatureWithSourceProperties(feature, geometry, {
    status_clip: 'clipped'
  });

  try {
    resultFeature.properties.panjang_clip_km = roundValue(
      turf.length(resultFeature, { units: 'kilometers' }),
      3
    );
  } catch (error) {
    resultFeature.properties.panjang_clip_km = null;
  }

  return resultFeature;
}

function clipPolygonFeature(areaFeature, feature) {
  if (!geometryIntersectsArea(areaFeature, feature)) {
    return null;
  }

  const clippedCoordinates = [];

  turf.flattenEach(feature, (flattenedPolygon) => {
    try {
      const clipped = turf.intersect(turf.featureCollection([areaFeature, flattenedPolygon]));
      if (clipped) {
        clippedCoordinates.push(...collectPolygonCoordinates(clipped));
      }
    } catch (error) {
      // ignore invalid geometry intersections and continue checking other parts
    }
  });

  if (!clippedCoordinates.length) {
    return null;
  }

  const geometry = clippedCoordinates.length === 1
    ? { type: 'Polygon', coordinates: clippedCoordinates[0] }
    : { type: 'MultiPolygon', coordinates: clippedCoordinates };

  const resultFeature = buildFeatureWithSourceProperties(feature, geometry, {
    status_clip: 'clipped'
  });

  try {
    const areaSqKm = turf.area(resultFeature) / 1_000_000;
    resultFeature.properties.luas_clip_km2 = roundValue(areaSqKm, 4);
    resultFeature.properties.luas_clip_ha = roundValue(areaSqKm * 100, 2);
  } catch (error) {
    resultFeature.properties.luas_clip_km2 = null;
    resultFeature.properties.luas_clip_ha = null;
  }

  return resultFeature;
}

function clipOrSelectFeature(areaFeature, feature) {
  const geometryType = feature?.geometry?.type;

  if (!geometryType) {
    return null;
  }

  if (isPointGeometry(geometryType)) {
    return clipPointFeature(areaFeature, feature);
  }

  if (isLineGeometry(geometryType)) {
    return clipLineFeature(areaFeature, feature);
  }

  if (isPolygonGeometry(geometryType)) {
    return clipPolygonFeature(areaFeature, feature);
  }

  return geometryIntersectsArea(areaFeature, feature)
    ? buildFeatureWithSourceProperties(feature, feature.geometry, { status_clip: 'intersects' })
    : null;
}

function getFeatureBBox(feature) {
  try {
    return turf.bbox(feature);
  } catch (error) {
    return null;
  }
}

function bboxIntersects(firstBBox, secondBBox) {
  if (!Array.isArray(firstBBox) || !Array.isArray(secondBBox)) {
    return true;
  }

  return !(
    firstBBox[0] > secondBBox[2]
    || firstBBox[2] < secondBBox[0]
    || firstBBox[1] > secondBBox[3]
    || firstBBox[3] < secondBBox[1]
  );
}

function calculateMetrics(areaFeature, featureCollection) {
  const features = featureCollection?.features || [];

  const metrics = features.reduce((accumulator, feature) => {
    const geometryType = feature.geometry?.type || '';
    const sourceLayer = feature.properties?.__sourceLayer || 'lainnya';

    accumulator.totalFeatures += 1;
    accumulator.byLayer[sourceLayer] = (accumulator.byLayer[sourceLayer] || 0) + 1;

    if (isLineGeometry(geometryType)) {
      try {
        accumulator.lineLengthKm += turf.length(feature, { units: 'kilometers' });
      } catch (error) {
        // ignore invalid line measurement
      }
    }

    if (isPolygonGeometry(geometryType)) {
      try {
        accumulator.polygonAreaSqKm += turf.area(feature) / 1_000_000;
      } catch (error) {
        // ignore invalid polygon measurement
      }
    }

    return accumulator;
  }, {
    totalFeatures: 0,
    byLayer: {},
    areaSqKm: 0,
    lineLengthKm: 0,
    polygonAreaSqKm: 0,
    affectedLayers: 0
  });

  try {
    metrics.areaSqKm = turf.area(areaFeature) / 1_000_000;
  } catch (error) {
    metrics.areaSqKm = 0;
  }

  metrics.affectedLayers = Object.keys(metrics.byLayer).length;
  metrics.lineLengthKm = roundValue(metrics.lineLengthKm, 3);
  metrics.polygonAreaSqKm = roundValue(metrics.polygonAreaSqKm, 3);
  metrics.areaSqKm = roundValue(metrics.areaSqKm, 3);

  return metrics;
}

function runSpatialSelection(areaFeature, analysisLabel) {
  const cleanAreaFeature = cleanFeatureCoordinates(areaFeature);
  const features = getFeaturesFromActiveLayers();
  const areaBBox = getFeatureBBox(cleanAreaFeature);
  const candidateFeatures = features.filter((feature) => bboxIntersects(areaBBox, getFeatureBBox(feature)));
  const selectedFeatures = candidateFeatures
    .map((feature) => clipOrSelectFeature(cleanAreaFeature, feature))
    .filter(Boolean);

  const featureCollection = {
    type: 'FeatureCollection',
    features: selectedFeatures
  };

  const metrics = calculateMetrics(cleanAreaFeature, featureCollection);

  AppState.analysis.currentArea = cleanAreaFeature;
  AppState.analysis.currentLabel = analysisLabel;
  AppState.analysis.metrics = metrics;
  AppState.analysis.selectedFeatures = featureCollection;

  AppState.analysis.searchAreaLayer.clearLayers().addData(cleanAreaFeature);
  AppState.analysis.resultLayer.clearLayers().addData(featureCollection);

  renderResultSummary(analysisLabel, featureCollection, metrics);
  renderResultTable(featureCollection);

  zoomToGeoJSON({
    type: 'FeatureCollection',
    features: [cleanAreaFeature, ...selectedFeatures]
  });

  updateStatus(
    selectedFeatures.length
      ? `Buffer dan clip selesai. ${selectedFeatures.length} fitur dari layer aktif berhasil dihimpun untuk site analysis.`
      : 'Buffer selesai, tetapi belum ada fitur dari layer aktif yang masuk ke area analisis.',
    selectedFeatures.length ? 'success' : 'warning'
  );
}

function buildCoordinateMarker(lat, lng) {
  const icon = L.divIcon({
    className: 'site-point-icon',
    html: '<span class="site-point-pin"></span>',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  const marker = L.marker([lat, lng], { icon });
  marker.bindPopup(`
    <div class="popup-card">
      <div class="popup-header">
        <span class="popup-chip">Site Point</span>
        <h3 class="popup-title">Titik Koordinat Aktif</h3>
        <div class="popup-subtitle">Latitude ${lat.toFixed(6)} • Longitude ${lng.toFixed(6)}</div>
      </div>
    </div>
  `);
  return marker;
}

function setCoordinateMarker(lat, lng) {
  const marker = buildCoordinateMarker(lat, lng);

  AppState.analysis.drawnItems.clearLayers();
  AppState.analysis.drawnItems.addLayer(marker);
  AppState.analysis.lastDrawnLayer = marker;
  setSourceInfo('coordinates', lat, lng);

  clearAnalysisOutputs('Titik koordinat aktif');
  focusMapOnLatLng(lat, lng);
  marker.openPopup();

  return marker;
}

export function placeCoordinatePoint(lat, lng) {
  setCoordinateMarker(lat, lng);
  updateStatus(
    `Titik koordinat (${lat.toFixed(6)}, ${lng.toFixed(6)}) berhasil ditempatkan. Jalankan buffer untuk mulai site analysis.`,
    'success'
  );
}

export function analyzeFromCoordinates(lat, lng, bufferKm) {
  setCoordinateMarker(lat, lng);
  bufferLastDrawnShape(bufferKm);
}

export function bufferLastDrawnShape(bufferKm) {
  const lastLayer = AppState.analysis.lastDrawnLayer;

  if (!lastLayer) {
    updateStatus('Belum ada titik atau shape site. Gunakan toolbar gambar atau tombol koordinat di dalam peta terlebih dahulu.', 'warning');
    return;
  }

  const sourceFeature = convertLeafletLayerToFeature(lastLayer);
  const sourceGeometryType = sourceFeature?.geometry?.type;

  if (!sourceGeometryType) {
    updateStatus('Bentuk tidak valid untuk dianalisis.', 'error');
    return;
  }

  if (!Number.isFinite(bufferKm) || bufferKm < 0) {
    updateStatus('Nilai buffer tidak valid. Gunakan angka 0 atau lebih besar.', 'warning');
    return;
  }

  if (bufferKm === 0 && !isPolygonGeometry(sourceGeometryType)) {
    updateStatus('Buffer 0 km hanya berlaku untuk polygon, rectangle, atau circle. Untuk titik atau garis gunakan buffer lebih dari 0 km.', 'warning');
    return;
  }

  if (AppState.analysis.sourceInfo.mode !== 'coordinates') {
    setSourceInfoFromFeature(sourceFeature, 'draw');
  }

  let areaFeature;

  if (bufferKm === 0 && isPolygonGeometry(sourceGeometryType)) {
    areaFeature = sourceFeature;
  } else {
    try {
      areaFeature = turf.buffer(sourceFeature, bufferKm, {
        units: 'kilometers',
        steps: CONFIG.analysis.circleSteps
      });
    } catch (error) {
      updateStatus('Buffer gagal dibuat. Periksa bentuk yang digambar dan coba lagi.', 'error');
      return;
    }
  }

  if (!areaFeature) {
    updateStatus('Area buffer tidak berhasil dibuat.', 'error');
    return;
  }

  AppState.analysis.bufferKm = bufferKm;
  const label = bufferKm === 0
    ? 'Clip langsung dari shape area'
    : `Buffer ${bufferKm} km untuk site analysis`;

  runSpatialSelection(areaFeature, label);
}

export function handleShapeCreated() {
  clearAnalysisOutputs('Site baru dibuat');
  setSourceInfo('draw', null, null);
  updateStatus('Shape site berhasil dibuat. Jalankan buffer untuk menghimpun parameter di sekitarnya.', 'info');
}

export function handleShapeEdited() {
  clearAnalysisOutputs('Shape diperbarui');
  setSourceInfo('draw', null, null);
  updateStatus('Shape berhasil diperbarui. Jalankan ulang buffer agar area clip mengikuti geometri terbaru.', 'info');
}

export function handleShapeDeleted() {
  clearAnalysisOutputs('Shape dihapus');
  setSourceInfo('draw', null, null);
  updateStatus('Shape dihapus. Masukkan koordinat atau gambar shape baru untuk menjalankan buffer dan clip.', 'warning');
}

export function resetAnalysis() {
  AppState.analysis.lastDrawnLayer = null;
  setSourceInfo('draw', null, null);
  clearAnalysisOutputs('Reset analisis');
  AppState.analysis.drawnItems.clearLayers();

  updateStatus('Analisis direset. Area buffer, hasil clip, dan shape gambar telah dibersihkan.', 'info');
}
