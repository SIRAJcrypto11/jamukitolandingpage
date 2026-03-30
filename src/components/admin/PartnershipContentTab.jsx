import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Sparkles, Eye, Save, Loader2, Plus, Edit, Trash2, 
  Handshake, Users, Zap, Target, DollarSign
} from 'lucide-react';
import { toast } from 'sonner';

export default function PartnershipContentTab() {
  const [content, setContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAIProcessing, setIsAIProcessing] = useState(false);

  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [editingTypeIndex, setEditingTypeIndex] = useState(null);
  const [typeForm, setTypeForm] = useState({
    icon: 'Store',
    title: '',
    description: '',
    commission: '',
    benefits: []
  });

  const [benefitInput, setBenefitInput] = useState('');

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      setIsLoading(true);
      const data = await base44.entities.PartnershipContent.filter({ is_active: true });
      if (data && data.length > 0) {
        setContent(data[0]);
      } else {
        const defaultContent = {
          hero_title: 'Partnership Program',
          hero_description: 'Bergabunglah dengan program partnership SNISHOP dan kembangkan bisnis bersama kami',
          contact_email: 'partnership@snishop.com',
          contact_whatsapp: '081532168812',
          is_active: true,
          partnership_types: [],
          why_partner_stats: [],
          success_stories: []
        };
        const created = await base44.entities.PartnershipContent.create(defaultContent);
        setContent(created);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Gagal memuat konten');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await base44.entities.PartnershipContent.update(content.id, content);
      toast.success('✅ Konten Partnership berhasil disimpan!');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Gagal menyimpan konten');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAIUpdate = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Masukkan prompt untuk AI');
      return;
    }

    try {
      setIsAIProcessing(true);
      
      const schema = {
        type: "object",
        properties: {
          hero_title: { type: "string" },
          hero_description: { type: "string" },
          contact_email: { type: "string" },
          contact_whatsapp: { type: "string" },
          partnership_types: {
            type: "array",
            items: {
              type: "object",
              properties: {
                icon: { type: "string" },
                title: { type: "string" },
                description: { type: "string" },
                commission: { type: "string" },
                benefits: { type: "array", items: { type: "string" } }
              }
            }
          }
        }
      };

      const fullPrompt = `
        Update konten Partnership page untuk SNISHOP dengan permintaan berikut:
        ${aiPrompt}

        Current content:
        ${JSON.stringify(content, null, 2)}

        PENTING: 
        - Icon: gunakan nama icon dari Lucide React (Store, Zap, Users, Briefcase, dll)
        - Commission format: "20-30%" atau "Revenue Share" atau "Custom Deal"
        - Benefits harus array of string
      `;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: fullPrompt,
        response_json_schema: schema
      });

      setContent({ ...content, ...result });
      toast.success('✅ Konten berhasil diupdate dengan AI!');
      setAiPrompt('');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Gagal update dengan AI');
    } finally {
      setIsAIProcessing(false);
    }
  };

  const openAddTypeDialog = () => {
    setEditingTypeIndex(null);
    setTypeForm({
      icon: 'Store',
      title: '',
      description: '',
      commission: '',
      benefits: []
    });
    setBenefitInput('');
    setShowTypeDialog(true);
  };

  const openEditTypeDialog = (type, index) => {
    setEditingTypeIndex(index);
    setTypeForm(type);
    setBenefitInput('');
    setShowTypeDialog(true);
  };

  const addBenefit = () => {
    if (!benefitInput.trim()) return;
    setTypeForm({
      ...typeForm,
      benefits: [...typeForm.benefits, benefitInput.trim()]
    });
    setBenefitInput('');
  };

  const removeBenefit = (index) => {
    setTypeForm({
      ...typeForm,
      benefits: typeForm.benefits.filter((_, i) => i !== index)
    });
  };

  const saveType = () => {
    if (!typeForm.title || !typeForm.description || !typeForm.commission) {
      toast.error('Title, Description, dan Commission wajib diisi!');
      return;
    }

    const updatedTypes = [...(content.partnership_types || [])];
    
    if (editingTypeIndex !== null) {
      updatedTypes[editingTypeIndex] = typeForm;
      toast.success('✅ Tipe partnership berhasil diupdate!');
    } else {
      updatedTypes.push(typeForm);
      toast.success('✅ Tipe partnership baru berhasil ditambahkan!');
    }

    setContent({ ...content, partnership_types: updatedTypes });
    setShowTypeDialog(false);
  };

  const deleteType = (index) => {
    if (!confirm('Yakin ingin hapus tipe partnership ini?')) return;
    
    const updatedTypes = content.partnership_types.filter((_, i) => i !== index);
    setContent({ ...content, partnership_types: updatedTypes });
    toast.success('✅ Tipe partnership berhasil dihapus!');
  };

  const iconOptions = [
    'Store', 'Zap', 'Users', 'Briefcase', 'Target', 'Handshake',
    'Users2', 'TrendingUp', 'Award', 'Rocket', 'Star', 'Crown'
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Handshake className="w-6 h-6 text-cyan-500" />
            Kelola Halaman Partnership
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Update konten dan kelola tipe partnership
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => window.open('/partnershippage', '_blank')}
            variant="outline"
            className="border-gray-700"
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Simpan
          </Button>
        </div>
      </div>

      {/* AI Assistant */}
      <Card className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 border-purple-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            AI Assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Contoh: Tambah tipe partnership baru untuk Affiliate Marketing dengan komisi 25%, sertakan 4 benefit utama"
            className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
          />
          <Button
            onClick={handleAIUpdate}
            disabled={isAIProcessing}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {isAIProcessing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Update dengan AI
          </Button>
        </CardContent>
      </Card>

      {/* Partnership Types Management */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">
              Kelola Tipe Partnership ({content.partnership_types?.length || 0})
            </CardTitle>
            <Button
              onClick={openAddTypeDialog}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah Tipe Baru
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {content.partnership_types && content.partnership_types.length > 0 ? (
            content.partnership_types.map((type, idx) => (
              <Card key={idx} className="bg-gray-800 border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-lg bg-cyan-600/20 flex items-center justify-center">
                          <Handshake className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-white">{type.title}</h4>
                          <Badge className="bg-cyan-600 mt-1">{type.commission}</Badge>
                        </div>
                      </div>
                      <p className="text-gray-400 text-sm mb-3">{type.description}</p>
                      {type.benefits && type.benefits.length > 0 && (
                        <div className="space-y-1">
                          {type.benefits.map((benefit, i) => (
                            <div key={i} className="flex items-center gap-2 text-gray-300 text-sm">
                              <DollarSign className="w-3 h-3 text-cyan-400" />
                              {benefit}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditTypeDialog(type, idx)}
                        className="border-blue-600 text-blue-400"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteType(idx)}
                        className="border-red-600 text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-8">
              <Handshake className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 mb-4">Belum ada tipe partnership</p>
              <Button onClick={openAddTypeDialog} className="bg-cyan-600">
                <Plus className="w-4 h-4 mr-2" />
                Tambah Tipe Pertama
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hero Section */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Hero Section</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-gray-300">Hero Title</Label>
            <Input
              value={content.hero_title}
              onChange={(e) => setContent({ ...content, hero_title: e.target.value })}
              className="bg-gray-800 border-gray-700 text-white mt-2"
            />
          </div>
          <div>
            <Label className="text-gray-300">Hero Description</Label>
            <Textarea
              value={content.hero_description}
              onChange={(e) => setContent({ ...content, hero_description: e.target.value })}
              className="bg-gray-800 border-gray-700 text-white mt-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Kontak Partnership</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-gray-300">Email Partnership</Label>
            <Input
              value={content.contact_email}
              onChange={(e) => setContent({ ...content, contact_email: e.target.value })}
              className="bg-gray-800 border-gray-700 text-white mt-2"
            />
          </div>
          <div>
            <Label className="text-gray-300">WhatsApp</Label>
            <Input
              value={content.contact_whatsapp}
              onChange={(e) => setContent({ ...content, contact_whatsapp: e.target.value })}
              className="bg-gray-800 border-gray-700 text-white mt-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Type Dialog */}
      <Dialog open={showTypeDialog} onOpenChange={setShowTypeDialog}>
        <DialogContent className="bg-gray-900 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTypeIndex !== null ? 'Edit Tipe Partnership' : 'Tambah Tipe Partnership Baru'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Icon</Label>
              <select
                value={typeForm.icon}
                onChange={(e) => setTypeForm({ ...typeForm, icon: e.target.value })}
                className="w-full mt-2 px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
              >
                {iconOptions.map(icon => (
                  <option key={icon} value={icon}>{icon}</option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-gray-300">Nama Tipe Partnership *</Label>
              <Input
                value={typeForm.title}
                onChange={(e) => setTypeForm({ ...typeForm, title: e.target.value })}
                placeholder="Reseller Partner"
                className="bg-gray-800 border-gray-700 text-white mt-2"
              />
            </div>

            <div>
              <Label className="text-gray-300">Deskripsi *</Label>
              <Textarea
                value={typeForm.description}
                onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
                placeholder="Jual lisensi SNISHOP dan dapatkan komisi hingga 30%"
                className="bg-gray-800 border-gray-700 text-white mt-2"
              />
            </div>

            <div>
              <Label className="text-gray-300">Komisi / Benefit Utama *</Label>
              <Input
                value={typeForm.commission}
                onChange={(e) => setTypeForm({ ...typeForm, commission: e.target.value })}
                placeholder="20-30% atau Revenue Share"
                className="bg-gray-800 border-gray-700 text-white mt-2"
              />
            </div>

            <div>
              <Label className="text-gray-300">Benefits</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={benefitInput}
                  onChange={(e) => setBenefitInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addBenefit()}
                  placeholder="Marketing materials lengkap"
                  className="bg-gray-800 border-gray-700 text-white flex-1"
                />
                <Button onClick={addBenefit} variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-2 mt-3">
                {typeForm.benefits.map((benefit, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                    <span className="text-gray-300 text-sm">{benefit}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeBenefit(idx)}
                      className="text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowTypeDialog(false)}
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                onClick={saveType}
                className="flex-1 bg-cyan-600 hover:bg-cyan-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingTypeIndex !== null ? 'Update Tipe' : 'Tambah Tipe'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}