import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Bot, Send, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { InvokeLLM } from '@/integrations/Core';
import { User } from '@/entities/User';
import { toast } from 'sonner';

const monthlyLimits = {
  free: 300, pro: 1500, business: 3000, advanced: 6000, enterprise: 9000
};

export default function NoteAIAssistant({ user, workspaces, onNoteCreate, onUserUpdate }) {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: "Halo! Saya AI asisten catatan. Saya bisa membantu:\n\n• Membuat catatan dengan riset mendalam\n• Mencari informasi dari internet\n• Menyusun catatan terstruktur dan rapi\n\nContoh: *'Buat catatan tentang React Hooks'* atau *'Tulis catatan tentang tips produktivitas'*"
  }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const monthlyUsage = user?.ai_monthly_usage || 0;
  const monthlyLimit = monthlyLimits[user?.subscription_plan || 'free'];
  const addonQuota = user?.ai_addon_quota || 0;
  const totalQuota = monthlyLimit + addonQuota;
  const canUseAI = monthlyUsage < totalQuota;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const createNoteFromAI = async (noteData) => {
    try {
      const personalWorkspace = workspaces.find(w => w.is_personal) || workspaces[0];
      if (!personalWorkspace) {
        throw new Error('No workspace found');
      }

      const newNote = {
        title: noteData.title,
        content: noteData.content,
        workspace_id: personalWorkspace.id,
        icon: noteData.icon || '📝'
      };

      const createdNote = await onNoteCreate(newNote);
      return createdNote;
    } catch (error) {
      console.error('Failed to create note:', error);
      throw error;
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || !canUseAI) return;

    const messageContent = input.trim();
    const newUserMessage = { role: 'user', content: messageContent };
    setMessages(prev => [...prev, newUserMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const shouldResearch = messageContent.toLowerCase().includes('tentang') || 
                           messageContent.toLowerCase().includes('mengenai') ||
                           messageContent.toLowerCase().includes('jelaskan');

      const contextPrompt = `Anda adalah AI asisten yang sangat ahli dalam membuat catatan informatif dan terstruktur. Anda terintegrasi di dalam halaman "Catatan" pada aplikasi produktivitas TODOIT.

Tugas Anda adalah mengubah permintaan pengguna menjadi sebuah catatan yang kaya konten dan rapi.

Permintaan pengguna: "${messageContent}"

**INSTRUKSI PENUH:**
- **Riset Mendalam:** Jika topik membutuhkan informasi eksternal (misal: "catatan tentang AI", "jelaskan tentang snishop"), gunakan kemampuan browsing internet Anda untuk mengumpulkan data yang akurat, relevan, dan terkini.
- **Struktur Konten:** Hasilkan konten dalam format HTML. Gunakan struktur yang logis dengan heading (<h1>, <h2>), paragraf (<p>), daftar (<ul><li>), dan penekanan (<strong>, <em>).
- **Output JSON Ketat:** Anda **HARUS** memberikan output dalam format JSON yang valid. Jangan sertakan teks lain di luar objek JSON.

**Format Output JSON (WAJIB):**
\`\`\`json
{
  "action": "create_note",
  "note": {
    "title": "Judul catatan yang menarik dan sesuai dengan topik permintaan.",
    "content": "Konten catatan yang sangat informatif, mendalam, dan terstruktur dengan baik dalam format HTML. Jangan takut membuat konten yang panjang jika topik kompleks.",
    "icon": "Satu emoji yang paling mewakili topik catatan."
  },
  "message": "Pesan konfirmasi yang ramah kepada pengguna, beritahu mereka bahwa catatan tentang topik tersebut telah berhasil dibuat dan siap dibaca."
}
\`\`\`
`;

      const response = await InvokeLLM({ 
        prompt: contextPrompt,
        add_context_from_internet: shouldResearch
      });
      
      let aiResponse;
      try {
        aiResponse = JSON.parse(response);
      } catch (e) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: "Maaf, saya tidak dapat memproses permintaan ini. Bisakah Anda jelaskan lebih spesifik catatan yang ingin dibuat?" 
        }]);
        return;
      }

      if (aiResponse.action === 'create_note') {
        try {
          const note = await createNoteFromAI(aiResponse.note);
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `📝 **Catatan berhasil dibuat!**\n\n${aiResponse.message}\n\n${aiResponse.note.icon} **${aiResponse.note.title}**\n\nCatatan telah disimpan dan siap untuk diedit lebih lanjut.` 
          }]);
          toast.success(`Catatan "${aiResponse.note.title}" berhasil dibuat!`);
        } catch (error) {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `❌ Maaf, gagal membuat catatan: ${error.message}` 
          }]);
        }
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: aiResponse.message 
        }]);
      }

      // Update AI usage
      const newUsage = (user?.ai_monthly_usage || 0) + 1;
      await User.updateMyUserData({ ai_monthly_usage: newUsage });
      if (onUserUpdate) onUserUpdate({ ...user, ai_monthly_usage: newUsage });

    } catch (error) {
      console.error("Error calling AI:", error);
      toast.error("Terjadi kesalahan saat menghubungi AI.");
      setMessages(prev => [...prev, { role: 'assistant', content: "Maaf, saya mengalami gangguan." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!canUseAI) {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardContent className="p-4 text-center">
          <p className="text-red-700">Kuota AI bulanan telah habis.</p>
          <Button size="sm" className="mt-2" onClick={() => window.location.href = '/pricing'}>
            Upgrade Plan
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700 text-white">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="w-5 h-5 text-purple-400" />
          AI Asisten Catatan
        </CardTitle>
        <p className="text-xs text-gray-400">
          Sisa kuota: {(totalQuota - monthlyUsage).toLocaleString()}
        </p>
      </CardHeader>
      <CardContent className="p-4">
        <div className="h-64 overflow-y-auto mb-4 space-y-3 pr-2 scrollbar-thin scrollbar-track-gray-700 scrollbar-thumb-gray-600">
          <AnimatePresence>
            {messages.map((msg, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && <Bot className="w-5 h-5 text-purple-400 mt-1 mr-2 flex-shrink-0" />}
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === 'user' ? 'bg-purple-600' : 'bg-gray-700'
                }`}>
                  <ReactMarkdown className="prose prose-sm prose-invert max-w-none [&>p]:my-0">
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
        
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Jelaskan catatan yang ingin dibuat..."
            className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 resize-none"
            rows={2}
            disabled={isLoading}
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={isLoading || !input.trim()} 
            size="icon"
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}