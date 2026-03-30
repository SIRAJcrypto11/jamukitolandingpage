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
  Briefcase, MapPin, Clock, DollarSign 
} from 'lucide-react';
import { toast } from 'sonner';

export default function CareerContentTab() {
  const [content, setContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAIProcessing, setIsAIProcessing] = useState(false);

  const [showPositionDialog, setShowPositionDialog] = useState(false);
  const [editingPosition, setEditingPosition] = useState(null);
  const [positionForm, setPositionForm] = useState({
    title: '',
    department: '',
    location: '',
    type: 'Full-time',
    salary: '',
    description: ''
  });

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      setIsLoading(true);
      const data = await base44.entities.CareerContent.filter({ is_active: true });
      if (data && data.length > 0) {
        setContent(data[0]);
      } else {
        const defaultContent = {
          hero_title: 'Karir di SNISHOP',
          hero_description: 'Bergabunglah dengan tim kami dan bangun masa depan teknologi bisnis Indonesia',
          culture_title: 'Budaya Kerja Kami',
          culture_description: 'Di SNISHOP, kami percaya bahwa karyawan yang bahagia akan menciptakan produk yang luar biasa. Kami membangun lingkungan kerja yang mendorong kreativitas, kolaborasi, dan inovasi.',
          application_email: 'career@snishop.com',
          contact_whatsapp: '081532168812',
          is_active: true,
          open_positions: [],
          benefits: [],
          recruitment_process: []
        };
        const created = await base44.entities.CareerContent.create(defaultContent);
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
      await base44.entities.CareerContent.update(content.id, content);
      toast.success('✅ Konten Career berhasil disimpan!');
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
          culture_title: { type: "string" },
          culture_description: { type: "string" },
          application_email: { type: "string" },
          contact_whatsapp: { type: "string" },
          open_positions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                department: { type: "string" },
                location: { type: "string" },
                type: { type: "string" },
                salary: { type: "string" },
                description: { type: "string" }
              }
            }
          }
        }
      };

      const fullPrompt = `
        Update konten Career page untuk SNISHOP dengan permintaan berikut:
        ${aiPrompt}

        Current content:
        ${JSON.stringify(content, null, 2)}

        PENTING: 
        - Jika diminta tambah posisi baru, tambahkan ke array open_positions
        - Format salary: "Rp X-Y Juta/bulan"
        - Location: "Jakarta / Remote" atau "Jakarta"
        - Type: "Full-time", "Part-time", atau "Contract"
        - Department: "Engineering", "Product", "Design", "Marketing", "Sales", "HR", dll
        - Description harus detail dan menarik
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

  const openAddPositionDialog = () => {
    setEditingPosition(null);
    setPositionForm({
      title: '',
      department: '',
      location: 'Jakarta',
      type: 'Full-time',
      salary: '',
      description: ''
    });
    setShowPositionDialog(true);
  };

  const openEditPositionDialog = (position, index) => {
    setEditingPosition(index);
    setPositionForm(position);
    setShowPositionDialog(true);
  };

  const savePosition = () => {
    if (!positionForm.title || !positionForm.department || !positionForm.salary) {
      toast.error('Title, Department, dan Salary wajib diisi!');
      return;
    }

    const updatedPositions = [...(content.open_positions || [])];
    
    if (editingPosition !== null) {
      updatedPositions[editingPosition] = positionForm;
      toast.success('✅ Posisi berhasil diupdate!');
    } else {
      updatedPositions.push(positionForm);
      toast.success('✅ Posisi baru berhasil ditambahkan!');
    }

    setContent({ ...content, open_positions: updatedPositions });
    setShowPositionDialog(false);
  };

  const deletePosition = (index) => {
    if (!confirm('Yakin ingin hapus posisi ini?')) return;
    
    const updatedPositions = content.open_positions.filter((_, i) => i !== index);
    setContent({ ...content, open_positions: updatedPositions });
    toast.success('✅ Posisi berhasil dihapus!');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-green-500" />
            Kelola Halaman Karir
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Update konten dan kelola lowongan kerja
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => window.open('/career', '_blank')}
            variant="outline"
            className="border-gray-700"
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700"
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
            placeholder="Contoh: Tambah 3 posisi baru: Data Analyst (Jakarta, Rp 8-12 juta), Marketing Manager (Remote, Rp 10-15 juta), dan DevOps Engineer (Jakarta, Rp 12-18 juta)"
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

      {/* Open Positions Management */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">
              Kelola Lowongan Kerja ({content.open_positions?.length || 0})
            </CardTitle>
            <Button
              onClick={openAddPositionDialog}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah Posisi Baru
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {content.open_positions && content.open_positions.length > 0 ? (
            content.open_positions.map((position, idx) => (
              <Card key={idx} className="bg-gray-800 border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-white mb-2">
                        {position.title}
                      </h4>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge className="bg-green-600">{position.department}</Badge>
                        <Badge variant="outline" className="border-green-600 text-green-400">
                          <MapPin className="w-3 h-3 mr-1" />
                          {position.location}
                        </Badge>
                        <Badge variant="outline" className="border-green-600 text-green-400">
                          <Clock className="w-3 h-3 mr-1" />
                          {position.type}
                        </Badge>
                        <Badge variant="outline" className="border-green-600 text-green-400">
                          <DollarSign className="w-3 h-3 mr-1" />
                          {position.salary}
                        </Badge>
                      </div>
                      <p className="text-gray-400 text-sm">{position.description}</p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditPositionDialog(position, idx)}
                        className="border-blue-600 text-blue-400"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deletePosition(idx)}
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
              <Briefcase className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 mb-4">Belum ada lowongan kerja</p>
              <Button onClick={openAddPositionDialog} className="bg-green-600">
                <Plus className="w-4 h-4 mr-2" />
                Tambah Lowongan Pertama
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

      {/* Culture Section */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Budaya Kerja</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-gray-300">Culture Title</Label>
            <Input
              value={content.culture_title}
              onChange={(e) => setContent({ ...content, culture_title: e.target.value })}
              className="bg-gray-800 border-gray-700 text-white mt-2"
            />
          </div>
          <div>
            <Label className="text-gray-300">Culture Description</Label>
            <Textarea
              value={content.culture_description}
              onChange={(e) => setContent({ ...content, culture_description: e.target.value })}
              className="bg-gray-800 border-gray-700 text-white mt-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Kontak</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-gray-300">Application Email</Label>
            <Input
              value={content.application_email}
              onChange={(e) => setContent({ ...content, application_email: e.target.value })}
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

      {/* Position Dialog */}
      <Dialog open={showPositionDialog} onOpenChange={setShowPositionDialog}>
        <DialogContent className="bg-gray-900 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPosition !== null ? 'Edit Lowongan Kerja' : 'Tambah Lowongan Baru'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Nama Posisi *</Label>
              <Input
                value={positionForm.title}
                onChange={(e) => setPositionForm({ ...positionForm, title: e.target.value })}
                placeholder="Senior Full-Stack Developer"
                className="bg-gray-800 border-gray-700 text-white mt-2"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Department *</Label>
                <select
                  value={positionForm.department}
                  onChange={(e) => setPositionForm({ ...positionForm, department: e.target.value })}
                  className="w-full mt-2 px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
                >
                  <option value="">Pilih Department</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Product">Product</option>
                  <option value="Design">Design</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Sales">Sales</option>
                  <option value="Customer Success">Customer Success</option>
                  <option value="HR">HR</option>
                  <option value="Finance">Finance</option>
                  <option value="Operations">Operations</option>
                </select>
              </div>

              <div>
                <Label className="text-gray-300">Location</Label>
                <select
                  value={positionForm.location}
                  onChange={(e) => setPositionForm({ ...positionForm, location: e.target.value })}
                  className="w-full mt-2 px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
                >
                  <option value="Jakarta">Jakarta</option>
                  <option value="Jakarta / Remote">Jakarta / Remote</option>
                  <option value="Remote">Remote</option>
                  <option value="Surabaya">Surabaya</option>
                  <option value="Bandung">Bandung</option>
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Type</Label>
                <select
                  value={positionForm.type}
                  onChange={(e) => setPositionForm({ ...positionForm, type: e.target.value })}
                  className="w-full mt-2 px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Internship">Internship</option>
                  <option value="Freelance">Freelance</option>
                </select>
              </div>

              <div>
                <Label className="text-gray-300">Salary Range *</Label>
                <Input
                  value={positionForm.salary}
                  onChange={(e) => setPositionForm({ ...positionForm, salary: e.target.value })}
                  placeholder="Rp 12-20 Juta/bulan"
                  className="bg-gray-800 border-gray-700 text-white mt-2"
                />
              </div>
            </div>

            <div>
              <Label className="text-gray-300">Deskripsi Job</Label>
              <Textarea
                value={positionForm.description}
                onChange={(e) => setPositionForm({ ...positionForm, description: e.target.value })}
                placeholder="Kami mencari full-stack developer berpengalaman untuk membangun dan mengembangkan fitur-fitur baru di platform SNISHOP..."
                className="bg-gray-800 border-gray-700 text-white mt-2 min-h-[120px]"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowPositionDialog(false)}
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                onClick={savePosition}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingPosition !== null ? 'Update Posisi' : 'Tambah Posisi'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}