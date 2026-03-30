import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Wifi, 
  WifiOff, 
  CloudUpload, 
  Database, 
  CheckCircle, 
  AlertCircle,
  Smartphone,
  Laptop,
  RefreshCw
} from 'lucide-react';

/**
 * OfflineGuide - Dokumentasi offline mode untuk user
 * Menjelaskan cara kerja dan best practices
 */

export default function OfflineGuide() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 border-blue-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <WifiOff className="w-6 h-6 text-blue-400" />
            Mode Offline - Panduan Lengkap
          </CardTitle>
          <p className="text-sm text-gray-300 mt-2">
            Sistem SNISHOP mendukung mode offline penuh. Semua fitur tetap berfungsi tanpa internet!
          </p>
        </CardHeader>
      </Card>

      {/* How It Works */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-green-400" />
            Cara Kerja
          </CardTitle>
        </CardHeader>
        <CardContent className="text-gray-300 space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                1
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">📥 First Load (Online)</h4>
                <p className="text-sm text-gray-400">
                  Saat pertama kali membuka aplikasi dengan internet, semua data penting akan otomatis di-download dan disimpan di browser Anda.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-yellow-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                2
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">📵 Offline Mode</h4>
                <p className="text-sm text-gray-400">
                  Ketika koneksi terputus, semua fitur tetap berfungsi normal. Perubahan data (tambah/edit/hapus) akan disimpan sementara di browser.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                3
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">🔄 Auto-Sync (Online Kembali)</h4>
                <p className="text-sm text-gray-400">
                  Begitu koneksi pulih, sistem akan otomatis mengunggah semua perubahan offline ke server. Tidak ada data yang hilang!
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            Fitur yang Tersedia Offline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-blue-400" />
                Manajemen Tugas
              </h4>
              <ul className="text-sm text-gray-400 space-y-1 ml-6">
                <li>✓ Buat tugas baru</li>
                <li>✓ Edit tugas existing</li>
                <li>✓ Update status & deadline</li>
                <li>✓ Hapus tugas</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                <Laptop className="w-4 h-4 text-purple-400" />
                Catatan
              </h4>
              <ul className="text-sm text-gray-400 space-y-1 ml-6">
                <li>✓ Tulis catatan baru</li>
                <li>✓ Edit catatan</li>
                <li>✓ Tambah label</li>
                <li>✓ Hapus catatan</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                <Database className="w-4 h-4 text-green-400" />
                Keuangan
              </h4>
              <ul className="text-sm text-gray-400 space-y-1 ml-6">
                <li>✓ Catat transaksi</li>
                <li>✓ Edit transaksi</li>
                <li>✓ Hapus transaksi</li>
                <li>✓ Lihat laporan</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                <CloudUpload className="w-4 h-4 text-yellow-400" />
                Company Data
              </h4>
              <ul className="text-sm text-gray-400 space-y-1 ml-6">
                <li>✓ Lihat data perusahaan</li>
                <li>✓ Manage members</li>
                <li>✓ Update permissions</li>
                <li>✓ View analytics</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Best Practices */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-400" />
            Tips & Best Practices
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-gray-300">
          <div className="space-y-3">
            <div className="p-3 bg-green-900/20 border border-green-700 rounded-lg">
              <p className="text-sm text-green-300 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Auto-Sync Aktif:</strong> Sistem akan otomatis menyinkronkan data setiap 15 detik saat online. Tidak perlu manual refresh!
                </span>
              </p>
            </div>

            <div className="p-3 bg-blue-900/20 border border-blue-700 rounded-lg">
              <p className="text-sm text-blue-300 flex items-start gap-2">
                <Database className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Data Aman:</strong> Semua perubahan offline tersimpan di browser dan akan otomatis di-upload saat koneksi pulih.
                </span>
              </p>
            </div>

            <div className="p-3 bg-yellow-900/20 border border-yellow-700 rounded-lg">
              <p className="text-sm text-yellow-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Perhatian:</strong> Hindari menghapus data browser (Clear Cache) saat ada data pending sync, atau data akan hilang.
                </span>
              </p>
            </div>

            <div className="p-3 bg-purple-900/20 border border-purple-700 rounded-lg">
              <p className="text-sm text-purple-300 flex items-start gap-2">
                <CloudUpload className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Manual Sync:</strong> Klik icon status koneksi di header untuk memaksa sinkronisasi manual atau melihat detail pending operations.
                </span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technical Details */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">💻 Detail Teknis</CardTitle>
        </CardHeader>
        <CardContent className="text-gray-400 text-sm space-y-2">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-white font-semibold mb-2">Storage</h4>
              <ul className="space-y-1 ml-4">
                <li>• IndexedDB untuk data offline</li>
                <li>• Cache API untuk aset aplikasi</li>
                <li>• LocalStorage untuk preferences</li>
                <li>• Kapasitas: ~50MB+ per domain</li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-2">Sync Mechanism</h4>
              <ul className="space-y-1 ml-4">
                <li>• Auto-sync setiap 15 detik</li>
                <li>• Retry otomatis (max 3x)</li>
                <li>• Conflict resolution: Last-Write-Wins</li>
                <li>• Queue-based sync untuk stabilitas</li>
              </ul>
            </div>
          </div>

          <div className="mt-4 p-3 bg-gray-800 border border-gray-700 rounded-lg">
            <p className="text-xs text-gray-500">
              💡 <strong>Pro Tip:</strong> Untuk pengalaman terbaik, buka aplikasi setidaknya 1x sehari dengan koneksi internet untuk memastikan semua data tersinkronisasi.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}