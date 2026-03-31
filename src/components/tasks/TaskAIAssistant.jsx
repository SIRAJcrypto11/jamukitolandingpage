import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Bot, Send, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { InvokeLLM } from '@/integrations/Core';
import { User } from '@/entities/User';
import { Notification } from '@/entities/Notification';
import { toast } from 'sonner';

const monthlyLimits = {
  free: 300, pro: 1500, business: 3000, advanced: 6000, enterprise: 9000
};

/**
 * Ensure due_date is either a valid ISO string or null to avoid RangeError in renderers.
 * - Accepts ISO-like strings or 'YYYY-MM-DD' (defaults time to 09:00 local).
 * - Returns ISO string (UTC, with Z) or null when invalid.
 */
function normalizeDueDateValue(input) {
  try {
    if (!input) return null;
    const s = String(input).trim();
    if (!s) return null;

    // If already parseable by Date
    const parsed = new Date(s);
    if (!isNaN(parsed)) return parsed.toISOString();

    // If only date is provided (YYYY-MM-DD)
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      const Y = parseInt(m[1], 10);
      const M = parseInt(m[2], 10);
      const D = parseInt(m[3], 10);
      return new Date(Y, M - 1, D, 9, 0, 0, 0).toISOString();
    }

    return null;
  } catch {
    return null;
  }
}

