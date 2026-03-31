import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Bot, X, Send, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { InvokeLLM } from '@/integrations/Core';
import { Task } from '@/entities/Task';
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

export default function WorkspaceFloatingAI({ workspace, onUpdate }) {
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
    const lowerPrompt = prompt.toLowerCase();
    
    if (/(cari|riset|referensi|analisis|internet)/.test(lowerPrompt)) {
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

      const prompt = `Kamu adalah AI assistant untuk workspace management. User berada di workspace "${workspace.name}".
            
Context:
- Workspace ID: ${workspace.id}
- Workspace Name: ${workspace.name}
- User: ${user.email}
- Tanggal/Waktu sekarang: ${currentDateTime.toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}

Tugas kamu:
1. Bantu user membuat tugas atau catatan di workspace ini
2. Berikan saran organisasi workspace
3. Analisis produktivitas tim

Permintaan user: "${input}"

Respons dalam format JSON:
{
  "action": "create_task" | "create_note" | "chat",
  "tasks": [{"title": "...", "content": "...", "priority": "...", "due_date": "..."}],
  "notes": [{"title": "...", "content": "...", "icon": "📝"}],
  "message": "..."
}`;

      const useInternet = /(cari|riset|referensi)/.test(input.toLowerCase());

      const response = await InvokeLLM({
        prompt,
        add_context_from_internet: useInternet,
        response_json_schema: { type: 'object' }
      });

      if (response.action === 'create_task' && response.tasks) {
        for (const taskData of response.tasks) {
          await Task.create({
            title: taskData.title || 'Tugas Baru',
            content: taskData.content || '',
            workspace_id: workspace.id,
            status: 'todo',
            priority: taskData.priority || 'medium',
            due_date: taskData.due_date || null
          });
        }
        toast.success(`${response.tasks.length} tugas berhasil dibuat! (${creditsNeeded} kredit)`);
        if (onUpdate) onUpdate();
      }

      if (response.action === 'create_note' && response.notes) {
        for (const noteData of response.notes) {
          await Note.create({
            ...noteData,
            workspace_id: workspace.id
          });
        }
        toast.success(`${response.notes.length} catatan berhasil dibuat! (${creditsNeeded} kredit)`);
        if (onUpdate) onUpdate();
      }

      // Update AI usage
      const newUsage = (user.ai_monthly_usage || 0) + creditsNeeded;
      await User.updateMyUserData({ ai_monthly_usage: newUsage });
      setAvailableQuota(prev => prev - creditsNeeded);

      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `${response.message || 'Selesai!'} (Digunakan ${creditsNeeded} kredit)`
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

  const quotaPercentage = user ? (availableQuota / (monthlyLimits[user.subscription_plan || 'free'] + (user.ai_addon_quota || 0))) * 100 : 0;

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999 }}
            className="md:bottom-6 md:right-6"
          >
            <Button
              onClick={() => setIsOpen(true)}
              size="lg"
              className="h-12 w-12 md:h-14 md:w-14 rounded-full shadow-2xl bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 hover:scale-110 transition-transform"
            >
              <Bot className="w-5 h-5 md:w-6 md:h-6" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999 }}
            className="w-[calc(100vw-2rem)] max-w-96 h-[500px] md:bottom-6 md:right-6 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col"
          >
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-green-500 to-teal-600 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">AI Workspace Assistant</h3>
                    <p className="text-xs text-gray-500">Bantu kelola workspace</p>
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
              {messages.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Sparkles className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Halo! Saya bisa membantu:</p>
                  <ul className="text-xs mt-2 space-y-1">
                    <li>• Buat tugas/catatan (1-5 kredit)</li>
                    <li>• Organisasi workspace</li>
                    <li>• Analisis produktivitas</li>
                  </ul>
                </div>
              )}
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${msg.role === 'user' ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'}`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              )}
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
                  placeholder="Ketik perintah..."
                  className="resize-none"
                  rows={2}
                  disabled={isLoading || availableQuota <= 0}
                />
                <Button onClick={handleSend} disabled={!input.trim() || isLoading || availableQuota <= 0} size="icon" className="self-end">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}