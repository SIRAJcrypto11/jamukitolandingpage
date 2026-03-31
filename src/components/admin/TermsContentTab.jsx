import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, Loader2, Sparkles, Eye, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function TermsContentTab() {
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
      const data = await base44.entities.TermsContent.list();
      if (data && data.length > 0) {
        setContent(data[0]);
      } else {
        const defaultContent = await base44.entities.TermsContent.create({
          title: "Syarat dan Ketentuan",
          last_updated: new Date().toISOString().split('T')[0],
          is_active: true
        });
        setContent(defaultContent);
      }
    } catch (error) {
      toast.error('Gagal memuat');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await base44.entities.TermsContent.update(content.id, content);
      toast.success('✅ Berhasil!');
    } catch (error) {
      toast.error('Gagal menyimpan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAiUpdate = async () => {
    if (!aiPrompt.trim()) return;
    try {
      setIsAiProcessing(true);
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Update Terms & Conditions SNISHOP. ${aiPrompt}. Return JSON.`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            intro: { type: "string" },
            contact_email: { type: "string" },
            contact_whatsapp: { type: "string" }
          }
        }
      });
      setContent({ ...content, ...response });
      toast.success('✅ Update berhasil!');
      setAiPrompt('');
    } catch (error) {
      toast.error('Gagal AI');
    } finally {
      setIsAiProcessing(false);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileText className="w-6 h-6 text-purple-500" />
          Kelola "Syarat & Ketentuan"
        </h2>
        <div className="flex gap-3">
          <Button onClick={() => window.open('/terms', '_blank')} variant="outline"><Eye className="w-4 h-4 mr-2" />Preview</Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600">
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}Simpan
          </Button>
        </div>
      </div>

      <Card className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border-purple-700 border-2">
        <CardHeader><CardTitle className="text-white flex items-center gap-2"><Sparkles className="w-5 h-5 text-purple-400" />AI Assistant</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="Update intro atau kontak" className="bg-gray-800 border-gray-700 text-white" />
          <Button onClick={handleAiUpdate} disabled={isAiProcessing} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600">
            {isAiProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}Update AI
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-700">
        <CardHeader><CardTitle className="text-white">Content</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-gray-300">Title</Label>
            <Input value={content?.title || ''} onChange={(e) => setContent({...content, title: e.target.value})} className="bg-gray-800 border-gray-700 text-white mt-2" />
          </div>
          <div>
            <Label className="text-gray-300">Intro</Label>
            <Textarea value={content?.intro || ''} onChange={(e) => setContent({...content, intro: e.target.value})} className="bg-gray-800 border-gray-700 text-white mt-2 min-h-[100px]" />
          </div>
          <div>
            <Label className="text-gray-300">Last Updated</Label>
            <Input type="date" value={content?.last_updated || ''} onChange={(e) => setContent({...content, last_updated: e.target.value})} className="bg-gray-800 border-gray-700 text-white mt-2" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}