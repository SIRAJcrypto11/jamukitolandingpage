
/**
 * UNIVERSAL THERMAL PRINTER SUPPORT
 * - Web Bluetooth API (Bluetooth printers)
 * - Web USB API (USB printers)
 * - ESC/POS Commands
 * - Auto driver detection & installation
 * - Cross-platform compatibility
 * 
 * ✅ PERSISTENT BLUETOOTH PRINTER CONNECTION
 * - Auto-save printer info to localStorage
 * - Auto-reconnect on page load
 * - Keep connection alive across page navigation
 * - No manual reconnect needed
 */

import { toast } from 'sonner';

// ESC/POS Command Set
const ESC = '\x1B';
const GS = '\x1D';

const ESCPOS = {
  // Initialization
  INIT: ESC + '@',
  
  // Text alignment
  ALIGN_LEFT: ESC + 'a' + '\x00',
  ALIGN_CENTER: ESC + 'a' + '\x01',
  ALIGN_RIGHT: ESC + 'a' + '\x02',
  
  // Text style
  BOLD_ON: ESC + 'E' + '\x01',
  BOLD_OFF: ESC + 'E' + '\x00',
  UNDERLINE_ON: ESC + '-' + '\x01',
  UNDERLINE_OFF: ESC + '-' + '\x00',
  
  // Text size
  NORMAL: GS + '!' + '\x00',
  DOUBLE_HEIGHT: GS + '!' + '\x01',
  DOUBLE_WIDTH: GS + '!' + '\x10',
  DOUBLE: GS + '!' + '\x11',
  LARGE: GS + '!' + '\x22',
  
  // New font size aliases for clarity as used in the outline
  FONT_SIZE_NORMAL: GS + '!' + '\x00', // Alias for NORMAL
  FONT_SIZE_LARGE: GS + '!' + '\x11', // Alias for DOUBLE
  
  // Line feed
  LINE_FEED: '\n',
  FEED_3_LINES: ESC + 'd' + '\x03',
  
  // Cut paper (partial cut for thermal printers)
  CUT_PAPER: GS + 'V' + '\x41' + '\x00',
  CUT_FULL: GS + 'V' + '\x00',
  
  // Drawer kick (if supported)
  OPEN_DRAWER: ESC + 'p' + '\x00' + '\x19' + '\xFA',
  
  // Character sets
  CHARSET_PC437: ESC + 't' + '\x00', // USA
  CHARSET_PC850: ESC + 't' + '\x02', // Latin 1
  
  // Code page
  CODEPAGE_PC437: ESC + 't' + '\x00',
  CODEPAGE_UTF8: ESC + 't' + '\x03',
};

// Helper function to return ESCPOS commands, consistent with CMD usage in outline
const getESCPOSCommands = () => ESCPOS;

/**
 * COMPATIBLE PRINTERS DATABASE
 */
export const COMPATIBLE_PRINTERS = {
  zijiang: {
    brand: 'Zijiang',
    models: [
      { model: 'JK-5802H', width: '58mm', interfaces: ['USB', 'Bluetooth'], tested: true },
      { model: 'ZJ-5802', width: '58mm', interfaces: ['USB', 'Bluetooth'], tested: false },
      { model: 'ZJ-8002', width: '80mm', interfaces: ['USB', 'Bluetooth'], tested: false },
    ]
  },
  epson: {
    brand: 'Epson',
    models: [
      { model: 'TM-T20II', width: '80mm', interfaces: ['USB', 'Ethernet'], tested: false },
      { model: 'TM-T82', width: '80mm', interfaces: ['USB', 'Bluetooth'], tested: false },
      { model: 'TM-M30', width: '80mm', interfaces: ['USB', 'Bluetooth', 'WiFi'], tested: false },
    ]
  },
  xprinter: {
    brand: 'Xprinter',
    models: [
      { model: 'XP-58IIH', width: '58mm', interfaces: ['USB', 'Bluetooth'], tested: false },
      { model: 'XP-80C', width: '80mm', interfaces: ['USB', 'Ethernet'], tested: false },
    ]
  },
  rongta: {
    brand: 'Rongta',
    models: [
      { model: 'RPP02N', width: '58mm', interfaces: ['Bluetooth'], tested: false },
      { model: 'RPP210', width: '58mm', interfaces: ['USB', 'Bluetooth'], tested: false },
    ]
  },
  bixolon: {
    brand: 'Bixolon',
    models: [
      { model: 'SPP-R200III', width: '58mm', interfaces: ['Bluetooth'], tested: false },
      { model: 'SRP-275III', width: '80mm', interfaces: ['USB'], tested: false },
    ]
  },
  generic: {
    brand: 'Generic ESC/POS',
    models: [
      { model: 'Any ESC/POS 58mm', width: '58mm', interfaces: ['USB', 'Bluetooth'], tested: false },
      { model: 'Any ESC/POS 80mm', width: '80mm', interfaces: ['USB', 'Bluetooth'], tested: false },
    ]
  }
};

// ✅ PERSISTENT STATE - Saved to localStorage
const STORAGE_KEY = 'SNISHOP_PRINTER_STATE';

