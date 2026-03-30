import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { withRetry } from '@/components/utils/apiHelpers';

const emojiList = ['💰', '🏠', '🚗', '🍔', '🎬', '🏥', '📚', '✈️', '👕', '🎮', '⚡', '📱', '💼', '🎓', '🛒', '🍕', '💳', '🏪', '🎯', '⭐'];

export default function CategoryManager({ categories, user, mode, onUpdate, companyId = null }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeMode, setActiveMode] = useState(mode);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [allDbCategories, setAllDbCategories] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    type: 'expense',
    mode: mode,
    icon: '💰'
  });

  useEffect(() => {
    setActiveMode(mode);
    console.log('📊 CategoryManager Props:');
    console.log('  Mode:', mode);
    console.log('  Company ID:', companyId);
    console.log('  Categories received:', categories?.length || 0);
    console.log('  Categories:', categories);
  }, [mode, categories, companyId]);

  // 🔍 DATABASE CHECK FUNCTION
  const checkDatabase = async () => {
    if (!user || !user.id) {
      toast.error('User tidak ditemukan');
      console.error('❌ No user!');
      return;
    }

    console.log('═══════════════════════════════════════════');
    console.log('🔍 DATABASE CHECK - Loading ALL categories');
    console.log('   User ID:', user.id);
    console.log('   Current Mode:', mode);
    console.log('   Current Company ID:', companyId || 'null');
    console.log('═══════════════════════════════════════════');

    try {
      // Load ALL categories for this user (no company filter)
      const allCats = await base44.entities.TransactionCategory.filter({ user_id: user.id });

      console.log('� TOTAL IN DATABASE:', allCats?.length || 0);

      if (allCats && allCats.length > 0) {
        const personal = allCats.filter(c => c.mode === 'personal' || !c.company_id);
        const business = allCats.filter(c => c.mode === 'business' && c.company_id);
        const orphan = allCats.filter(c => c.mode === 'business' && !c.company_id);
        const forThisCompany = companyId ? allCats.filter(c => c.company_id === companyId) : [];

        console.log('📈 BREAKDOWN:');
        console.log('   Personal:', personal.length);
        console.log('   Business (with company_id):', business.length);
        console.log('   Orphan (business, no company_id):', orphan.length);
        if (companyId) {
          console.log('   For CURRENT company:', forThisCompany.length);
        }

        console.log('� ALL CATEGORIES LIST:');
        allCats.forEach((cat, i) => {
          const status = !cat.company_id ? 'PERSONAL' :
            cat.company_id === companyId ? 'CURRENT_COMPANY ✅' : 'OTHER_COMPANY';
          console.log(`   ${i + 1}. ${cat.name} | mode:${cat.mode} | company_id:${cat.company_id || 'null'} | ${status}`);
        });
      } else {
        console.log('❌ NO CATEGORIES FOUND IN DATABASE!');
      }

      console.log('═══════════════════════════════════════════');

      setAllDbCategories(allCats || []);
      setShowDiagnostic(true);
      toast.success(`Ditemukan ${allCats?.length || 0} kategori total di database`);
    } catch (error) {
      console.error('❌ Error checking database:', error);
      console.error('Error details:', error.message);
      toast.error('Gagal cek database: ' + error.message);
    }
  };

  const handleCreate = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      type: 'expense',
      mode: mode, // Use current mode prop directly
      icon: '💰'
    });
    console.log('📝 Creating new category in mode:', mode);
    setIsModalOpen(true);
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      type: category.type,
      mode: category.mode,
      icon: category.icon || '💰'
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (categoryId) => {
    if (!confirm('Yakin hapus kategori ini? Data transaksi dengan kategori ini tidak akan terhapus.')) {
      return;
    }

    try {
      await withRetry(() => base44.entities.TransactionCategory.delete(categoryId));
      toast.success("Kategori berhasil dihapus");
      if (onUpdate) onUpdate(); // INSTANT reload
    } catch (error) {
      toast.error("Gagal menghapus kategori");
      console.error(error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Nama kategori wajib diisi");
      return;
    }

    // ✅ VALIDATION: Check user
    if (!user || !user.id) {
      console.error('❌ CRITICAL ERROR: No user ID!');
      toast.error("Error: User tidak ditemukan. Coba login ulang.");
      setIsSaving(false);
      return;
    }

    // ✅ VALIDATION: Check company ID for business mode
    if (mode === 'business' && !companyId) {
      console.error('❌ CRITICAL ERROR: Company mode but no companyId!');
      toast.error("Error: Company ID tidak ditemukan. Refresh halaman dan coba lagi.");
      setIsSaving(false);
      return;
    }

    setIsSaving(true);
    try {
      console.log('═══════════════════════════════════════════');
      console.log('🔍 DEBUG: Checking props BEFORE save');
      console.log('  mode prop:', mode);
      console.log('  companyId prop:', companyId);
      console.log('  user.id:', user.id);
      console.log('═══════════════════════════════════════════');

      // ✅ ROBUST FIX: Use companyId existence, NOT mode prop!
      // If companyId exists = Company mode, otherwise = Personal mode
      const isCompanyMode = !!companyId;
      const actualMode = isCompanyMode ? 'business' : 'personal';
      const actualCompanyId = isCompanyMode ? companyId : null;

      console.log('✅ COMPUTED VALUES:');
      console.log('  isCompanyMode:', isCompanyMode);
      console.log('  actualMode:', actualMode);
      console.log('  actualCompanyId:', actualCompanyId);

      // ✅ Build data to save
      const dataToSave = {
        name: formData.name.trim(),
        type: formData.type,
        icon: formData.icon,
        user_id: user.id,
        mode: actualMode,  // Use computed mode!
        company_id: actualCompanyId  // Use computed company_id!
      };

      console.log('═══════════════════════════════════════════');
      console.log('💾 SAVING CATEGORY');
      console.log('  Final data to save:', JSON.stringify(dataToSave, null, 2));
      console.log('═══════════════════════════════════════════');

      let result;
      if (editingCategory) {
        result = await withRetry(() => base44.entities.TransactionCategory.update(editingCategory.id, dataToSave));
        console.log('✅ UPDATE Response from base44:', JSON.stringify(result, null, 2));
        toast.success("✅ Kategori berhasil diperbarui!");
      } else {
        console.log('🔄 Calling base44.entities.TransactionCategory.create()...');
        result = await withRetry(() => base44.entities.TransactionCategory.create(dataToSave));
        console.log('✅ CREATE Response from base44:', JSON.stringify(result, null, 2));

        // 🔍 CRITICAL: Check if base44 saved company_id correctly!
        console.log('🔍 CRITICAL VERIFICATION:');
        console.log('  We wanted to save company_id:', actualCompanyId);
        console.log('  Base44 returned company_id:', result?.company_id);

        if (actualCompanyId && !result?.company_id) {
          console.error('❌❌❌ CRITICAL ERROR ❌❌❌');
          console.error('  COMPANY_ID WAS NOT SAVED!');
          console.error('  We sent:', actualCompanyId);
          console.error('  Base44 returned:', result?.company_id);
          console.error('  This means TransactionCategory entity does NOT have company_id field configured!');
          console.error('❌❌❌ CRITICAL ERROR ❌❌❌');
          toast.error('⚠️ Kategori tersimpan tapi company_id TIDAK tersimpan! Hubungi admin.');
        } else if (actualCompanyId && result?.company_id !== actualCompanyId) {
          console.error('❌ MISMATCH! Sent company_id:', actualCompanyId, 'but got:', result?.company_id);
        } else {
          console.log('✅ company_id saved correctly!');
        }

        toast.success("✅ Kategori berhasil ditambahkan!");
      }

      setIsModalOpen(false);
      console.log('🔄 Calling onUpdate to reload data...');
      if (onUpdate) {
        await onUpdate(); // INSTANT reload
        console.log('✅ Data reloaded after save');
      }
    } catch (error) {
      console.error('═══════════════════════════════════════════');
      console.error('❌ FAILED TO SAVE CATEGORY');
      console.error('  Error:', error);
      console.error('  Error message:', error.message);
      console.error('  Error details:', error.details || 'N/A');
      console.error('  Error stack:', error.stack);
      console.error('  Full error object:', JSON.stringify(error, null, 2));
      console.error('═══════════════════════════════════════════');
      toast.error("Gagal menyimpan kategori: " + (error.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ FIX: Categories sudah difilter dari parent, jadi langsung pakai
  const getIncomeCategories = () => {
    const filtered = categories.filter(c => c.type === 'income');
    console.log('🔵 Income categories:', filtered.length, filtered);
    return filtered;
  };
  const getExpenseCategories = () => {
    const filtered = categories.filter(c => c.type === 'expense');
    console.log('🔴 Expense categories:', filtered.length, filtered);
    return filtered;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Kategori {mode === 'personal' ? 'Pribadi' : 'Bisnis'}
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Kelola kategori transaksi untuk pencatatan {mode === 'personal' ? 'pribadi' : 'bisnis'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={checkDatabase}
            variant="outline"
            className="border-yellow-600 text-yellow-600 hover:bg-yellow-600 hover:text-white"
          >
            🔍 Cek Database
          </Button>
          <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Tambah Kategori
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2 text-white">
            <Badge className="bg-green-600">Pemasukan</Badge>
            <span className="text-sm text-gray-400">({getIncomeCategories().length})</span>
          </h4>
          <div className="space-y-2">
            {getIncomeCategories().map((category) => (
              <Card key={category.id} className="bg-gray-700 border-gray-600">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{category.icon}</span>
                    <span className="font-medium text-white">{category.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(category)}
                      className="hover:bg-gray-600"
                    >
                      <Edit className="w-4 h-4 text-blue-400" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(category.id)}
                      className="hover:bg-gray-600"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {getIncomeCategories().length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8 bg-gray-800 rounded-lg">
                Belum ada kategori pemasukan
              </p>
            )}
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2 text-white">
            <Badge className="bg-red-600">Pengeluaran</Badge>
            <span className="text-sm text-gray-400">({getExpenseCategories().length})</span>
          </h4>
          <div className="space-y-2">
            {getExpenseCategories().map((category) => (
              <Card key={category.id} className="bg-gray-700 border-gray-600">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{category.icon}</span>
                    <span className="font-medium text-white">{category.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(category)}
                      className="hover:bg-gray-600"
                    >
                      <Edit className="w-4 h-4 text-blue-400" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(category.id)}
                      className="hover:bg-gray-600"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {getExpenseCategories().length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8 bg-gray-800 rounded-lg">
                Belum ada kategori pengeluaran
              </p>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Kategori' : 'Tambah Kategori Baru'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-white">Nama Kategori *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Gaji, Transport, Penjualan"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div>
              <Label className="text-white">Tipe *</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => setFormData({ ...formData, type: v })}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Pemasukan</SelectItem>
                  <SelectItem value="expense">Pengeluaran</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white">Pilih Icon</Label>
              <div className="grid grid-cols-10 gap-2 mt-2">
                {emojiList.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon: emoji })}
                    className={`p-2 text-2xl rounded-lg border-2 transition-all hover:scale-110 ${formData.icon === emoji
                      ? 'border-blue-500 bg-blue-900/30 scale-110'
                      : 'border-gray-600 hover:border-gray-500'
                      }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}