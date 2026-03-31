import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Save, Loader2, Sparkles, RefreshCw, Eye, Building2
} from 'lucide-react';
import { toast } from 'sonner';

export default function AboutContentTab() {
  const [content, setContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      setIsLoading(true);
      const data = await base44.entities.AboutContent.list();
      
      if (data && data.length > 0) {
        setContent(data[0]);
      } else {
        // Create default content
        const defaultContent = await base44.entities.AboutContent.create({
          company_name: "SNISHOP",
          tagline: "Platform Manajemen Bisnis All-in-One untuk UKM Indonesia",
          is_active: true
        });
        setContent(defaultContent);
      }
    } catch (error) {
      console.error('Error loading content:', error);
      toast.error('Gagal memuat konten');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      if (content.id) {
        await base44.entities.AboutContent.update(content.id, content);
        toast.success('✅ Konten berhasil diperbarui!');
      } else {
        const created = await base44.entities.AboutContent.create(content);
        setContent(created);
        toast.success('✅ Konten berhasil dibuat!');
      }
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Gagal menyimpan konten');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAiUpdate = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Masukkan prompt untuk AI');
      return;
    }

    try {
      setIsAiProcessing(true);
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Kamu adalah AI content writer untuk halaman "About Us" SNISHOP - platform manajemen bisnis Indonesia.

KONTEKS SAAT INI:
${JSON.stringify(content, null, 2)}

INSTRUKSI USER:
${aiPrompt}

TUGAS:
Update konten sesuai instruksi user. Return JSON lengkap dengan struktur yang sama, hanya ubah bagian yang diminta.
Pastikan tone profesional, modern, dan sesuai untuk perusahaan teknologi B2B.
Jika user minta update statistik, sesuaikan angka yang realistis.
Jika user minta tambah/ubah value, pastikan icon masih valid (Shield, Users, Zap, Heart, Target, Award).

PENTING: Return HANYA JSON, tidak ada penjelasan tambahan.`,
        response_json_schema: {
          type: "object",
          properties: {
            company_name: { type: "string" },
            tagline: { type: "string" },
            hero_title: { type: "string" },
            hero_description: { type: "string" },
            vision_title: { type: "string" },
            vision_content: { type: "string" },
            mission_title: { type: "string" },
            mission_content: { type: "string" },
            story_title: { type: "string" },
            story_content: { type: "string" },
            core_values: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  icon: { type: "string" },
                  title: { type: "string" },
                  description: { type: "string" }
                }
              }
            },
            offerings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  icon: { type: "string" },
                  title: { type: "string" },
                  description: { type: "string" },
                  features: {
                    type: "array",
                    items: { type: "string" }
                  }
                }
              }
            },
            stats: {
              type: "object",
              properties: {
                businesses: { type: "number" },
                uptime: { type: "string" },
                support: { type: "string" }
              }
            },
            cta_title: { type: "string" },
            cta_description: { type: "string" },
            contact_email: { type: "string" },
            contact_whatsapp: { type: "string" }
          }
        }
      });

      setContent({ ...content, ...response });
      toast.success('✅ Konten berhasil di-update oleh AI!');
      setAiPrompt('');
    } catch (error) {
      console.error('AI error:', error);
      toast.error('Gagal memproses dengan AI');
    } finally {
      setIsAiProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-500" />
            Kelola Halaman "Tentang Kami"
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Update informasi perusahaan secara manual atau dengan AI Assistant
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={loadContent}
            className="border-gray-700 text-gray-300"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => window.open('/about', '_blank')}
            variant="outline"
            className="border-blue-600 text-blue-400"
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700"
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
      <Card className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border-purple-700 border-2">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            AI Assistant - Update Konten Instant
          </CardTitle>
          <CardDescription className="text-gray-300">
            Instruksikan AI untuk mengupdate konten halaman About Us
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-gray-300">Prompt AI</Label>
            <Textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Contoh: 'Update statistik jadi 1000+ bisnis dan ubah visi jadi lebih ambisius'"
              className="bg-gray-800 border-gray-700 text-white mt-2 min-h-[100px]"
            />
          </div>
          <Button
            onClick={handleAiUpdate}
            disabled={isAiProcessing || !aiPrompt.trim()}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            {isAiProcessing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> AI Processing...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Update dengan AI</>
            )}
          </Button>
          
          <div className="grid grid-cols-3 gap-2">
            {['Update statistik jadi 1000+ bisnis', 'Buat visi lebih ambisius', 'Tambah benefit ke offerings'].map((example) => (
              <Button
                key={example}
                variant="outline"
                size="sm"
                onClick={() => setAiPrompt(example)}
                className="border-gray-700 text-gray-300 text-xs"
              >
                {example}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Manual Edit */}
      <Tabs defaultValue="hero" className="w-full">
        <TabsList className="bg-gray-800">
          <TabsTrigger value="hero">Hero & Basic</TabsTrigger>
          <TabsTrigger value="vision">Vision & Mission</TabsTrigger>
          <TabsTrigger value="values">Core Values</TabsTrigger>
          <TabsTrigger value="offerings">Offerings</TabsTrigger>
          <TabsTrigger value="contact">Contact & Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="hero" className="space-y-4">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Hero Section</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-300">Company Name</Label>
                <Input
                  value={content?.company_name || ''}
                  onChange={(e) => setContent({...content, company_name: e.target.value})}
                  className="bg-gray-800 border-gray-700 text-white mt-2"
                />
              </div>
              <div>
                <Label className="text-gray-300">Tagline</Label>
                <Input
                  value={content?.tagline || ''}
                  onChange={(e) => setContent({...content, tagline: e.target.value})}
                  className="bg-gray-800 border-gray-700 text-white mt-2"
                />
              </div>
              <div>
                <Label className="text-gray-300">Hero Title</Label>
                <Input
                  value={content?.hero_title || ''}
                  onChange={(e) => setContent({...content, hero_title: e.target.value})}
                  className="bg-gray-800 border-gray-700 text-white mt-2"
                />
              </div>
              <div>
                <Label className="text-gray-300">Hero Description</Label>
                <Textarea
                  value={content?.hero_description || ''}
                  onChange={(e) => setContent({...content, hero_description: e.target.value})}
                  className="bg-gray-800 border-gray-700 text-white mt-2 min-h-[100px]"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vision" className="space-y-4">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Vision & Mission</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-300">Vision Title</Label>
                <Input
                  value={content?.vision_title || ''}
                  onChange={(e) => setContent({...content, vision_title: e.target.value})}
                  className="bg-gray-800 border-gray-700 text-white mt-2"
                />
              </div>
              <div>
                <Label className="text-gray-300">Vision Content</Label>
                <Textarea
                  value={content?.vision_content || ''}
                  onChange={(e) => setContent({...content, vision_content: e.target.value})}
                  className="bg-gray-800 border-gray-700 text-white mt-2 min-h-[80px]"
                />
              </div>
              <div>
                <Label className="text-gray-300">Mission Title</Label>
                <Input
                  value={content?.mission_title || ''}
                  onChange={(e) => setContent({...content, mission_title: e.target.value})}
                  className="bg-gray-800 border-gray-700 text-white mt-2"
                />
              </div>
              <div>
                <Label className="text-gray-300">Mission Content</Label>
                <Textarea
                  value={content?.mission_content || ''}
                  onChange={(e) => setContent({...content, mission_content: e.target.value})}
                  className="bg-gray-800 border-gray-700 text-white mt-2 min-h-[80px]"
                />
              </div>
              <div>
                <Label className="text-gray-300">Story Title</Label>
                <Input
                  value={content?.story_title || ''}
                  onChange={(e) => setContent({...content, story_title: e.target.value})}
                  className="bg-gray-800 border-gray-700 text-white mt-2"
                />
              </div>
              <div>
                <Label className="text-gray-300">Story Content</Label>
                <Textarea
                  value={content?.story_content || ''}
                  onChange={(e) => setContent({...content, story_content: e.target.value})}
                  className="bg-gray-800 border-gray-700 text-white mt-2 min-h-[120px]"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Contact & Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-gray-300">Jumlah Bisnis</Label>
                  <Input
                    type="number"
                    value={content?.stats?.businesses || 500}
                    onChange={(e) => setContent({
                      ...content,
                      stats: {...(content.stats || {}), businesses: parseInt(e.target.value)}
                    })}
                    className="bg-gray-800 border-gray-700 text-white mt-2"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Uptime</Label>
                  <Input
                    value={content?.stats?.uptime || '99.9%'}
                    onChange={(e) => setContent({
                      ...content,
                      stats: {...(content.stats || {}), uptime: e.target.value}
                    })}
                    className="bg-gray-800 border-gray-700 text-white mt-2"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Support</Label>
                  <Input
                    value={content?.stats?.support || '24/7'}
                    onChange={(e) => setContent({
                      ...content,
                      stats: {...(content.stats || {}), support: e.target.value}
                    })}
                    className="bg-gray-800 border-gray-700 text-white mt-2"
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-gray-300">Email</Label>
                <Input
                  value={content?.contact_email || ''}
                  onChange={(e) => setContent({...content, contact_email: e.target.value})}
                  className="bg-gray-800 border-gray-700 text-white mt-2"
                />
              </div>
              <div>
                <Label className="text-gray-300">WhatsApp</Label>
                <Input
                  value={content?.contact_whatsapp || ''}
                  onChange={(e) => setContent({...content, contact_whatsapp: e.target.value})}
                  className="bg-gray-800 border-gray-700 text-white mt-2"
                />
              </div>
              
              <div>
                <Label className="text-gray-300">CTA Title</Label>
                <Input
                  value={content?.cta_title || ''}
                  onChange={(e) => setContent({...content, cta_title: e.target.value})}
                  className="bg-gray-800 border-gray-700 text-white mt-2"
                />
              </div>
              <div>
                <Label className="text-gray-300">CTA Description</Label>
                <Textarea
                  value={content?.cta_description || ''}
                  onChange={(e) => setContent({...content, cta_description: e.target.value})}
                  className="bg-gray-800 border-gray-700 text-white mt-2"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Add more tabs for values and offerings if needed */}
      </Tabs>
    </div>
  );
}