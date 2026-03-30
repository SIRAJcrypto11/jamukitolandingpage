export const changelog2026 = [
    // ---- MARET 2026 ----
    {
        id: 'cl-2026-03-01-003',
        version: 'v3.8.2',
        title: '🎙️ Optimalisasi Suara & Sinkronisasi POS',
        description: `
      <h3>🚀 Peningkatan</h3>
      <ul>
        <li>Penambahan dukungan <strong>Voice Synthesis</strong> Bahasa Indonesia untuk modul POS (Voice Greeting & Total Pembayaran).</li>
        <li>Optimasi kecepatan rendering halaman Dashboard Admin sebesar 15% melalui code-splitting.</li>
        <li>Peningkatan performa rendering tabel data transaksi hingga 30% menggunakan virtualized rows.</li>
      </ul>
      <h3>🔧 Perbaikan</h3>
      <ul>
        <li>Sinkronisasi <em>timestamp</em> server di zona waktu WIB (UTC+7) untuk akurasi laporan transaksi real-time.</li>
        <li>Fix bug pada tombol 'Cetak Struk' yang kadang tidak merespon pada browser Safari iOS.</li>
      </ul>
    `,
        release_date: '2026-03-01T12:00:00.000Z',
        tags: ['peningkatan', 'perbaikan'],
        is_published: true,
        type: 'automatic',
        category: 'pos'
    },
    {
        id: 'cl-2026-02-28-001',
        version: 'v3.8.1',
        title: '🔧 Resolusi Sinkronisasi Cloud & Build Base44',
        description: `
      <h3>🔧 Perbaikan Kritis</h3>
      <ul>
        <li><strong>Base44 Router Fix:</strong> Perbaikan metode <code>get()</code> pada interceptor Base44 SDK untuk mengatasi masalah resolusi entity virtual. Menghilangkan error 404 (object Object) di seluruh komponen fetch.</li>
        <li>Memperbaiki path import sistem Changelog agar tidak mengalami bentrok dengan virtual router (Pemindahan ke <code>@/lib/changelog</code>).</li>
        <li><strong>Workspace Auto-Join:</strong> Memperbaiki infinite loop pada proses autentikasi auto-join ke workspace default untuk user baru.</li>
        <li><em>Fix Git History:</em> Resolusi pada <code>companyWorkspaceSync.js</code> dan sinkronisasi Inventori (<code>inventorySync.jsx</code>).</li>
      </ul>
    `,
        release_date: '2026-02-28T10:00:00.000Z',
        tags: ['perbaikan', 'admin'],
        is_published: true,
        type: 'automatic',
        category: 'system'
    },
    {
        id: 'cl-2026-02-25-001',
        version: 'v3.8.0.5',
        title: '🏢 Custom Forms & Workspace Visibility',
        description: `
      <h3>✨ Fitur Baru</h3>
      <ul>
        <li>Pengenalan modul <strong>WorkspaceOperationalForm.jsx</strong> untuk menangani formulir operasional dinamis spesifik per-cabang.</li>
        <li>Integrasi form <strong>FinanceAIAssistant.jsx</strong> untuk konsultasi keuangan cerdas dengan AI pada pengaturan workspace.</li>
        <li>Pengaturan Workspace Visibility: Admin kini bisa menyembunyikan workspace tertentu dari daftar publik dashboard karyawan.</li>
      </ul>
      <h3>🚀 Peningkatan</h3>
      <ul>
        <li>Refaktor pada <code>CompanySwitcher.jsx</code> dan <code>WorkspaceHeader.jsx</code> untuk memuat metadata perusahaan lebih cepat.</li>
        <li>Penyempurnaan tampilan UI pada modul Tasks (<code>Tasks.jsx</code>) dan Dashboard utama.</li>
      </ul>
    `,
        release_date: '2026-02-25T09:00:00.000Z',
        tags: ['fitur baru', 'peningkatan'],
        is_published: true,
        type: 'automatic',
        category: 'workspace'
    },

    // ---- FEBRUARI 2026 ----
    {
        id: 'cl-2026-02-20-001',
        version: 'v3.8.0',
        title: '🤖 Integrasi AI GPT-4o & Serverless Architecture',
        description: `
      <h3>✨ Fitur Baru</h3>
      <ul>
        <li>Integrasi penuh <strong>OpenAI GPT-4o Omni</strong> sebagai otak utama JAMU KITO AI Assistant.</li>
        <li>Dukungan pemrosesan prompt suara langsung (Speech-to-Text) untuk perintah admin via Python Engine sidecar (Vosk).</li>
        <li>Transisi arsitektur backend ke infrastruktur <strong>Serverless (Vercel)</strong> untuk stabilitas uptime 99.9%.</li>
        <li>Migrasi database storage tracker (<code>storageTracker.jsx</code>) ke struktur baru berbasis API.</li>
      </ul>
      <h3>🚀 Peningkatan</h3>
      <ul>
        <li>Sistem <em>fallback</em> otomatis ke Claude 3.5 Sonnet jika API OpenAI mengalami rate limit.</li>
        <li>Pemutusan dependensi status local ke <code>requestManager.jsx</code> untuk mengatasi bottleneck fetch pada dashboard utama.</li>
      </ul>
    `,
        release_date: '2026-02-20T10:00:00.000Z',
        tags: ['fitur baru', 'peningkatan'],
        is_published: true,
        type: 'automatic',
        category: 'ai'
    },
    {
        id: 'cl-2026-02-14-001',
        version: 'v3.7.5',
        title: '⚡ Peningkatan Performa Database & Finance Form',
        description: `
      <h3>🚀 Peningkatan</h3>
      <ul>
        <li>Implementasi <strong>Redis Caching</strong> untuk query produk pada <code>Shop.jsx</code>, mempercepat loading halaman hingga 40%.</li>
        <li>Optimasi rendering komponen <code>FinanceForm.jsx</code> yang sebelumnya mengalami lag saat menampung &gt;100 row jurnal entri.</li>
        <li>Sistem manajemen layout baru (<code>Layout.jsx</code>) untuk navigasi sidebar yang lebih persisten.</li>
      </ul>
      <h3>🔧 Perbaikan</h3>
      <ul>
        <li>Perbaikan bug pada Company POS Cashier (<code>CompanyPOSCashier.jsx</code>) dimana diskon tier member lambat teraplikasi pada keranjang belanja.</li>
      </ul>
    `,
        release_date: '2026-02-14T08:00:00.000Z',
        tags: ['perbaikan', 'peningkatan'],
        is_published: true,
        type: 'automatic',
        category: 'backend'
    },

    // ---- JANUARI 2026 ----
    {
        id: 'cl-2026-01-31-001',
        version: 'v3.7.0',
        title: '🛡️ Admin Management Suite v2 & Blog',
        description: `
      <h3>✨ Fitur Baru</h3>
      <ul>
        <li>Modul <strong>Blog Content Management System (CMS)</strong> dengan editor teks kaya (Quill) terintegrasi pada <code>BlogDetail.jsx</code> untuk publikasi artikel/promo.</li>
        <li>Dukungan SEO Metadata generator otomatis untuk setiap artikel blog.</li>
        <li>Manajemen Pengguna: Penambahan log audit untuk melihat kapan terakhir pengguna login ke sistem.</li>
      </ul>
    `,
        release_date: '2026-01-31T10:00:00.000Z',
        tags: ['fitur baru', 'admin'],
        is_published: true,
        type: 'automatic',
        category: 'admin'
    },
    {
        id: 'cl-2026-01-15-001',
        version: 'v3.6.0',
        title: '🏪 Multi-Vendor Marketplace Engine',
        description: `
      <h3>✨ Fitur Baru</h3>
      <ul>
        <li>Peluncuran arsitektur <strong>Multi-Tenant Marketplace</strong> memungkinkan kemitraan reseller/distributor (B2B).</li>
        <li>Sistem bagi hasil (Splitting Fee) otomatis atas setiap transaksi antar cabang/partner.</li>
        <li>Sistem rating, ulasan produk, dan filter pencarian marketplace (lokasi, harga, kategori).</li>
        <li>Laporan khusus komisi penjualan affiliate real-time.</li>
      </ul>
    `,
        release_date: '2026-01-15T10:00:00.000Z',
        tags: ['fitur baru'],
        is_published: true,
        type: 'automatic',
        category: 'ecommerce'
    }
];
