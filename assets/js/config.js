export const CONFIG = {
  map: {
    center: [-7.7956, 110.3695],
    zoom: 12,
    minZoom: 5,
    defaultBasemap: 'googleSatellite'
  },
  basemaps: {
    googleSatellite: {
      label: 'Google Satellite',
      url: 'https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      options: {
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        maxZoom: 20,
        attribution: 'Google'
      }
    },
    esriImagery: {
      label: 'Esri World Imagery',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      options: {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri'
      }
    },
    osm: {
      label: 'OpenStreetMap',
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      options: {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }
    },
    cartoLight: {
      label: 'Carto Light',
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      options: {
        maxZoom: 20,
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
      }
    },
    topo: {
      label: 'OpenTopoMap',
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      options: {
        maxZoom: 17,
        attribution: '&copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap'
      }
    }
  },
  dataSources: {
    batasProvinsi: {
      label: 'Batas Provinsi',
      group: 'Referensi',
      geometryType: 'polygon',
      description: 'Batas administratif provinsi',
      path: './assets/data/batas_provinsi.geojson',
      visible: true,
      style: {
        color: '#facc15',
        weight: 2.8,
        opacity: 1,
        fill: false,
        fillColor: '#fef08a',
        fillOpacity: 0.2
      }
    },
    transmisi: {
      label: 'Jaringan Transmisi',
      group: 'Kelistrikan',
      geometryType: 'line',
      description: 'Jalur interkoneksi utama',
      path: './assets/data/transmisi.geojson',
      visible: true,
      style: {
        color: '#dc2626',
        weight: 3,
        opacity: 0.95
      }
    },
    garduInduk: {
      label: 'Gardu Induk',
      group: 'Kelistrikan',
      geometryType: 'point',
      description: 'Node gardu induk dan switching',
      path: './assets/data/gardu_induk.geojson',
      visible: true,
      markerStyle: {
        radius: 6.5,
        color: '#1d4ed8',
        fillColor: '#60a5fa',
        weight: 1,
        fillOpacity: 0.95
      }
    },
    pembangkit: {
      label: 'Pembangkit',
      group: 'Kelistrikan',
      geometryType: 'point',
      description: 'Pembangkit utama sistem',
      path: './assets/data/pembangkit.geojson',
      visible: false,
      markerStyle: {
        radius: 7,
        color: '#166534',
        fillColor: '#4ade80',
        weight: 1,
        fillOpacity: 0.95
      }
    },
    rtrw: {
      label: 'RTRW',
      group: 'Tata Ruang & Perizinan',
      geometryType: 'polygon',
      description: 'Arahan zonasi RTRW',
      path: './assets/data/rtrw.geojson',
      visible: false,
      style: {
        color: '#f59e0b',
        weight: 0.9,
        opacity: 0.85,
        fill: true,
        fillColor: '#fbbf24',
        fillOpacity: 0.2
      }
    },
    wiup: {
      label: 'WIUP',
      group: 'Tata Ruang & Perizinan',
      geometryType: 'polygon',
      description: 'Wilayah izin usaha pertambangan',
      path: './assets/data/wiup.geojson',
      visible: false,
      style: {
        color: '#8b5cf6',
        weight: 1.1,
        opacity: 0.88,
        fill: true,
        fillColor: '#c4b5fd',
        fillOpacity: 0.2
      }
    },
    slope: {
      label: 'Slope',
      group: 'Topografi & Lahan',
      geometryType: 'polygon',
      description: 'Kelas kemiringan lereng',
      path: './assets/data/slope.geojson',
      visible: false,
      style: {
        color: '#d97706',
        weight: 0.9,
        opacity: 0.8,
        fill: true,
        fillColor: '#facc15',
        fillOpacity: 0.2
      }
    },
    lsd: {
      label: 'LSD',
      group: 'Topografi & Lahan',
      geometryType: 'polygon',
      description: 'Layer LSD dummy untuk site analysis',
      path: './assets/data/lsd.geojson',
      visible: false,
      style: {
        color: '#ea580c',
        weight: 0.9,
        opacity: 0.8,
        fill: true,
        fillColor: '#fdba74',
        fillOpacity: 0.2
      }
    },
    hutanLindung: {
      label: 'Hutan Lindung',
      group: 'Lingkungan',
      geometryType: 'polygon',
      description: 'Kawasan lindung dan penyangga',
      path: './assets/data/hutan_lindung.geojson',
      visible: false,
      style: {
        color: '#16a34a',
        weight: 1.1,
        opacity: 0.86,
        fill: true,
        fillColor: '#86efac',
        fillOpacity: 0.2
      }
    },
    rawanBanjir: {
      label: 'Rawan Banjir',
      group: 'Kebencanaan',
      geometryType: 'polygon',
      description: 'Zona genangan dan banjir',
      path: './assets/data/rawan_banjir.geojson',
      visible: false,
      style: {
        color: '#0284c7',
        weight: 1.1,
        opacity: 0.86,
        fill: true,
        fillColor: '#7dd3fc',
        fillOpacity: 0.2
      }
    },
    pergerakanTanah: {
      label: 'Pergerakan Tanah',
      group: 'Kebencanaan',
      geometryType: 'polygon',
      description: 'Zona kerentanan gerakan tanah',
      path: './assets/data/pergerakan_tanah.geojson',
      visible: false,
      style: {
        color: '#ef4444',
        weight: 1.1,
        opacity: 0.86,
        fill: true,
        fillColor: '#fca5a5',
        fillOpacity: 0.2
      }
    },
    likuefaksi: {
      label: 'Likuefaksi',
      group: 'Kebencanaan',
      geometryType: 'polygon',
      description: 'Potensi likuefaksi',
      path: './assets/data/likuefaksi.geojson',
      visible: false,
      style: {
        color: '#db2777',
        weight: 1.1,
        opacity: 0.86,
        fill: true,
        fillColor: '#f9a8d4',
        fillOpacity: 0.2
      }
    }
  },
  analysis: {
    defaultBufferKm: 10,
    circleSteps: 96,
    coordinateZoom: 14,
    tablePreviewLimit: 60
  },
  drawStyles: {
    polygon: {
      color: '#0f766e',
      weight: 2,
      fillColor: '#99f6e4',
      fillOpacity: 0.12
    },
    line: {
      color: '#1d4ed8',
      weight: 3,
      opacity: 0.95
    },
    rectangle: {
      color: '#0f766e',
      weight: 2,
      fillColor: '#bfdbfe',
      fillOpacity: 0.1
    },
    circle: {
      color: '#0f766e',
      weight: 2,
      fillColor: '#99f6e4',
      fillOpacity: 0.12
    }
  },
  analysisStyles: {
    area: {
      color: '#7c3aed',
      weight: 2.4,
      dashArray: '7 5',
      fillColor: '#c4b5fd',
      fillOpacity: 0.16
    },
    resultPoint: {
      radius: 7.5,
      color: '#6d28d9',
      fillColor: '#a78bfa',
      weight: 1.5,
      fillOpacity: 0.96
    },
    resultLine: {
      color: '#6d28d9',
      weight: 4,
      opacity: 0.95
    },
    resultPolygon: {
      color: '#6d28d9',
      weight: 2,
      fillColor: '#a78bfa',
      fillOpacity: 0.22
    }
  }
};
