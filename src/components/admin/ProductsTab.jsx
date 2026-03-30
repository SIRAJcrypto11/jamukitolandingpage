import React, { useState } from 'react';
import { DigitalProduct } from '@/entities/DigitalProduct';
import { UploadFile } from '@/integrations/Core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash, Package, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

export default function ProductsTab({ products, onUpdate }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'other',
    price: 0,
    images: [],
    delivery_time: '',
    features: [],
    is_active: true,
    stock_available: true,
    commission_rate: 0,
    variants: [],
    order_form_fields: []
  });

  const categoryLabels = {
    zoom: "Zoom Meeting",
    design: "Design Tools (Canva)",
    plagiarism_check: "Plagiarism Check (Turnitin)",
    streaming: "Streaming (Netflix, etc)",
    video_editing: "Video Editing (Capcut, etc)",
    other: "Lainnya"
  };

  const handleCreate = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      category: 'other',
      price: 0,
      images: [],
      delivery_time: '',
      features: [],
      is_active: true,
      stock_available: true,
      commission_rate: 0,
      variants: [],
      order_form_fields: []
    });
    setIsModalOpen(true);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      ...product,
      images: product.images || [product.image_url].filter(Boolean),
      variants: product.variants || [],
      order_form_fields: product.order_form_fields || []
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (productId) => {
    if (confirm('Hapus produk ini?')) {
      try {
        await DigitalProduct.delete(productId);
        toast.success("Produk berhasil dihapus");
        onUpdate();
      } catch (error) {
        toast.error("Gagal menghapus produk");
      }
    }
  };

  const handleImageUpload = async (file) => {
    try {
      toast.info("Mengunggah gambar...");
      const { file_url } = await UploadFile({ file });
      setFormData((prev) => ({
        ...prev,
        images: [...(prev.images || []), file_url]
      }));
      toast.success("Gambar berhasil diunggah");
    } catch (error) {
      toast.error("Gagal mengunggah gambar");
    }
  };

  const removeImage = (index) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.description || formData.price <= 0) {
      toast.error("Isi semua field yang diperlukan");
      return;
    }

    if (!formData.images || formData.images.length === 0) {
      toast.error("Upload minimal 1 gambar produk");
      return;
    }

    setIsProcessing(true);
    try {
      const dataToSave = {
        ...formData,
        image_url: formData.images[0],
        features: formData.features.filter((f) => f.trim() !== ''),
        order_form_fields: formData.order_form_fields.map((field) => ({
          ...field,
          options: field.options || []
        }))
      };

      if (editingProduct) {
        await DigitalProduct.update(editingProduct.id, dataToSave);
        toast.success("Produk berhasil diperbarui");
      } else {
        await DigitalProduct.create(dataToSave);
        toast.success("Produk berhasil ditambahkan");
      }
      setIsModalOpen(false);
      onUpdate();
    } catch (error) {
      toast.error("Gagal menyimpan produk");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const addVariant = () => {
    const newVariant = {
      name: '',
      price: 0,
      description: '',
      is_active: true,
      attributes: {}
    };

    if (formData.category === 'zoom') {
      newVariant.attributes = {
        participant_capacity: '',
        duration: '',
        package_type: 'standard'
      };
    } else if (formData.category === 'design') {
      newVariant.attributes = {
        duration_months: 1,
        account_type: 'pro'
      };
    } else if (formData.category === 'plagiarism_check') {
      newVariant.attributes = {
        check_type: 'regular',
        quota: 1
      };
    } else if (formData.category === 'streaming') {
      newVariant.attributes = {
        duration_months: 1,
        quality: 'hd',
        device_count: 1
      };
    } else if (formData.category === 'video_editing') {
      newVariant.attributes = {
        duration_months: 1,
        features_included: []
      };
    }

    setFormData((prev) => ({
      ...prev,
      variants: [...(prev.variants || []), newVariant]
    }));
  };

  const updateVariant = (index, updates) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.map((v, i) => i === index ? { ...v, ...updates } : v)
    }));
  };

  const updateVariantAttribute = (index, attrKey, value) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.map((v, i) =>
      i === index ? { ...v, attributes: { ...v.attributes, [attrKey]: value } } : v
      )
    }));
  };

  const removeVariant = (index) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index)
    }));
  };

  const addFormField = () => {
    setFormData((prev) => ({
      ...prev,
      order_form_fields: [
      ...prev.order_form_fields,
      {
        field_id: `field_${Date.now()}`,
        field_type: 'text',
        field_label: '',
        field_placeholder: '',
        is_required: false,
        is_enabled: true,
        options: []
      }]

    }));
  };

  const updateFormField = (index, updates) => {
    setFormData((prev) => ({
      ...prev,
      order_form_fields: prev.order_form_fields.map((field, i) =>
      i === index ? { ...field, ...updates } : field
      )
    }));
  };

  const removeFormField = (index) => {
    setFormData((prev) => ({
      ...prev,
      order_form_fields: prev.order_form_fields.filter((_, i) => i !== index)
    }));
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Manajemen Produk Digital</h2>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Produk
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) =>
        <Card key={product.id}>
            <CardHeader>
              <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 mb-4">
                <img
                src={product.images?.[0] || product.image_url || 'https://via.placeholder.com/400'}
                alt={product.name}
                className="w-full h-full object-cover" />

              </div>
              <CardTitle className="text-lg">{product.name}</CardTitle>
              <div className="flex gap-2 mt-2">
                <Badge>{categoryLabels[product.category]}</Badge>
                <Badge variant={product.is_active ? 'default' : 'secondary'}>
                  {product.is_active ? 'Aktif' : 'Nonaktif'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                {product.description}
              </p>
              <p className="text-xl font-bold text-blue-600 mb-2">
                Rp {(product.price || 0).toLocaleString('id-ID')}
              </p>
              {product.variants && product.variants.length > 0 &&
            <p className="text-sm text-gray-500 mb-4">
                  {product.variants.length} varian tersedia
                </p>
            }
              <div className="flex gap-2">
                <Button onClick={() => handleEdit(product)} size="sm" variant="outline" className="flex-1">
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button onClick={() => handleDelete(product.id)} size="sm" variant="destructive">
                  <Trash className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Product Form Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-slate-900 p-6 fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 border shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="bg-slate-950 text-muted-foreground p-1 h-10 items-center justify-center rounded-md grid w-full grid-cols-4">
              <TabsTrigger value="basic">Info Dasar</TabsTrigger>
              <TabsTrigger value="images">Gambar</TabsTrigger>
              <TabsTrigger value="variants">Varian</TabsTrigger>
              <TabsTrigger value="form">Form Tambahan</TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4">
              <div>
                <Label>Nama Produk *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Zoom Meeting Premium" />

              </div>

              <div>
                <Label>Deskripsi *</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Deskripsi lengkap produk"
                  rows={4} />

              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Kategori *</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryLabels).map(([key, label]) =>
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Harga Dasar (Rp) *</Label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    placeholder="50000" />

                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Estimasi Pengerjaan</Label>
                  <Input
                    value={formData.delivery_time}
                    onChange={(e) => setFormData({ ...formData, delivery_time: e.target.value })}
                    placeholder="1-2 hari kerja" />

                </div>

                <div>
                  <Label>Komisi Admin (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={(formData.commission_rate || 0) * 100}
                    onChange={(e) => setFormData({ ...formData, commission_rate: Number(e.target.value) / 100 })}
                    placeholder="10" />

                  <p className="text-xs text-gray-500 mt-1">Contoh: 10 = 10%</p>
                </div>
              </div>

              <div>
                <Label>Fitur Produk (Enter untuk menambah)</Label>
                <Textarea
                  value={(formData.features || []).join('\n')}
                  onChange={(e) => setFormData({ ...formData, features: e.target.value.split('\n') })}
                  placeholder="Zoom Premium dengan kapasitas besar&#10;Unlimited meeting time&#10;Recording tersedia"
                  rows={4} />

              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(v) => setFormData({ ...formData, is_active: v })} />

                  <Label>Produk Aktif</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.stock_available}
                    onCheckedChange={(v) => setFormData({ ...formData, stock_available: v })} />

                  <Label>Stok Tersedia</Label>
                </div>
              </div>
            </TabsContent>

            {/* Images Tab */}
            <TabsContent value="images" className="space-y-4">
              <div>
                <Label>Upload Gambar Produk (Ratio 1:1 / Square) *</Label>
                <div className="mt-2 space-y-4">
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files[0]) {
                          handleImageUpload(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                      id="product-image-upload" />

                    <Label htmlFor="product-image-upload" className="cursor-pointer text-blue-600 hover:text-blue-700">
                      Klik untuk upload gambar
                    </Label>
                    <p className="text-xs text-gray-500 mt-1">Rekomendasi: 800x800px</p>
                  </div>

                  {formData.images && formData.images.length > 0 &&
                  <div className="grid grid-cols-3 gap-4">
                      {formData.images.map((img, idx) =>
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 group">
                          <img src={img} alt={`Product ${idx + 1}`} className="w-full h-full object-cover" />
                          <button
                        onClick={() => removeImage(idx)}
                        className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">

                            <X className="w-4 h-4" />
                          </button>
                          {idx === 0 &&
                      <Badge className="absolute bottom-2 left-2 bg-blue-600">
                              Gambar Utama
                            </Badge>
                      }
                        </div>
                    )}
                    </div>
                  }
                </div>
              </div>
            </TabsContent>

            {/* Variants Tab */}
            <TabsContent value="variants" className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <Label>Varian Produk</Label>
                  <p className="text-sm text-gray-500">
                    {formData.category === 'zoom' && 'Atur kapasitas peserta, durasi, dan harga'}
                    {formData.category === 'design' && 'Atur durasi akun dan harga'}
                    {formData.category === 'plagiarism_check' && 'Atur tipe cek, kuota, dan harga'}
                    {formData.category === 'streaming' && 'Atur durasi, kualitas, dan harga'}
                    {formData.category === 'video_editing' && 'Atur durasi dan fitur'}
                    {!['zoom', 'design', 'plagiarism_check', 'streaming', 'video_editing'].includes(formData.category) && 'Tambahkan varian produk dengan harga berbeda'}
                  </p>
                </div>
                <Button onClick={addVariant} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1" />
                  Tambah Varian
                </Button>
              </div>

              {formData.variants && formData.variants.length > 0 ?
              <div className="space-y-3">
                  {formData.variants.map((variant, idx) =>
                <Card key={idx}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-medium">Varian {idx + 1}</h4>
                          <Button
                        onClick={() => removeVariant(idx)}
                        size="sm"
                        variant="ghost">

                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label>Nama Varian</Label>
                              <Input
                            value={variant.name}
                            onChange={(e) => updateVariant(idx, { name: e.target.value })}
                            placeholder="Paket Premium" />

                            </div>
                            <div>
                              <Label>Harga (Rp)</Label>
                              <Input
                            type="number"
                            value={variant.price}
                            onChange={(e) => updateVariant(idx, { price: Number(e.target.value) })}
                            placeholder="100000" />

                            </div>
                          </div>

                          {/* Zoom specific attributes */}
                          {formData.category === 'zoom' &&
                      <div className="grid grid-cols-3 gap-3">
                              <div>
                                <Label>Kapasitas Peserta</Label>
                                <Input
                            value={variant.attributes?.participant_capacity || ''}
                            onChange={(e) => updateVariantAttribute(idx, 'participant_capacity', e.target.value)}
                            placeholder="50-100" />

                              </div>
                              <div>
                                <Label>Durasi</Label>
                                <Input
                            value={variant.attributes?.duration || ''}
                            onChange={(e) => updateVariantAttribute(idx, 'duration', e.target.value)}
                            placeholder="1 jam" />

                              </div>
                              <div>
                                <Label>Jenis Paket</Label>
                                <Select
                            value={variant.attributes?.package_type || 'standard'}
                            onValueChange={(v) => updateVariantAttribute(idx, 'package_type', v)}>

                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="standard">Standard</SelectItem>
                                    <SelectItem value="bundling">Bundling Harian</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                      }

                          {/* Canva specific attributes */}
                          {formData.category === 'design' &&
                      <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label>Durasi (Bulan)</Label>
                                <Input
                            type="number"
                            value={variant.attributes?.duration_months || 1}
                            onChange={(e) => updateVariantAttribute(idx, 'duration_months', Number(e.target.value))}
                            placeholder="1" />

                              </div>
                              <div>
                                <Label>Tipe Akun</Label>
                                <Select
                            value={variant.attributes?.account_type || 'pro'}
                            onValueChange={(v) => updateVariantAttribute(idx, 'account_type', v)}>

                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pro">Pro</SelectItem>
                                    <SelectItem value="team">Team</SelectItem>
                                    <SelectItem value="enterprise">Enterprise</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                      }

                          {/* Turnitin specific attributes */}
                          {formData.category === 'plagiarism_check' &&
                      <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label>Tipe Cek</Label>
                                <Select
                            value={variant.attributes?.check_type || 'regular'}
                            onValueChange={(v) => updateVariantAttribute(idx, 'check_type', v)}>

                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="regular">Regular</SelectItem>
                                    <SelectItem value="priority">Priority</SelectItem>
                                    <SelectItem value="ai">AI Detection</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Kuota Cek</Label>
                                <Select
                            value={String(variant.attributes?.quota || 1)}
                            onValueChange={(v) => updateVariantAttribute(idx, 'quota', Number(v))}>

                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="1">1x Cek</SelectItem>
                                    <SelectItem value="3">3x Cek</SelectItem>
                                    <SelectItem value="6">6x Cek</SelectItem>
                                    <SelectItem value="10">10x Cek</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                      }

                          {/* Netflix/Streaming specific attributes */}
                          {formData.category === 'streaming' &&
                      <div className="grid grid-cols-3 gap-3">
                              <div>
                                <Label>Durasi (Bulan)</Label>
                                <Input
                            type="number"
                            value={variant.attributes?.duration_months || 1}
                            onChange={(e) => updateVariantAttribute(idx, 'duration_months', Number(e.target.value))} />

                              </div>
                              <div>
                                <Label>Kualitas</Label>
                                <Select
                            value={variant.attributes?.quality || 'hd'}
                            onValueChange={(v) => updateVariantAttribute(idx, 'quality', v)}>

                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="sd">SD</SelectItem>
                                    <SelectItem value="hd">HD</SelectItem>
                                    <SelectItem value="4k">4K</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Jumlah Device</Label>
                                <Input
                            type="number"
                            value={variant.attributes?.device_count || 1}
                            onChange={(e) => updateVariantAttribute(idx, 'device_count', Number(e.target.value))} />

                              </div>
                            </div>
                      }

                          {/* Capcut/Video Editing specific attributes */}
                          {formData.category === 'video_editing' &&
                      <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label>Durasi (Bulan)</Label>
                                <Input
                            type="number"
                            value={variant.attributes?.duration_months || 1}
                            onChange={(e) => updateVariantAttribute(idx, 'duration_months', Number(e.target.value))} />

                              </div>
                              <div>
                                <Label>Fitur</Label>
                                <Input
                            value={variant.attributes?.features_included?.join(', ') || ''}
                            onChange={(e) => updateVariantAttribute(idx, 'features_included', e.target.value.split(',').map((s) => s.trim()))}
                            placeholder="Premium templates, AI tools" />

                              </div>
                            </div>
                      }

                          <div>
                            <Label>Deskripsi Varian</Label>
                            <Textarea
                          value={variant.description}
                          onChange={(e) => updateVariant(idx, { description: e.target.value })}
                          placeholder="Penjelasan varian ini"
                          rows={2} />

                          </div>

                          <div className="flex items-center gap-2">
                            <Switch
                          checked={variant.is_active}
                          onCheckedChange={(v) => updateVariant(idx, { is_active: v })} />

                            <Label>Varian Aktif</Label>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                )}
                </div> :

              <p className="text-sm text-gray-500 text-center py-8">
                  Belum ada varian. Klik "Tambah Varian" untuk menambahkan.
                </p>
              }
            </TabsContent>

            {/* Form Fields Tab */}
            <TabsContent value="form" className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <Label>Field Form Tambahan (Opsional)</Label>
                  <p className="text-sm text-gray-500">Field tambahan selain varian (e.g., email, notes)</p>
                </div>
                <Button onClick={addFormField} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1" />
                  Tambah Field
                </Button>
              </div>

              {formData.order_form_fields && formData.order_form_fields.length > 0 ?
              <div className="space-y-3">
                  {formData.order_form_fields.map((field, idx) =>
                <Card key={idx}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-medium">Field {idx + 1}</h4>
                          <div className="flex gap-2">
                            <Switch
                          checked={field.is_enabled}
                          onCheckedChange={(v) => updateFormField(idx, { is_enabled: v })} />

                            <Button onClick={() => removeFormField(idx)} size="sm" variant="ghost">
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>ID Field</Label>
                            <Input
                          value={field.field_id}
                          onChange={(e) => updateFormField(idx, { field_id: e.target.value })} />

                          </div>
                          <div>
                            <Label>Tipe Field</Label>
                            <Select
                          value={field.field_type}
                          onValueChange={(v) => updateFormField(idx, { field_type: v })}>

                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">Text</SelectItem>
                                <SelectItem value="email">Email</SelectItem>
                                <SelectItem value="textarea">Textarea</SelectItem>
                                <SelectItem value="file">File Upload</SelectItem>
                                <SelectItem value="date">Date</SelectItem>
                                <SelectItem value="checkbox">Checkbox</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Label</Label>
                            <Input
                          value={field.field_label}
                          onChange={(e) => updateFormField(idx, { field_label: e.target.value })} />

                          </div>
                          <div>
                            <Label>Placeholder</Label>
                            <Input
                          value={field.field_placeholder}
                          onChange={(e) => updateFormField(idx, { field_placeholder: e.target.value })} />

                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-3">
                          <Switch
                        checked={field.is_required}
                        onCheckedChange={(v) => updateFormField(idx, { is_required: v })} />

                          <Label>Field Wajib Diisi</Label>
                        </div>
                      </CardContent>
                    </Card>
                )}
                </div> :

              <p className="text-sm text-gray-500 text-center py-8">
                  Belum ada field tambahan. Varian sudah mencakup field utama.
                </p>
              }
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
            <Button onClick={() => setIsModalOpen(false)} variant="outline">
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={isProcessing} className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
              {isProcessing ? 'Menyimpan...' : 'Simpan Produk'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>);

}