/**
 * Changelog Entity - Local Storage Based
 * Menyimpan riwayat pembaruan sistem JAMU KITO INTERNASIONAL
 * CRUD operations dengan localStorage persistence
 */

const STORAGE_KEY = 'jamu_kito_changelogs';

// ============================================
// DATA CHANGELOG SISTEM - SEMUA UPDATE & FITUR
// ============================================
const DEFAULT_CHANGELOGS = [
    // ---- MARET 2026 ----
    {
        id: 'cl-2026-03-25-001',
        version: 'v3.11.0',
        title: '📊 Company Dashboard: Executive Business Intelligence',
        description: `
      <h3>✨ Dashboard Company Upgrade — Real-Time Business Intelligence</h3>
      <ul>
        <li><strong>10 Widget BI Baru</strong> — Dashboard company kini menampilkan data bisnis secara langsung: KPI Keuangan, Tren Penjualan, Alokasi Pendapatan, Produk Terlaris, Stok Menipis, Absensi, Transaksi Terbaru, Kasir Aktif, dan Skor Kesehatan Operasional.</li>
        <li><strong>Grafik Real-Time</strong> — Area Chart 7-hari untuk tren penjualan POS, Pie Chart alokasi keuangan per kategori, dan sparklines KPI untuk setiap kartu ringkasan.</li>
        <li><strong>Zero Flickering</strong> — Data dimuat dari cache terlebih dahulu, kemudian diperbarui secara diam-diam dari database. Sinkronisasi real-time via BroadcastChannel dari modul POS, Inventory, dan Finance.</li>
        <li><strong>Skor Kesehatan Operasional</strong> — Indikator komposit dari 4 faktor (keuangan, stok, penjualan, kehadiran) untuk gambaran kesehatan bisnis sekilas.</li>
        <li><strong>AI Assistant Dipertahankan</strong> — Seluruh fungsi AI Assistant termasuk deteksi workspace real-time tetap berjalan normal, hanya ukuran layout yang disesuaikan di mode company.</li>
      </ul>
    `,
        release_date: '2026-03-25T09:41:00.000Z',
        tags: ['fitur baru', 'dashboard', 'analytics', 'system'],
        is_published: true,
        type: 'automatic',
        category: 'analytics'
    },
    {
        id: 'cl-2026-03-14-001',
        version: 'v3.10.4',
        title: '🌐 Universal Sales Channels: Full Module Sync',
        description: `
      <h3>✨ Fitur Baru & Sinkronisasi</h3>
      <ul>
        <li><strong>Unified Sales Channels</strong> — Sinkronisasi penuh 12 channel penjualan (termasuk 3 segmen geografis baru) di seluruh ekosistem: POS, Business Reports, Finance, dan Pengaturan Struk.</li>
        <li><strong>Geographic Tracking</strong> — Penambahan channel: <strong>Online Dalam Kota</strong>, <strong>Online Luar Kota</strong>, dan <strong>Online Luar Provinsi</strong> untuk akurasi data pengiriman.</li>
        <li><strong>Icon Consistency</strong> — Penyeragaman icon (Shopee, Grab, dll) di seluruh modul untuk estetika aplikasi yang lebih premium.</li>
      </ul>
    `,
        release_date: '2026-03-14T02:45:00.000Z',
        tags: ['fitur baru', 'pos', 'system'],
        is_published: true,
        type: 'automatic',
        category: 'pos'
    },
    {
        id: 'cl-2026-03-13-003',
        version: 'v3.10.3',
        title: '🛠️ Fix: Critical Syntax & POS Customer Entry',
        description: `
      <h3>🔧 Perbaikan & Peningkatan</h3>
      <ul>
        <li><strong>Critical Syntax Fix</strong> — Memperbaiki error "Unexpected token" di Laporan Bisnis (CompanyReports) akibat karakter liar yang mengganggu render komponen.</li>
        <li><strong>Customer Data Persistence</strong> — Memperbaiki isu data lokasi (maps_url) dan foto (image_url) yang tidak tersimpan dengan standarisasi nama field sesuai skema backend.</li>
        <li><strong>POS Customer Onboarding</strong> — Memungkinkan kasir untuk langsung memasukkan Link Google Maps dan Foto Rumah saat menambah member baru di Kasir.</li>
        <li><strong>Cloudinary Integration</strong> — Integrasi unggah foto rumah langsung di modul Kasir dengan preview instan.</li>
      </ul>
    `,
        release_date: '2026-03-13T10:00:00.000Z',
        tags: ['perbaikan', 'crm', 'pos'],
        is_published: true,
        type: 'automatic',
        category: 'pos'
    },
    {
        id: 'cl-2026-03-13-002',
        version: 'v3.10.2',
        title: '🛡️ Fix: Component Stability & Hook Consistency',
        description: `
      <h3>🔧 Perbaikan</h3>
      <ul>
        <li><strong>React Hooks Consistency</strong> — Memperbaiki error "Rendered more hooks than during the previous render" di Laporan Bisnis (CompanyReports). Alur logika render dirombak total untuk memastikan hook berjalan setiap render tanpa pengecualian, meningkatkan stabilitas saat halaman di-refresh.</li>
      </ul>
    `,
        release_date: '2026-03-13T09:00:00.000Z',
        tags: ['perbaikan', 'stabilitas'],
        is_published: true,
        type: 'automatic',
        category: 'core'
    },
    {
        id: 'cl-2026-03-13-001',
        version: 'v3.10.1',
        title: '📸 Customer House Photo & GMaps Integration',
        description: `
      <h3>✨ Fitur Baru</h3>
      <ul>
        <li><strong>Customer House Photo</strong> — CRM mendukung unggah foto rumah pelanggan via Cloudinary. Foto muncul di preview POS dan instruksi Tugas Terapis.</li>
        <li><strong>Google Maps Integration</strong> — Penyimpanan link Google Maps untuk penentuan lokasi layanan yang presisi.</li>
        <li><strong>Detailed Service Briefing</strong> — Terapis menerima briefing super lengkap (Nama, WA, Alamat, Maps, Foto Rumah) langsung di aplikasi.</li>
      </ul>
    `,
        release_date: '2026-03-13T08:15:00.000Z',
        tags: ['fitur baru', 'crm', 'pos'],
        is_published: true,
        type: 'automatic',
        category: 'pos'
    },
    {
        id: 'cl-2026-03-11-002',
        version: 'v3.9.2',
        title: '🛡️ Robust POS Checkout (Anti-Data Loss)',
        description: `
      <h3>🚀 Peningkatan Keandalan Server (Robustness)</h3>
      <ul>
        <li><strong>Sinkronisasi Transaksi Ketat</strong> — Merombak alur "Bayar" (Checkout) Kasir. Sebelumnya, sistem langsung mengosongkan keranjang sebelum database menanggapi, menyebabkan data rawan hilang bila koneksi terputus. Sekarang, sistem <strong>mewajibkan</strong> data inti tersimpan sempurna ke Cloud sebelum mengosongkan keranjang & menampilkan notifikasi sukses.</li>
        <li><strong>Proteksi Keranjang</strong> — Jika terjadi error koneksi saat memproses pembayaran, keranjang belanja <strong>tidak akan hilang</strong>, dan kasir dapat sekadar menekan tombol "Bayar" lagi tanpa harus scan ulang seluruh item.</li>
      </ul>
    `,
        release_date: '2026-03-11T15:20:00.000Z',
        tags: ['pos', 'perbaikan', 'keamanan-data'],
        is_published: true,
        type: 'automatic',
        category: 'pos'
    },
    {
        id: 'cl-2026-03-11-001',
        version: 'v3.9.1',
        title: '🐛 Fix: Sinkronisasi Tanggal Transaksi POS Biasa (Penjualan)',
        description: `
      <h3>🔧 Perbaikan</h3>
      <ul>
        <li><strong>Edit Tanggal Persisten</strong> — Perbaikan isu dimana tanggal transaksi penjualan (POS) tidak berubah saat diedit. Sistem kini akan menggunakan \`transaction_date\` alih-alih mencoba menimpa \`created_date\` yang bersifat immutable, sehingga perubahan tanggal di antarmuka tabel dan print invoice segera ter-update.</li>
      </ul>
    `,
        release_date: '2026-03-11T14:12:00.000Z',
        tags: ['perbaikan'],
        is_published: true,
        type: 'automatic',
        category: 'pos'
    },
    {
        id: 'cl-2026-03-10-001',
        version: 'v3.9.0',
        title: '✏️ Edit & Delete Transaksi Kasir (POS)',
        description: `
      <h3>✨ Fitur Baru</h3>
      <ul>
        <li><strong>Edit Metadata Transaksi</strong> — Owner/Admin kini bisa merubah tanggal transaksi, metode bayar (cash/transfer/qris), sales channel, & note pada riwayat penjualan di Laporan POS/Finance. Singkron 100% antar modul.</li>
        <li><strong>Hapus Transaksi Sinkron</strong> — Menghapus data transaksi penjualan kini akan otomatis melacak & menghapus riwayat Keuangan (Finance) yang berkaitan untuk mencegah kebocoran data double-entry.</li>
        <li><strong>Role-Based Action</strong> — Pengamanan tombol Aksi (Edit & Hapus) hanya untuk role Owner & Admin di tab Penjualan.</li>
      </ul>
    `,
        release_date: '2026-03-10T20:55:00.000Z',
        tags: ['fitur baru', 'perbaikan'],
        is_published: true,
        type: 'automatic',
        category: 'pos'
    },
    {
        id: 'cl-2026-03-01-001',
        version: 'v3.8.0',
        title: '🎯 Kanban Board Enhancement & Workspace Improvements',
        description: `
      <h3>🔧 Perbaikan</h3>
      <ul>
        <li><strong>Kanban Board</strong> — Perbaikan drag & drop task antar kolom, fix rendering issue pada card</li>
        <li><strong>Workspace Page</strong> — Optimasi layout dan penghapusan kode yang tidak terpakai</li>
        <li><strong>Workspace Navigation</strong> — Fix tab navigation dan auto-join ke workspace utama</li>
      </ul>
      <h3>⚡ Peningkatan</h3>
      <ul>
        <li>Peningkatan stabilitas Kanban Board dengan state management yang lebih baik</li>
        <li>Optimasi rendering komponen Workspace untuk performa lebih cepat</li>
      </ul>
    `,
        release_date: '2026-03-01T04:09:00.000Z',
        tags: ['perbaikan', 'peningkatan'],
        is_published: true,
        type: 'automatic',
        category: 'workspace'
    },
    {
        id: 'cl-2026-03-01-002',
        version: 'v3.7.5',
        title: '📋 Sistem Changelog & Updates Page',
        description: `
      <h3>✨ Fitur Baru</h3>
      <ul>
        <li><strong>Changelog Entity</strong> — Entitas baru untuk mencatat semua pembaruan sistem secara terstruktur</li>
        <li><strong>Updates Page</strong> — Halaman timeline pembaruan dengan tampilan modern dan animasi smooth</li>
        <li><strong>Admin Changelog</strong> — Panel admin untuk mengelola catatan pembaruan (CRUD) dengan rich text editor</li>
        <li><strong>Tag Filtering</strong> — Sistem tag untuk kategorisasi update: Fitur Baru, Perbaikan, Peningkatan, Admin</li>
      </ul>
    `,
        release_date: '2026-03-01T12:00:00.000Z',
        tags: ['fitur baru'],
        is_published: true,
        type: 'automatic',
        category: 'system'
    },

    // ---- FEBRUARI 2026 ----
    {
        id: 'cl-2026-02-28-001',
        version: 'v3.7.0',
        title: '🔧 Fix Base44 SDK & Build Error Resolution',
        description: `
      <h3>🔧 Perbaikan Kritis</h3>
      <ul>
        <li><strong>Base44 SDK get()</strong> — Perbaikan argumen method get() di seluruh komponen untuk mengatasi error 404 dan 429</li>
        <li><strong>Vite Build Errors</strong> — Resolusi syntax errors, import issues, dan entity references yang gagal saat build</li>
        <li><strong>Package Updates</strong> — Update base44 packages ke versi terbaru untuk kompatibilitas</li>
      </ul>
      <h3>⚡ Peningkatan</h3>
      <ul>
        <li>Optimasi import statements di seluruh komponen</li>
        <li>Perbaikan error handling pada API calls</li>
      </ul>
    `,
        release_date: '2026-02-28T05:00:00.000Z',
        tags: ['perbaikan'],
        is_published: true,
        type: 'automatic',
        category: 'core'
    },
    {
        id: 'cl-2026-02-27-001',
        version: 'v3.6.5',
        title: '📖 README & Deployment Documentation',
        description: `
      <h3>📝 Dokumentasi</h3>
      <ul>
        <li><strong>README.md</strong> — Panduan deployment lengkap untuk Vercel</li>
        <li><strong>Environment Variables</strong> — Dokumentasi variabel lingkungan yang diperlukan</li>
        <li><strong>Serverless Limitations</strong> — Penjelasan batasan WhatsApp Baileys pada Vercel serverless functions</li>
        <li><strong>Architecture Guide</strong> — Panduan arsitektur aplikasi untuk developer</li>
      </ul>
    `,
        release_date: '2026-02-27T03:43:00.000Z',
        tags: ['peningkatan'],
        is_published: true,
        type: 'automatic',
        category: 'documentation'
    },
    {
        id: 'cl-2026-02-26-001',
        version: 'v3.6.0',
        title: '🚀 Vercel Deployment & Serverless Architecture',
        description: `
      <h3>✨ Fitur Baru</h3>
      <ul>
        <li><strong>Vercel Deployment</strong> — Konfigurasi penuh untuk deployment di Vercel</li>
        <li><strong>Stateless Download Engine</strong> — Refaktor engine download agar kompatibel dengan serverless</li>
        <li><strong>PostgreSQL Config</strong> — Konfigurasi database PostgreSQL untuk environment production</li>
      </ul>
      <h3>🔧 Perbaikan</h3>
      <ul>
        <li>Penyesuaian routing untuk Vercel serverless functions</li>
        <li>Optimasi cold start time untuk serverless environment</li>
      </ul>
    `,
        release_date: '2026-02-26T03:34:00.000Z',
        tags: ['fitur baru', 'perbaikan'],
        is_published: true,
        type: 'automatic',
        category: 'deployment'
    },
    {
        id: 'cl-2026-02-22-001',
        version: 'v3.5.0',
        title: '🗄️ Database Integration & Authentication System',
        description: `
      <h3>✨ Fitur Baru</h3>
      <ul>
        <li><strong>PostgreSQL + Prisma ORM</strong> — Integrasi database relasional untuk data persistence</li>
        <li><strong>NextAuth.js</strong> — Sistem autentikasi yang aman dengan session management</li>
        <li><strong>React Server Actions</strong> — Efisiensi data management dengan server-side actions</li>
        <li><strong>Database Migration</strong> — Sistem migrasi database otomatis dengan Prisma</li>
      </ul>
      <h3>⚡ Peningkatan</h3>
      <ul>
        <li>Transisi dari mock data ke database-driven application</li>
        <li>Schema design yang scalable untuk ERP system</li>
      </ul>
    `,
        release_date: '2026-02-22T08:16:00.000Z',
        tags: ['fitur baru', 'peningkatan'],
        is_published: true,
        type: 'automatic',
        category: 'backend'
    },
    {
        id: 'cl-2026-02-21-001',
        version: 'v3.4.0',
        title: '🐙 GitHub Deployment & Version Control',
        description: `
      <h3>✨ Fitur Baru</h3>
      <ul>
        <li><strong>GitHub Repository</strong> — Inisialisasi repository dan push ke GitHub</li>
        <li><strong>Git Workflow</strong> — Setup branching strategy dan commit conventions</li>
        <li><strong>CI/CD Pipeline</strong> — Konfigurasi deployment otomatis</li>
      </ul>
    `,
        release_date: '2026-02-21T02:34:00.000Z',
        tags: ['fitur baru'],
        is_published: true,
        type: 'automatic',
        category: 'devops'
    },
    {
        id: 'cl-2026-02-21-002',
        version: 'v3.3.5',
        title: '🎨 UI Overhaul — Google Standard Design',
        description: `
      <h3>🎨 Desain</h3>
      <ul>
        <li><strong>Google Standard UI</strong> — Porting seluruh UI ke estetika Google Standard</li>
        <li><strong>Landing Page</strong> — Redesign halaman landing dengan HTML/CSS original</li>
        <li><strong>Ecosystem Dock</strong> — Komponen dock navigasi baru yang interaktif</li>
        <li><strong>Launchpad</strong> — Komponen launchpad untuk akses cepat fitur</li>
        <li><strong>Responsive Design</strong> — Optimasi tampilan untuk semua ukuran layar</li>
      </ul>
    `,
        release_date: '2026-02-21T03:57:00.000Z',
        tags: ['peningkatan'],
        is_published: true,
        type: 'automatic',
        category: 'ui'
    },

    // ---- JANUARI 2026 ----
    {
        id: 'cl-2026-01-24-001',
        version: 'v3.3.0',
        title: '🏷️ Rebranding SNISHOP → JAMU KITO INTERNASIONAL',
        description: `
      <h3>🏷️ Rebranding</h3>
      <ul>
        <li><strong>Nama Aplikasi</strong> — Perubahan branding dari "SNISHOP" ke "JAMU KITO"</li>
        <li><strong>Export Reports</strong> — Update branding pada laporan CSV dan PDF</li>
        <li><strong>Company Switcher</strong> — Perbaikan logic switcher dan tampilan workspace</li>
        <li><strong>Konsistensi</strong> — Penggantian semua referensi SNISHOP di seluruh codebase</li>
      </ul>
    `,
        release_date: '2026-01-24T14:45:00.000Z',
        tags: ['peningkatan', 'admin'],
        is_published: true,
        type: 'automatic',
        category: 'branding'
    },

    // ---- FITUR UTAMA SISTEM ----
    {
        id: 'cl-2026-01-20-001',
        version: 'v3.2.0',
        title: '🏢 Workspace & Team Management System',
        description: `
      <h3>✨ Fitur Baru</h3>
      <ul>
        <li><strong>Multi-Workspace</strong> — Dukungan multiple workspace per organisasi</li>
        <li><strong>Workspace Members</strong> — Manajemen anggota workspace dengan role & permission</li>
        <li><strong>Workspace Settings</strong> — Halaman pengaturan workspace yang komprehensif</li>
        <li><strong>Auto-Join</strong> — Anggota otomatis masuk ke workspace utama saat registrasi</li>
        <li><strong>Workspace Notes</strong> — Catatan kolaboratif per workspace</li>
        <li><strong>Workspace Attendance</strong> — Sistem absensi terintegrasi per workspace</li>
        <li><strong>Workspace AI Assistant</strong> — Floating AI assistant untuk bantuan kontekstual</li>
      </ul>
    `,
        release_date: '2026-01-20T10:00:00.000Z',
        tags: ['fitur baru'],
        is_published: true,
        type: 'automatic',
        category: 'workspace'
    },
    {
        id: 'cl-2026-01-18-001',
        version: 'v3.1.0',
        title: '📊 Dashboard & Analytics Suite',
        description: `
      <h3>✨ Fitur Baru</h3>
      <ul>
        <li><strong>Dashboard Utama</strong> — Overview bisnis dengan widget KPI, grafik penjualan, dan statistik real-time</li>
        <li><strong>Advanced Analytics</strong> — Analisis data mendalam dengan visualisasi interaktif (Recharts)</li>
        <li><strong>KPI Tracker</strong> — Pelacakan Key Performance Indicators per departemen</li>
        <li><strong>Company Reports</strong> — Laporan perusahaan komprehensif dengan export PDF/CSV</li>
      </ul>
    `,
        release_date: '2026-01-18T10:00:00.000Z',
        tags: ['fitur baru'],
        is_published: true,
        type: 'automatic',
        category: 'analytics'
    },
    {
        id: 'cl-2026-01-15-001',
        version: 'v3.0.0',
        title: '🛒 Point of Sale (POS) System',
        description: `
      <h3>✨ Fitur Baru</h3>
      <ul>
        <li><strong>POS Kasir</strong> — Interface kasir modern dengan barcode scanning</li>
        <li><strong>Produk & Kategori</strong> — Manajemen produk dengan kategori hierarkis</li>
        <li><strong>Transaksi</strong> — Pencatatan transaksi penjualan real-time</li>
        <li><strong>Member POS</strong> — Sistem membership pelanggan dengan poin loyalitas</li>
        <li><strong>Inventory Management</strong> — Pelacakan stok otomatis dengan notifikasi stok rendah</li>
        <li><strong>POS Reports</strong> — Laporan penjualan harian, mingguan, bulanan</li>
        <li><strong>Company POS</strong> — POS terpisah untuk level perusahaan</li>
        <li><strong>Digital Products</strong> — Dukungan produk digital (voucher, e-code)</li>
      </ul>
    `,
        release_date: '2026-01-15T10:00:00.000Z',
        tags: ['fitur baru'],
        is_published: true,
        type: 'automatic',
        category: 'pos'
    },
    {
        id: 'cl-2026-01-12-001',
        version: 'v2.8.0',
        title: '👥 Human Resources (HR) Module',
        description: `
      <h3>✨ Fitur Baru</h3>
      <ul>
        <li><strong>Employee Management</strong> — Database karyawan dengan profil lengkap</li>
        <li><strong>Leave Management</strong> — Pengajuan dan approval cuti online</li>
        <li><strong>Payroll System</strong> — Penggajian otomatis dengan komponen gaji yang fleksibel</li>
        <li><strong>Payroll Automation</strong> — Jadwal penggajian otomatis bulanan</li>
        <li><strong>Attendance System</strong> — Absensi digital dengan geolokasi</li>
        <li><strong>Performance Reviews</strong> — Penilaian kinerja karyawan periodik</li>
        <li><strong>Employee Portal</strong> — Portal self-service untuk karyawan</li>
        <li><strong>Company HR</strong> — Dashboard HR tingkat perusahaan</li>
      </ul>
    `,
        release_date: '2026-01-12T10:00:00.000Z',
        tags: ['fitur baru'],
        is_published: true,
        type: 'automatic',
        category: 'hr'
    },
    {
        id: 'cl-2026-01-10-001',
        version: 'v2.6.0',
        title: '💰 Finance & Accounting Module',
        description: `
      <h3>✨ Fitur Baru</h3>
      <ul>
        <li><strong>Financial Records</strong> — Pencatatan transaksi keuangan (pemasukan & pengeluaran)</li>
        <li><strong>Finance Form</strong> — Formulir input keuangan dengan validasi</li>
        <li><strong>Finance AI Assistant</strong> — Asisten AI untuk analisis keuangan dan rekomendasi</li>
        <li><strong>HPP Calculator</strong> — Kalkulator Harga Pokok Penjualan otomatis</li>
        <li><strong>Invoice System</strong> — Pembuatan dan manajemen faktur</li>
        <li><strong>Saldo Tracker</strong> — Pelacakan saldo real-time per akun</li>
        <li><strong>Workspace Operational Form</strong> — Formulir operasional per workspace</li>
      </ul>
    `,
        release_date: '2026-01-10T10:00:00.000Z',
        tags: ['fitur baru'],
        is_published: true,
        type: 'automatic',
        category: 'finance'
    },
    {
        id: 'cl-2026-01-08-001',
        version: 'v2.4.0',
        title: '📋 Task Management & Project Tools',
        description: `
      <h3>✨ Fitur Baru</h3>
      <ul>
        <li><strong>Task Board</strong> — Manajemen tugas dengan multiple views (list, board, calendar)</li>
        <li><strong>Kanban Board</strong> — Drag & drop Kanban board untuk visual workflow</li>
        <li><strong>Recurring Tasks</strong> — Tugas berulang otomatis (harian, mingguan, bulanan)</li>
        <li><strong>Task Status Updater</strong> — Quick update status tugas</li>
        <li><strong>Goal Tracking</strong> — Pelacakan target dan sasaran tim</li>
        <li><strong>Notes & Documents</strong> — Sistem catatan dan dokumentasi kolaboratif</li>
        <li><strong>Note Editor</strong> — Rich text editor untuk catatan detail</li>
      </ul>
    `,
        release_date: '2026-01-08T10:00:00.000Z',
        tags: ['fitur baru'],
        is_published: true,
        type: 'automatic',
        category: 'productivity'
    },
    {
        id: 'cl-2026-01-06-001',
        version: 'v2.2.0',
        title: '📧 CRM & Marketing Tools',
        description: `
      <h3>✨ Fitur Baru</h3>
      <ul>
        <li><strong>CRM</strong> — Customer Relationship Management dengan pipeline penjualan</li>
        <li><strong>Sales Pipeline</strong> — Visualisasi pipeline deals dengan drag & drop stages</li>
        <li><strong>Customer Database</strong> — Database pelanggan dengan riwayat interaksi</li>
        <li><strong>Email Marketing</strong> — Campaign email marketing dengan template builder</li>
        <li><strong>Referral System</strong> — Program referral dengan kode unik dan komisyang otomatis</li>
        <li><strong>Referral Codes</strong> — Generasi dan pelacakan kode referral</li>
        <li><strong>Commission Tracker</strong> — Pelacakan komisi partner/affiliate</li>
      </ul>
    `,
        release_date: '2026-01-06T10:00:00.000Z',
        tags: ['fitur baru'],
        is_published: true,
        type: 'automatic',
        category: 'crm'
    },
    {
        id: 'cl-2026-01-04-001',
        version: 'v2.0.0',
        title: '🏢 Multi-Company & Membership System',
        description: `
      <h3>✨ Fitur Baru</h3>
      <ul>
        <li><strong>Company Management</strong> — Dukungan multi-company dengan Company Switcher</li>
        <li><strong>Company Membership</strong> — Sistem membership perusahaan dengan tier berbeda</li>
        <li><strong>Company Products</strong> — Katalog produk per perusahaan</li>
        <li><strong>Company Orders</strong> — Manajemen pesanan tingkat perusahaan</li>
        <li><strong>Company Settings</strong> — Pengaturan perusahaan yang komprehensif</li>
        <li><strong>Company Attendance</strong> — Sistem absensi perusahaan</li>
        <li><strong>Partnership Page</strong> — Halaman kemitraan untuk partnership program</li>
      </ul>
    `,
        release_date: '2026-01-04T10:00:00.000Z',
        tags: ['fitur baru'],
        is_published: true,
        type: 'automatic',
        category: 'company'
    },
    {
        id: 'cl-2026-01-02-001',
        version: 'v1.8.0',
        title: '🛍️ E-Commerce & Shop Module',
        description: `
      <h3>✨ Fitur Baru</h3>
      <ul>
        <li><strong>Shop</strong> — Toko online terintegrasi dengan katalog produk</li>
        <li><strong>Shopping Cart</strong> — Keranjang belanja dengan kalkulasi otomatis</li>
        <li><strong>Checkout</strong> — Proses checkout dengan integrasi Midtrans payment gateway</li>
        <li><strong>My Orders</strong> — Halaman riwayat pesanan pelanggan</li>
        <li><strong>Manufacturing</strong> — Modul manufaktur untuk tracking produksi</li>
        <li><strong>Assets Management</strong> — Manajemen aset perusahaan</li>
      </ul>
    `,
        release_date: '2026-01-02T10:00:00.000Z',
        tags: ['fitur baru'],
        is_published: true,
        type: 'automatic',
        category: 'ecommerce'
    },
    {
        id: 'cl-2025-12-28-001',
        version: 'v1.6.0',
        title: '🤖 AI & Smart Features',
        description: `
      <h3>✨ Fitur Baru</h3>
      <ul>
        <li><strong>AI Assistant</strong> — Asisten AI pintar untuk analisis bisnis dan rekomendasi</li>
        <li><strong>Finance AI</strong> — AI khusus untuk analisis keuangan dan prediksi</li>
        <li><strong>Smart Suggestions</strong> — Sistem saran cerdas untuk optimasi bisnis</li>
        <li><strong>Feature Suggestion</strong> — Halaman saran fitur dari pengguna dengan voting system</li>
      </ul>
    `,
        release_date: '2025-12-28T10:00:00.000Z',
        tags: ['fitur baru'],
        is_published: true,
        type: 'automatic',
        category: 'ai'
    },
    {
        id: 'cl-2025-12-25-001',
        version: 'v1.4.0',
        title: '💳 Payment & Pricing System',
        description: `
      <h3>✨ Fitur Baru</h3>
      <ul>
        <li><strong>Midtrans Integration</strong> — Integrasi payment gateway Midtrans untuk pembayaran online</li>
        <li><strong>Pricing Plans</strong> — Halaman harga dengan multiple tier (Free, Pro, Enterprise)</li>
        <li><strong>Subscription System</strong> — Sistem langganan dengan billing otomatis</li>
        <li><strong>Payment Functions</strong> — Serverless functions untuk proses pembayaran aman</li>
      </ul>
    `,
        release_date: '2025-12-25T10:00:00.000Z',
        tags: ['fitur baru'],
        is_published: true,
        type: 'automatic',
        category: 'payment'
    },
    {
        id: 'cl-2025-12-22-001',
        version: 'v1.2.0',
        title: '💬 Team Communication & Chat',
        description: `
      <h3>✨ Fitur Baru</h3>
      <ul>
        <li><strong>Team Chat</strong> — Sistem chat tim real-time dengan channels</li>
        <li><strong>Chat Channels</strong> — Buat dan kelola channel chat per topik/departemen</li>
        <li><strong>Notification System</strong> — Sistem notifikasi in-app untuk aktivitas penting</li>
        <li><strong>Blog System</strong> — Blog internal perusahaan dengan editor rich text</li>
        <li><strong>Career Page</strong> — Halaman karir untuk rekrutmen</li>
      </ul>
    `,
        release_date: '2025-12-22T10:00:00.000Z',
        tags: ['fitur baru'],
        is_published: true,
        type: 'automatic',
        category: 'communication'
    },
    {
        id: 'cl-2025-12-20-001',
        version: 'v1.0.0',
        title: '🚀 Launch — Platform ERP JAMU KITO INTERNASIONAL',
        description: `
      <h3>🎉 Peluncuran Pertama</h3>
      <ul>
        <li><strong>Core Platform</strong> — Fondasi platform ERP all-in-one untuk bisnis JAMU KITO</li>
        <li><strong>User Authentication</strong> — Sistem login dan registrasi dengan Base44 SDK</li>
        <li><strong>Layout System</strong> — Sidebar navigation, topbar, dan responsive layout</li>
        <li><strong>Settings Page</strong> — Halaman pengaturan profil dan preferensi</li>
        <li><strong>Admin Dashboard</strong> — Panel admin untuk pengelolaan sistem</li>
        <li><strong>Offline Mode</strong> — Dukungan mode offline dengan sync otomatis</li>
        <li><strong>Data Cleanup</strong> — Utility untuk pembersihan dan maintenance data</li>
        <li><strong>Auth Recovery</strong> — Sistem pemulihan autentikasi untuk session expired</li>
        <li><strong>Request Manager</strong> — Manajemen request API dengan retry dan queue</li>
      </ul>
    `,
        release_date: '2025-12-20T10:00:00.000Z',
        tags: ['fitur baru', 'admin'],
        is_published: true,
        type: 'automatic',
        category: 'core'
    },
    {
        id: 'cl-2025-12-18-001',
        version: 'v0.9.0',
        title: '📅 Appointment & Scheduling System',
        description: `
      <h3>✨ Fitur Baru</h3>
      <ul>
        <li><strong>Appointments</strong> — Sistem janji temu dan penjadwalan meeting</li>
        <li><strong>Calendar View</strong> — Tampilan kalender untuk manajemen jadwal</li>
        <li><strong>Scheduling</strong> — Penjadwalan otomatis dengan conflict detection</li>
      </ul>
    `,
        release_date: '2025-12-18T10:00:00.000Z',
        tags: ['fitur baru'],
        is_published: true,
        type: 'automatic',
        category: 'scheduling'
    },
];

