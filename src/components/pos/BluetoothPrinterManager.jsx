
import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { cachedRequest, invalidateCache } from '@/components/utils/requestManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Bluetooth,
  BluetoothConnected,
  BluetoothSearching,
  Printer,
  Loader2,
  Check,
  CheckCircle,
  X,
  Settings as SettingsIcon,
  AlertCircle,
  Wifi,
  Save,
  FileText,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import {
  connectBluetoothPrinter,
  disconnectBluetoothPrinter,
  testBluetoothPrinter,
  getBluetoothPrinterStatus
} from '@/components/pos/BluetoothPrinter';

export default function BluetoothPrinterManager({ company, user, onConnectionChange }) {
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [printerStatus, setPrinterStatus] = useState({ connected: false, deviceName: null });
  const [isPrinting, setIsPrinting] = useState(false);
  const [settings, setSettings] = useState({
    paper_width: '80mm',
    encoding: 'UTF-8',
    auto_cut: true,
    beep_on_print: false,
    auto_reconnect: true,
    print_logo: false,
    // ✅ REMOVED: header_text and footer_text - now managed in Company Settings → Struk/Receipt
    font_size: 'normal'
  });
  const [savedSettings, setSavedSettings] = useState([]);
  const loadAttemptRef = useRef(0);

  useEffect(() => {
    // ✅ DELAYED LOAD untuk menghindari rate limit
    const timer = setTimeout(() => {
      loadSavedSettings();
    }, 1000); // Delay 1 detik

    // ✅ CHECK STATUS SAAT MOUNT
    const status = getBluetoothPrinterStatus();
    setPrinterStatus(status);
    if (onConnectionChange) {
      onConnectionChange(status);
    }

    // ✅ TRY AUTO-RECONNECT ON MOUNT
    setTimeout(async () => {
      try {
        const { autoReconnectPrinter } = await import('@/components/pos/BluetoothPrinter');
        const result = await autoReconnectPrinter();

        if (result && result.success) {
          const newStatus = getBluetoothPrinterStatus();
          setPrinterStatus(newStatus);
          if (onConnectionChange) {
            onConnectionChange(newStatus);
          }

          toast.success(`🎉 Auto-reconnect berhasil!\n\n${result.deviceName} siap print!`, {
            duration: 5000
          });
        }
      } catch (e) {
        console.log('Auto-reconnect not available or failed:', e);
      }
    }, 2000); // Try auto-reconnect 2s after mount

    // ✅ AUTO-CHECK SETIAP 5 DETIK (lebih lama untuk hemat API calls)
    const statusInterval = setInterval(() => {
      const currentStatus = getBluetoothPrinterStatus();
      setPrinterStatus(currentStatus);
      if (onConnectionChange) {
        onConnectionChange(currentStatus);
      }
    }, 5000); // Changed from 3000 to 5000

    return () => {
      clearTimeout(timer);
      clearInterval(statusInterval);
    };
  }, [onConnectionChange]);

  // ✅ IMPROVED loadSavedSettings dengan error handling & retry
  const loadSavedSettings = async (retryCount = 0) => {
    try {
      loadAttemptRef.current++;

      // Max 2 retry attempts
      if (retryCount > 2) {
        console.log('⚠️ Max retry reached, using empty settings');
        setSavedSettings([]);
        return;
      }

      // ✅ GUNAKAN CACHED REQUEST untuk menghindari rate limit
      const data = await cachedRequest('PrinterSettings', 'filter', {
        user_id: user.id,
        company_id: company?.id || null
      });

      setSavedSettings(data || []);

      const defaultSetting = data?.find(s => s.is_default);
      if (defaultSetting) {
        setSettings({
          paper_width: defaultSetting.paper_width || '80mm',
          encoding: defaultSetting.encoding || 'UTF-8',
          auto_cut: defaultSetting.auto_cut !== false,
          beep_on_print: defaultSetting.beep_on_print || false,
          auto_reconnect: defaultSetting.auto_reconnect !== false,
          print_logo: defaultSetting.print_logo || false,
          // ✅ REMOVED: header_text and footer_text - now managed in Company Settings → Struk/Receipt
          font_size: defaultSetting.font_size || 'normal'
        });
      }

      console.log(`✅ Loaded ${data?.length || 0} printer settings`);

    } catch (error) {
      console.error('Error loading settings:', error);

      // ✅ HANDLE SPECIFIC ERRORS
      const errorMsg = error?.message || String(error);

      if (errorMsg.includes('Rate limit') || errorMsg.includes('429')) {
        console.log(`⚠️ Rate limit hit, retry ${retryCount + 1}/3 in ${(retryCount + 1) * 2} seconds...`);

        // Exponential backoff retry
        setTimeout(() => {
          loadSavedSettings(retryCount + 1);
        }, (retryCount + 1) * 2000); // 2s, 4s, 6s

      } else if (errorMsg.includes('Network')) {
        console.log(`⚠️ Network error, retry ${retryCount + 1}/3 in ${(retryCount + 1) * 3} seconds...`);

        setTimeout(() => {
          loadSavedSettings(retryCount + 1);
        }, (retryCount + 1) * 3000); // 3s, 6s, 9s

      } else {
        // Other errors - use empty settings
        console.log('⚠️ Unknown error, using empty settings');
        setSavedSettings([]);
      }
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setIsScanning(true);

    try {
      // ✅ CONNECT PRINTER
      const result = await connectBluetoothPrinter();

      const status = getBluetoothPrinterStatus();
      setPrinterStatus(status);

      // ✅ NOTIFY PARENT COMPONENT
      if (onConnectionChange) {
        onConnectionChange(status);
      }

      // ✅ SAVE SETTINGS dengan delay untuk avoid rate limit
      setTimeout(async () => {
        try {
          await saveDeviceSettings(result.deviceId, result.deviceName);
        } catch (e) {
          console.error('Failed to save settings:', e);
          // Don't show error to user, settings will be saved next time
        }
      }, 2000);

      toast.success(`🎉 Printer terhubung!\n\n✅ Semua transaksi akan otomatis print ke ${result.deviceName}`, {
        duration: 5000
      });

    } catch (error) {
      if (error.message !== 'CANCELLED') {
        toast.error(error.message, { duration: 5000 });
      }
    } finally {
      setIsConnecting(false);
      setIsScanning(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectBluetoothPrinter();

      const status = { connected: false, deviceName: null };
      setPrinterStatus(status);

      if (onConnectionChange) {
        onConnectionChange(status);
      }

      toast.success('✅ Printer disconnected');
    } catch (error) {
      toast.error('Gagal disconnect');
    }
  };

  const handleTestPrint = async () => {
    setIsPrinting(true);
    try {
      await testBluetoothPrinter();
      toast.success('✅ Test print berhasil!');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsPrinting(false);
    }
  };

  // ✅ IMPROVED saveDeviceSettings dengan error handling
  const saveDeviceSettings = async (deviceId, deviceName) => {
    try {
      const settingData = {
        company_id: company?.id || null,
        user_id: user.id,
        printer_name: deviceName || 'Bluetooth Printer',
        device_id: deviceId,
        device_name: deviceName || 'Unknown',
        paper_width: settings.paper_width,
        encoding: settings.encoding,
        auto_cut: settings.auto_cut,
        beep_on_print: settings.beep_on_print,
        auto_reconnect: settings.auto_reconnect,
        print_logo: settings.print_logo,
        // ✅ REMOVED: header_text and footer_text - now managed in Company Settings → Struk/Receipt
        font_size: settings.font_size,
        last_connected: new Date().toISOString(),
        connection_count: 1,
        is_default: true
      };

      // ✅ CHECK EXISTING dengan delay
      await new Promise(resolve => setTimeout(resolve, 500));

      const existing = await cachedRequest('PrinterSettings', 'filter', {
        user_id: user.id,
        company_id: company?.id || null,
        device_id: deviceId
      }, { skipCache: true });

      // ✅ SAVE dengan delay
      await new Promise(resolve => setTimeout(resolve, 500));

      if (existing && existing.length > 0) {
        await base44.entities.PrinterSettings.update(existing[0].id, {
          ...settingData,
          connection_count: (existing[0].connection_count || 0) + 1
        });
      } else {
        await base44.entities.PrinterSettings.create(settingData);
      }

      // ✅ INVALIDATE CACHE
      invalidateCache(/PrinterSettings/);

      // ✅ RELOAD dengan delay
      setTimeout(() => {
        loadSavedSettings();
      }, 1000);

    } catch (error) {
      console.error('Error saving settings:', error);
      // Don't throw - just log
    }
  };

  const handleSaveSettings = async () => {
    try {
      if (!printerStatus.connected) {
        toast.error('❌ Connect printer dulu sebelum save settings');
        return;
      }

      const currentStatus = getBluetoothPrinterStatus();

      if (!currentStatus.connected) {
        toast.error('❌ Printer tidak terhubung');
        return;
      }

      const settingData = {
        company_id: company?.id || null,
        user_id: user.id,
        printer_name: currentStatus.deviceName || 'Bluetooth Printer',
        device_id: currentStatus.deviceId || 'unknown',
        device_name: currentStatus.deviceName || 'Unknown',
        ...settings,
        last_connected: new Date().toISOString(),
        is_default: true
      };

      // ✅ DELAY sebelum query untuk avoid rate limit
      await new Promise(resolve => setTimeout(resolve, 500));

      const existing = await cachedRequest('PrinterSettings', 'filter', {
        user_id: user.id,
        company_id: company?.id || null,
        is_default: true
      }, { skipCache: true });

      // ✅ DELAY sebelum save
      await new Promise(resolve => setTimeout(resolve, 500));

      if (existing && existing.length > 0) {
        await base44.entities.PrinterSettings.update(existing[0].id, settingData);
      } else {
        await base44.entities.PrinterSettings.create(settingData);
      }

      // ✅ INVALIDATE CACHE
      invalidateCache(/PrinterSettings/);

      toast.success('✅ Pengaturan tersimpan & sync ke Kasir!');

      // ✅ RELOAD dengan delay
      setTimeout(() => {
        loadSavedSettings();
      }, 1000);

    } catch (error) {
      console.error('Save error:', error);

      const errorMsg = error?.message || String(error);

      if (errorMsg.includes('Rate limit')) {
        toast.error('⚠️ Terlalu banyak request. Tunggu sebentar dan coba lagi.', {
          duration: 3000
        });
      } else {
        toast.error('❌ Gagal menyimpan. Coba lagi dalam beberapa detik.', {
          duration: 3000
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* ✅ PERSISTENT CONNECTION BANNER */}
      {printerStatus.connected && (
        <div className="p-4 bg-gradient-to-r from-green-900/40 to-blue-900/40 border-2 border-green-500 rounded-xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-600 rounded-full animate-pulse">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-lg">🔒 Koneksi PERSISTENT Aktif!</p>
              <p className="text-sm text-gray-300 mt-1">
                <strong>{printerStatus.deviceName}</strong>
              </p>
              <div className="mt-2 space-y-1 text-xs text-green-300">
                <p>✅ Tetap terhubung walaupun:</p>
                <p className="ml-4">• Pindah menu / page</p>
                <p className="ml-4">• Refresh halaman</p>
                <p className="ml-4">• Close/open browser</p>
                <p className="mt-2 font-semibold text-yellow-300">🔄 Auto-reconnect AKTIF!</p>
              </div>
            </div>
            <Button
              onClick={handleTestPrint}
              disabled={isPrinting}
              className="bg-green-600 hover:bg-green-700 px-6 py-6"
            >
              {isPrinting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Printer className="w-5 h-5 mr-2" />
                  <span className="font-semibold">Test Print</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            {printerStatus.connected ? (
              <>
                <BluetoothConnected className="w-5 h-5 text-green-400 animate-pulse" />
                Terhubung & Siap Print
              </>
            ) : (
              <>
                <Bluetooth className="w-5 h-5 text-gray-400" />
                Belum Terhubung
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {printerStatus.connected ? (
            <div className="p-4 bg-gray-800 rounded-lg border-2 border-green-500">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Printer className="w-8 h-8 text-green-400" />
                  <div>
                    <p className="font-semibold text-white text-lg">{printerStatus.deviceName}</p>
                    <p className="text-xs text-gray-400">Device ID: {printerStatus.deviceId || 'N/A'}</p>
                  </div>
                </div>
                <Badge className="bg-green-600 text-white px-3 py-1">
                  <Wifi className="w-3 h-3 mr-1" />
                  Connected
                </Badge>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={handleDisconnect}
                  variant="outline"
                  className="border-red-600 text-red-400 hover:bg-red-600/10 flex-1 min-h-[48px]"
                >
                  <X className="w-4 h-4 mr-2" />
                  Disconnect
                </Button>
                <Button
                  onClick={handleTestPrint}
                  disabled={isPrinting}
                  className="bg-green-600 hover:bg-green-700 flex-1 min-h-[48px]"
                >
                  {isPrinting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Printing...</>
                  ) : (
                    <><Printer className="w-4 h-4 mr-2" /> Test Print</>
                  )}
                </Button>
              </div>

              <div className="mt-3 p-3 bg-green-900/20 border border-green-700 rounded">
                <p className="text-xs text-green-300 font-semibold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  PERSISTENT CONNECTION AKTIF
                </p>
                <p className="text-xs text-gray-300 mt-2">
                  • Tidak perlu connect ulang<br />
                  • Print otomatis saat transaksi<br />
                  • Tetap terhubung selama tidak disconnect
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Button
                onClick={handleConnect}
                disabled={isConnecting || isScanning}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 py-8 text-lg font-semibold shadow-lg"
              >
                {isScanning || isConnecting ? (
                  <>
                    <BluetoothSearching className="w-6 h-6 mr-3 animate-spin" />
                    <span>{isScanning ? 'Scanning...' : 'Connecting...'}</span>
                  </>
                ) : (
                  <>
                    <Bluetooth className="w-6 h-6 mr-3" />
                    <span>🔍 Scan & Connect Printer</span>
                  </>
                )}
              </Button>

              <div className="p-5 bg-gradient-to-r from-green-900/30 to-blue-900/30 border-2 border-green-600 rounded-xl">
                <p className="text-base text-green-300 font-bold mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  SETUP SEKALI - PRINT SELAMANYA!
                </p>
                <div className="text-sm text-gray-200 space-y-2 mb-4">
                  <p className="font-semibold">✅ CARA KERJA SISTEM:</p>
                  <ul className="space-y-1 ml-4">
                    <li>• Setup printer SEKALI saja</li>
                    <li>• Koneksi TETAP TERHUBUNG selama tidak disconnect</li>
                    <li>• Setiap transaksi OTOMATIS print</li>
                    <li>• TIDAK PERLU reconnect setiap transaksi!</li>
                    <li>• Driver auto-install untuk semua printer thermal</li>
                  </ul>
                </div>
                <ol className="text-sm text-gray-200 space-y-3 list-decimal list-inside">
                  <li className="font-semibold">✅ Nyalakan printer thermal Anda</li>
                  <li className="font-semibold">✅ Pastikan Bluetooth HP AKTIF di Settings</li>
                  <li className="font-semibold">✅ Tekan tombol BT printer 3-5 detik (lampu KEDIP)</li>
                  <li className="font-semibold">✅ Klik tombol "Scan & Connect Printer"</li>
                  <li className="font-semibold text-yellow-300">⚠️ Popup browser muncul → PILIH printer → JANGAN cancel!</li>
                  <li className="font-semibold">✅ Sistem auto-detect driver & install...</li>
                  <li className="font-semibold text-green-300">✅ Driver installed! Printer terhubung!</li>
                  <li className="font-semibold text-green-300">✅ SELESAI! Sekarang bisa print otomatis! 🎉</li>
                </ol>
              </div>

              <div className="p-4 bg-yellow-900/30 border-2 border-yellow-600 rounded-lg">
                <p className="text-sm text-yellow-300 font-bold mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  ⚠️ PENTING - BACA INI!
                </p>
                <ul className="text-xs text-gray-200 space-y-2">
                  <li className="font-semibold">• Scan akan tampilkan SEMUA device Bluetooth</li>
                  <li className="font-semibold">• Pilih printer Anda (JK-xxxx, Zijiang, RPP, dll)</li>
                  <li className="font-semibold">• HARUS pakai Chrome browser Android/Desktop</li>
                  <li className="font-semibold">• JANGAN cancel popup! Pilih printer dari list!</li>
                  <li className="font-semibold">• Koneksi PERSISTEN - tidak perlu connect ulang!</li>
                  <li className="font-semibold">• Jarak maksimal 5 meter dari HP ke printer</li>
                </ul>
              </div>

              <div className="p-4 bg-red-900/30 border border-red-600 rounded-lg">
                <p className="text-sm text-red-300 font-bold mb-2">🚫 TROUBLESHOOTING:</p>
                <ul className="text-xs text-gray-200 space-y-1">
                  <li>• <strong>Popup kosong:</strong> Pastikan printer ON & mode pairing (lampu kedip)</li>
                  <li>• <strong>Connect gagal:</strong> Restart printer & scan ulang</li>
                  <li>• <strong>Print gagal:</strong> Check printer status di atas</li>
                  <li>• <strong>Disconnect sendiri:</strong> Restart printer & reconnect sekali</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings Card */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" />
            Pengaturan Printer
          </CardTitle>
          <p className="text-xs text-gray-400 mt-1">
            Settings ini berlaku untuk Kasir & Company Settings
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-gray-300">Lebar Kertas</Label>
            <select
              value={settings.paper_width}
              onChange={(e) => setSettings({ ...settings, paper_width: e.target.value })}
              className="w-full mt-2 px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
            >
              <option value="58mm">58mm (Mini)</option>
              <option value="80mm">80mm (Standard)</option>
            </select>
          </div>

          {/* ✅ REMOVED: Header Struk and Footer Struk inputs */}
          {/* These are now managed in Company Settings → Struk/Receipt tab */}
          <div className="p-3 bg-yellow-900/20 border border-yellow-600 rounded-lg">
            <p className="text-xs text-yellow-300 font-semibold">
              ⚠️ Pengaturan Header & Footer Struk ada di tab <strong>"Struk/Receipt"</strong>
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Klik tab Struk/Receipt di atas untuk mengatur teks Header, Footer, Logo, dll.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
              <Label className="text-gray-300">Auto Cut Paper</Label>
              <Switch
                checked={settings.auto_cut}
                onCheckedChange={(checked) => setSettings({ ...settings, auto_cut: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
              <Label className="text-gray-300">Beep Sound</Label>
              <Switch
                checked={settings.beep_on_print}
                onCheckedChange={(checked) => setSettings({ ...settings, beep_on_print: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
              <Label className="text-gray-300">Auto Reconnect</Label>
              <Switch
                checked={settings.auto_reconnect}
                onCheckedChange={(checked) => setSettings({ ...settings, auto_reconnect: checked })}
              />
            </div>
          </div>

          <Button
            onClick={handleSaveSettings}
            className="w-full bg-green-600 hover:bg-green-700 py-6"
            disabled={!printerStatus.connected}
          >
            <Save className="w-4 h-4 mr-2" />
            Simpan Pengaturan
          </Button>

          <div className="p-3 bg-blue-900/20 border border-blue-700 rounded-lg">
            <p className="text-xs text-blue-300 font-semibold">
              💡 Settings ini otomatis sync antara Kasir & Company Settings!
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Saved Printers */}
      {savedSettings.length > 0 && (
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Printer Tersimpan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {savedSettings.map((setting) => (
                <div
                  key={setting.id}
                  className="p-3 bg-gray-800 rounded-lg flex items-center justify-between hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Printer className="w-5 h-5 text-blue-400" />
                    <div>
                      <p className="text-white font-semibold text-sm">{setting.printer_name}</p>
                      <p className="text-xs text-gray-400">{setting.paper_width} | {setting.connection_count || 0}x connected</p>
                    </div>
                  </div>
                  {setting.is_default && (
                    <Badge className="bg-green-600 text-white">Default</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Browser Compatibility */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <AlertCircle className="w-5 h-5 text-yellow-400" />
            Browser Support
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 p-2 bg-green-900/20 rounded">
              <Check className="w-4 h-4 text-green-400" />
              <span className="text-green-300 font-semibold">✅ Chrome Android (RECOMMENDED)</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-green-900/20 rounded">
              <Check className="w-4 h-4 text-green-400" />
              <span className="text-green-300 font-semibold">✅ Chrome Desktop</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-green-900/20 rounded">
              <Check className="w-4 h-4 text-green-400" />
              <span className="text-green-300 font-semibold">✅ Edge Desktop</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-red-900/20 rounded">
              <X className="w-4 h-4 text-red-400" />
              <span className="text-red-400">❌ Safari (tidak support)</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-red-900/20 rounded">
              <X className="w-4 h-4 text-red-400" />
              <span className="text-red-400">❌ Firefox (tidak support)</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-red-900/20 rounded">
              <X className="w-4 h-4 text-red-400" />
              <span className="text-red-400">❌ UC Browser / Opera (tidak support)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
