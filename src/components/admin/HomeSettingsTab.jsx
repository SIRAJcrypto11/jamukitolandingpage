import { useState, useEffect } from 'react';
import { HomeSettings } from '@/entities/HomeSettings';
import { UploadFile } from '@/integrations/Core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Home, Plus, Trash } from 'lucide-react';
import { toast } from 'sonner';

export default function HomeSettingsTab() {
  const [settings, setSettings] = useState({
    setting_key: 'main',
    hero_title: '',
    hero_subtitle: '',
    hero_cta_text: '',
    hero_image_url: '',
    features: [],
    testimonials: [],
    stats: { users: 0, tasks: 0, workspaces: 0 },
    contact_email: 'snishopsolusinetwork@gmail.com',
    contact_whatsapp: '081532168812',
    social_links: {}
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const iconOptions = ['CheckSquare', 'Users', 'Zap', 'Clock', 'FileText', 'Briefcase', 'Target', 'Shield', 'Globe'];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await HomeSettings.filter({ setting_key: 'main' });
      if (data.length > 0) {
        setSettings(data[0]);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (file) => {
    try {
      toast.info("Mengunggah gambar...");
      const { file_url } = await UploadFile({ file });
      setSettings(prev => ({ ...prev, hero_image_url: file_url }));
      toast.success("Gambar berhasil diunggah");
    } catch (error) {
      toast.error("Gagal mengunggah gambar");
    }
  };

  const addFeature = () => {
    setSettings(prev => ({
      ...prev,
      features: [...prev.features, { title: '', description: '', icon: 'CheckSquare' }]
    }));
  };

  const updateFeature = (index, field, value) => {
    setSettings(prev => ({
      ...prev,
      features: prev.features.map((f, i) => i === index ? { ...f, [field]: value } : f)
    }));
  };

  const removeFeature = (index) => {
    setSettings(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const addTestimonial = () => {
    setSettings(prev => ({
      ...prev,
      testimonials: [...prev.testimonials, { name: '', role: '', content: '', avatar_url: '' }]
    }));
  };

  const updateTestimonial = (index, field, value) => {
    setSettings(prev => ({
      ...prev,
      testimonials: prev.testimonials.map((t, i) => i === index ? { ...t, [field]: value } : t)
    }));
  };

  const removeTestimonial = (index) => {
    setSettings(prev => ({
      ...prev,
      testimonials: prev.testimonials.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (settings.id) {
        await HomeSettings.update(settings.id, settings);
        toast.success("Pengaturan homepage berhasil diperbarui");
      } else {
        await HomeSettings.create(settings);
        toast.success("Pengaturan homepage berhasil dibuat");
      }
      loadSettings();
    } catch (error) {
      toast.error("Gagal menyimpan pengaturan");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-12">Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Home className="w-5 h-5" />
          Pengaturan Halaman Home
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="hero" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="hero">Hero Section</TabsTrigger>
            <TabsTrigger value="features">Fitur</TabsTrigger>
            <TabsTrigger value="testimonials">Testimoni</TabsTrigger>
            <TabsTrigger value="contact">Kontak</TabsTrigger>
          </TabsList>

          <TabsContent value="hero" className="space-y-4">
            <div>
              <Label>Judul Utama</Label>
              <Input
                value={settings.hero_title}
                onChange={(e) => setSettings({ ...settings, hero_title: e.target.value })}
                placeholder="Kelola Tugas & Produktivitas dengan Mudah"
              />
            </div>
            <div>
              <Label>Subtitle</Label>
              <Textarea
                value={settings.hero_subtitle}
                onChange={(e) => setSettings({ ...settings, hero_subtitle: e.target.value })}
                placeholder="Platform all-in-one untuk manajemen tugas..."
              />
            </div>
            <div>
              <Label>Teks Tombol CTA</Label>
              <Input
                value={settings.hero_cta_text}
                onChange={(e) => setSettings({ ...settings, hero_cta_text: e.target.value })}
                placeholder="Mulai Gratis Sekarang"
              />
            </div>
            <div>
              <Label>Gambar Hero</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) handleImageUpload(file);
                }}
              />
              {settings.hero_image_url && (
                <img
                  src={settings.hero_image_url}
                  alt="Hero Preview"
                  className="mt-3 w-full max-w-md rounded-lg border"
                />
              )}
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Jumlah Users</Label>
                <Input
                  type="number"
                  value={settings.stats.users}
                  onChange={(e) => setSettings({
                    ...settings,
                    stats: { ...settings.stats, users: Number(e.target.value) }
                  })}
                />
              </div>
              <div>
                <Label>Jumlah Tasks</Label>
                <Input
                  type="number"
                  value={settings.stats.tasks}
                  onChange={(e) => setSettings({
                    ...settings,
                    stats: { ...settings.stats, tasks: Number(e.target.value) }
                  })}
                />
              </div>
              <div>
                <Label>Jumlah Workspace</Label>
                <Input
                  type="number"
                  value={settings.stats.workspaces}
                  onChange={(e) => setSettings({
                    ...settings,
                    stats: { ...settings.stats, workspaces: Number(e.target.value) }
                  })}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="features" className="space-y-4">
            <Button onClick={addFeature} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Tambah Fitur
            </Button>
            {settings.features.map((feature, index) => (
              <Card key={index}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>Fitur #{index + 1}</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFeature(index)}
                    >
                      <Trash className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                  <div>
                    <Label>Judul</Label>
                    <Input
                      value={feature.title}
                      onChange={(e) => updateFeature(index, 'title', e.target.value)}
                      placeholder="Task Management"
                    />
                  </div>
                  <div>
                    <Label>Deskripsi</Label>
                    <Textarea
                      value={feature.description}
                      onChange={(e) => updateFeature(index, 'description', e.target.value)}
                      placeholder="Kelola tugas dengan sistem yang powerful"
                    />
                  </div>
                  <div>
                    <Label>Icon</Label>
                    <select
                      className="w-full border rounded p-2"
                      value={feature.icon}
                      onChange={(e) => updateFeature(index, 'icon', e.target.value)}
                    >
                      {iconOptions.map(icon => (
                        <option key={icon} value={icon}>{icon}</option>
                      ))}
                    </select>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="testimonials" className="space-y-4">
            <Button onClick={addTestimonial} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Tambah Testimoni
            </Button>
            {settings.testimonials.map((testimonial, index) => (
              <Card key={index}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>Testimoni #{index + 1}</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTestimonial(index)}
                    >
                      <Trash className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <Label>Nama</Label>
                      <Input
                        value={testimonial.name}
                        onChange={(e) => updateTestimonial(index, 'name', e.target.value)}
                        placeholder="Ahmad Rizki"
                      />
                    </div>
                    <div>
                      <Label>Role/Jabatan</Label>
                      <Input
                        value={testimonial.role}
                        onChange={(e) => updateTestimonial(index, 'role', e.target.value)}
                        placeholder="Project Manager"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Konten Testimoni</Label>
                    <Textarea
                      value={testimonial.content}
                      onChange={(e) => updateTestimonial(index, 'content', e.target.value)}
                      placeholder="TODOIT membantu tim kami lebih produktif..."
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="contact" className="space-y-4">
            <div>
              <Label>Email Kontak</Label>
              <Input
                value={settings.contact_email}
                onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
                placeholder="snishopsolusinetwork@gmail.com"
              />
            </div>
            <div>
              <Label>WhatsApp</Label>
              <Input
                value={settings.contact_whatsapp}
                onChange={(e) => setSettings({ ...settings, contact_whatsapp: e.target.value })}
                placeholder="081532168812"
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6">
          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? "Menyimpan..." : "Simpan Pengaturan Home"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}