import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, X, Keyboard, SwitchCamera, Scan } from 'lucide-react';
import { toast } from 'sonner';

/**
 * BarcodeScanner Component
 * Menggunakan kamera device untuk scan barcode
 * Fallback ke keyboard input jika camera tidak tersedia
 */
export default function BarcodeScanner({ onScan, onClose, products }) {
  const [mode, setMode] = useState('keyboard'); // 'keyboard' or 'camera'
  const [manualInput, setManualInput] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'user' or 'environment'
  const [stream, setStream] = useState(null);
  
  const videoRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Auto focus ke input saat component mount
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup camera stream saat unmount
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      // Stop existing stream jika ada
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      
      setIsCameraActive(true);
      setMode('camera');
      toast.success('Kamera aktif! Ketik SKU atau scan barcode.');
    } catch (error) {
      console.error('Camera error:', error);
      toast.error('Gagal mengakses kamera. Gunakan input manual.');
      setMode('keyboard');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
    setMode('keyboard');
    
    // Focus kembali ke input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    if (isCameraActive) {
      startCamera(); // Restart dengan facing mode baru
    }
  };

  const handleManualScan = () => {
    const sku = manualInput.trim().toUpperCase();
    
    if (!sku) {
      toast.error('Masukkan SKU produk!');
      return;
    }

    // Cari produk berdasarkan SKU
    const product = products.find(p => 
      p.sku && p.sku.toUpperCase() === sku
    );

    if (product) {
      onScan(product);
      setManualInput('');
      
      // Audio feedback
      playBeep();
      
      toast.success(`✅ ${product.name} ditambahkan!`);
      
      // Focus kembali ke input
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    } else {
      toast.error(`❌ Produk dengan SKU "${sku}" tidak ditemukan!`);
      setManualInput('');
    }
  };

  const playBeep = () => {
    // Simple beep sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
      // Ignore beep error
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleManualScan();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <Card className="bg-gray-900 border-gray-700 max-w-2xl w-full">
        <CardHeader className="border-b border-gray-800 flex flex-row items-center justify-between p-4">
          <CardTitle className="text-white flex items-center gap-2">
            <Scan className="w-5 h-5 text-blue-500" />
            Scanner Barcode
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          {/* Mode Selector */}
          <div className="flex gap-2">
            <Button
              onClick={() => {
                stopCamera();
                setMode('keyboard');
              }}
              variant={mode === 'keyboard' ? 'default' : 'outline'}
              className="flex-1"
            >
              <Keyboard className="w-4 h-4 mr-2" />
              Input Manual
            </Button>
            <Button
              onClick={startCamera}
              variant={mode === 'camera' ? 'default' : 'outline'}
              className="flex-1"
            >
              <Camera className="w-4 h-4 mr-2" />
              Gunakan Kamera
            </Button>
          </div>

          {/* Camera Preview */}
          {mode === 'camera' && isCameraActive && (
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-64 object-cover"
              />
              
              {/* Scan Area Overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-64 h-32 border-4 border-blue-500 rounded-lg">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-400 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-400 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-400 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-400 rounded-br-lg" />
                  
                  {/* Scanning Line Animation */}
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="w-full h-1 bg-blue-500 animate-scan" />
                  </div>
                </div>
              </div>

              {/* Camera Controls */}
              <div className="absolute bottom-4 right-4 flex gap-2">
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={switchCamera}
                  className="bg-gray-800/80 hover:bg-gray-700"
                >
                  <SwitchCamera className="w-5 h-5" />
                </Button>
              </div>

              <style jsx>{`
                @keyframes scan {
                  0% { transform: translateY(0); }
                  100% { transform: translateY(128px); }
                }
                .animate-scan {
                  animation: scan 2s linear infinite;
                }
              `}</style>
            </div>
          )}

          {/* Manual Input */}
          <div className="space-y-3">
            <div className="relative">
              <Input
                ref={inputRef}
                type="text"
                placeholder="Ketik atau scan SKU produk..."
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                className="bg-gray-800 border-gray-700 text-white text-lg font-mono pr-20"
                autoFocus
              />
              <Button
                onClick={handleManualScan}
                size="sm"
                className="absolute right-1 top-1 bg-blue-600 hover:bg-blue-700"
              >
                <Scan className="w-4 h-4 mr-1" />
                Scan
              </Button>
            </div>

            {/* Instructions */}
            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
              <p className="text-blue-400 text-sm">
                💡 <strong>Tips:</strong>
              </p>
              <ul className="text-blue-300 text-xs mt-2 space-y-1 ml-4">
                <li>• Ketik SKU produk lalu tekan <kbd className="bg-gray-800 px-1 rounded">Enter</kbd></li>
                <li>• Atau gunakan barcode scanner hardware</li>
                <li>• Produk akan otomatis ditambahkan ke keranjang</li>
                <li>• Tekan <kbd className="bg-gray-800 px-1 rounded">ESC</kbd> untuk tutup scanner</li>
              </ul>
            </div>
          </div>

          {/* Quick Product List (untuk referensi) */}
          {products.length > 0 && (
            <div className="border border-gray-700 rounded-lg p-3 max-h-48 overflow-y-auto">
              <p className="text-gray-400 text-xs mb-2 font-semibold">Daftar SKU Produk:</p>
              <div className="grid grid-cols-2 gap-2">
                {products.slice(0, 10).map(product => (
                  <button
                    key={product.id}
                    onClick={() => {
                      setManualInput(product.sku || '');
                      handleManualScan();
                    }}
                    className="text-left p-2 rounded bg-gray-800 hover:bg-gray-700 transition-colors"
                  >
                    <p className="font-mono text-xs text-blue-400">{product.sku}</p>
                    <p className="text-xs text-gray-300 truncate">{product.name}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}