// ===========================
// CHANGELOG ENTITY CLASS
// ===========================
class ChangelogEntity {
    constructor() {
        this._initializeStorage();
    }

    _initializeStorage() {
        try {
            const existing = localStorage.getItem(STORAGE_KEY);
            if (!existing) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CHANGELOGS));
            } else {
                // Merge: add any new default entries that don't exist yet
                const stored = JSON.parse(existing);
                const storedIds = new Set(stored.map(e => e.id));
                const newEntries = DEFAULT_CHANGELOGS.filter(e => !storedIds.has(e.id));
                if (newEntries.length > 0) {
                    const merged = [...newEntries, ...stored];
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
                }
            }
        } catch (e) {
            console.warn('[Changelog] localStorage init failed, using in-memory fallback', e);
            this._fallbackData = [...DEFAULT_CHANGELOGS];
        }
    }

    _getData() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [...DEFAULT_CHANGELOGS];
        } catch {
            return this._fallbackData || [...DEFAULT_CHANGELOGS];
        }
    }

    _saveData(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch {
            this._fallbackData = data;
        }
    }

    _sortData(data, sortBy) {
        if (!sortBy) return data;
        const desc = sortBy.startsWith('-');
        const field = desc ? sortBy.slice(1) : sortBy;
        return [...data].sort((a, b) => {
            const va = a[field] || '';
            const vb = b[field] || '';
            if (va < vb) return desc ? 1 : -1;
            if (va > vb) return desc ? -1 : 1;
            return 0;
        });
    }

    // CRUD Operations matching Base44 SDK interface
    async list(sortBy) {
        const data = this._getData();
        return this._sortData(data, sortBy);
    }

    async filter(conditions = {}, sortBy) {
        const data = this._getData();
        const filtered = data.filter(entry => {
            return Object.entries(conditions).every(([key, val]) => {
                return entry[key] === val;
            });
        });
        return this._sortData(filtered, sortBy);
    }

    async get(id) {
        const data = this._getData();
        const entry = data.find(e => e.id === id);
        if (!entry) throw new Error(`Changelog entry not found: ${id}`);
        return entry;
    }

    async create(entryData) {
        const data = this._getData();
        const newEntry = {
            ...entryData,
            id: entryData.id || `cl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            created_at: new Date().toISOString(),
        };
        data.unshift(newEntry);
        this._saveData(data);
        return newEntry;
    }

    async update(id, updateData) {
        const data = this._getData();
        const idx = data.findIndex(e => e.id === id);
        if (idx === -1) throw new Error(`Changelog entry not found: ${id}`);
        data[idx] = { ...data[idx], ...updateData, updated_at: new Date().toISOString() };
        this._saveData(data);
        return data[idx];
    }

    async delete(id) {
        const data = this._getData();
        const filtered = data.filter(e => e.id !== id);
        if (filtered.length === data.length) throw new Error(`Changelog entry not found: ${id}`);
        this._saveData(filtered);
        return true;
    }
}

export const Changelog = new ChangelogEntity();
