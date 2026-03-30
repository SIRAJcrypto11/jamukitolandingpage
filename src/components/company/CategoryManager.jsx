import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Plus, X, Save, Loader2, Tag } from 'lucide-react';
import { toast } from 'sonner';

export default function CategoryManager({ categories, companyId, onCategoriesUpdated }) {
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategory, setNewCategory] = useState({ name: '', icon: '🏷️', color: '#3b82f6' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);

  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) {
      toast.error('Nama kategori wajib diisi');
      return;
    }

    try {
      setIsSaving(true);
      await base44.entities.CompanyPOSCategory.create({
        company_id: companyId,
        name: newCategory.name.trim(),
        icon: newCategory.icon || '🏷️',
        color: newCategory.color || '#3b82f6'
      });

      toast.success('✅ Kategori berhasil ditambahkan!');
      setNewCategory({ name: '', icon: '🏷️', color: '#3b82f6' });
      setShowAddForm(false);

      // ✅ BROADCAST
      try {
        const channel = new BroadcastChannel('snishop_product_updates');
        channel.postMessage({
          type: 'CATEGORY_CREATED',
          companyId: companyId,
          timestamp: Date.now()
        });
        channel.close();
      } catch (e) {}

      if (onCategoriesUpdated) onCategoriesUpdated();
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error('Gagal membuat kategori');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateCategory = async (categoryId) => {
    if (!editingCategory?.name.trim()) {
      toast.error('Nama kategori wajib diisi');
      return;
    }

    const oldCategory = categories.find(c => c.id === categoryId);
    const oldName = oldCategory?.name;
    const newName = editingCategory.name.trim();

    try {
      setIsSaving(true);
      
      // ✅ SYNC: Jika nama berubah, update produk yang menggunakan kategori ini
      if (oldName && oldName !== newName) {
        console.log(`🔄 Syncing category rename: "${oldName}" -> "${newName}"`);
        try {
          const productsToUpdate = await base44.entities.CompanyPOSProduct.filter({
            company_id: companyId,
            category: oldName
          });

          if (productsToUpdate && productsToUpdate.length > 0) {
            toast.info(`🔄 Mengupdate ${productsToUpdate.length} produk ke kategori baru...`);
            // Update products sequentially or in small batches to avoid rate limits
            for (const product of productsToUpdate) {
              await base44.entities.CompanyPOSProduct.update(product.id, {
                category: newName
              });
            }
            console.log(`✅ Successfully synced ${productsToUpdate.length} products`);
          }
        } catch (syncError) {
          console.error('❌ Sync Rename Failed:', syncError);
          // Kita lanjut saja ke update kategori, tapi beri peringatan
          toast.warning('⚠️ Kategori diupdate, tapi beberapa produk mungkin gagal sinkronisasi.');
        }
      }

      await base44.entities.CompanyPOSCategory.update(categoryId, {
        name: newName,
        icon: editingCategory.icon || '🏷️',
        color: editingCategory.color || '#3b82f6'
      });

      toast.success('✅ Kategori berhasil diupdate!');
      setEditingCategory(null);

      // ✅ BROADCAST
      try {
        const channel = new BroadcastChannel('snishop_product_updates');
        channel.postMessage({
          type: 'CATEGORY_UPDATED',
          companyId: companyId,
          timestamp: Date.now()
        });
        channel.close();
      } catch (e) {}

      if (onCategoriesUpdated) onCategoriesUpdated();
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Gagal mengupdate kategori');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategory = async (category) => {
    // ✅ CHECK: Apakah kategori sedang digunakan produk?
    try {
      setIsDeleting(category.id);
      const productsUsingCategory = await base44.entities.CompanyPOSProduct.filter({
        company_id: companyId,
        category: category.name
      });

      if (productsUsingCategory && productsUsingCategory.length > 0) {
        const proceed = confirm(`⚠️ Kategori "${category.name}" masih digunakan oleh ${productsUsingCategory.length} produk.\n\nJika dihapus, produk tersebut akan menjadi "Tanpa Kategori".\n\nTetap hapus kategori ini?`);
        if (!proceed) {
          setIsDeleting(null);
          return;
        }
      } else {
        if (!confirm(`Yakin ingin menghapus kategori "${category.name}"?`)) {
          setIsDeleting(null);
          return;
        }
      }
    } catch (error) {
      console.error('Error checking category usage:', error);
      // Jika error saat check, tetap tanya user untuk hapus sebagai fallback
      if (!confirm(`Gagal memeriksa penggunaan produk. Yakin ingin mencoba menghapus kategori "${category.name}"?`)) {
        setIsDeleting(null);
        return;
      }
    }

    try {
      await base44.entities.CompanyPOSCategory.delete(category.id);
      toast.success('✅ Kategori berhasil dihapus!');

      // ✅ BROADCAST
      try {
        const channel = new BroadcastChannel('snishop_product_updates');
        channel.postMessage({
          type: 'CATEGORY_DELETED',
          companyId: companyId,
          timestamp: Date.now()
        });
        channel.close();
      } catch (e) {}

      if (onCategoriesUpdated) onCategoriesUpdated();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Gagal menghapus kategori: ' + (error.message || 'Error server'));
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Tag className="w-5 h-5 text-blue-600" />
          Kategori Produk
        </h3>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 hover:bg-blue-700"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Tambah Kategori
        </Button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <Label className="text-xs text-gray-700 dark:text-gray-300">Nama Kategori *</Label>
                <Input
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  placeholder="Contoh: Makanan, Minuman, Jasa Spa..."
                  className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-700 dark:text-gray-300">Icon Emoji</Label>
                <Input
                  value={newCategory.icon}
                  onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
                  placeholder="🏷️"
                  className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 mt-1"
                  maxLength={2}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCreateCategory}
                disabled={isSaving || !newCategory.name.trim()}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Simpan
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setNewCategory({ name: '', icon: '🏷️', color: '#3b82f6' });
                }}
                className="border-gray-300 dark:border-gray-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Categories List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {categories?.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <Tag className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400 text-sm">Belum ada kategori</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Klik "Tambah Kategori" untuk mulai</p>
          </div>
        ) : (
          categories.map((category) => (
            <Card
              key={category.id}
              className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all"
            >
              <CardContent className="p-4">
                {editingCategory?.id === category.id ? (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-gray-700 dark:text-gray-300">Nama</Label>
                      <Input
                        value={editingCategory.name}
                        onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                        className="bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-600 mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-700 dark:text-gray-300">Icon</Label>
                      <Input
                        value={editingCategory.icon}
                        onChange={(e) => setEditingCategory({ ...editingCategory, icon: e.target.value })}
                        className="bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-600 mt-1"
                        maxLength={2}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleUpdateCategory(category.id)}
                        disabled={isSaving}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                        Simpan
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingCategory(null)}
                        className="border-gray-300 dark:border-gray-700"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{category.icon || '🏷️'}</span>
                        <h4 className="font-semibold text-gray-900 dark:text-white">{category.name}</h4>
                      </div>
                      <Badge
                        style={{ backgroundColor: category.color || '#3b82f6' }}
                        className="text-white text-xs"
                      >
                        Aktif
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingCategory({ ...category })}
                        className="flex-1 border-gray-300 dark:border-gray-700"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteCategory(category)}
                        disabled={isDeleting === category.id}
                        className="border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20"
                      >
                        {isDeleting === category.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
