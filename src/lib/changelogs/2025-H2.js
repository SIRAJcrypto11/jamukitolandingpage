export const changelog2025H2 = [
    // ---- DESEMBER 2025 ----
    {
        id: 'cl-2025-12-20-001',
        version: 'v3.5.0',
        title: '📈 Business Intelligence & Multi-Warehouse',
        description: `
      <h3>✨ Fitur Baru</h3>
      <ul>
        <li>Dashboard <strong>AI Analytics & Forecasting</strong> (<code>Dashboard.jsx</code>) untuk prediksi penjualan 30 hari ke depan berdasarkan data historis dan tren pasar regional.</li>
        <li>Dukungan penuh <strong>Multi-Warehouse Inventory</strong> (Manajemen dan transfer stok antar banyak gudang fisik). Visibilitas live stok antar rute.</li>
        <li>Sistem otomatisasi pembuatan Laporan Keuangan (Laba Rugi, Neraca, Arus Kas) setiap pukul 23:59 akhir bulan.</li>
        <li>Penghitungan Estimasi Nilai Inventarisasi (FIFO & LIFO) secara real-time.</li>
      </ul>
      <h3>🔧 Perbaikan</h3>
      <ul>
        <li>Perbaikan kalkulasi jurnal pembalik pada sistem akuntansi core.</li>
        <li>Optimasi sinkronisasi gudang (<code>companyWorkspaceSync.js</code>) untuk menghindari perselisihan data stok saat 2 kasir menembak barang yang sama bersamaan.</li>
      </ul>
    `,
        release_date: '2025-12-20T10:00:00.000Z',
        tags: ['fitur baru'],
        is_published: true,
        type: 'automatic',
        category: 'analytics'
    },
    {
        id: 'cl-2025-12-05-001',
        version: 'v3.4.5',
        title: '🎨 Standarisasi Desain Google MUI & UI Overhaul',
        description: `
      <h3>🚀 Peningkatan</h3>
      <ul>
        <li>Perombakan besar-besaran antarmuka seluruh modul ERP agar sesuai dengan pedoman desain Standard Google. Seluruh bayangan (shadow), kelengkungan sudut (border-radius), dan kontras warna (contrast-ratio) diperbaiki.</li>
        <li>Penyeragaman komponen tombol (<code>Button.jsx</code>), form input, modal overlay, dan tabel menggunakan library komponen Shadcn UI yang dimodifikasi khusus untuk JAMU KITO.</li>
        <li>Penambahan <em>Dark Mode</em> responsif di seluruh halaman aplikasi, mendeteksi preferensi OS pengguna.</li>
      </ul>
    `,
        release_date: '2025-12-05T09:00:00.000Z',
        tags: ['peningkatan'],
        is_published: true,
        type: 'automatic',
        category: 'ui'
    },

    // ---- NOVEMBER 2025 ----
    {
        id: 'cl-2025-11-20-001',
        version: 'v3.4.0',
        title: '💳 Payment Gateway Midtrans & Purchase Orders',
        description: `
      <h3>✨ Fitur Baru</h3>
      <ul>
        <li>Integrasi resmi <strong>Midtrans Payment Gateway</strong> mendukung pembayaran langsung QRIS Statis & Dinamis, Virtual Account BCA/BNI/Mandiri, dan E-Wallet (GoPay, OVO, ShopeePay) untuk pelanggan B2C.</li>
        <li>Peluncuran modul <strong>Supplier Management & Purchase Order (PO)</strong> elektronik. Persetujuan PO 3 jenjang (Staff -&gt; SPV -&gt; Manajer Pembelian).</li>
        <li>Status pelacakan pesanan (Resi tracking API) terintegrasi dengan ekspedisi lokal JAMU KITO (JNE, SiCepat, J&T).</li>
      </ul>
      <h3>🔧 Perbaikan</h3>
      <ul>
        <li>Fix bug status pembayaran "pending" yang tidak otomatis menjadi "paid" di frontend saat webhooks dari bank mengalami timeout.</li>
      </ul>
    `,
        release_date: '2025-11-20T10:00:00.000Z',
        tags: ['fitur baru', 'perbaikan'],
        is_published: true,
        type: 'automatic',
        category: 'payment'
    },
    {
        id: 'cl-2025-11-05-001',
        version: 'v3.3.5',
        title: '📱 PWA Offline Support & Background Sync',
        description: `
      <h3>🚀 Peningkatan</h3>
      <ul>
        <li>Implementasi Standar <strong>Progressive Web App (PWA)</strong> (<code>manifest.json</code> & Service Workers). Sistem JAMU KITO ERP kini bisa diinstal di Home Screen Android, iOS, maupun OS Windows seperti aplikasi native mandiri.</li>
        <li>Sistem Queue <em>Background Sync</em>: Transaksi POS (<code>CompanyPOSCashier.jsx</code>) yang diinput saat perangkat mati koneksi internet (Offline), akan dikarantina di IndexedDB lokal dan ditembakkan massal ke server saat indikator online hijau menyala.</li>
      </ul>
    `,
        release_date: '2025-11-05T14:30:00.000Z',
        tags: ['peningkatan'],
        is_published: true,
        type: 'automatic',
        category: 'system'
    },

    // ---- OKTOBER 2025 ----
    {
        id: 'cl-2025-10-15-001',
        version: 'v3.3.0',
        title: '🧾 Core Payroll Pro & Tax Enforcement',
        description: `
      <h3>✨ Fitur Baru</h3>
      <ul>
        <li>Sistem kalkulasi pajak dinamis 2025: mendukung aturan transisi PPN 11% menjadi 12% secara opsional dan konfiguratif. Kalkulator PPh 21 otomatis diterapkan ke komponen potong pendapatan slip gaji operasional.</li>
        <li>Modul <strong>Payroll Professional</strong> (<code>HR_Payroll.jsx</code>): Parameter gaji pokok, tunjangan jabatan, BPJS Ketenagakerjaan & Kesehatan, serta absensi.</li>
        <li>Penyunting Dokumen Generatif: Editor template untuk struk kertas kasir (thermal) dan faktur perpajakan komersial perusahaan (cetak logo, barcode E-Faktur, syarat & ketentuan custom).</li>
      </ul>
    `,
        release_date: '2025-10-15T10:00:00.000Z',
        tags: ['fitur baru', 'perbaikan'],
        is_published: true,
        type: 'automatic',
        category: 'finance'
    },

    // ---- SEPTEMBER 2025 ----
    {
        id: 'cl-2025-09-10-001',
        version: 'v3.2.0',
        title: '🔄 CRM Loyalty System & Multi-Currency',
        description: `
      <h3>✨ Fitur Baru</h3>
      <ul>
        <li>Modul <strong>Customer Relationship (CRM)</strong>: Sistem akumulasi poin pelanggan (Loyalty Program) otomatis saat checkout POS dengan penanda nomor telpon klien.</li>
        <li>Manajemen Diskon Harga Tetap/Persen Tiered Berjenjang (Member Publik, Reseller Silver, Gold, Distributor Platinum). Perubahan harga produk otomatis sesuai jenis pelanggan yang dilayani.</li>
        <li>Dukungan kalkulasi <strong>Multi-Currency</strong> (IDR, USD, SGD, MYR) untuk pemesanan barang impor/ekspor di <code>FinanceForm.jsx</code> dengan sinkronisasi nilai tukar API Bank Indonesia harian.</li>
      </ul>
    `,
        release_date: '2025-09-10T10:00:00.000Z',
        tags: ['fitur baru', 'peningkatan'],
        is_published: true,
        type: 'automatic',
        category: 'crm'
    },

    // ---- AGUSTUS 2025 ----
    {
        id: 'cl-2025-08-20-001',
        version: 'v3.1.0',
        title: '🔒 Skalabilitas Data & Keamanan RBAC Enterprise',
        description: `
      <h3>✨ Fitur Baru</h3>
      <ul>
        <li>Penerapan <strong>Role Based Access Control (RBAC)</strong> tingkat dewa (Fine-Grained). Admin operasional bisa membuat jenis akun kustom seperti "Manajer Gudang B" yang "Boleh membaca stok, boleh mutasi masuk, dilarang melihat HPP modal, dan dilarang hapus barang stok nol".</li>
        <li>Web Console dan Portal Webhook API untuk Developer mengintegrasikan sistem JAMU KITO dengan aplikasi IoT pihak ketiga secara aman (API Keys Tracking log).</li>
      </ul>
      <h3>🚀 Peningkatan</h3>
      <ul>
        <li>Refaktor total arsitektur ORM Database yang kini sanggup menangani lebih dari 50,000 baris kueri transaksi per hari tanpa degradasi latency pada pencari tabel.</li>
        <li>Penerapan enkripsi satu arah (salting) AES pada parameter sensitif profil pergerakan uang internal.</li>
      </ul>
    `,
        release_date: '2025-08-20T10:00:00.000Z',
        tags: ['fitur baru', 'peningkatan'],
        is_published: true,
        type: 'automatic',
        category: 'backend'
    },

    // ---- JULI 2025 ----
    {
        id: 'cl-2025-07-25-001',
        version: 'v3.0.0',
        title: '👥 Evaluasi Modul SDM (HR) & Vanguard Audit Logs',
        description: `
      <h3>✨ Fitur Baru</h3>
      <ul>
        <li>Implementasi instrumen mesin <strong>Audit Tracker Logs Vanguard</strong>: Mulai detik peluncuran modul ini, semua operasi krusial seperti hapus dokumen, paksa sunting transaksi kadaluarsa, diskon paksa POS, dan mutasi siluman stok akan direkam permanen mencatat profil pelaksana, cap waktu server UTC, nilai data sebelum, dan nilai sesudah perubahan.</li>
        <li>Integrasi sensor lokasi geofencing browser <strong>GPS Attendance Tracking</strong> (Mencegah karyawan nakal login absen masuk/pulang di luar radius 100 meter koordinat properti fisik kantor/gudang perseroan).</li>
        <li>Penambahan siklus pengajuan mutasi dan Cuti (Leave Request System) antar departemen dan HR.</li>
      </ul>
    `,
        release_date: '2025-07-25T10:00:00.000Z',
        tags: ['fitur baru', 'admin'],
        is_published: true,
        type: 'automatic',
        category: 'hr'
    }
];
