# WebGIS Kelistrikan Nasional - Site Analysis Starter

Project ini dibuat dengan:
- HTML
- CSS
- JavaScript modular
- Leaflet
- Leaflet.draw
- Turf.js
- JSZip

## Versi ini difokuskan untuk site analysis
Perubahan utama pada revisi ini:
- Fokus analisis tetap pada **buffer dan clip** untuk mendukung workflow site analysis.
- Input **koordinat site** kini dipindahkan dari sidebar ke **popup di dalam antarmuka peta** agar lebih mudah dipahami pengguna awam.
- Ditambahkan tombol **Site via Koordinat** langsung di map interface.
- Ditambahkan basemap **Google Satellite** dan **Esri World Imagery** untuk pembacaan konteks lokasi.
- Tetap tersedia layer dummy untuk simulasi site analysis:
  - RTRW
  - Slope
  - LSD
  - WIUP
  - Hutan Lindung
  - Rawan Banjir
  - Pergerakan Tanah
  - Likuefaksi
- Hasil clip dapat diunduh sebagai **paket ZIP** yang berisi:
  - area buffer
  - ringkasan analisis
  - hasil clip gabungan
  - hasil clip per layer
- Ringkasan unduhan menyimpan metadata analisis seperti:
  - label analisis
  - buffer_km
  - mode_input
  - koordinat_site
- Properti hasil clip menyertakan metrik turunan seperti:
  - `status_clip`
  - `luas_clip_km2`
  - `luas_clip_ha`
  - `panjang_clip_km`

## Optimasi yang ditambahkan
- **Popup koordinat** dipindahkan ke map interface agar alur input site tidak tersebar di tepi peta.
- **Pemrosesan layer paralel** saat load data dummy, sehingga start-up lebih cepat.
- **Prefilter bbox** sebelum clipping, agar proses seleksi spasial lebih ringan ketika jumlah fitur bertambah.
- `preferCanvas: true` pada Leaflet untuk membantu performa vektor saat layer makin banyak.

## Fitur yang tersedia
- Peta interaktif dengan zoom, pan, dan basemap switcher
- Toggle layer berbasis kelompok data
- Input lokasi site dengan popup koordinat `lat, long`
- Deteksi otomatis bila input tertukar menjadi `long, lat`
- Gambar titik, garis, polygon, rectangle, atau circle sebagai site awal
- Buffer pada titik koordinat atau shape terakhir
- Clip data aktif ke dalam area buffer
- Ringkasan hasil dan tabel atribut
- Download paket ZIP untuk analisis lanjutan di ArcGIS
- Download CSV rekap atribut

## Struktur folder

```text
webgis-kelistrikan-starter/
├── index.html
├── README.md
└── assets/
    ├── css/
    │   └── main.css
    ├── data/
    │   ├── batas_provinsi.geojson
    │   ├── gardu_induk.geojson
    │   ├── pembangkit.geojson
    │   ├── transmisi.geojson
    │   ├── rtrw.geojson
    │   ├── slope.geojson
    │   ├── lsd.geojson
    │   ├── wiup.geojson
    │   ├── hutan_lindung.geojson
    │   ├── rawan_banjir.geojson
    │   ├── pergerakan_tanah.geojson
    │   └── likuefaksi.geojson
    └── js/
        ├── analysis.js
        ├── config.js
        ├── coordinates.js
        ├── download.js
        ├── layers.js
        ├── main.js
        ├── map.js
        ├── site-popup.js
        ├── state.js
        └── ui.js
```

## Workflow singkat
1. Centang layer yang ingin dihimpun ke hasil clip.
2. Klik tombol **Site via Koordinat** di pojok kanan bawah peta, atau gambar site langsung dari toolbar.
3. Masukkan koordinat site jika memakai popup.
4. Isi buffer pada popup atau panel kiri.
5. Jalankan analisis.
6. Unduh paket ZIP atau CSV.
7. Buka hasilnya di ArcGIS untuk analisis lanjutan.

