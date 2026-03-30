// CompanyProductForm - existing file, no changes needed
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Upload, Loader2, Save, MapPin, Plus, Trash2, Package, Scan, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

import BarcodeScanner from '@/components/pos/BarcodeScanner';
import { UploadFile } from '@/api/integrations';

export default function CompanyProductForm({ product, onSave, onClose, categories, companyId, onCategoryCreated }) {
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    description: '',
    price: 0,
    cost: 0,
    stock: 0,
    min_stock: 5,
    unit: 'pcs',
    supplier: '',
    tax_rate: 0,
    image_url: '',
    is_active: true,
    is_unlimited_stock: false,
    ...product
  });

  const [locations, setLocations] = useState([]);
  const [locationStocks, setLocationStocks] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [locationLoadError, setLocationLoadError] = useState(false);

  // ✅ SCANNER & VALIDATION STATE
  const [showScanner, setShowScanner] = useState(false);
  const [skuError, setSkuError] = useState(null);
  const [isCheckingSku, setIsCheckingSku] = useState(false);

  // ✅ Category creation states
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  useEffect(() => {
    console.log('🔧 CompanyProductForm mounted with companyId:', companyId);

    if (companyId) {
      loadLocations();
    } else {
      console.warn('⚠️ No companyId provided!');
      setLocations([]);
      setLocationStocks([]);
      setIsLoadingLocations(false);
      toast.error('Company ID tidak tersedia. Tutup dan buka form kembali.');
    }
  }, [companyId]);

  // ✅ ORACLE-STYLE: Proactive Duplicate SKU Check
  const checkDuplicateSku = async (skuToCheck) => {
    if (!skuToCheck || !companyId) return;

    // Ignore if same SKU as original product (editing)
    if (product && product.sku === skuToCheck) {
      setSkuError(null);
      return;
    }

    try {
      setIsCheckingSku(true);
      const existing = await base44.entities.CompanyPOSProduct.filter({
        company_id: companyId,
        sku: skuToCheck
      });

      // Validasi ketat: Jika ada produk lain dengan SKU sama
      const duplicate = existing?.find(p => p.id !== product?.id);

      if (duplicate) {
        setSkuError(`⛔ SKU "${skuToCheck}" sudah digunakan oleh produk: ${duplicate.name}`);
        toast.error(`⚠️ SKU DUPLIKAT! Sudah digunakan oleh: ${duplicate.name}`);
      } else {
        setSkuError(null); // Clear error if unique
      }
    } catch (error) {
      console.error('Error checking SKU:', error);
    } finally {
      setIsCheckingSku(false);
    }
  };

  const loadLocations = async () => {
    // ... (rest of loadLocations stays same)
    const startTime = Date.now();
    console.log('📦 Starting location load for company:', companyId);

    try {
      setIsLoadingLocations(true);
      setLocationLoadError(false);

      // ✅ FETCH LOCATIONS dengan timeout 3 detik (lebih cepat!)
      const locationsPromise = base44.entities.WarehouseLocation.filter({
        company_id: companyId,
        is_active: true
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout after 3 seconds')), 3000)
      );

      const locationsData = await Promise.race([locationsPromise, timeoutPromise]);

      const loadTime = Date.now() - startTime;
      console.log(`✅ Loaded ${locationsData?.length || 0} locations in ${loadTime}ms`);

      setLocations(locationsData || []);

      // ✅ LOAD EXISTING INVENTORY if editing (with timeout)
      if (product && product.id) {
        console.log('📝 Loading existing inventory for product:', product.id);

        try {
          const inventoryPromise = base44.entities.Inventory.filter({
            company_id: companyId,
            product_id: product.id
          });

          const inventoryTimeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Inventory timeout')), 3000)
          );

          const inventoryData = await Promise.race([inventoryPromise, inventoryTimeoutPromise]);
          console.log(`✅ Loaded inventory: ${inventoryData?.length || 0} records`);

          const stocksByLocation = (locationsData || []).map(location => {
            const inv = inventoryData.find(i => i.location_id === location.id);
            return {
              location_id: location.id,
              location_name: location.location_name,
              quantity: inv?.quantity || 0,
              min_stock: inv?.min_stock || formData.min_stock || 5,
              unit_cost: inv?.unit_cost || formData.cost || 0,
              selling_price: inv?.selling_price || formData.price || 0
            };
          });

          setLocationStocks(stocksByLocation);
        } catch (invError) {
          console.warn('⚠️ Inventory load failed, using defaults:', invError.message);
          const defaultStocks = (locationsData || []).map(location => ({
            location_id: location.id,
            location_name: location.location_name,
            quantity: 0,
            min_stock: formData.min_stock || 5,
            unit_cost: formData.cost || 0,
            selling_price: formData.price || 0
          }));
          setLocationStocks(defaultStocks);
        }
      } else {
        // ✅ NEW PRODUCT - Initialize dengan 0
        const defaultStocks = (locationsData || []).map(location => ({
          location_id: location.id,
          location_name: location.location_name,
          quantity: 0,
          min_stock: formData.min_stock || 5,
          unit_cost: formData.cost || 0,
          selling_price: formData.price || 0
        }));

        setLocationStocks(defaultStocks);
        console.log('✅ Initialized default stocks for', defaultStocks.length, 'locations');
      }

    } catch (error) {
      const loadTime = Date.now() - startTime;
      console.error(`❌ Location load failed after ${loadTime}ms:`, error.message);

      setLocationLoadError(true);

      if (error.message.includes('Timeout')) {
        toast.error('⏱️ Loading lokasi timeout (>3 detik). Klik "Coba Lagi" atau "Lewati".');
      } else {
        toast.error('Gagal memuat lokasi: ' + error.message);
      }

      setLocations([]);
      setLocationStocks([]);
    } finally {
      setIsLoadingLocations(false);
    }
  };

  const updateLocationStock = (locationId, field, value) => {
    setLocationStocks(prev => prev.map(stock =>
      stock.location_id === locationId
        ? { ...stock, [field]: (field === 'quantity' || field === 'min_stock') ? (parseInt(value) || 0) : (parseFloat(value) || 0) }
        : stock
    ));
  };

  const handleImageUpload = async (file) => {
    try {
      setIsUploading(true);
      const { file_url } = await UploadFile({ file });
      setFormData({ ...formData, image_url: file_url });
      toast.success('Gambar berhasil diunggah');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Gagal mengunggah gambar');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ✅ STRICT BLOCKING: Oracle-style prevent save on duplicate
    if (skuError) {
      toast.error('Gagal Simpan: SKU sudah terdaftar pada produk lain. Harap ganti SKU.');
      return;
    }

    // Trigger check again just to be safe if user clicked save immediately after typing
    // (Optional, but adds robustness)

    if (!formData.name || !formData.sku || formData.price <= 0) {
      toast.error('Nama, SKU, dan Harga wajib diisi dengan benar');
      return;
    }

    if (!companyId) {
      toast.error('Company ID tidak tersedia. Refresh halaman dan coba lagi.');
      return;
    }

    try {
      setIsSaving(true);

      const totalStock = locationStocks.reduce((sum, loc) => sum + (loc.quantity || 0), 0);

      const productData = {
        ...formData,
        stock: totalStock
      };

      console.log('💾 Saving product with', locationStocks.length, 'location stocks');
      await onSave(productData, locationStocks);
    } catch (error) {
      console.error('Error in form submit:', error);
      toast.error('Gagal menyimpan produk');
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ Handle creating new category inline
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim() || !companyId) {
      toast.error('Nama kategori tidak boleh kosong');
      return;
    }

    try {
      setIsSavingCategory(true);
      await base44.entities.CompanyPOSCategory.create({
        company_id: companyId,
        name: newCategoryName.trim(),
        is_active: true
      });
      toast.success('✅ Kategori berhasil ditambahkan!');
      setFormData({ ...formData, category: newCategoryName.trim() });
      setNewCategoryName('');
      setShowNewCategoryInput(false);

      // ✅ BROADCAST to sync with POS Cashier and other pages
      try {
        const productChannel = new BroadcastChannel('snishop_product_updates');
        productChannel.postMessage({
          type: 'CATEGORY_CREATED',
          companyId: companyId,
          categoryName: newCategoryName.trim(),
          timestamp: Date.now()
        });
        productChannel.close();
        console.log('✅ Category broadcast sent');
      } catch (e) { }

      if (onCategoryCreated) onCategoryCreated();
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error('Gagal membuat kategori: ' + error.message);
    } finally {
      setIsSavingCategory(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <Card className="bg-gray-900 border-gray-700 max-w-4xl w-full max-h-[95vh] overflow-y-auto my-4 mx-3 sm:mx-0">
        <CardHeader className="border-b border-gray-800 p-4 sm:p-6 sticky top-0 bg-gray-900 z-10">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-white text-base sm:text-xl">
              {product ? 'Edit Produk' : 'Tambah Produk Baru'}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="flex-shrink-0">
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Image Upload */}
            <div>
              <Label className="text-gray-300 text-xs sm:text-sm">Gambar Produk</Label>
              <div className="mt-2">
                {formData.image_url ? (
                  <div className="relative inline-block">
                    <img
                      src={formData.image_url}
                      alt="Product"
                      className="w-32 h-32 object-cover rounded-lg border-2 border-gray-700"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={() => setFormData({ ...formData, image_url: '' })}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) handleImageUpload(file);
                      }}
                      disabled={isUploading}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                    {isUploading && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
                  </div>
                )}
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300 text-xs sm:text-sm">Nama Produk *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                  required
                />
              </div>

              <div>
                <Label className="text-gray-300 text-xs sm:text-sm">SKU/Barcode *</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.sku}
                    onChange={(e) => {
                      setFormData({ ...formData, sku: e.target.value.toUpperCase() });
                      setSkuError(null); // Reset visual error temporarily
                    }}
                    onBlur={() => checkDuplicateSku(formData.sku)} // ✅ CHECK ON BLUR
                    className={`bg-gray-800 border-gray-700 text-white mt-1 uppercase ${skuError ? 'border-red-500 ring-1 ring-red-500' : ''
                      }`}
                    required
                    placeholder="Scan atau ketik SKU"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowScanner(true)}
                    className="mt-1 bg-blue-700 hover:bg-blue-600 text-white border-blue-600"
                    title="Scan Barcode (Camera)"
                  >
                    <Scan className="w-4 h-4" />
                  </Button>
                </div>
                {/* ✅ ERROR MESSAGE UI */}
                {isCheckingSku && <p className="text-xs text-blue-400 mt-1 animate-pulse">Memeriksa ketersediaan SKU...</p>}
                {skuError && (
                  <div className="flex items-center gap-2 mt-1 text-red-400 bg-red-900/20 p-2 rounded border border-red-800">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <p className="text-xs font-bold">{skuError}</p>
                  </div>
                )}
              </div>

              {/* ✅ SCANNER MODAL */}
              {showScanner && (
                <BarcodeScanner
                  scanMode="raw" // ✅ Use RAW mode to get string directly
                  onScan={(code) => {
                    setFormData(prev => ({ ...prev, sku: code }));
                    checkDuplicateSku(code); // ✅ Check immediately after scan
                    setShowScanner(false);
                    // toast handled by scanner
                  }}
                  onClose={() => setShowScanner(false)}
                />
              )}

              <div>
                <Label className="text-gray-300 text-xs sm:text-sm">Kategori</Label>
                <select
                  value={showNewCategoryInput ? '__new__' : formData.category}
                  onChange={(e) => {
                    if (e.target.value === '__new__') {
                      setShowNewCategoryInput(true);
                    } else {
                      setShowNewCategoryInput(false);
                      setFormData({ ...formData, category: e.target.value });
                    }
                  }}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-md mt-1"
                >
                  <option value="">Pilih Kategori</option>
                  <option value="__new__">➕ Tambah Kategori Baru...</option>
                  {categories?.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>

                {/* Inline new category creation */}
                {showNewCategoryInput && (
                  <div className="mt-2 p-3 bg-gray-800/50 border border-gray-600 rounded-lg space-y-2">
                    <Label className="text-gray-300 text-xs">Nama Kategori Baru</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Contoh: Makanan, Minuman, Jasa..."
                        className="bg-gray-900 border-gray-600 text-white flex-1"
                        disabled={isSavingCategory}
                      />
                      <Button
                        type="button"
                        onClick={handleCreateCategory}
                        disabled={isSavingCategory || !newCategoryName.trim()}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isSavingCategory ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setShowNewCategoryInput(false);
                          setNewCategoryName('');
                        }}
                        disabled={isSavingCategory}
                        className="text-gray-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-gray-300 text-xs sm:text-sm">Harga Jual *</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                  min="0"
                  required
                />
              </div>

              <div>
                <Label className="text-gray-300 text-xs sm:text-sm">Harga Modal</Label>
                <Input
                  type="number"
                  value={formData.cost}
                  onChange={(e) => {
                    const cost = parseFloat(e.target.value) || 0;
                    setFormData({ ...formData, cost });
                    setLocationStocks(prev => prev.map(s => ({ ...s, unit_cost: cost })));
                  }}
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                  min="0"
                />
              </div>

              <div>
                <Label className="text-gray-300 text-xs sm:text-sm">Minimum Stok</Label>
                <Input
                  type="number"
                  value={formData.min_stock}
                  onChange={(e) => {
                    const minStock = parseInt(e.target.value) || 0;
                    setFormData({ ...formData, min_stock: minStock });
                    setLocationStocks(prev => prev.map(s => ({ ...s, min_stock: minStock })));
                  }}
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                  min="0"
                />
              </div>

              <div>
                <Label className="text-gray-300 text-xs sm:text-sm">Satuan</Label>
                <Input
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                  placeholder="pcs, kg, liter, dll"
                />
              </div>

              <div>
                <Label className="text-gray-300 text-xs sm:text-sm">Supplier</Label>
                <Input
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                />
              </div>

              <div>
                <Label className="text-gray-300 text-xs sm:text-sm">Pajak (%)</Label>
                <Input
                  type="number"
                  value={formData.tax_rate}
                  onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                  min="0"
                  max="100"
                />
              </div>

              {/* ✅ UNLIMITED STOCK TOGGLE */}
              <div className="flex items-center gap-3 p-3 bg-blue-900/20 border border-blue-800 rounded-lg">
                <input
                  type="checkbox"
                  id="unlimited_stock"
                  checked={formData.is_unlimited_stock}
                  onChange={(e) => setFormData({ ...formData, is_unlimited_stock: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 bg-gray-700 border-gray-600"
                />
                <div className="flex-1">
                  <Label htmlFor="unlimited_stock" className="text-white font-medium cursor-pointer">
                    Stok Tak Terbatas (Unlimited)
                  </Label>
                  <p className="text-xs text-gray-400">
                    Produk ini tidak akan mengurangi stok inventory & selalu tersedia.
                  </p>
                </div>
                <Package className={`w-6 h-6 ${formData.is_unlimited_stock ? 'text-blue-400' : 'text-gray-600'}`} />
              </div>
              
              {/* ✅ PRODUCT ACTIVE/INACTIVE TOGGLE */}
              <div className="flex items-center gap-3 p-3 bg-green-900/20 border border-green-800 rounded-lg">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-5 h-5 text-green-600 rounded focus:ring-green-500 bg-gray-700 border-gray-600"
                />
                <div className="flex-1">
                  <Label htmlFor="is_active" className="text-white font-medium cursor-pointer">
                    Status Produk: {formData.is_active ? '✅ AKTIF' : '❌ NON-AKTIF'}
                  </Label>
                  <p className="text-xs text-gray-400">
                    {formData.is_active 
                      ? 'Produk ini akan muncul di Kasir dan Landing Page Home'
                      : 'Produk TIDAK akan muncul di Kasir dan Home (data tetap tersimpan)'}
                  </p>
                </div>
                {formData.is_active ? (
                  <Eye className="w-6 h-6 text-green-400" />
                ) : (
                  <EyeOff className="w-6 h-6 text-gray-600" />
                )}
              </div>
            </div>


            <div>
              <Label className="text-gray-300 text-xs sm:text-sm">Deskripsi</Label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-md mt-1"
                rows="3"
              />
            </div>

            {/* ✅ LOCATION STOCK SECTION - OPTIMIZED */}
            {/* HIDE if Unlimited Stock is checked */}
            {!formData.is_unlimited_stock && (
              <div className="border-t border-gray-700 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <Label className="text-white text-base font-semibold flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-purple-400" />
                      Alokasi Stok per Lokasi
                    </Label>
                    <p className="text-xs text-gray-400 mt-1">
                      Atur stok produk ini di setiap lokasi gudang/toko
                    </p>
                  </div>
                  {!isLoadingLocations && locationStocks.length > 0 && (
                    <Badge className="bg-purple-600 text-white">
                      Total: {locationStocks.reduce((sum, s) => sum + (s.quantity || 0), 0)} {formData.unit}
                    </Badge>
                  )}
                </div>

                {isLoadingLocations ? (
                  <div className="flex flex-col items-center justify-center py-8 space-y-3">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                    <span className="text-gray-400 text-sm">Memuat lokasi... (max 3 detik)</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsLoadingLocations(false);
                        setLocationLoadError(true);
                        toast.info('Loading dibatalkan. Simpan produk tanpa inventory.');
                      }}
                      className="border-yellow-600 text-yellow-400"
                    >
                      Lewati & Simpan Tanpa Lokasi
                    </Button>
                  </div>
                ) : locationLoadError ? (
                  <div className="p-6 bg-red-900/20 border border-red-700 rounded-lg text-center">
                    <Package className="w-12 h-12 text-red-400 mx-auto mb-3" />
                    <p className="text-red-300 font-semibold mb-2">Gagal memuat lokasi</p>
                    <p className="text-xs text-gray-400 mb-4">
                      Produk tetap bisa disimpan, lokasi bisa diatur nanti di menu Inventory
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setLocationLoadError(false);
                          loadLocations();
                        }}
                        className="bg-blue-600"
                      >
                        Coba Lagi
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setLocationLoadError(false);
                          toast.info('Lanjutkan tanpa lokasi');
                        }}
                        className="border-gray-600"
                      >
                        Lanjutkan
                      </Button>
                    </div>
                  </div>
                ) : locations.length === 0 ? (
                  <div className="p-6 bg-yellow-900/20 border border-yellow-700 rounded-lg text-center">
                    <Package className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
                    <p className="text-yellow-300 font-semibold mb-2">Belum ada lokasi</p>
                    <p className="text-xs text-gray-400 mb-4">
                      Buat lokasi di menu Inventory terlebih dahulu untuk mengatur stok per lokasi
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const inventoryUrl = window.location.origin + '/inventory';
                          window.open(inventoryUrl, '_blank');
                        }}
                        className="border-yellow-600 text-yellow-400"
                      >
                        Buka Inventory (Tab Baru)
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={loadLocations}
                        className="bg-blue-600"
                      >
                        Refresh Lokasi
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {locationStocks.map((stock, index) => (
                      <Card key={stock.location_id} className="bg-gray-800 border-gray-700">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-purple-600/20 rounded-lg">
                              <MapPin className="w-5 h-5 text-purple-400" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-white">{stock.location_name}</p>
                              <p className="text-xs text-gray-400">Lokasi #{index + 1}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <Label className="text-gray-400 text-xs">Stok Awal</Label>
                              <Input
                                type="number"
                                value={stock.quantity}
                                onChange={(e) => updateLocationStock(stock.location_id, 'quantity', e.target.value)}
                                className="bg-gray-900 border-gray-600 text-white mt-1"
                                min="0"
                                placeholder="0"
                              />
                            </div>

                            <div>
                              <Label className="text-gray-400 text-xs">Min Stok</Label>
                              <Input
                                type="number"
                                value={stock.min_stock}
                                onChange={(e) => updateLocationStock(stock.location_id, 'min_stock', e.target.value)}
                                className="bg-gray-900 border-gray-600 text-white mt-1"
                                min="0"
                                placeholder="5"
                              />
                            </div>

                            <div>
                              <Label className="text-gray-400 text-xs">Harga Modal</Label>
                              <Input
                                type="number"
                                value={stock.unit_cost}
                                onChange={(e) => updateLocationStock(stock.location_id, 'unit_cost', e.target.value)}
                                className="bg-gray-900 border-gray-600 text-white mt-1"
                                min="0"
                                placeholder="0"
                              />
                            </div>

                            <div>
                              <Label className="text-gray-400 text-xs text-blue-400 font-semibold">Harga Jual (Lokasi)</Label>
                              <Input
                                type="number"
                                value={stock.selling_price || ''}
                                onChange={(e) => updateLocationStock(stock.location_id, 'selling_price', e.target.value)}
                                className="bg-gray-900 border-gray-600 text-white mt-1"
                                placeholder={formData.price}
                              />
                              <p className="text-[10px] text-gray-500 mt-1">Kosongkan utk harga default</p>
                            </div>
                          </div>

                          <div className="mt-3 pt-3 border-t border-gray-700 flex items-center justify-between text-xs">
                            <span className="text-gray-400">Total Nilai:</span>
                            <span className="text-green-400 font-semibold">
                              Rp {((stock.quantity || 0) * (stock.unit_cost || 0)).toLocaleString('id-ID')}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {/* Summary */}
                    {locationStocks.length > 0 && (
                      <Card className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-purple-700">
                        <CardContent className="p-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-400">Total Stok:</p>
                              <p className="text-xl font-bold text-white">
                                {locationStocks.reduce((sum, s) => sum + (s.quantity || 0), 0)} {formData.unit}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-400">Total Nilai:</p>
                              <p className="text-xl font-bold text-green-400">
                                Rp {locationStocks.reduce((sum, s) => sum + ((s.quantity || 0) * (s.unit_cost || 0)), 0).toLocaleString('id-ID')}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-gray-800">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 border-gray-700"
                disabled={isSaving}
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={isSaving || isUploading}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {locationStocks.length > 0 ? 'Simpan Produk & Stok' : 'Simpan Produk Saja'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div >
  );
}