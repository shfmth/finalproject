export const AppState = {
  map: null,
  baseLayers: {},
  thematicLayers: {},
  rawData: {},
  analysis: {
    bufferKm: 10,
    searchAreaLayer: null,
    resultLayer: null,
    drawnItems: null,
    lastDrawnLayer: null,
    currentArea: null,
    currentLabel: '',
    metrics: null,
    sourceInfo: {
      mode: 'draw',
      lat: null,
      lng: null
    },
    selectedFeatures: {
      type: 'FeatureCollection',
      features: []
    }
  }
};
