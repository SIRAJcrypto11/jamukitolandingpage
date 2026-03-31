import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Download, Upload, FileSpreadsheet, CheckCircle2, AlertCircle,
  Loader2, X, FileDown, FileUp, Info
} from 'lucide-react';
import { toast } from 'sonner';

export default function ProductImportExport({
  isOpen,
  onClose,
  companyId,
  companyName,
  categories = [],
  locations = [],
  onImportSuccess
}) {
  const [activeTab, setActiveTab] = useState('export');
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const fileInputRef = useRef(null);

  // =====================================================
  // CSV HELPER FUNCTIONS
  // =====================================================
  const escapeCSV = (value) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const parseCSV = (csvText) => {
    const lines = csvText.split('\n');
    const result = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const row = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        
        if (char === '"') {
          if (inQuotes && line[j + 1] === '"') {
            current += '"';
            j++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          row.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      row.push(current.trim());
      result.push(row);
    }
    
    return result;
  };

  // =====================================================
  // EXPORT TEMPLATE & DATA
  // =====================================================
  const generateCSVTemplate = (includeData = false, existingProducts = [], inventoryData = []) => {
    // Get first location name for template
    const firstLocationName = locations.length > 0 ? locations[0].location_name : 'Gudang Utama';
    
    const headers = [
      'SKU*', 'Nama Produk*', 'Kategori', 'Harga Jual*', 'Harga Modal', 
      'Stok Awal', 'Stok Minimum', 'Satuan', 'Deskripsi', 
      'Tipe (produk/jasa)', 'Status (aktif/nonaktif)', 'Barcode', 'Lokasi'
    ];

    const sampleData = [
      ['SKU001', 'Contoh Produk 1', 'Makanan', '25000', '15000', '100', '10', 'pcs', 'Deskripsi produk', 'produk', 'aktif', '8991234567890', firstLocationName],
      ['SKU002', 'Contoh Jasa 1', 'Jasa', '50000', '0', '0', '0', 'layanan', 'Deskripsi jasa', 'jasa', 'aktif', '', firstLocationName],
      ['SKU003', 'Contoh Produk 2', 'Minuman', '10000', '5000', '50', '5', 'pcs', '', 'produk', 'aktif', '', firstLocationName]
    ];

    let rows = [headers];
    
    if (includeData && existingProducts.length > 0) {
      existingProducts.forEach(product => {
        // Find inventory for this product to get location
        const productInventory = inventoryData.find(inv => inv.product_id === product.id);
        const locationName = productInventory?.location_name || firstLocationName;
        
        rows.push([
          product.sku || '',
          product.name || '',
          product.category || '',
          String(product.price || 0),
          String(product.cost || 0),
          String(productInventory?.quantity || product.stock || 0),
          String(product.min_stock || 5),
          product.unit || 'pcs',
          product.description || '',
          product.product_type || 'produk',
          product.is_active ? 'aktif' : 'nonaktif',
          product.barcode || '',
          locationName
        ]);
      });
    } else {
      rows = rows.concat(sampleData);
    }

    // Add locations list at the end for reference
    if (locations.length > 0) {
      rows.push([]);
      rows.push(['--- DAFTAR LOKASI TERSEDIA ---']);
      locations.forEach(loc => {
        rows.push([loc.location_name, loc.location_type || '', loc.address || '']);
      });
    }

    return rows.map(row => row.map(escapeCSV).join(',')).join('\n');
  };

  const handleDownloadTemplate = () => {
    const csvContent = generateCSVTemplate(false, []);
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `template_import_produk_${companyName || 'company'}.csv`;
    link.click();
    toast.success('✅ Template CSV berhasil didownload!');
  };

  const handleExportProducts = async () => {
    setIsProcessing(true);
    try {
      const [products, inventoryData] = await Promise.all([
        base44.entities.CompanyPOSProduct.filter({ company_id: companyId }),
        base44.entities.Inventory.filter({ company_id: companyId })
      ]);

      if (!products || products.length === 0) {
        toast.warning('Tidak ada produk untuk di-export');
        setIsProcessing(false);
        return;
      }

      const csvContent = generateCSVTemplate(true, products, inventoryData || []);
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `produk_${companyName || 'company'}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      toast.success(`✅ ${products.length} produk berhasil di-export!`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Gagal export produk');
    } finally {
      setIsProcessing(false);
    }
  };

  // =====================================================
  // IMPORT PRODUCTS
  // =====================================================
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type - only CSV supported
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      toast.error('Format file tidak didukung. Gunakan file CSV (.csv)');
      return;
    }

    setIsProcessing(true);
    setPreviewData(null);
    setImportResults(null);

    try {
      const text = await file.text();
      const jsonData = parseCSV(text);
      
      if (jsonData.length < 2) {
        toast.error('File kosong atau tidak memiliki data');
        setIsProcessing(false);
        return;
      }

      // Parse rows (skip header)
      const headers = jsonData[0];
      const rows = jsonData.slice(1).filter(row => row.length > 0 && row[0]); // Filter empty rows

      const parsedProducts = rows.map((row, index) => {
        const locationName = String(row[12] || '').trim();
        // Find matching location from company locations
        const matchedLocation = locations.find(loc => 
          loc.location_name.toLowerCase() === locationName.toLowerCase()
        );
        
        return {
          rowNumber: index + 2,
          sku: String(row[0] || '').trim(),
          name: String(row[1] || '').trim(),
          category: String(row[2] || '').trim(),
          price: parseFloat(row[3]) || 0,
          cost: parseFloat(row[4]) || 0,
          stock: parseInt(row[5]) || 0,
          min_stock: parseInt(row[6]) || 5,
          unit: String(row[7] || 'pcs').trim(),
          description: String(row[8] || '').trim(),
          product_type: String(row[9] || 'produk').toLowerCase().includes('jasa') ? 'jasa' : 'produk',
          is_active: !String(row[10] || '').toLowerCase().includes('nonaktif'),
          barcode: String(row[11] || '').trim(),
          location_name: locationName,
          location_id: matchedLocation?.id || (locations.length > 0 ? locations[0].id : null),
          matched_location: matchedLocation || (locations.length > 0 ? locations[0] : null),
          isValid: true,
          errors: []
        };
      });

      // Validate each product
      const existingProducts = await base44.entities.CompanyPOSProduct.filter({
        company_id: companyId
      });
      const existingSKUs = new Set(existingProducts.map(p => p.sku?.toLowerCase()));

      parsedProducts.forEach(product => {
        product.errors = [];
        
        if (!product.sku) {
          product.errors.push('SKU wajib diisi');
        }
        if (!product.name) {
          product.errors.push('Nama produk wajib diisi');
        }
        if (product.price <= 0) {
          product.errors.push('Harga jual harus lebih dari 0');
        }
        
        // Check duplicate SKU in file
        const duplicateInFile = parsedProducts.filter(p => 
          p.sku.toLowerCase() === product.sku.toLowerCase()
        ).length > 1;
        
        if (duplicateInFile) {
          product.errors.push('SKU duplikat dalam file');
        }

        // Check existing SKU (for new products)
        if (existingSKUs.has(product.sku?.toLowerCase())) {
          product.isUpdate = true; // Mark as update
        }

        product.isValid = product.errors.length === 0;
      });

      setPreviewData({
        total: parsedProducts.length,
        valid: parsedProducts.filter(p => p.isValid).length,
        invalid: parsedProducts.filter(p => !p.isValid).length,
        updates: parsedProducts.filter(p => p.isUpdate).length,
        products: parsedProducts
      });

    } catch (error) {
      console.error('Parse error:', error);
      toast.error('Gagal membaca file: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!previewData || previewData.valid === 0) {
      toast.error('Tidak ada data valid untuk di-import');
      return;
    }

    setIsProcessing(true);
    setImportProgress(0);

    const results = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: []
    };

    const validProducts = previewData.products.filter(p => p.isValid);

    for (let i = 0; i < validProducts.length; i++) {
      const product = validProducts[i];
      
      try {
        const productData = {
          company_id: companyId,
          sku: product.sku,
          name: product.name,
          category: product.category,
          price: product.price,
          cost: product.cost,
          stock: product.stock,
          min_stock: product.min_stock,
          unit: product.unit,
          description: product.description,
          product_type: product.product_type,
          is_active: product.is_active,
          barcode: product.barcode
        };

        if (product.isUpdate) {
          // Find and update existing product
          const existing = await base44.entities.CompanyPOSProduct.filter({
            company_id: companyId,
            sku: product.sku
          });

          if (existing && existing.length > 0) {
            await base44.entities.CompanyPOSProduct.update(existing[0].id, productData);
            results.updated++;
          } else {
            await base44.entities.CompanyPOSProduct.create(productData);
            results.created++;
          }
        } else {
          await base44.entities.CompanyPOSProduct.create(productData);
          results.created++;
        }

        // Create inventory for new products
        if (!product.isUpdate && product.stock > 0 && locations.length > 0) {
          const savedProducts = await base44.entities.CompanyPOSProduct.filter({
            company_id: companyId,
            sku: product.sku
          });

          if (savedProducts && savedProducts.length > 0) {
            const savedProduct = savedProducts[0];
            // Use matched location from CSV or fallback to first location
            const targetLocation = product.matched_location || locations[0];

            await base44.entities.Inventory.create({
              company_id: companyId,
              product_id: savedProduct.id,
              product_name: savedProduct.name,
              product_sku: savedProduct.sku,
              location_id: targetLocation.id,
              location_name: targetLocation.location_name,
              quantity: product.stock,
              available_quantity: product.stock,
              reserved_quantity: 0,
              min_stock: product.min_stock,
              max_stock: 1000,
              unit_cost: product.cost,
              total_value: product.stock * product.cost,
              stock_status: product.stock === 0 ? 'out_of_stock' :
                           product.stock <= product.min_stock ? 'low_stock' : 'in_stock'
            });

            // Create stock movement
            await base44.entities.StockMovement.create({
              company_id: companyId,
              product_id: savedProduct.id,
              product_name: savedProduct.name,
              location_id: targetLocation.id,
              location_name: targetLocation.location_name,
              movement_type: 'in',
              quantity: product.stock,
              stock_before: 0,
              stock_after: product.stock,
              reference_type: 'manual',
              reason: 'Import dari Excel',
              performed_by: 'system',
              performed_by_name: 'Import System',
              unit_cost: product.cost,
              total_value: product.stock * product.cost
            });
          }
        }

      } catch (error) {
        results.failed++;
        results.errors.push({
          row: product.rowNumber,
          sku: product.sku,
          error: error.message
        });
      }

      setImportProgress(Math.round(((i + 1) / validProducts.length) * 100));
    }

    setImportResults(results);
    setIsProcessing(false);

    // Broadcast update
    try {
      const channel = new BroadcastChannel('snishop_inventory_updates');
      channel.postMessage({
        type: 'PRODUCT_IMPORTED',
        companyId: companyId,
        count: results.created + results.updated,
        timestamp: Date.now()
      });
      channel.close();
    } catch (e) {}

    if (results.created > 0 || results.updated > 0) {
      toast.success(`✅ Import selesai! ${results.created} baru, ${results.updated} diupdate`);
      if (onImportSuccess) onImportSuccess();
    }
  };

  const resetImport = () => {
    setPreviewData(null);
    setImportResults(null);
    setImportProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
        <DialogHeader className="border-b border-gray-200 dark:border-gray-700 pb-4">
          <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <FileSpreadsheet className="w-5 h-5 text-green-500" />
            Import / Export Produk
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Tab Buttons */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={activeTab === 'export' ? 'default' : 'outline'}
              onClick={() => setActiveTab('export')}
              className={activeTab === 'export' ? 'bg-blue-600' : ''}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button
              variant={activeTab === 'import' ? 'default' : 'outline'}
              onClick={() => { setActiveTab('import'); resetImport(); }}
              className={activeTab === 'import' ? 'bg-green-600' : ''}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
          </div>

          {/* Export Tab */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <FileDown className="w-8 h-8 text-blue-600 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-blue-900 dark:text-blue-100">Download Template</h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        Download template Excel kosong untuk mengisi data produk baru
                      </p>
                      <Button
                        onClick={handleDownloadTemplate}
                        className="mt-3 bg-blue-600 hover:bg-blue-700"
                        disabled={isProcessing}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Template
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <FileSpreadsheet className="w-8 h-8 text-green-600 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-green-900 dark:text-green-100">Export Semua Produk</h3>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        Export semua produk yang ada ke file Excel untuk backup atau editing
                      </p>
                      <Button
                        onClick={handleExportProducts}
                        className="mt-3 bg-green-600 hover:bg-green-700"
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4 mr-2" />
                        )}
                        Export Produk
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Import Tab */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              {/* File Input */}
              {!previewData && !importResults && (
                <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <FileUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                        Pilih File Excel
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Upload file CSV dengan format yang sesuai template
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4 mr-2" />
                        )}
                        Pilih File
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Preview Data */}
              {previewData && !importResults && (
                <div className="space-y-4">
                  <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
                    <Info className="w-4 h-4 text-blue-600" />
                    <AlertDescription className="text-blue-800 dark:text-blue-200">
                      <strong>{previewData.total}</strong> baris ditemukan: 
                      <span className="text-green-600 ml-2">{previewData.valid} valid</span>
                      {previewData.invalid > 0 && (
                        <span className="text-red-600 ml-2">{previewData.invalid} error</span>
                      )}
                      {previewData.updates > 0 && (
                        <span className="text-yellow-600 ml-2">{previewData.updates} update</span>
                      )}
                    </AlertDescription>
                  </Alert>

                  {/* Preview Table */}
                  <div className="max-h-64 overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0">
                        <tr>
                          <th className="p-2 text-left">Baris</th>
                          <th className="p-2 text-left">SKU</th>
                          <th className="p-2 text-left">Nama</th>
                          <th className="p-2 text-right">Harga</th>
                          <th className="p-2 text-right">Stok</th>
                          <th className="p-2 text-center">Status</th>
                          <th className="p-2 text-left">Lokasi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.products.slice(0, 50).map((product, idx) => (
                          <tr 
                            key={idx} 
                            className={`border-b border-gray-200 dark:border-gray-700 ${
                              !product.isValid ? 'bg-red-50 dark:bg-red-900/20' : 
                              product.isUpdate ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''
                            }`}
                          >
                            <td className="p-2 text-gray-600 dark:text-gray-400">{product.rowNumber}</td>
                            <td className="p-2 font-mono text-xs">{product.sku}</td>
                            <td className="p-2 truncate max-w-[150px]">{product.name}</td>
                            <td className="p-2 text-right">Rp {product.price.toLocaleString()}</td>
                            <td className="p-2 text-right">{product.stock}</td>
                            <td className="p-2 text-center">
                              {!product.isValid ? (
                                <Badge className="bg-red-600 text-xs">Error</Badge>
                              ) : product.isUpdate ? (
                                <Badge className="bg-yellow-600 text-xs">Update</Badge>
                              ) : (
                                <Badge className="bg-green-600 text-xs">Baru</Badge>
                              )}
                            </td>
                            <td className="p-2 text-xs truncate max-w-[100px]">
                              {product.matched_location?.location_name || product.location_name || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {previewData.products.length > 50 && (
                      <p className="text-center text-xs text-gray-500 py-2">
                        +{previewData.products.length - 50} baris lainnya...
                      </p>
                    )}
                  </div>

                  {/* Error List */}
                  {previewData.products.some(p => !p.isValid) && (
                    <Alert className="bg-red-50 dark:bg-red-900/20 border-red-200">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <AlertDescription className="text-red-800 dark:text-red-200">
                        <p className="font-semibold mb-2">Data dengan error:</p>
                        <ul className="list-disc list-inside text-xs space-y-1">
                          {previewData.products.filter(p => !p.isValid).slice(0, 5).map((p, i) => (
                            <li key={i}>
                              Baris {p.rowNumber}: {p.errors.join(', ')}
                            </li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 justify-end">
                    <Button variant="outline" onClick={resetImport}>
                      <X className="w-4 h-4 mr-2" />
                      Batal
                    </Button>
                    <Button
                      onClick={handleImport}
                      disabled={previewData.valid === 0 || isProcessing}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      Import {previewData.valid} Produk
                    </Button>
                  </div>

                  {/* Progress */}
                  {isProcessing && (
                    <div className="space-y-2">
                      <Progress value={importProgress} className="h-2" />
                      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                        Mengimport... {importProgress}%
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Import Results */}
              {importResults && (
                <div className="space-y-4">
                  <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <AlertDescription className="text-green-800 dark:text-green-200">
                      <p className="font-semibold">Import Selesai!</p>
                      <ul className="mt-2 space-y-1 text-sm">
                        <li>✅ {importResults.created} produk baru dibuat</li>
                        <li>🔄 {importResults.updated} produk diupdate</li>
                        {importResults.failed > 0 && (
                          <li className="text-red-600">❌ {importResults.failed} gagal</li>
                        )}
                      </ul>
                    </AlertDescription>
                  </Alert>

                  {importResults.errors.length > 0 && (
                    <Alert className="bg-red-50 dark:bg-red-900/20 border-red-200">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <AlertDescription className="text-red-800 dark:text-red-200">
                        <p className="font-semibold mb-2">Error Detail:</p>
                        <ul className="list-disc list-inside text-xs space-y-1">
                          {importResults.errors.slice(0, 10).map((err, i) => (
                            <li key={i}>
                              Baris {err.row} ({err.sku}): {err.error}
                            </li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={resetImport}>
                      Import Lagi
                    </Button>
                    <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700">
                      Selesai
                    </Button>
                  </div>
                </div>
              )}

              {/* Instructions */}
              {!previewData && !importResults && (
                <Alert className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <Info className="w-4 h-4 text-gray-600" />
                  <AlertDescription className="text-gray-700 dark:text-gray-300 text-sm">
                    <p className="font-semibold mb-2">Panduan Import:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Download template terlebih dahulu dari tab Export</li>
                      <li>Isi data produk sesuai format template</li>
                      <li>Hapus baris contoh sebelum import</li>
                      <li>Upload file dan periksa preview data</li>
                      <li>Klik Import untuk menyimpan data</li>
                    </ol>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}