import { CONFIG } from './config.js';
import { AppState } from './state.js';
import { buildPopupContent } from './layers.js';

function buildAnalysisResultOptions() {
  return {
    style: (feature) => {
      const geometryType = feature?.geometry?.type || '';
      if (geometryType.includes('LineString')) {
        return CONFIG.analysisStyles.resultLine;
      }
      return CONFIG.analysisStyles.resultPolygon;
    },
    pointToLayer: (_, latlng) => L.circleMarker(latlng, CONFIG.analysisStyles.resultPoint),
    onEachFeature: (feature, layer) => {
      layer.bindPopup(buildPopupContent(feature));
    }
  };
}

export function initMap() {
  const map = L.map('map', {
    center: CONFIG.map.center,
    zoom: CONFIG.map.zoom,
    minZoom: CONFIG.map.minZoom,
    zoomControl: true,
    preferCanvas: true
  });

  const defaultBasemapKey = CONFIG.map.defaultBasemap;

  const baseLayers = Object.fromEntries(
    Object.entries(CONFIG.basemaps).map(([key, basemapConfig], index) => {
      const layer = L.tileLayer(basemapConfig.url, basemapConfig.options);
      const shouldEnable = key === defaultBasemapKey || (!defaultBasemapKey && index === 0);

      if (shouldEnable) {
        layer.addTo(map);
      }

      return [key, layer];
    })
  );

  AppState.map = map;
  AppState.baseLayers = baseLayers;

  L.control.layers(
    Object.fromEntries(
      Object.entries(CONFIG.basemaps).map(([key, basemapConfig]) => [basemapConfig.label, baseLayers[key]])
    ),
    null,
    { position: 'topright', collapsed: true }
  ).addTo(map);

  L.control.scale({ imperial: false }).addTo(map);

  AppState.analysis.searchAreaLayer = L.geoJSON(null, {
    style: CONFIG.analysisStyles.area
  }).addTo(map);

  AppState.analysis.resultLayer = L.geoJSON(null, buildAnalysisResultOptions()).addTo(map);
  AppState.analysis.drawnItems = new L.FeatureGroup().addTo(map);

  return map;
}

export function initDrawControl(onCreated, onEdited, onDeleted) {
  const drawControl = new L.Control.Draw({
    position: 'topleft',
    draw: {
      polygon: {
        shapeOptions: CONFIG.drawStyles.polygon
      },
      polyline: {
        shapeOptions: CONFIG.drawStyles.line
      },
      rectangle: {
        shapeOptions: CONFIG.drawStyles.rectangle
      },
      circle: {
        shapeOptions: CONFIG.drawStyles.circle
      },
      marker: true,
      circlemarker: false
    },
    edit: {
      featureGroup: AppState.analysis.drawnItems,
      edit: true,
      remove: true
    }
  });

  AppState.map.addControl(drawControl);

  AppState.map.on(L.Draw.Event.CREATED, (event) => {
    AppState.analysis.drawnItems.addLayer(event.layer);
    AppState.analysis.lastDrawnLayer = event.layer;
    if (typeof onCreated === 'function') {
      onCreated(event.layer, event.layerType);
    }
  });

  AppState.map.on(L.Draw.Event.EDITED, (event) => {
    event.layers.eachLayer((layer) => {
      AppState.analysis.lastDrawnLayer = layer;
    });

    if (typeof onEdited === 'function') {
      onEdited(event.layers);
    }
  });

  AppState.map.on(L.Draw.Event.DELETED, (event) => {
    AppState.analysis.lastDrawnLayer = null;

    if (typeof onDeleted === 'function') {
      onDeleted(event.layers);
    }
  });
}

export function focusMapOnLatLng(lat, lng, zoom = CONFIG.analysis.coordinateZoom) {
  if (!AppState.map) {
    return;
  }

  const nextZoom = Math.max(AppState.map.getZoom(), zoom);
  AppState.map.setView([lat, lng], nextZoom, { animate: true });
}

export function zoomToGeoJSON(geojson) {
  if (!geojson) {
    return;
  }

  const tempLayer = L.geoJSON(geojson);

  if (tempLayer.getLayers().length > 0) {
    AppState.map.fitBounds(tempLayer.getBounds(), { padding: [30, 30] });
  }
}

export function zoomToVisibleThematicLayers() {
  const group = L.featureGroup(
    Object.values(AppState.thematicLayers).filter((layer) => AppState.map.hasLayer(layer))
  );

  if (group.getLayers().length > 0) {
    AppState.map.fitBounds(group.getBounds(), { padding: [20, 20] });
  }
}