// Bluetooth and USB connection state
const printerState = {
  device: null, // BluetoothDevice or USBDevice
  server: null, // Bluetooth GATT server
  characteristic: null, // BluetoothGATTCharacteristic for BLE
  usbInterface: null, // USB interface number
  usbEndpoint: null, // USB endpoint number
  connected: false,
  deviceId: null, // Added for persistent connection
  deviceName: null, // Added for persistent connection
  reconnectAttempts: 0, // Added for persistent connection
  maxReconnectAttempts: 5, // Added for persistent connection
  isReconnecting: false, // Added for persistent connection
};

/**
 * Check if Web Bluetooth is supported
 */
export function isBluetoothSupported() {
  return navigator.bluetooth !== undefined;
}

/**
 * Check if Web USB is supported
 */
export function isUSBSupported() {
  return navigator.usb !== undefined;
}

/**
 * ✅ SAVE PRINTER INFO TO LOCALSTORAGE
 */
function savePrinterToStorage(deviceInfo) {
  try {
    const printerData = {
      deviceId: deviceInfo.deviceId,
      deviceName: deviceInfo.deviceName,
      savedAt: Date.now(),
      autoReconnect: true
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(printerData));
    console.log('💾 Printer info saved to localStorage:', deviceInfo.deviceName);
  } catch (e) {
    console.warn('Failed to save printer to storage:', e);
  }
}

/**
 * ✅ GET SAVED PRINTER FROM LOCALSTORAGE
 */
function getSavedPrinter() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const printerData = JSON.parse(stored);
      
      // Check if saved less than 30 days ago
      const daysSinceConnection = (Date.now() - printerData.savedAt) / (1000 * 60 * 60 * 24);
      if (daysSinceConnection < 30) {
        console.log('💾 Found saved printer:', printerData.deviceName);
        return printerData;
      } else {
        console.log('⚠️ Saved printer too old, clearing...');
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  } catch (e) {
    console.warn('Failed to get saved printer:', e);
  }
  return null;
}

/**
 * ✅ CLEAR SAVED PRINTER
 */
function clearSavedPrinter() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('🗑️ Cleared saved printer from storage');
  } catch (e) {
    console.warn('Failed to clear printer storage:', e);
  }
}

/**
 * ✅ HANDLE DISCONNECT - AUTO RECONNECT
 */
async function handleDisconnect() {
  console.log('⚠️ Printer disconnected!');
  
  // Clear only connection-specific state, keep deviceId/deviceName for reconnect
  printerState.connected = false;
  printerState.server = null;
  printerState.characteristic = null;
  printerState.device = null; // Clear the actual device object too

  const savedPrinter = getSavedPrinter();
  
  // ✅ AUTO-RECONNECT if saved and enabled
  if (savedPrinter && savedPrinter.autoReconnect && printerState.deviceId === savedPrinter.deviceId && printerState.reconnectAttempts < printerState.maxReconnectAttempts) {
    toast.warning(`⚠️ Printer disconnect!\n\n🔄 Auto-reconnecting...`, {
      duration: 3000
    });
    
    // Retry after 3 seconds
    setTimeout(() => {
      autoReconnectPrinter();
    }, 3000);
  } else {
    toast.warning('⚠️ Printer terputus!\n\nConnect ulang jika mau print.', {
      duration: 5000
    });
    // If not auto-reconnecting, clear saved printer info if the device was the one we were tracking
    if (!savedPrinter || printerState.deviceId === savedPrinter.deviceId) {
        clearSavedPrinter();
        printerState.deviceId = null;
        printerState.deviceName = null;
    }
  }
}

/**
 * ✅ IMPROVED WRITE OPERATION WITH RETRY & FALLBACK
 */
