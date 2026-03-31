import { useState, useRef, useEffect } from 'react';
import { InvokeLLM } from '@/integrations/Core';
import { Task } from '@/entities/Task';
import { Note } from '@/entities/Note';
import { FinancialRecord } from '@/entities/FinancialRecord';
import { Conversation } from '@/entities/Conversation';
import { Workspace } from '@/entities/Workspace';
import { User } from '@/entities/User';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, Mic, Sparkles, ArrowLeft, Globe, WifiOff } from 'lucide-react';
import MessageBubble from './MessageBubble';
import { toast } from 'sonner';

export default function ChatWindow({ conversation, onConversationUpdate, user, totalQuota, onBack, isMobileView }) {
  const [messages, setMessages] = useState(conversation?.messages || []);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false); // New state for voice input
  const [useInternet, setUseInternet] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null); // New ref for speech recognition

  // Effect to update messages when conversation prop changes
  useEffect(() => {
    setMessages(conversation?.messages || []);
  }, [conversation]);

  // Effect to scroll to the bottom of the chat window
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // New function to update user's AI usage
  const updateUsage = async (credits) => {
    if (!user || !user.id) {
      console.warn("User or User ID not available for AI usage update.");
      return;
    }
    const newUsage = (user?.ai_monthly_usage || 0) + credits;
    await User.update(user.id, { ai_monthly_usage: newUsage });
    // Optionally, you might want to refresh the user data in the parent component
    // For now, we assume parent component will refresh user prop eventually or it's handled elsewhere.
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages); // Update local state immediately
    setInput('');
    setIsLoading(true);

    // Create a working copy of the conversation state for updates
    let currentConversationState = { ...conversation, messages: newMessages };

    try {
      // Persist user message and potentially update title
      if (currentConversationState.title === "Percakapan Baru" && newMessages.length === 1) {
        const newTitle = input.substring(0, 40);
        currentConversationState.title = newTitle; // Update working copy of title
        onConversationUpdate(currentConversationState); // Optimistically update parent with new title and user message
        await Conversation.update(conversation.id, { title: newTitle, messages: newMessages }); // Persist title and messages to DB
      } else {
        await Conversation.update(conversation.id, { messages: newMessages }); // Persist user's message
        onConversationUpdate(currentConversationState); // Update parent with just new messages
      }

      // FIX: Use a real-time, unambiguous ISO string for the AI's context.
      const now = new Date();
      const currentTimeISOString = now.toISOString();

      const prompt = `
                Anda adalah TODOIT AI, asisten AI terintegrasi penuh yang sangat presisi dalam manajemen waktu.

                WAKTU REFERENSI SAAT INI (ISO 8601 UTC): **${currentTimeISOString}**.
                Ini adalah satu-satunya acuan waktu absolut yang boleh Anda gunakan.

                Konteks Pengguna: ${user.email}, ${user.full_name}.
                Riwayat percakapan saat ini: ${JSON.stringify(newMessages.slice(-5))}
                
                TUGAS UTAMA:
                1. Analisis permintaan pengguna.
                2. Ketika pengguna menyebutkan waktu relatif (misal: 'besok jam 4 sore', '30 menit dari sekarang', 'hari selasa lalu'), Anda WAJIB menghitung tanggal dan waktu absolut yang benar berdasarkan WAKTU REFERENSI di atas.
                3. Pilih salah satu dari TINDAKAN YANG TERSEDIA di bawah.
                4. Pastikan semua output tanggal dan waktu dalam format ISO 8601 UTC yang ketat (YYYY-MM-DDTHH:mm:ss.sssZ).
                5. Untuk perintah seperti 'jadikan ini catatan', gunakan 3-5 pesan terakhir dalam riwayat sebagai konten catatan.

                PERMINTAAN PENGGUNA: "${input}"

                TINDAKAN YANG TERSEDIA:
                - 'chat_response': Untuk obrolan umum, pertanyaan, atau jika tidak ada tindakan lain yang cocok.
                - 'create_task': Untuk membuat tugas baru. Wajib ada 'title'. 'workspace_id' default ke workspace pribadi pengguna jika tidak ditentukan.
                - 'create_note': Untuk membuat catatan baru. Wajib ada 'title'. 'workspace_id' default ke workspace pribadi pengguna.
                - 'create_financial_record': Untuk mencatat transaksi keuangan. Wajib ada 'amount' dan 'type' (income/expense). 'mode' bisa 'personal' atau 'business'.

                FORMAT OUTPUT (HANYA JSON YANG VALID):
                - Chat: \`{"action": "chat_response", "message": "Jawaban Anda dalam Markdown."}\`
                - Tugas: \`{"action": "create_task", "task": {"title": "...", "description": "...", "due_date": "YYYY-MM-DDTHH:mm:ss.sssZ"}}\`
                - Catatan: \`{"action": "create_note", "note": {"title": "...", "content": "..."}}\`
                - Keuangan: \`{"action": "create_financial_record", "record": {"type": "expense", "amount": 15000, "category": "Makanan", "description": "Makan siang", "date": "YYYY-MM-DDTHH:mm:ss.sssZ", "mode": "personal"}}\`
            `;

      // FIX: Dynamically decide whether to request JSON based on internet usage
      let aiResponse;
      if (useInternet) {
        // Can't request JSON with web search. We will get a string response.
        aiResponse = await InvokeLLM({ prompt, add_context_from_internet: true });
      } else {
        aiResponse = await InvokeLLM({ prompt, response_json_schema: { type: 'object' } });
      }

      let assistantMessageContent = "Maaf, saya tidak dapat memproses permintaan Anda.";
      let creditsUsed = 1; // Default credit usage for a simple chat

      // Helper to find default workspace
      const getDefaultWorkspaceId = async () => {
        const personalWorkspaces = await Workspace.filter({ is_personal: true, owner_id: user.email });
        if (personalWorkspaces && personalWorkspaces.length > 0) return personalWorkspaces[0].id;
        const allWorkspaces = await Workspace.list();
        return allWorkspaces && allWorkspaces.length > 0 ? allWorkspaces[0].id : null;
      };

      // Handle both string (from web search) and object responses
      const responseAction = typeof aiResponse === 'object' ? aiResponse.action : 'chat_response';
      const responseData = typeof aiResponse === 'object' ? aiResponse : { message: aiResponse };

      if (responseAction === 'create_task' && responseData.task) {
        const workspaceId = responseData.task.workspace_id || (await getDefaultWorkspaceId());
        if (!workspaceId) {
          assistantMessageContent = "Gagal membuat tugas. Anda harus memiliki setidaknya satu workspace.";
          toast.error("Silakan buat workspace terlebih dahulu.");
        } else {
          const newTask = await Task.create({ ...responseData.task, workspace_id: workspaceId });
          assistantMessageContent = `✅ Tugas berhasil dibuat: **${newTask.title}**.`;
          toast.success("Tugas berhasil dibuat oleh AI.");
          creditsUsed = 5; // Creating tasks is a complex action
        }
      } else if (responseAction === 'create_note' && responseData.note) {
        const workspaceId = responseData.note.workspace_id || (await getDefaultWorkspaceId());
        if (!workspaceId) {
          assistantMessageContent = "Gagal membuat catatan. Anda harus memiliki setidaknya satu workspace.";
          toast.error("Silakan buat workspace terlebih dahulu.");
        } else {
          const newNote = await Note.create({ ...responseData.note, workspace_id: workspaceId });
          assistantMessageContent = `✅ Catatan berhasil disimpan: **${newNote.title}**.`;
          toast.success("Catatan berhasil dibuat oleh AI.");
          creditsUsed = 5;
        }
      } else if (responseAction === 'create_financial_record' && responseData.record) {
        const newRecord = await FinancialRecord.create({ ...responseData.record, user_id: user.id });
        assistantMessageContent = `✅ Transaksi Keuangan dicatat: ${newRecord.description} sebesar Rp ${newRecord.amount.toLocaleString()}.`;
        toast.success("Transaksi keuangan berhasil dicatat oleh AI.");
        creditsUsed = 5;
      } else if (responseData.message) {
        assistantMessageContent = responseData.message;
        if (useInternet) creditsUsed = 10; // Web search is more expensive
      }

      await updateUsage(creditsUsed);
      const finalAssistantMessage = { role: 'assistant', content: assistantMessageContent };
      const finalMessages = [...newMessages, finalAssistantMessage];
      setMessages(finalMessages);
      await Conversation.update(conversation.id, { messages: finalMessages });
      onConversationUpdate({ ...currentConversationState, messages: finalMessages });

    } catch (error) {
      console.error("AI Error:", error);
      toast.error("AI Error:", { description: error.message });
      // Add a message to the chat indicating an error
      const errorFinalMessages = [...newMessages, { role: 'assistant', content: 'Maaf, terjadi sedikit gangguan. Bisakah Anda mencoba lagi?' }];
      setMessages(errorFinalMessages);
      await Conversation.update(conversation.id, { messages: errorFinalMessages });
      onConversationUpdate({ ...currentConversationState, messages: errorFinalMessages });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Browser Anda tidak mendukung fitur pengenalan suara.");
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.lang = 'id-ID';
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;

    recognitionRef.current.onstart = () => setIsListening(true);
    recognitionRef.current.onend = () => setIsListening(false);
    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      toast.error("Terjadi kesalahan pada pengenalan suara.");
      setIsListening(false);
    };

    recognitionRef.current.onresult = (event) => {
      const transcript = Array.from(event.results).
      map((result) => result[0]).
      map((result) => result.transcript).
      join('');
      setInput(transcript);
    };

    recognitionRef.current.start();
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      <header className="flex items-center p-4 border-b dark:border-gray-700 flex-shrink-0">
        {isMobileView && onBack &&
        <Button variant="ghost" size="icon" onClick={onBack} className="mr-2">
                <ArrowLeft className="h-5 w-5" />
            </Button>
        }
        <h2 className="text-lg font-semibold truncate">{conversation?.title}</h2>
        <div className="ml-auto flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Sparkles className="w-4 h-4" />
            <span>{(totalQuota - (user?.ai_monthly_usage || 0)).toLocaleString()} / {totalQuota.toLocaleString()} kredit</span>
        </div>
      </header>

      <div className="flex-1 p-4 overflow-y-auto space-y-6">
        {messages.map((msg, index) =>
        <MessageBubble key={index} message={msg} />
        )}
         {isLoading &&
        <div className="flex justify-start">
                <div className="rounded-lg px-4 py-3 bg-gray-200 dark:bg-gray-700">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-600 dark:text-gray-300" />
                </div>
            </div>
        }
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 border-t dark:border-gray-700">
        <div className="relative">
            <Textarea
            placeholder="Tanyakan apa saja..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }} className="bg-slate-900 pr-24 p-3 text-sm flex min-h-[80px] border ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 w-full rounded-xl border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"

            rows={1}
            disabled={isLoading} />

            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                 <Button
              variant="ghost"
              size="icon"
              onClick={handleVoiceInput}
              disabled={isLoading}
              className={`h-8 w-8 rounded-full ${isListening ? 'text-red-500 bg-red-100' : 'text-gray-500 hover:text-blue-500 hover:bg-blue-100'}`}>

                    <Mic className="h-5 w-5" />
                </Button>
                <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              className="h-8 w-8 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300">

                    <Send className="h-4 w-4" />
                </Button>
            </div>
        </div>
        <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
                <Button variant={useInternet ? 'secondary' : 'ghost'} size="sm" onClick={() => setUseInternet(!useInternet)} className="text-xs gap-2">
                    {useInternet ? <Globe className="h-4 w-4 text-blue-500" /> : <WifiOff className="h-4 w-4" />}
                    Pencarian Web
                </Button>
            </div>
            <p className="text-xs text-gray-500">
                TODOIT AI dapat membuat kesalahan. Harap periksa fakta penting.
            </p>
        </div>
      </div>
    </div>);

}