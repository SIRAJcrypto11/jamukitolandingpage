import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Bot, X, Send, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { InvokeLLM } from '@/integrations/Core';
import { Note } from '@/entities/Note';
import { User } from '@/entities/User';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

const monthlyLimits = {
  free: 300,
  pro: 1500,
  business: 3000,
  advanced: 6000,
  enterprise: 9000
};

export default function NoteFloatingAI({ workspaceId, onNoteCreated }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [user, setUser] = useState(null);
  const [availableQuota, setAvailableQuota] = useState(0);

  useEffect(() => {
    loadUserQuota();
  }, []);

  const loadUserQuota = async () => {
    try {
      const userData = await User.me();
      setUser(userData);
      const monthlyUsage = userData.ai_monthly_usage || 0;
      const monthlyLimit = monthlyLimits[userData.subscription_plan || 'free'];
      const addonQuota = userData.ai_addon_quota || 0;
      const totalQuota = monthlyLimit + addonQuota;
      setAvailableQuota(totalQuota - monthlyUsage);
    } catch (error) {
      console.error('Failed to load user quota:', error);
    }
  };

  const calculateCreditsNeeded = (prompt) => {
    // Simple note: 1 credit
    // Note with research: 5 credits
    // Multiple notes or complex formatting: 3 credits
    const lowerPrompt = prompt.toLowerCase();

    if (/(cari|riset|referensi|ringkas|rangkuman|internet|sumber)/.test(lowerPrompt)) {
      return 5;
    }
    if (/(beberapa|banyak|multiple)/.test(lowerPrompt)) {
      return 3;
    }
    return 1;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const creditsNeeded = calculateCreditsNeeded(input);

    if (availableQuota < creditsNeeded) {
      toast.error(`Kuota AI tidak cukup. Butuh ${creditsNeeded} kredit, tersisa ${availableQuota} kredit.`);
      return;
    }

    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const currentDateTime = new Date('2025-10-06T21:48:00+07:00');

      const prompt = `Kamu adalah AI assistant untuk manajemen catatan. User berada di halaman Notes.
            
Context:
- Workspace ID: ${workspaceId}
- User: ${user.email}
- Tanggal/Waktu sekarang: ${currentDateTime.toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })} (${currentDateTime.toISOString()})

Tugas kamu:
1. Jika user meminta untuk membuat catatan, buat catatan dengan format yang baik
2. Jika user ingin meringkas sesuatu, bantu ringkas
3. Jika user butuh template catatan, berikan template yang sesuai
4. Jika user ingin mengorganisir catatan, berikan saran

Permintaan user: "${input}"

Respons dalam format JSON:
{
  "action": "create_note" | "chat",
  "notes": [{"title": "...", "content": "...", "icon": "📝", "tags": [...]}],
  "message": "..."
}`;

      const useInternet = /(cari|riset|referensi|ringkas|rangkuman)/.test(input.toLowerCase());

      const response = await InvokeLLM({
        prompt,
        add_context_from_internet: useInternet,
        response_json_schema: { type: 'object' }
      });

      if (response.action === 'create_note' && response.notes) {
        for (const noteData of response.notes) {
          await Note.create({
            ...noteData,
            workspace_id: workspaceId
          });
        }
        toast.success(`${response.notes.length} catatan berhasil dibuat! (${creditsNeeded} kredit)`);
        if (onNoteCreated) onNoteCreated();
      }

      // Update AI usage
      const newUsage = (user.ai_monthly_usage || 0) + creditsNeeded;
      await User.updateMyUserData({ ai_monthly_usage: newUsage });
      setAvailableQuota((prev) => prev - creditsNeeded);

      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `${response.message || 'Catatan berhasil dibuat!'} (Digunakan ${creditsNeeded} kredit)`
      }]);

    } catch (error) {
      console.error('AI error:', error);
      toast.error('Gagal memproses permintaan');
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: 'Maaf, terjadi kesalahan. Coba lagi.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const quotaPercentage = user ? availableQuota / (monthlyLimits[user.subscription_plan || 'free'] + (user.ai_addon_quota || 0)) * 100 : 0;

  return (
    <>
      <AnimatePresence>
        {!isOpen &&
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          style={{ position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999 }}
          className="md:top-6 md:right-6">

            <Button
            onClick={() => setIsOpen(true)}
            size="lg" className="bg-gradient-to-r text-primary-foreground mt-6 px-8 text-sm font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-primary/90 h-12 w-12 md:h-14 md:w-14 rounded-full shadow-2xl from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 hover:scale-110 transition-transform">


              <Bot className="w-5 h-5 md:w-6 md:h-6" />
            </Button>
          </motion.div>
        }
      </AnimatePresence>

      <AnimatePresence>
        {isOpen &&
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          style={{ position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999 }}
          className="w-[calc(100vw-2rem)] max-w-96 h-[500px] md:top-6 md:right-6 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col">

            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">AI Note Assistant</h3>
                    <p className="text-xs text-gray-500">Bantu kelola catatan Anda</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                <div className="flex justify-between mb-1">
                  <span>Kuota AI:</span>
                  <span className="font-semibold">{availableQuota} kredit</span>
                </div>
                <Progress value={quotaPercentage} className="h-1" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 &&
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Sparkles className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Halo! Saya bisa membantu Anda:</p>
                  <ul className="text-xs mt-2 space-y-1">
                    <li>• Buat catatan baru (1-5 kredit)</li>
                    <li>• Ringkas informasi</li>
                    <li>• Template catatan</li>
                    <li>• Organisir catatan</li>
                  </ul>
                </div>
            }
              {messages.map((msg, idx) =>
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${msg.role === 'user' ? 'bg-purple-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'}`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
            )}
              {isLoading &&
            <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>
            }
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex gap-2">
                <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ketik pesan..."
                className="resize-none"
                rows={2}
                disabled={isLoading || availableQuota <= 0} />

                <Button onClick={handleSend} disabled={!input.trim() || isLoading || availableQuota <= 0} size="icon" className="self-end">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </motion.div>
        }
      </AnimatePresence>
    </>);

}