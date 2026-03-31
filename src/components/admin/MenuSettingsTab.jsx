import { useState, useEffect } from 'react';
import { MenuSettings } from '@/entities/MenuSettings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Edit, Save } from 'lucide-react';
import { toast } from 'sonner';

const defaultMenus = [
  { menu_id: 'dashboard', menu_name: 'Dashboard', parent_menu: null },
  { menu_id: 'tasks', menu_name: 'Tugas Saya', parent_menu: 'administration' },
  { menu_id: 'notes', menu_name: 'Catatan', parent_menu: 'administration' },
  { menu_id: 'workspaces', menu_name: 'Workspace', parent_menu: 'administration' },
  { menu_id: 'attendance', menu_name: 'Absensi', parent_menu: 'administration' },
  { menu_id: 'pos', menu_name: 'Point of Sale', parent_menu: null },
  { menu_id: 'marketplace', menu_name: 'Marketplace', parent_menu: 'shop' },
  { menu_id: 'my_orders', menu_name: 'Pesanan Saya', parent_menu: 'shop' },
  { menu_id: 'saldo', menu_name: 'Saldo', parent_menu: 'shop' },
  { menu_id: 'finance_recording', menu_name: 'Pencatatan Keuangan', parent_menu: 'finance' },
  { menu_id: 'finance_report', menu_name: 'Laporan Keuangan', parent_menu: 'finance' },
  { menu_id: 'ai_assistant', menu_name: 'AI Assistant', parent_menu: null },
  { menu_id: 'referral_program', menu_name: 'Referral Program', parent_menu: null },
  { menu_id: 'updates', menu_name: 'Pembaruan', parent_menu: null },
  { menu_id: 'settings', menu_name: 'Pengaturan', parent_menu: null },
  { menu_id: 'admin_dashboard', menu_name: 'Admin Dashboard', parent_menu: null }
];

export default function MenuSettingsTab() {
  const [menuSettings, setMenuSettings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingMenu, setEditingMenu] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadMenuSettings();
  }, []);

  const loadMenuSettings = async () => {
    try {
      setIsLoading(true);
      const settings = await MenuSettings.list();
      
      // Merge with default menus
      const mergedSettings = defaultMenus.map(defaultMenu => {
        const existing = settings.find(s => s.menu_id === defaultMenu.menu_id);
        return existing || {
          ...defaultMenu,
          is_visible_free: true,
          is_visible_pro: true,
          is_visible_business: true,
          is_visible_advanced: true,
          is_visible_enterprise: true,
          is_visible_admin: true,
          is_active: true,
          order: 0
        };
      });

      setMenuSettings(mergedSettings);
    } catch (error) {
      console.error('Error loading menu settings:', error);
      toast.error('Gagal memuat pengaturan menu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (menu) => {
    setEditingMenu(menu);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingMenu) return;

    try {
      setIsSaving(true);
      
      if (editingMenu.id) {
        await MenuSettings.update(editingMenu.id, editingMenu);
      } else {
        await MenuSettings.create(editingMenu);
      }

      toast.success('Pengaturan menu berhasil disimpan');
      setIsModalOpen(false);
      setEditingMenu(null);
      loadMenuSettings();
    } catch (error) {
      console.error('Error saving menu settings:', error);
      toast.error('Gagal menyimpan pengaturan menu');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleVisibility = (menuId, tier, value) => {
    setMenuSettings(prev => prev.map(menu => 
      menu.menu_id === menuId 
        ? { ...menu, [`is_visible_${tier}`]: value }
        : menu
    ));
  };

  const saveAllSettings = async () => {
    try {
      setIsSaving(true);
      
      for (const menu of menuSettings) {
        if (menu.id) {
          await MenuSettings.update(menu.id, menu);
        } else {
          await MenuSettings.create(menu);
        }
      }

      toast.success('Semua pengaturan berhasil disimpan');
      loadMenuSettings();
    } catch (error) {
      console.error('Error saving all settings:', error);
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pengaturan Visibility Menu</CardTitle>
          <CardDescription>
            Atur menu mana yang terlihat untuk setiap tier membership
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Button onClick={saveAllSettings} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Simpan Semua Perubahan
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Menu</th>
                  <th className="text-center p-2">Free</th>
                  <th className="text-center p-2">Pro</th>
                  <th className="text-center p-2">Business</th>
                  <th className="text-center p-2">Advanced</th>
                  <th className="text-center p-2">Enterprise</th>
                  <th className="text-center p-2">Admin</th>
                  <th className="text-center p-2">Aktif</th>
                  <th className="text-center p-2">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {menuSettings.map((menu) => (
                  <tr key={menu.menu_id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="p-2">
                      <div>
                        <p className="font-medium">{menu.menu_name}</p>
                        {menu.parent_menu && (
                          <p className="text-xs text-gray-500">Parent: {menu.parent_menu}</p>
                        )}
                      </div>
                    </td>
                    <td className="text-center p-2">
                      <Switch
                        checked={menu.is_visible_free}
                        onCheckedChange={(value) => toggleVisibility(menu.menu_id, 'free', value)}
                      />
                    </td>
                    <td className="text-center p-2">
                      <Switch
                        checked={menu.is_visible_pro}
                        onCheckedChange={(value) => toggleVisibility(menu.menu_id, 'pro', value)}
                      />
                    </td>
                    <td className="text-center p-2">
                      <Switch
                        checked={menu.is_visible_business}
                        onCheckedChange={(value) => toggleVisibility(menu.menu_id, 'business', value)}
                      />
                    </td>
                    <td className="text-center p-2">
                      <Switch
                        checked={menu.is_visible_advanced}
                        onCheckedChange={(value) => toggleVisibility(menu.menu_id, 'advanced', value)}
                      />
                    </td>
                    <td className="text-center p-2">
                      <Switch
                        checked={menu.is_visible_enterprise}
                        onCheckedChange={(value) => toggleVisibility(menu.menu_id, 'enterprise', value)}
                      />
                    </td>
                    <td className="text-center p-2">
                      <Switch
                        checked={menu.is_visible_admin}
                        onCheckedChange={(value) => toggleVisibility(menu.menu_id, 'admin', value)}
                      />
                    </td>
                    <td className="text-center p-2">
                      <Badge variant={menu.is_active ? 'default' : 'secondary'}>
                        {menu.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </td>
                    <td className="text-center p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(menu)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Menu: {editingMenu?.menu_name}</DialogTitle>
          </DialogHeader>
          {editingMenu && (
            <div className="space-y-4">
              <div>
                <Label>Nama Menu</Label>
                <Input
                  value={editingMenu.menu_name}
                  onChange={(e) => setEditingMenu({ ...editingMenu, menu_name: e.target.value })}
                />
              </div>

              <div>
                <Label>Badge Text (opsional)</Label>
                <Input
                  value={editingMenu.badge_text || ''}
                  onChange={(e) => setEditingMenu({ ...editingMenu, badge_text: e.target.value })}
                  placeholder="e.g., NEW, BETA"
                />
              </div>

              <div>
                <Label>Order (urutan tampilan)</Label>
                <Input
                  type="number"
                  value={editingMenu.order || 0}
                  onChange={(e) => setEditingMenu({ ...editingMenu, order: parseInt(e.target.value) })}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={editingMenu.is_active}
                  onCheckedChange={(value) => setEditingMenu({ ...editingMenu, is_active: value })}
                />
                <Label>Menu Aktif</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}