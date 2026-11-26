# Akhirnya!

Akhirnya! membuat banner wisuda dari foto dan nama 1–20 wisudawan. Pilih ukuran cetak dan salah satu dari enam gaya, buat tiga variasi, lalu sesuaikan desain di studio sebelum mengunduhnya.

## Pengembangan lokal

Gunakan Node.js 22 atau 24 dan npm.

```sh
npm ci
npm run dev
```

Buka `http://localhost:3000`. Untuk mencoba alur lengkap, pilih **Buat Banner Sekarang**. Untuk mencoba studio dengan data yang sudah terisi, buka **Proyek Saya** dan pilih **Buka proyek contoh**.

| Perintah | Kegunaan |
| --- | --- |
| `npm run dev` | Jalankan Next.js dalam mode pengembangan |
| `npm run models` | Salin model, runtime WASM, dan Web Worker ke folder aset publik |
| `npm run typecheck` | Periksa tipe TypeScript |
| `npm test` | Uji tata letak, asosiasi nama dan foto, penyimpanan, serta dimensi ekspor |
| `npm run test:browser` | Jalankan alur aplikasi pada Chromium dengan server yang sedang aktif |
| `npm run build` | Buat build produksi |
| `npm start` | Jalankan build produksi |

Model dan worker disiapkan otomatis sebelum `dev` dan `build`. File model berasal dari paket npm yang tercatat di lockfile dan disajikan oleh aplikasi. Aplikasi inti tidak memerlukan variabel lingkungan atau kunci API.

Uji browser memakai `/usr/bin/chromium` secara default. Gunakan `CHROMIUM_PATH` untuk lokasi lain atau `AKHIRNYA_URL` bila server memakai alamat selain `http://localhost:3000`. Uji ini memeriksa pemrosesan lokal, galeri, studio, pemulihan sesi, ekspor raster dan dimensi halaman PDF, impor file, dan fallback foto asli. Pengujian tata letak mencakup delapan ukuran kelompok pada dua belas gaya dan lima rasio.

## Deploy ke Vercel

1. Impor repositori dengan preset **Next.js**. Gunakan root direktori yang memuat `package.json`.
2. Pilih Node.js 22 atau 24, gunakan `npm ci` untuk instalasi, dan gunakan `npm run build` sebagai perintah build agar langkah penyalinan model dan kompilasi worker ikut berjalan.
3. Deploy dan uji unggah satu foto, pemrosesan, lalu ekspor pada URL HTTPS hasil deployment.

Proyek disimpan per origin dan per profil browser. Gunakan unduhan `.akhirnya` dari **Proyek Saya** untuk memindahkan proyek antara localhost dan domain deployment. Proyek dari versi sebelumnya pada origin yang sama dimigrasikan otomatis. Cadangan lama tetap dapat diimpor.

## Stand banner vertikal

Pada langkah **Ukuran Banner**, pilih **Stand Banner / Vertikal** untuk ukuran 60 × 160, 80 × 180, 85 × 200, atau 100 × 200 cm. Masukkan ukuran lain melalui **Ukuran custom**, termasuk ukuran dengan desimal. Setiap gaya memiliki komposisi vertikal khusus. Ukuran yang dipilih dibawa ke studio dan menjadi ukuran awal ekspor.

## Koleksi ilustrasi

Adventure Mountain, Scrapbook Binder, dan Mukbang Picnic adalah tiga koleksi unggulan. Masing-masing menghasilkan tiga konsep yang berbeda pada latar, pola susunan, tipografi, dan bingkai. Tujuh koleksi tambahan tersedia melalui generator ilustrasi yang sama. Tema Minimalist Elegant dan Funny & Meme juga tetap tersedia.

Ilustrasi di `lib/scenes/vectors.ts` dan `lib/scenes/assets.ts` adalah SVG orisinal yang ditulis untuk proyek ini. Kode tersebut menghasilkan gunung, jalur, hutan, kertas, alat tulis, makanan, kota, karakter, bunga, dan aset tematik lain. Aset ilustrasi tidak mengambil elemen dari waralaba atau desainer eksternal. Font Caveat tersedia lewat Fontsource dengan lisensi SIL OFL. Foto demonstrasi memakai aset sintetis lokal yang sudah termasuk dalam repositori.

`lib/scenes/catalog.ts` memuat resep koleksi, aset, palet, serta pilihan komposisi. `compose.ts` menyesuaikan susunan berdasarkan jumlah wisudawan dan rasio banner. `quality.ts` menilai hierarki, kontras, keseimbangan, dan ruang kosong setelah pemeriksaan kelengkapan dan tumpang tindih. Editor menyimpan ilustrasi sebagai grup vektor, teks sebagai teks editable, dan foto sebagai lapisan terpisah dengan masker. Latar dan tekstur dapat dibuka kuncinya dari panel lapisan.

