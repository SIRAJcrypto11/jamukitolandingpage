export const changelog2025H1 = [
    // ---- JUNI 2025 ----
    {
        id: 'cl-2025-06-15-001',
        version: 'v2.5.0',
        title: '💰 Visualisasi Cashflow Real-Time & POS Peak Analysis',
        description: `
      <h3>✨ Fitur Baru</h3>
      <ul>
        <li>Peluncuran perdana Modul Visualisasi <strong>Cashflow Dynamics</strong> pada Dashboard Finansial Utama. Ekstraksi otomatis rekap transaksi harian memampukan owner memantau aliran kas operasional toko/gudang dalam grafik batang interaktif secara live.</li>
        <li>Fitur prediktif <strong>Peak Hours Analysis</strong> di POS: Algoritma memetakan pola jam transaksi padat (missal 12:00-14:00) yang diekspor sebagai rekomendasi pendelegasian shift perbantuan kasir, menekan angka antrian panjang operasional JAMU KITO.</li>
        <li>Peta produk terlaris lintas cabang: Daftar "Top 10 Fast-Moving" & "Bottom 20 Slow-Moving" dengan peringatan penumpukan barang.</li>
      </ul>
      <h3>🔧 Perbaikan</h3>
      <ul>
        <li>Resolusi bug pembulatan pajak desimal (Math.round) saat mencelup total invoice POS bernilai koma ke keranjang pembayaran.</li>
      </ul>
    `,
        release_date: '2025-06-15T10:00:00.000Z',
        tags: ['fitur baru', 'perbaikan'],
        is_published: true,
        type: 'automatic',
        category: 'finance'
    },
    {
        id: 'cl-2025-06-05-001',
        version: 'v2.4.1',
        title: '📋 Optimalisasi Board Productivity & Tasks',
        description: `
      <h3>🚀 Peningkatan</h3>
      <ul>
        <li>Refaktor total modul manajemen tugas (<code>Tasks.jsx</code>): Komponen <em>Drag & Drop</em> (menggunakan dnd-kit modern) pada Kanban Task Board kini mendukung pergerakan geser kolom list dan sub-task dengan animasi rigid 60fps tanpa lagging DOM.</li>
        <li>Fitur sinkronisasi penugasan antar divisi, ketika tugas ditandai "Selesai", atasan langsung mendapatkan pop-up web.</li>
      </ul>
    `,
        release_date: '2025-06-05T11:00:00.000Z',
        tags: ['peningkatan'],
        is_published: true,
        type: 'automatic',
        category: 'productivity'
    },

    // ---- MEI 2025 ----
    {
        id: 'cl-2025-05-20-001',
        version: 'v2.2.0',
        title: '🏢 Multi-Workspace Isolation & Kolaborasi Tim',
        description: `
      <h3>✨ Fitur Baru</h3>
      <ul>
        <li>Peluncuran arsitektur <strong>Multi-Workspace Data Isolation</strong> pada <code>Workspaces.jsx</code> & <code>Workspace.jsx</code>: Logika ini memisahkan operasional tiap departemen perseroan (Gudang Induk, Tim Backoffice, Kasir Cabang) ke ruang kelola tertutup, namun seluruhnya bermuara aman pada laporan Buku Besar Konsolidasi Pimpinan Utama.</li>
        <li>Mini-app <strong>Team Messenger & Mentions</strong>: Fasilitas chat internal antar staff terotorisasi di dalam portal ERP tanpa bergantung aplikasi pihak ketiga. Sangat mempercepat komunikasi lintas gudang mengenai konfirmasi mutasi stok.</li>
        <li>Editor Kolaboratif <strong>JAMU-Docs (Note/SOP)</strong>: Fasilitas basis pengetahuan (knowledge-base) internal perusahaan langsung di menu sidebar.</li>
      </ul>
    `,
        release_date: '2025-05-20T09:00:00.000Z',
        tags: ['fitur baru'],
        is_published: true,
        type: 'automatic',
        category: 'workspace'
    },

    // ---- APRIL 2025 ----
    {
        id: 'cl-2025-04-30-001',
        version: 'v2.0.0',
        title: '📦 Ultimate Product Management & Barcode Engine',
        description: `
      <h3>✨ Fitur Baru</h3>
      <ul>
        <li>Modul master <strong>Katalog Produk Perusahaan Konfigurasi Lanjut</strong>. Kini sistem mendeteksi dan bisa mengurai struktur Varian Kompleks multi dimensi (misalnya: Ramuan Jahe Merah -&gt; Level Pedas: Sedang/Kuat -&gt; Kemasan: 100gr/500gr). Masing-masing anak varian memiliki SKU asil, stok, dan harga spesifik unik independen.</li>
        <li>Mesin generator manifes bundling (Pecah Kardus / Paket Hemat Momen Khusus).</li>
        <li><strong>Sistem Cetak Barcode Terintegrasi</strong>: Satu kali klik otomatis me-render lembaran PDF dengan label barcode 1D Code-128 / 2D QR beserta nama PT & harga jual eceran yang siap tempel untuk alat scanner kasir fisik.</li>
      </ul>
      <h3>🔧 Perbaikan</h3>
      <ul>
        <li>Tuntasan isu kalkulasi Margin / HPP yang salah menampilkan proporsi profit ketika ada barang dikembalikan (Retur) tanpa bon asil.</li>
      </ul>
    `,
        release_date: '2025-04-30T10:00:00.000Z',
        tags: ['fitur baru', 'perbaikan'],
        is_published: true,
        type: 'automatic',
        category: 'ecommerce'
    },

    // ---- MARET 2025 ----
    {
        id: 'cl-2025-03-25-001',
        version: 'v1.1.0',
        title: '📒 Fondasi Finansial & POS Shift Management',
        description: `
      <h3>✨ Fitur Baru</h3>
      <ul>
        <li>Rilis Fasa-2 (Menyusul HR): <strong>Sub-Sistem Point of Sales (POS) Klasik</strong> operasional. Menyokong koneksi hardware barcode scanner laser fisik, metode "Parkir Keranjang" (Save Bill sementara untuk melayani antrian berikutnya), dan rekonsiliasi kas laci per-Shift kerja Karyawan harian.</li>
        <li><strong>Modul Akuntansi Buku Besar & Jurnal Umum (Ledger)</strong>: Perilisan logika <em>Double-Entry Bookkeeping</em> murni. Segala pergeseran saldo, dari penjualan tunai kasir hingga penerimaan restock gudang dari maklon JAMU KITO otomatis merangkum jurnal Akun T dan menyeimbangkan Neraca secara ghaib di belakang layar.</li>
        <li>Modul permohonan dan pelunasan Piutang Kasbon karyawan perusahaan.</li>
      </ul>
    `,
        release_date: '2025-03-25T10:00:00.000Z',
        tags: ['fitur baru'],
        is_published: true,
        type: 'automatic',
        category: 'pos'
    },
    {
        id: 'cl-2025-03-10-001',
        version: 'v1.0.0',
        title: '🚀 Grand Launch: Core JAMU KITO ERP System',
        description: `
      <h3>🎉 Lahirnya Revolusi Digital Perusahaan</h3>
      <ul>
        <li><strong>Infrastruktur Core Enterprise:</strong> Tanggal rilis perdana sistem operasi (ERP) awan sentral terpadu yang didesain secara kustom sebagai tulang punggung bisnis PT. JAMU KITO INTERNASIONAL.</li>
        <li>Penyebaran Framework Keamanan tingkat dewa menggunakan JWT Authentication, integrasi sesi persistens, serta navigasi antarmuka intuitif (Sidebar Moduler / Topbar Global Navbar) terakselerasi SPA (Single Page Applications) Vite React (<code>Home.jsx</code> & <code>Layout.jsx</code>).</li>
        <li>Modul Utama <strong>Employee Hub / HR Dasar</strong>: Sinkronisasi database seluruh profil staf aktif berjenjang, arsip kartu identitas, dan peran.</li>
        <li>Modul <strong>Inventori Statis Dasar</strong>: Pencatatan manual barang masuk, sisa barang, sirkulasi keluar harian untuk membiasakan admin dengan pola kerja digital (tahap pre-barcode).</li>
      </ul>
      <br>
      <blockquote><p><em>Hari ini kita meletakkan batu bata pertama. Besok kita bangun istana digital operasi Nusantara.</em></p></blockquote>
    `,
        release_date: '2025-03-10T08:00:00.000Z',
        tags: ['fitur baru', 'admin'],
        is_published: true,
        type: 'automatic',
        category: 'core'
    }
];