export default function TaskAIAssistant({ user, workspaces, onTaskCreate, onUserUpdate }) {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: "Halo! Saya AI asisten tugas. Saya bisa membantu:\n\n• Membuat tugas dengan jadwal otomatis\n• Mengatur reminder dan prioritas\n• Memahami konteks waktu yang tepat\n\nContoh: *'Buat tugas rapat dengan tim jam 14:00 hari ini'*"
  }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef(null);

  const monthlyUsage = user?.ai_monthly_usage || 0;
  const monthlyLimit = monthlyLimits[user?.subscription_plan || 'free'];
  const addonQuota = user?.ai_addon_quota || 0;
  const totalQuota = monthlyLimit + addonQuota;
  const canUseAI = monthlyUsage < totalQuota;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const createTaskFromAI = async (taskData) => {
    try {
      const personalWorkspace = workspaces.find(w => w.is_personal) || workspaces[0];
      if (!personalWorkspace) {
        throw new Error('No workspace found');
      }

      const validDue = normalizeDueDateValue(taskData.due_date);
      const newTask = {
        title: taskData.title,
        content: taskData.description || '',
        // Ensure downstream components never receive an invalid time value
        // Use null explicitly instead of undefined to avoid serialization issues
        due_date: (validDue ?? null),
        priority: taskData.priority || 'medium',
        status: 'todo',
        workspace_id: personalWorkspace.id,
        reminder_config: taskData.reminder_config
      };

      const createdTask = await onTaskCreate(newTask);

      // Create notification if reminder is set
      if (taskData.due_date && taskData.should_notify && createdTask) {
        await Notification.create({
          user_id: user.email,
          title: `Reminder: ${taskData.title}`,
          message: taskData.description || `Tugas "${taskData.title}" akan dimulai.`,
          url: `/tasks?id=${createdTask.id}`
        });
      }

      return createdTask;
    } catch (error) {
      console.error('Failed to create task:', error);
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
      const now = new Date();
      now.setFullYear(2025); // Sesuai permintaan user
      const currentTime = `${now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} jam ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;

      const contextPrompt = `Anda adalah AI asisten yang sangat ahli dalam manajemen tugas. Anda terintegrasi di dalam halaman "Tugas" pada aplikasi produktivitas TODOIT.
Konteks waktu saat ini adalah: **${currentTime}**.

Tugas Anda adalah menganalisis permintaan pengguna dan mengubahnya menjadi data tugas yang terstruktur.

Permintaan pengguna: "${messageContent}"

**INSTRUKSI PENUH:**
- **Analisis Waktu:** Tafsirkan referensi waktu dengan sangat akurat. 'jam 11 malam ini' berarti malam ini, bukan besok. 'besok jam 10 pagi' berarti besok. Jika ambigu (misal: 'rapat jam 2'), asumsikan waktu logis berikutnya (jika sekarang jam 3 sore, berarti jam 2 besok).
- **Atur Notifikasi:** Selalu setel \`should_notify\` ke \`true\` jika ada waktu spesifik yang disebutkan. Atur pengingat 15 menit sebelum acara sebagai default.
- **Tentukan Prioritas:** Gunakan 'urgent' untuk deadline yang sangat dekat atau penting, 'high' untuk tugas penting, dan 'medium' untuk default.
- **Output JSON Ketat:** Anda **HARUS** memberikan output dalam format JSON yang valid. Jangan sertakan teks lain di luar objek JSON.

**Format Output JSON (WAJIB):**
\`\`\`json
{
  "action": "create_task",
  "task": {
    "title": "Judul tugas yang ringkas tapi jelas, diambil dari inti permintaan.",
    "description": "Deskripsi detail jika ada informasi tambahan dari pengguna.",
    "due_date": "Tanggal dan waktu dalam format ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)",
    "priority": "low | medium | high | urgent",
    "should_notify": true,
    "reminder_config": {"value": 15, "unit": "minutes"}
  },
  "message": "Pesan konfirmasi yang ramah dan informatif untuk pengguna, sebutkan detail tugas yang baru saja Anda buat."
}
\`\`\`
`;

      const response = await InvokeLLM({ prompt: contextPrompt });
      
      let aiResponse;
      try {
        aiResponse = JSON.parse(response);
      } catch (e) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: "Maaf, saya tidak dapat memproses permintaan ini. Bisakah Anda jelaskan lebih spesifik tugas yang ingin dibuat?" 
        }]);
        return;
      }

      if (aiResponse.action === 'create_task') {
        try {
          const task = await createTaskFromAI(aiResponse.task);
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `✅ **Tugas berhasil dibuat!**\n\n${aiResponse.message}\n\n📋 **${task.title}**\n⏰ ${task.due_date ? new Date(task.due_date).toLocaleString('id-ID') : 'Tidak ada deadline'}\n🎯 Prioritas: ${task.priority}` 
          }]);
          toast.success(`Tugas "${task.title}" berhasil dibuat!`);
        } catch (error) {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `❌ Maaf, gagal membuat tugas: ${error.message}` 
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

  // canUseAI gating is handled per viewport in the render below (desktop vs mobile)

  return (
    <>
      <Button
        size="icon"
        onClick={() => setIsOpen(true)}
        className="fixed right-4 bottom-24 md:bottom-6 z-40 rounded-full h-14 w-14 shadow-lg bg-blue-600 hover:bg-blue-700"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 6rem)' }}
        aria-label="Buka AI Assistant"
      >
        <Sparkles className="w-6 h-6 text-white" />
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed right-4 bottom-24 md:bottom-6 z-50 w-[92vw] max-w-[420px] h-[75vh] bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden flex flex-col"
            style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 6rem)' }}
          >
            <div className="flex items-center justify-between p-3 border-b border-gray-700">
              <div className="flex items-center gap-2 text-white text-sm font-semibold">
                <Sparkles className="w-4 h-4 text-blue-400" />
                AI Asisten Tugas
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-gray-300 hover:text-white"
                onClick={() => setIsOpen(false)}
              >
                Tutup
              </Button>
            </div>

            <div className="flex-1 overflow-hidden">
              {canUseAI ? (
                <div className="h-full flex flex-col p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-gray-400">
                      Sisa kuota: {(totalQuota - monthlyUsage).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex-1 overflow-y-auto mb-3 space-y-3 pr-2 scrollbar-thin scrollbar-track-gray-700 scrollbar-thumb-gray-600">
                    <AnimatePresence>
                      {messages.map((msg, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          {msg.role === 'assistant' && <Bot className="w-5 h-5 text-blue-400 mt-1 mr-2 flex-shrink-0" />}
                          <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                            msg.role === 'user' ? 'bg-blue-600' : 'bg-gray-700'
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
                      placeholder="Jelaskan tugas yang ingin dibuat..."
                      className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 resize-none"
                      rows={2}
                      disabled={isLoading}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={isLoading || !input.trim()}
                      size="icon"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center p-6">
                  <Card className="bg-red-50 border-red-200 w-full">
                    <CardContent className="p-4 text-center">
                      <p className="text-red-700">Kuota AI bulanan telah habis.</p>
                      <Button size="sm" className="mt-2" onClick={() => window.location.href = '/pricing'}>
                        Upgrade Plan
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}