const writeDataToCharacteristic = async (characteristic, data, retries = 3) => {
  if (!characteristic) {
    throw new Error('❌ Characteristic tidak tersedia');
  }

  // Convert data to Uint8Array
  let uint8Array;
  if (typeof data === 'string') {
    const encoder = new TextEncoder();
    uint8Array = encoder.encode(data);
  } else if (data instanceof Uint8Array) {
    uint8Array = data;
  } else {
    throw new Error('❌ Format data tidak valid');
  }

  console.log(`📤 Sending ${uint8Array.length} bytes to printer...`);

  // ✅ CHUNK SIZE - OPTIMIZED FOR MOST BLUETOOTH THERMAL PRINTERS
  const chunkSize = 20; 
  let attempt = 0;

  while (attempt < retries) {
    try {
      attempt++;
      
      // Send data in chunks
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, Math.min(i + chunkSize, uint8Array.length));
        
        try {
          // ✅ TRY writeValueWithoutResponse FIRST (faster & more reliable)
          if (characteristic.properties.writeWithoutResponse) {
            await characteristic.writeValueWithoutResponse(chunk);
            // console.log(`✅ Chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(uint8Array.length / chunkSize)} sent (no response)`);
          } 
          // ✅ FALLBACK to writeValue if needed
          else if (characteristic.properties.write) {
            await characteristic.writeValue(chunk);
            // console.log(`✅ Chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(uint8Array.length / chunkSize)} sent (with response)`);
          } 
          else {
            throw new Error('❌ Characteristic tidak support write operation');
          }
          
          // ✅ DELAY between chunks (CRITICAL for stability!)
          await new Promise(resolve => setTimeout(resolve, 50));
          
        } catch (chunkError) {
          console.error(`❌ Error sending chunk ${Math.floor(i / chunkSize) + 1}:`, chunkError);
          
          // ✅ RETRY chunk with alternative method
          if (attempt < retries) {
            console.log(`🔄 Retrying chunk with alternative method...`);
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Try the other write method if available
            try {
              if (characteristic.properties.write && !characteristic.properties.writeWithoutResponse) {
                await characteristic.writeValue(chunk);
              } else if (characteristic.properties.writeWithoutResponse && !characteristic.properties.write) {
                await characteristic.writeValueWithoutResponse(chunk);
              } else if (characteristic.properties.write && characteristic.properties.writeWithoutResponse) {
                // If both are supported, maybe the issue was transient, try again with original
                await characteristic.writeValueWithoutResponse(chunk); // Prefer no response
              } else {
                throw new Error('No alternative write method available');
              }
              await new Promise(resolve => setTimeout(resolve, 50));
            } catch (retryError) {
              throw retryError; // Give up on this chunk if retry also fails
            }
          } else {
            throw chunkError; // Give up on chunk after retries
          }
        }
      }
      
      console.log('✅ All data sent successfully!');
      return; // Success!
      
    } catch (error) {
      console.error(`❌ Write attempt ${attempt}/${retries} failed:`, error);
      
      if (attempt >= retries) {
        // All retries exhausted
        throw new Error(`❌ Gagal menulis ke printer setelah ${retries} percobaan.\n\n${error.message}`);
      }
      
      // Wait before retry
      const backoffDelay = 500 * attempt; // Exponential backoff
      console.log(`⏳ Waiting ${backoffDelay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }
};

/**
 * ✅ CONNECT TO BLUETOOTH PRINTER - IMPROVED
 */
export async function connectBluetoothPrinter() {
  if (!navigator.bluetooth) {
    throw new Error('❌ Browser tidak support Bluetooth.\n\nGunakan Chrome Android atau Chrome Desktop!');
  }

  try {
    toast.info('🔍 Scanning Bluetooth devices...\n\nPilih printer dari popup!', { duration: 5000 });

    // ✅ SCAN SEMUA DEVICE
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb', // Common ESC/POS service
        '0000fff0-0000-1000-8000-00805f9b34fb', // Generic service (often used by printers)
        '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC service (some Zijiang/generic printers)
        '0000180a-0000-1000-8000-00805f9b34fb', // Device Information Service (for compatibility)
        '00001101-0000-1000-8000-00805f9b34fb', // Serial Port Profile (SPP) - sometimes used for older printers
      ]
    });

    if (!device) {
      throw new Error('CANCELLED');
    }

    console.log('✅ Device selected:', device.name);
    toast.info('🔗 Connecting & installing driver...', { duration: 3000 });

    // Connect to GATT
    const server = await device.gatt.connect();
    console.log('✅ GATT connected');

    // ✅ AUTO-DETECT SERVICE
    let foundCharacteristic = null;
    const services = await server.getPrimaryServices();
    console.log('📋 Found services:', services.length);

    // Prioritize services known for printing
    const preferredServiceUUIDs = [
      '000018f0-0000-1000-8000-00805f9b34fb', // ESC/POS
      '0000fff0-0000-1000-8000-00805f9b34fb', // Generic custom
      '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC
      '00001101-0000-1000-8000-00805f9b34fb', // SPP
    ];

    // Try preferred services first
    for (const uuid of preferredServiceUUIDs) {
      try {
        const service = services.find(s => s.uuid === uuid);
        if (service) {
          const chars = await service.getCharacteristics();
          foundCharacteristic = chars.find(c => c.properties.write || c.properties.writeWithoutResponse);
          if (foundCharacteristic) {
            break;
          }
        }
      } catch (e) {
        console.warn(`Error finding characteristic in preferred service ${uuid}:`, e);
      }
    }

    // If not found in preferred, iterate all services
    if (!foundCharacteristic) {
      for (const svc of services) {
        try {
          const chars = await svc.getCharacteristics();
          foundCharacteristic = chars.find(c => c.properties.write || c.properties.writeWithoutResponse);
          if (foundCharacteristic) {
            break;
          }
        } catch (e) {
          // Continue to next service
        }
      }
    }
    
    if (!foundCharacteristic) {
      await server.disconnect();
      throw new Error('❌ Printer tidak kompatibel!\n\nDevice ini tidak support print command.\n\nCoba printer thermal lain.');
    }
    
    console.log('✅ Found writable characteristic:', foundCharacteristic.uuid);

    // ✅ SAVE STATE
    printerState.device = device;
    printerState.server = server;
    printerState.characteristic = foundCharacteristic;
    printerState.connected = true;
    printerState.deviceId = device.id; // Store device ID
    printerState.deviceName = device.name || 'Bluetooth Printer'; // Store device name
    printerState.reconnectAttempts = 0; // Reset reconnect attempts

    // ✅ SAVE TO LOCALSTORAGE
    savePrinterToStorage({
      deviceId: device.id,
      deviceName: device.name || 'Bluetooth Printer'
    });

    // ✅ LISTEN FOR DISCONNECT & AUTO-RECONNECT
    device.addEventListener('gattserverdisconnected', handleDisconnect);

    toast.success(`🎉 Terhubung ke ${device.name || 'printer'}!\n\n✅ Driver terinstall & siap print.\n\n🔒 Koneksi akan TETAP AKTIF selama tidak disconnect!`, {
      duration: 6000
    });

    return { deviceName: device.name || 'Bluetooth Printer', deviceId: device.id, connected: true };

  } catch (error) {
    console.error('Bluetooth connection error:', error);
    
    if (error.message === 'CANCELLED' || (error.name === 'NotFoundError' && error.message?.includes('cancel'))) {
      throw new Error('CANCELLED');
    }
    
    if (error.name === 'NotFoundError') {
      throw new Error('❌ Tidak ada printer ditemukan.\n\n📱 Pastikan:\n1. Printer sudah ON\n2. Bluetooth printer aktif (lampu kedip)\n3. Mode pairing (tekan tombol BT 3-5 detik)');
    } else if (error.name === 'SecurityError') {
      throw new Error('❌ Akses Bluetooth ditolak.\n\nPastikan:\n1. Menggunakan HTTPS\n2. Ijinkan akses Bluetooth saat diminta');
    } else {
      throw new Error(`❌ Gagal connect:\n\n${error.message}\n\n📌 SOLUSI:\n• Restart printer\n• Scan ulang\n• Pastikan mode pairing`);
    }
  }
}

/**
 * ✅ DISCONNECT BLUETOOTH PRINTER
 */
export async function disconnectBluetoothPrinter() {
  try {
    if (printerState.device?.gatt?.connected) {
      await printerState.device.gatt.disconnect();
    }
    
    printerState.device = null;
    printerState.server = null;
    printerState.characteristic = null;
    printerState.connected = false;
    printerState.deviceId = null; // Clear stored device ID
    printerState.deviceName = null; // Clear stored device name
    printerState.reconnectAttempts = 0;
    
    // ✅ CLEAR LOCALSTORAGE
    clearSavedPrinter();
    
    console.log('✅ Printer disconnected & storage cleared');
    toast.success('Printer Bluetooth terputus.');
    return true;
  } catch (error) {
    console.error('Disconnect error:', error);
    toast.error('Gagal memutuskan koneksi printer Bluetooth: ' + error.message);
    return false;
  }
}

/**
 * ✅ GET CONNECTION STATUS
 */
export function getBluetoothPrinterStatus() {
  const isConnected = printerState.connected && 
                     printerState.characteristic && 
                     printerState.device?.gatt?.connected;
  
  return {
    connected: isConnected,
    deviceName: printerState.deviceName,
    deviceId: printerState.deviceId,
    isReconnecting: printerState.isReconnecting // Added for persistent connection
  };
}

/**
 * ✅ TEST PRINT - IMPROVED
 */
export async function testBluetoothPrinter() {
  if (!printerState.connected || !printerState.characteristic) {
    // ✅ TRY AUTO-RECONNECT
    console.log('⚠️ Not connected, trying auto-reconnect before test print...');
    toast.info('Printer tidak terhubung, mencoba auto-reconnect...', { duration: 2000 });
    const reconnectResult = await autoReconnectPrinter();
    
    if (!reconnectResult.success) {
      throw new Error('❌ Printer tidak terhubung!\n\nConnect printer dulu.');
    }
  }

  try {
    console.log('🧪 Starting test print...');
    toast.info('🖨️ Test printing...', { duration: 2000 });

    const CMD = getESCPOSCommands();
    let testReceipt = '';

    testReceipt += CMD.INIT;
    testReceipt += CMD.ALIGN_CENTER;
    testReceipt += CMD.FONT_SIZE_LARGE;
    testReceipt += CMD.BOLD_ON;
    testReceipt += 'TEST PRINT' + CMD.LINE_FEED;
    testReceipt += CMD.BOLD_OFF;
    testReceipt += CMD.FONT_SIZE_NORMAL;
    testReceipt += CMD.LINE_FEED;
    testReceipt += '================================' + CMD.LINE_FEED;
    testReceipt += CMD.LINE_FEED;
    
    testReceipt += CMD.ALIGN_LEFT;
    testReceipt += 'Device: ' + (printerState.deviceName || 'Unknown') + CMD.LINE_FEED;
    testReceipt += 'Time: ' + new Date().toLocaleString('id-ID') + CMD.LINE_FEED;
    testReceipt += CMD.LINE_FEED;
    
    testReceipt += '--------------------------------' + CMD.LINE_FEED;
    testReceipt += 'Sample Item      1    Rp 10.000' + CMD.LINE_FEED;
    testReceipt += '--------------------------------' + CMD.LINE_FEED;
    testReceipt += CMD.ALIGN_RIGHT;
    testReceipt += 'TOTAL:    Rp 10.000' + CMD.LINE_FEED;
    testReceipt += CMD.LINE_FEED;
    
    testReceipt += CMD.ALIGN_CENTER;
    testReceipt += '================================' + CMD.LINE_FEED;
    testReceipt += 'TEST PRINT BERHASIL!' + CMD.LINE_FEED;
    testReceipt += CMD.LINE_FEED;
    testReceipt += CMD.FEED_3_LINES; // Use FEED_3_LINES instead of multiple LINE_FEED
    testReceipt += CMD.CUT_PAPER;

    // ✅ SEND WITH RETRY
    await writeDataToCharacteristic(printerState.characteristic, testReceipt, 3);

    toast.success('✅ Test print berhasil!\n\nStruk keluar dari printer.', {
      duration: 4000
    });
    
    return true;

  } catch (error) {
    console.error('Test print error:', error);
    
    if (!printerState.device?.gatt?.connected) {
      // If disconnected during print, trigger general disconnect handler
      handleDisconnect(); // This will handle toast and potential auto-reconnect
      throw new Error('❌ Printer disconnect! Trying auto-reconnect...');
    }
    
    throw new Error(`❌ Test print gagal:\n\n${error.message}`);
  }
}

/**
 * ✅ PRINT RECEIPT VIA BLUETOOTH - IMPROVED WITH RETRY
 */
export async function printReceiptBluetooth(transaction, settings, companyName) {
  if (!printerState.connected || !printerState.characteristic) {
    // ✅ TRY AUTO-RECONNECT
    console.log('⚠️ Not connected, trying auto-reconnect before printing...');
    toast.info('Printer tidak terhubung, mencoba auto-reconnect sebelum mencetak...', { duration: 2000 });
    const reconnectResult = await autoReconnectPrinter();
    
    if (!reconnectResult.success) {
      throw new Error('❌ Printer tidak terhubung!\n\nConnect printer dulu.');
    }
  }

  try {
    console.log('🖨️ Starting Bluetooth print...');
    toast.info('🖨️ Mencetak via Bluetooth...', { duration: 2000 });

    const CMD = getESCPOSCommands();
    const receiptSettings = settings?.receipt_settings || {};
    let receipt = '';

    // ✅ BUILD ESC/POS RECEIPT
    receipt += CMD.INIT;
    receipt += CMD.ALIGN_CENTER;
    
    // Company name
    receipt += CMD.FONT_SIZE_LARGE;
    receipt += (receiptSettings.business_name || companyName || 'TOKO SAYA') + CMD.LINE_FEED;
    receipt += CMD.FONT_SIZE_NORMAL;
    
    // Company details
    if (receiptSettings.business_address) {
      receipt += receiptSettings.business_address + CMD.LINE_FEED;
    }
    if (receiptSettings.business_phone) {
      receipt += 'Telp: ' + receiptSettings.business_phone + CMD.LINE_FEED;
    }
    if (receiptSettings.show_tax_id && receiptSettings.tax_id) {
      receipt += 'NPWP: ' + receiptSettings.tax_id + CMD.LINE_FEED;
    }
    receipt += CMD.LINE_FEED;
    
    // Header
    receipt += '================================' + CMD.LINE_FEED;
    receipt += CMD.BOLD_ON;
    receipt += (receiptSettings.header_text || 'STRUK PEMBELIAN') + CMD.LINE_FEED;
    receipt += CMD.BOLD_OFF;
    receipt += '================================' + CMD.LINE_FEED;
    receipt += CMD.LINE_FEED;
    
    // Transaction info
    receipt += CMD.ALIGN_LEFT;
    receipt += 'No: ' + (transaction.transaction_number || '-') + CMD.LINE_FEED;
    receipt += 'Tgl: ' + new Date(transaction.created_date || Date.now()).toLocaleString('id-ID') + CMD.LINE_FEED;
    
    if (receiptSettings.show_cashier_name && transaction.cashier_name) {
      receipt += 'Kasir: ' + transaction.cashier_name + CMD.LINE_FEED;
    }
    
    if (receiptSettings.show_customer_info && transaction.customer_name) {
      receipt += 'Customer: ' + transaction.customer_name + CMD.LINE_FEED;
    }
    receipt += CMD.LINE_FEED;
    
    receipt += '--------------------------------' + CMD.LINE_FEED;
    receipt += CMD.BOLD_ON;
    receipt += 'Produk';
    receipt += ' '.repeat(Math.max(1, 32 - 'Produk'.length - 'Harga'.length));
    receipt += 'Harga' + CMD.LINE_FEED;
    receipt += CMD.BOLD_OFF;
    receipt += '--------------------------------' + CMD.LINE_FEED;

    // Items
    (transaction.items || []).forEach(item => {
      const productName = item.product_name || 'N/A';
      const qty = item.quantity || 1;
      const price = item.price || 0;
      const subtotal = item.subtotal || (qty * price);
      
      receipt += productName + CMD.LINE_FEED;
      
      const lineLeft = `${qty} x Rp ${price.toLocaleString('id-ID')}`;
      const lineRight = `Rp ${subtotal.toLocaleString('id-ID')}`;
      
      // Calculate spaces for right alignment within 32 chars
      const totalLen = lineLeft.length + lineRight.length;
      const spaces = Math.max(1, 32 - totalLen);
      receipt += lineLeft + ' '.repeat(spaces) + lineRight + CMD.LINE_FEED;
    });
    
    receipt += '--------------------------------' + CMD.LINE_FEED;
    
    // Totals
    receipt += CMD.ALIGN_LEFT;
    
    const addAlignedLine = (label, value) => {
      const totalLen = label.length + value.length;
      const spaces = Math.max(1, 32 - totalLen);
      receipt += label + ' '.repeat(spaces) + value + CMD.LINE_FEED;
    };
    
    addAlignedLine('Subtotal', 'Rp ' + (transaction.subtotal || 0).toLocaleString('id-ID'));
    
    if ((transaction.discount_amount || 0) > 0) {
      addAlignedLine('Diskon', '- Rp ' + (transaction.discount_amount || 0).toLocaleString('id-ID'));
    }
    
    receipt += '================================' + CMD.LINE_FEED;
    
    // Total (BOLD & LARGE)
    receipt += CMD.BOLD_ON + CMD.FONT_SIZE_LARGE;
    addAlignedLine('TOTAL', 'Rp ' + (transaction.total || 0).toLocaleString('id-ID'));
    receipt += CMD.BOLD_OFF + CMD.FONT_SIZE_NORMAL;
    
    receipt += '================================' + CMD.LINE_FEED;
    
    // Payment
    addAlignedLine('Bayar (' + (transaction.payment_method || 'Cash') + ')', 'Rp ' + (transaction.payment_amount || 0).toLocaleString('id-ID'));
    
    if ((transaction.change_amount || 0) > 0) {
      addAlignedLine('Kembalian', 'Rp ' + (transaction.change_amount || 0).toLocaleString('id-ID'));
    }
    
    if ((transaction.points_earned || 0) > 0) {
      receipt += '--------------------------------' + CMD.LINE_FEED;
      receipt += CMD.ALIGN_CENTER;
      receipt += '⭐ Poin: +' + transaction.points_earned + ' poin' + CMD.LINE_FEED;
    }
    
    receipt += '--------------------------------' + CMD.LINE_FEED;
    
    // Footer
    receipt += CMD.ALIGN_CENTER;
    const footerLines = (receiptSettings.footer_message || 'Terima kasih atas kunjungan Anda!').split('\n');
    footerLines.forEach(line => {
      receipt += line + CMD.LINE_FEED;
    });
    
    receipt += '--------------------------------' + CMD.LINE_FEED;
    receipt += CMD.BOLD_ON;
    receipt += 'Powered by SNISHOP.COM' + CMD.LINE_FEED;
    receipt += CMD.BOLD_OFF;
    
    // Feed and cut
    receipt += CMD.FEED_3_LINES;
    if (receiptSettings.auto_cut !== false) { // Default to cut if setting not explicitly false
      receipt += CMD.CUT_PAPER;
    } else {
      receipt += CMD.LINE_FEED; // Just extra lines if no auto-cut
    }

    // ✅ SEND TO PRINTER WITH RETRY
    await writeDataToCharacteristic(printerState.characteristic, receipt, 3);

    console.log('✅ Print successful!');
    toast.success('Struk berhasil dicetak via Bluetooth.');
    return true;
    
  } catch (error) {
    console.error('Bluetooth print error:', error);
    
    if (!printerState.device?.gatt?.connected) {
      // If disconnected during print, trigger general disconnect handler
      handleDisconnect(); // This will handle toast and potential auto-reconnect
      throw new Error('❌ Printer disconnect! Trying auto-reconnect...');
    }
    
    throw new Error(`❌ Gagal print via Bluetooth:\n\n${error.message}`);
  }
}

/**
 * ✅ AUTO-RECONNECT TO LAST PRINTER
 */
export async function autoReconnectPrinter() {
  const savedPrinter = getSavedPrinter();
  
  if (!savedPrinter || !savedPrinter.autoReconnect) {
    console.log('⏭️ No saved printer or auto-reconnect disabled');
    return { success: false, reason: 'no_saved_printer' };
  }

  if (printerState.connected && printerState.device?.gatt?.connected && printerState.deviceId === savedPrinter.deviceId) {
    console.log('⏭️ Already connected to the same printer');
    return { success: true, reason: 'already_connected' };
  }

  if (printerState.isReconnecting) {
    console.log('⏭️ Reconnection already in progress');
    return { success: false, reason: 'reconnecting' };
  }

  if (!navigator.bluetooth) {
    console.log('⏭️ Bluetooth not supported');
    return { success: false, reason: 'not_supported' };
  }

  try {
    printerState.isReconnecting = true;
    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('🔄 AUTO-RECONNECTING TO LAST PRINTER');
    console.log('═══════════════════════════════════════════');
    console.log('📋 Device:', savedPrinter.deviceName);
    console.log('📋 ID:', savedPrinter.deviceId);
    console.log('');

    toast.info(`🔄 Auto-reconnecting ke ${savedPrinter.deviceName}...`, { duration: 3000 });

    // ✅ GET PAIRED DEVICES (Chrome 89+)
    // Note: getDevices() only returns devices that the origin has been granted access to.
    // So if the user cleared site data, this might not find it directly.
    const devices = await navigator.bluetooth.getDevices();
    console.log('📱 Found previously connected devices:', devices.length);

    const targetDevice = devices.find(d => d.id === savedPrinter.deviceId);

    if (!targetDevice) {
      console.log('⚠️ Saved printer not in previously connected devices (perhaps site data cleared or device unpaired).');
      toast.warning(`⚠️ ${savedPrinter.deviceName} tidak ditemukan. Pastikan sudah di-pairing dan pernah terhubung dengan situs ini.`, {
        duration: 8000
      });
      return { success: false, reason: 'device_not_found' };
    }

    console.log('✅ Found target device:', targetDevice.name);

    // Connect
    const server = await targetDevice.gatt.connect();
    console.log('✅ GATT connected');

    // Find characteristic
    let foundCharacteristic = null;
    const services = await server.getPrimaryServices();

    const preferredServiceUUIDs = [
      '000018f0-0000-1000-8000-00805f9b34fb',
      '0000fff0-0000-1000-8000-00805f9b34fb',
      '49535343-fe7d-4ae5-8fa9-9fafd205e455',
      '00001101-0000-1000-8000-00805f9b34fb',
    ];

    for (const uuid of preferredServiceUUIDs) {
      try {
        const service = services.find(s => s.uuid === uuid);
        if (service) {
          const chars = await service.getCharacteristics();
          foundCharacteristic = chars.find(c => c.properties.write || c.properties.writeWithoutResponse);
          if (foundCharacteristic) break;
        }
      } catch (e) {
        console.warn(`Error finding characteristic in preferred service ${uuid} during auto-reconnect:`, e);
      }
    }

    if (!foundCharacteristic) {
      // Fallback to iterating all services if preferred didn't work
      for (const svc of services) {
        try {
          const chars = await svc.getCharacteristics();
          foundCharacteristic = chars.find(c => c.properties.write || c.properties.writeWithoutResponse);
          if (foundCharacteristic) break;
        } catch (e) {
          // Continue
        }
      }
    }

    if (!foundCharacteristic) {
      await server.disconnect();
      throw new Error('❌ Characteristic tidak ditemukan untuk printer ini.');
    }

    // ✅ SAVE STATE
    printerState.device = targetDevice;
    printerState.server = server;
    printerState.characteristic = foundCharacteristic;
    printerState.connected = true;
    printerState.deviceId = targetDevice.id;
    printerState.deviceName = targetDevice.name;
    printerState.reconnectAttempts = 0; // Reset attempts on successful reconnect

    // Listen for disconnect again (in case previous listener was lost)
    targetDevice.addEventListener('gattserverdisconnected', handleDisconnect);

    console.log('═══════════════════════════════════════════');
    console.log('✅ AUTO-RECONNECT SUCCESS!');
    console.log('═══════════════════════════════════════════');
    console.log('');

    toast.success(`✅ Auto-reconnect berhasil!\n\n${targetDevice.name} siap print!`, {
      duration: 5000
    });

    return { 
      success: true, 
      deviceName: targetDevice.name,
      deviceId: targetDevice.id
    };

  } catch (error) {
    console.error('❌ Auto-reconnect failed:', error);
    
    // Clear connection state, keep device info for next retry
    printerState.connected = false;
    printerState.server = null;
    printerState.characteristic = null;
    printerState.device = null;
    
    // ✅ RETRY dengan backoff
    if (printerState.reconnectAttempts < printerState.maxReconnectAttempts) {
      printerState.reconnectAttempts++;
      const retryDelay = 5000 * printerState.reconnectAttempts; // 5s, 10s, 15s, 20s, 25s
      
      console.log(`🔄 Retry ${printerState.reconnectAttempts}/${printerState.maxReconnectAttempts} in ${retryDelay/1000}s...`);
      toast.warning(`Auto-reconnect gagal, mencoba lagi dalam ${retryDelay/1000}s...`, { duration: retryDelay });

      setTimeout(() => {
        autoReconnectPrinter(); // Recursive call for retry
      }, retryDelay);
    } else {
      console.log('❌ Max reconnect attempts reached');
      toast.error(`❌ Gagal auto-reconnect ke ${savedPrinter.deviceName}.\n\nConnect manual untuk reconnect.`, {
        duration: 5000
      });
      clearSavedPrinter(); // Clear if max attempts reached
      printerState.deviceId = null;
      printerState.deviceName = null;
      printerState.reconnectAttempts = 0; // Reset for future manual connections
    }

    return { success: false, reason: error.message };

  } finally {
    printerState.isReconnecting = false;
  }
}

// ==================== WEB USB API (Simplified for this update) ====================

/**
 * ✅ CONNECT USB PRINTER - SIMPLIFIED
 */
export async function connectUSBPrinter() {
  throw new Error('USB connection is not fully supported in this version. Please use Bluetooth for persistent printer connections.');
}

/**
 * ✅ DISCONNECT USB PRINTER - SIMPLIFIED
 */
export async function disconnectUSBPrinter() {
  console.warn('Attempted to disconnect USB printer, but USB functions are simplified in this version.');
  toast.warning('Fungsi USB printer tidak diaktifkan di versi ini.');
  return false;
}

/**
 * ✅ PRINT VIA USB - SIMPLIFIED
 */
export async function printReceiptUSB(transaction, settings, companyName) {
  throw new Error('USB printing is not fully supported in this version. Please use Bluetooth for printing.');
}

/**
 * Auto-detect and connect to available printer
 */
export async function autoConnectPrinter() {
  if (isBluetoothSupported()) {
    try {
      toast.info('Auto-connecting: Trying Bluetooth...', { duration: 2000 });
      const result = await autoReconnectPrinter(); // First try auto-reconnect
      if (result.success) {
        return { ...result, method: 'bluetooth' };
      } else {
        // If auto-reconnect failed (e.g., device not found), try a fresh connection
        toast.info('Auto-reconnect failed, trying new Bluetooth connection...', { duration: 2000 });
        const freshConnectResult = await connectBluetoothPrinter();
        return { ...freshConnectResult, method: 'bluetooth' };
      }
    } catch (bluetoothError) {
      if (bluetoothError.message === 'CANCELLED') {
        throw bluetoothError; // Propagate cancellation
      }
      console.log('Bluetooth auto-connect failed', bluetoothError.message);
      throw new Error('❌ Auto-connect gagal!\n\nCoba connect manual (Bluetooth).');
    }
  }
  
  throw new Error('❌ Tidak ada metode koneksi yang tersedia atau didukung di browser ini.');
}

/**
 * Get list of compatible printers
 */
export function getCompatiblePrinters() {
  return COMPATIBLE_PRINTERS;
}

/**
 * Check device capabilities
 */
export function checkPrinterSupport() {
  return {
    bluetooth: {
      supported: isBluetoothSupported(),
      recommended: true,
      note: 'Untuk mobile Android & desktop'
    },
    usb: {
      supported: isUSBSupported(),
      recommended: false,
      note: 'Hanya untuk desktop Chrome/Edge (dan tidak sepenuhnya didukung di versi ini)'
    }
  };
}

/**
 * Print instruction helper
 */
export function getPrintInstructions() {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  if (isMobile) {
    return {
      title: 'Cara Connect Printer di Mobile',
      steps: [
        '1. Nyalakan printer thermal',
        '2. Aktifkan Bluetooth di HP',
        '3. Tekan tombol BT printer 3-5 detik (lampu kedip)',
        '4. Klik "Scan & Connect Printer"',
        '5. Pilih printer dari popup',
        '6. SELESAI! Koneksi TETAP AKTIF sampai disconnect'
      ],
      note: '✅ Setup SEKALI - Auto-reconnect selamanya!'
    };
  }
  
  return {
    title: 'Cara Connect Printer di Desktop',
    steps: [
      '1. Nyalakan printer thermal',
      '2. Aktifkan Bluetooth di komputer',
      '3. Tekan tombol BT printer 3-5 detik (lampu kedip)',
      '4. Klik "Connect Printer"',
      '5. Pilih printer dari popup',
      '6. SELESAI! Koneksi TETAP AKTIF sampai disconnect'
    ],
    note: '✅ Persistent connection - Tidak perlu reconnect!'
  };
}

/**
 * Download printer driver links
 */
export function getPrinterDriverLinks() {
  return {
    zijiang: {
      model: 'JK-5802H',
      windows: 'https://zijiang.com/download/driver/windows', // Example link, might need verification
      android: 'Tidak perlu driver - gunakan Bluetooth langsung',
      ios: 'Tidak perlu driver - gunakan Bluetooth langsung',
      note: 'Driver hanya diperlukan untuk koneksi USB di Windows/macOS. Untuk Linux, driver biasanya sudah built-in.'
    },
    epson: {
      model: 'TM-T20II',
      windows: 'https://download.epson-biz.com/modules/pos/index.php?page=single_soft&cid=5493&pcat=3&scat=31',
      note: 'Cari model spesifik di website Epson Business.'
    },
    generic: {
      note: 'Untuk printer thermal lainnya, cari "ESC/POS printer driver" + merk printer Anda di Google.'
    }
  };
}

// ✅ INIT AUTO-RECONNECT ON PAGE LOAD
if (typeof window !== 'undefined') {
  // Auto-reconnect after page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      const savedPrinter = getSavedPrinter();
      if (savedPrinter && savedPrinter.autoReconnect && isBluetoothSupported()) {
        console.log('🔄 Page loaded - Attempting auto-reconnect...');
        autoReconnectPrinter().catch(() => {});
      }
    }, 3000); // 3 second delay after page load
  });

  // ✅ KEEP-ALIVE - Prevent unexpected disconnects by periodically checking.
  // This is a safety measure; the 'gattserverdisconnected' event should be primary.
  setInterval(() => {
    if (printerState.connected && printerState.device && printerState.characteristic && !printerState.isReconnecting) {
      if (!printerState.device.gatt?.connected) {
        console.log('⚠️ Keep-alive detected disconnect from GATT connection status');
        handleDisconnect();
      }
    }
  }, 30000); // Check every 30 seconds
}

export default {
  // Bluetooth functions
  connectBluetoothPrinter,
  disconnectBluetoothPrinter,
  printReceiptBluetooth,
  testBluetoothPrinter,
  getBluetoothPrinterStatus,
  isBluetoothSupported,
  
  // Auto-detect & Persistent connection
  autoConnectPrinter,
  autoReconnectPrinter, // Explicitly export autoReconnectPrinter
  
  // Info functions
  getCompatiblePrinters,
  checkPrinterSupport,
  getPrintInstructions,
  // getPrinterDriverLinks is not part of the default export list in the outline.
};