Foto cutout memakai hasil segmentasi lokal. Komposisi chibi memasang potongan wajah asli pada tubuh ilustrasi jika posisi wajah cocok. Jika data wajah kurang atau pengguna memilih potongan manual, desain memakai bingkai foto biasa. Perbandingan foto masa kecil dan sekarang serta provider AI untuk menghasilkan arah kreatif atau ilustrasi belum diimplementasikan. Koleksi dapat digunakan tanpa akun atau kunci API.

Uji browser merender stand banner 60 × 160 cm dengan 2, 3, 5, 7, 10, dan 15 wisudawan, memeriksa editor, serta mengunduh ekspor PNG 150 DPI. Set `AKHIRNYA_SHOTS=1` saat menjalankan tes untuk menyimpan tangkapan layar di `/tmp`.

## Arsitektur

- `app/` berisi rute Next.js App Router. `components/` berisi wizard, galeri, dan studio responsif. Komponen UI menggunakan Tailwind CSS dan komponen internal dengan ikon Lucide.
- `lib/themes.ts` mendefinisikan gaya, palet, tipografi, dekorasi, dan strategi tata letak. `lib/layout.ts` menyusun kandidat dengan seed deterministik, mengukur teks lewat Canvas, memeriksa batas serta tumpang tindih, dan memilih variasi dengan skor tertinggi.
- `lib/process.ts` menjalankan model pralatih MediaPipe Selfie Segmentation dan Face Detection di browser. `workers/photo.ts` menggabungkan masker dan piksel asli dalam Web Worker. Posisi wajah digunakan untuk membingkai potret dan tidak digunakan untuk mengenali identitas.
- `lib/canvas.ts` mengubah dokumen desain menjadi objek Fabric yang tetap dapat diedit. Studio menyimpan perubahan sebagai JSON terpisah dari foto dan informasi proyek. `lib/export.ts` merender PNG, JPEG, dan PDF dengan dimensi fisik yang dipilih.
- `lib/storage.ts` menyimpan proyek, foto, dan desain di IndexedDB. Antarmuka `ProjectRepository` menyediakan titik integrasi untuk penyimpanan lain.
- `lib/ai-design.ts` mendefinisikan kontrak provider dan skema spesifikasi untuk integrasi AI generatif di masa depan. Implementasi provider, akun, dan kolaborasi belum diaktifkan.

## Privasi dan batasan

- Foto tidak dikirim ke server. Penghapusan latar membutuhkan WebGL, Web Worker, dan OffscreenCanvas. Foto asli tetap dapat dipakai saat model gagal, perangkat tidak kompatibel, atau hasil segmentasi kurang tepat. Foto kelompok memakai wajah terbesar sebagai acuan dan dapat disesuaikan manual.
- Wizard menerima JPG, PNG, dan WebP hingga 20 MB per foto. Akhirnya! menyimpan foto asli. Potret yang disiapkan untuk desain dan hasil segmentasi dibatasi 1.800 piksel pada sisi terpanjang. Periksa peringatan resolusi sebelum mencetak.
- Kanvas ekspor dibatasi 40 megapiksel dan 16.384 piksel per sisi. Browser yang lebih terbatas mungkin memerlukan DPI yang lebih rendah. PDF berisi gambar RGB satu halaman, dengan ukuran fisik sesuai pengaturan. Bleed menambah margin latar. Ekspor PDF vektor, CMYK, dan perpanjangan otomatis elemen hingga tepi bleed belum tersedia.
- Penyimpanan bergantung pada kuota browser. File cadangan dapat berisi foto asli dan hasil edit. Simpan file cadangan secara privat dan ekspor sebelum menghapus data situs.
- Undo dan redo berlaku selama sesi studio aktif. Desain terakhir tetap tersimpan saat proyek dibuka kembali.
- Akhirnya! menggunakan MediaPipe berlisensi Apache-2.0, Fabric.js dan jsPDF berlisensi MIT, serta font berlisensi SIL OFL. Foto contoh adalah aset sintetis orisinal yang dibuat untuk Akhirnya!.

## Pintasan studio

Gunakan Ctrl atau Cmd + Z untuk urungkan, Ctrl atau Cmd + Shift + Z untuk ulangi, Ctrl atau Cmd + S untuk simpan, dan Ctrl atau Cmd + D untuk duplikat. Pan dengan spasi + seret. Gunakan tombol panah untuk menggeser objek atau Delete untuk menghapus objek yang dipilih.

## Identitas merek

Perjuangan panjang, bikin banner gampang.

Logo SVG versi terang, gelap, dan monokrom tersedia di `public/brand/`. Ikon ringkas dan favicon memakai `app/icon.svg`. Antarmuka memakai Bricolage Grotesque, Plus Jakarta Sans, dan Fraunces berlisensi SIL OFL. Palet desain banner ditentukan oleh setiap templat.
