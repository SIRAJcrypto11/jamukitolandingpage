import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, XCircle, AlertTriangle, Bluetooth, 
  Power, RefreshCw, Wifi, Volume2
} from 'lucide-react';

export default function BluetoothTroubleshoot() {
  const [checklistCompleted, setChecklistCompleted] = useState({
    printerOn: false,
    bluetoothOn: false,
    printerBluetooth: false,
    unpaired: false,
    appsClosed: false,
    inRange: false
  });

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  const toggleCheck = (key) => {
    setChecklistCompleted(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const allChecked = Object.values(checklistCompleted).every(v => v);

  return (
    <div className="space-y-4">
      <Card className="bg-red-900/20 border-red-700">
        <CardHeader>
          <CardTitle className="text-red-400 text-base flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Bluetooth Tidak Bisa Pairing?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-300">
            Ikuti checklist ini step-by-step untuk mengatasi masalah pairing:
          </p>

          {/* Checklist Items */}
          <div className="space-y-2">
            <div 
              className={`p-3 rounded-lg border cursor-pointer transition-all ${checklistCompleted.printerOn ? 'bg-green-900/20 border-green-700' : 'bg-gray-800 border-gray-700'}`}
              onClick={() => toggleCheck('printerOn')}
            >
              <div className="flex items-center gap-3">
                {checklistCompleted.printerOn ? (
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-600 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">1. Nyalakan Printer</p>
                  <p className="text-xs text-gray-400">Tekan tombol power sampai lampu menyala</p>
                </div>
                <Power className="w-4 h-4 text-gray-500" />
              </div>
            </div>

            <div 
              className={`p-3 rounded-lg border cursor-pointer transition-all ${checklistCompleted.bluetoothOn ? 'bg-green-900/20 border-green-700' : 'bg-gray-800 border-gray-700'}`}
              onClick={() => toggleCheck('bluetoothOn')}
            >
              <div className="flex items-center gap-3">
                {checklistCompleted.bluetoothOn ? (
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-600 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">2. Aktifkan Bluetooth HP</p>
                  <p className="text-xs text-gray-400">Settings → Bluetooth → ON</p>
                </div>
                <Bluetooth className="w-4 h-4 text-blue-500" />
              </div>
            </div>

            <div 
              className={`p-3 rounded-lg border cursor-pointer transition-all ${checklistCompleted.printerBluetooth ? 'bg-green-900/20 border-green-700' : 'bg-gray-800 border-gray-700'}`}
              onClick={() => toggleCheck('printerBluetooth')}
            >
              <div className="flex items-center gap-3">
                {checklistCompleted.printerBluetooth ? (
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-600 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">3. Aktifkan Mode Bluetooth Printer</p>
                  <p className="text-xs text-gray-400">
                    {isAndroid && "Tekan & tahan tombol Bluetooth printer (lampu biru kedip)"}
                    {isIOS && "Long press Bluetooth button di printer"}
                    {!isMobile && "Hold Bluetooth button on printer until LED blinks"}
                  </p>
                </div>
                <Volume2 className="w-4 h-4 text-blue-500" />
              </div>
            </div>

            <div 
              className={`p-3 rounded-lg border cursor-pointer transition-all ${checklistCompleted.unpaired ? 'bg-green-900/20 border-green-700' : 'bg-gray-800 border-gray-700'}`}
              onClick={() => toggleCheck('unpaired')}
            >
              <div className="flex items-center gap-3">
                {checklistCompleted.unpaired ? (
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-600 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">4. Unpair Printer Lama (Jika Ada)</p>
                  <p className="text-xs text-gray-400">
                    Settings → Bluetooth → Cari printer → "Forget" / "Lupakan"
                  </p>
                </div>
                <RefreshCw className="w-4 h-4 text-orange-500" />
              </div>
            </div>

            <div 
              className={`p-3 rounded-lg border cursor-pointer transition-all ${checklistCompleted.appsClosed ? 'bg-green-900/20 border-green-700' : 'bg-gray-800 border-gray-700'}`}
              onClick={() => toggleCheck('appsClosed')}
            >
              <div className="flex items-center gap-3">
                {checklistCompleted.appsClosed ? (
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-600 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">5. Tutup Aplikasi Printer Lain</p>
                  <p className="text-xs text-gray-400">
                    Close semua app yang mungkin connect ke printer
                  </p>
                </div>
                <XCircle className="w-4 h-4 text-red-500" />
              </div>
            </div>

            <div 
              className={`p-3 rounded-lg border cursor-pointer transition-all ${checklistCompleted.inRange ? 'bg-green-900/20 border-green-700' : 'bg-gray-800 border-gray-700'}`}
              onClick={() => toggleCheck('inRange')}
            >
              <div className="flex items-center gap-3">
                {checklistCompleted.inRange ? (
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-600 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">6. Dekatkan HP ke Printer</p>
                  <p className="text-xs text-gray-400">
                    Jarak maksimal 1-2 meter untuk pairing pertama kali
                  </p>
                </div>
                <Wifi className="w-4 h-4 text-green-500" />
              </div>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="mt-4 p-3 bg-gray-800 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-400">Progress:</span>
              <span className="text-sm font-semibold text-white">
                {Object.values(checklistCompleted).filter(v => v).length} / 6
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-600 to-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(Object.values(checklistCompleted).filter(v => v).length / 6) * 100}%` }}
              />
            </div>
          </div>

          {allChecked && (
            <div className="p-3 bg-green-900/20 border border-green-700 rounded-lg">
              <p className="text-green-400 font-semibold text-sm mb-2">
                ✅ Semua langkah selesai!
              </p>
              <p className="text-xs text-gray-300 mb-3">
                Sekarang coba pairing lagi:
              </p>
              <div className="space-y-2 text-xs text-gray-300">
                <p>1. Buka Settings → Bluetooth</p>
                <p>2. Scan/Refresh untuk cari device</p>
                <p>3. Pilih "JK-5802H" atau "BlueTooth Printer"</p>
                <p>4. Masukkan PIN: <strong className="text-white">0000</strong> atau <strong className="text-white">1234</strong></p>
                <p>5. Tunggu sampai status "Connected"</p>
                <p>6. Kembali ke app, klik "Connect Bluetooth"</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alternative Solutions */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-base">
            🔧 Solusi Alternatif Jika Bluetooth Tetap Gagal:
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 bg-blue-900/20 border border-blue-700 rounded-lg">
            <p className="text-blue-400 font-semibold text-sm mb-2">
              1. Reset Printer ke Factory Settings
            </p>
            <div className="space-y-1 text-xs text-gray-300">
              <p>• Matikan printer</p>
              <p>• Tekan & tahan tombol FEED + Power bersamaan</p>
              <p>• Tahan 5 detik sampai print test page</p>
              <p>• Coba pairing lagi dari awal</p>
            </div>
          </div>

          <div className="p-3 bg-purple-900/20 border border-purple-700 rounded-lg">
            <p className="text-purple-400 font-semibold text-sm mb-2">
              2. Gunakan Desktop/Laptop
            </p>
            <div className="space-y-1 text-xs text-gray-300">
              <p>• Connect printer via USB ke laptop</p>
              <p>• Buka app SNISHOP di laptop</p>
              <p>• Connect USB printer</p>
              <p>• Print dari laptop (paling stabil)</p>
            </div>
          </div>

          <div className="p-3 bg-green-900/20 border border-green-700 rounded-lg">
            <p className="text-green-400 font-semibold text-sm mb-2">
              3. Install Native Printer App (Sementara)
            </p>
            <div className="space-y-1 text-xs text-gray-300">
              <p>• Download app "Bluetooth Thermal Printer" dari Play Store</p>
              <p>• Gunakan app tersebut untuk pairing pertama kali</p>
              <p>• Setelah berhasil paired, baru connect dari SNISHOP</p>
            </div>
          </div>

          <div className="p-3 bg-orange-900/20 border border-orange-700 rounded-lg">
            <p className="text-orange-400 font-semibold text-sm mb-2">
              4. Cek Kompatibilitas HP
            </p>
            <div className="space-y-1 text-xs text-gray-300">
              <p>• Beberapa HP (Oppo/Vivo) ada restrict Bluetooth</p>
              <p>• Coba di HP lain untuk test</p>
              <p>• Update OS HP ke versi terbaru</p>
              <p>• Enable semua permission untuk Chrome</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Device Info */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-sm">Info Device Anda:</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400">Platform:</span>
            <span className="text-white">
              {isAndroid && '📱 Android'}
              {isIOS && '📱 iOS'}
              {!isMobile && '💻 Desktop'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Bluetooth Support:</span>
            <Badge className={navigator.bluetooth ? 'bg-green-600' : 'bg-red-600'}>
              {navigator.bluetooth ? '✅ YES' : '❌ NO'}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">USB Support:</span>
            <Badge className={navigator.usb && !isMobile ? 'bg-green-600' : 'bg-red-600'}>
              {navigator.usb && !isMobile ? '✅ YES' : '❌ NO'}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Browser:</span>
            <span className="text-white">
              {/Chrome/i.test(navigator.userAgent) && 'Chrome ✅'}
              {/Safari/i.test(navigator.userAgent) && !(/Chrome/i.test(navigator.userAgent)) && 'Safari'}
              {/Firefox/i.test(navigator.userAgent) && 'Firefox'}
              {!/Chrome|Safari|Firefox/i.test(navigator.userAgent) && 'Other'}
            </span>
          </div>

          {!navigator.bluetooth && (
            <div className="mt-3 p-2 bg-red-900/20 border border-red-700 rounded">
              <p className="text-red-400 text-xs font-semibold">
                ⚠️ Browser Anda tidak support Web Bluetooth!
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Gunakan Chrome atau Edge browser
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Pairing Guide */}
      <Card className="bg-gray-800 border-yellow-700">
        <CardHeader>
          <CardTitle className="text-yellow-400 text-base">
            📋 Panduan Manual Pairing (Zijiang JK-5802H)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">1.</span>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">Nyalakan Printer & Aktifkan Bluetooth</p>
                <p className="text-xs text-gray-400 mt-1">
                  • Tekan tombol Power<br/>
                  • Tekan tombol Bluetooth (icon BT) sampai lampu biru kedip-kedip cepat<br/>
                  • Lampu kedip = printer dalam mode pairing
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">2.</span>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">Buka Settings Bluetooth di HP</p>
                <p className="text-xs text-gray-400 mt-1">
                  {isAndroid && "• Settings → Connected devices → Connection preferences → Bluetooth"}
                  {isIOS && "• Settings → Bluetooth"}
                  {!isMobile && "• System Settings → Bluetooth & devices"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">3.</span>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">Scan & Cari Printer</p>
                <p className="text-xs text-gray-400 mt-1">
                  • Klik "Scan" atau "Search for devices"<br/>
                  • Tunggu 5-10 detik<br/>
                  • Cari nama: <strong className="text-white">"JK-5802H"</strong>, <strong className="text-white">"Zijiang"</strong>, atau <strong className="text-white">"BlueTooth Printer"</strong>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">4.</span>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">Klik Printer → Masukkan PIN</p>
                <p className="text-xs text-gray-400 mt-1">
                  • PIN default: <strong className="text-white bg-gray-700 px-2 py-1 rounded">0000</strong> atau <strong className="text-white bg-gray-700 px-2 py-1 rounded">1234</strong><br/>
                  • Jika ditolak, coba: 1111, 9999, 0001
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">5.</span>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">Tunggu "Connected"</p>
                <p className="text-xs text-gray-400 mt-1">
                  • Status harus berubah jadi "Connected" atau "Paired"<br/>
                  • Lampu printer berhenti kedip (jadi nyala terus)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-green-400 font-bold">6.</span>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">Connect dari App SNISHOP</p>
                <p className="text-xs text-gray-400 mt-1">
                  • Kembali ke app SNISHOP<br/>
                  • Klik "Connect Bluetooth"<br/>
                  • Pilih printer dari popup<br/>
                  • Test print → DONE! ✅
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Common Problems */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-base">
            ⚠️ Problem yang Sering Terjadi:
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div className="p-3 bg-gray-700 rounded-lg">
            <p className="text-white font-semibold mb-2">❌ "Printer tidak muncul di scan"</p>
            <p className="text-gray-300">
              → Restart printer & HP<br/>
              → Pastikan lampu Bluetooth printer kedip<br/>
              → Jarak HP & printer max 1 meter<br/>
              → Coba di HP lain untuk test printer
            </p>
          </div>

          <div className="p-3 bg-gray-700 rounded-lg">
            <p className="text-white font-semibold mb-2">❌ "PIN ditolak / Pairing failed"</p>
            <p className="text-gray-300">
              → Coba semua PIN: 0000, 1234, 1111, 9999<br/>
              → Reset printer ke factory (hold FEED + Power)<br/>
              → Unpair dulu di Settings Bluetooth
            </p>
          </div>

          <div className="p-3 bg-gray-700 rounded-lg">
            <p className="text-white font-semibold mb-2">❌ "Connected tapi tidak bisa print"</p>
            <p className="text-gray-300">
              → Tutup aplikasi printer lain<br/>
              → Disconnect & reconnect di app<br/>
              → Restart browser Chrome<br/>
              → Cek kertas printer (harus ada kertas)
            </p>
          </div>

          <div className="p-3 bg-gray-700 rounded-lg">
            <p className="text-white font-semibold mb-2">❌ "Oppo/Vivo tidak bisa pairing"</p>
            <p className="text-gray-300">
              → Settings → Apps → Chrome → Permissions → Bluetooth (ON)<br/>
              → Settings → Privacy → Location → ON (required untuk Bluetooth)<br/>
              → Battery optimization OFF untuk Chrome<br/>
              → Update Chrome ke versi terbaru
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Video Tutorial Link */}
      <Card className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-purple-700">
        <CardContent className="p-4 text-center">
          <p className="text-white font-semibold mb-2">
            🎥 Masih Bingung?
          </p>
          <p className="text-sm text-gray-300 mb-3">
            Search di YouTube: "Cara pairing printer thermal bluetooth Android"
          </p>
          <Button 
            className="bg-red-600 hover:bg-red-700"
            onClick={() => window.open('https://www.youtube.com/results?search_query=cara+pairing+printer+thermal+bluetooth+android', '_blank')}
          >
            📺 Lihat Tutorial Video
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}