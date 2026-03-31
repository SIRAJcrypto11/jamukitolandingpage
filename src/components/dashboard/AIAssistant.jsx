import { useState, useRef, useEffect, useMemo } from 'react';
import { Bot, Sparkles, Send, Mic, Loader2, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { base44 } from '@/api/base44Client';
import { Task } from '@/entities/Task';
import { Note } from '@/entities/Note';
import { Badge } from '@/components/ui/badge';

import { InvokeLLM } from '@/api/integrations';

const monthlyLimits = {
  free: 300, pro: 1500, business: 3000, advanced: 6000, enterprise: 9000
};

const suggestionPills = [
  "Buat tugas 'Rapat tim' besok jam 10 pagi",
  "Tulis catatan tentang ide proyek baru"];


/**
 * Time parsing helpers to guarantee tasks follow the user's requested local time (WIB, Asia/Bangkok).
 */
const USER_TZ_LABEL = 'Asia/Bangkok'; // WIB (UTC+7)

function normalizeDueDate(dueDateStr, userMessage, todayStr, tomorrowStr) {
  try {
    const text = (userMessage || '').toLowerCase();

    const isBesok = /\bbesok\b/.test(text);
    const isTodayExplicit = /\bhari ini\b/.test(text) || /\b(pagi|siang|sore|malam)\s+ini\b/.test(text);
    const dayStr = isBesok ? tomorrowStr : todayStr;

    const timeMatch = text.match(/\bjam\s+(\d{1,2})(?:[:.](\d{2}))?/);
    let hour = null;
    let minute = 0;

    if (timeMatch) {
      hour = parseInt(timeMatch[1], 10);
      minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    }

    const period =
      /\bpagi\b/.test(text) ? 'pagi' :
        /\bsiang\b/.test(text) ? 'siang' :
          /\bsore\b/.test(text) ? 'sore' :
            /\bmalam\b/.test(text) ? 'malam' :
              null;

    if (hour !== null) {
      if (period === 'malam') {
        if (hour === 12) { hour = 0; }
        if (hour < 12) { hour += 12; }
      } else if (period === 'siang' || period === 'sore') {
        if (hour !== 12 && hour < 12) { hour += 12; }
      } else if (period === 'pagi') {
        if (hour === 12) { hour = 0; }
      }
    } else {
      if (period === 'pagi') { hour = 9; } else
        if (period === 'siang') { hour = 13; } else
          if (period === 'sore') { hour = 16; } else
            if (period === 'malam') { hour = 20; } else { hour = 9; } // Default to 9 AM if no period specified
    }

    let targetDate = new Date(dayStr);
    targetDate.setHours(hour, minute, 0, 0);

    // If a dueDateStr was provided and is valid, use its date part
    if (dueDateStr) {
      const parsed = new Date(dueDateStr);
      if (!isNaN(parsed.getTime())) {
        targetDate.setFullYear(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
      }
    }

    // Ensure the date is not in the past if it's "today" and the time has passed
    const now = new Date();
    if (targetDate < now && (dayStr === todayStr || dueDateStr === todayStr)) {
      // If the parsed time is before now, move it to tomorrow if "today" was intended
      // This is a common AI error where it sets "today 8am" when it's already "today 10am"
      // Only apply this if the *date* from the message is "today"
      if (targetDate.toDateString() === now.toDateString()) {
        targetDate.setDate(targetDate.getDate() + 1);
        console.warn(`Adjusted task date from past (today) to tomorrow: ${targetDate.toISOString()}`);
      }
    }

    return targetDate.toISOString();
  } catch (err) {
    console.error('Error normalizing due date:', err);
    const [Y, M, D] = (todayStr || new Date().toISOString().slice(0, 10)).split('-').map((n) => parseInt(n, 10));
    return new Date(Y, M - 1, D, 9, 0, 0, 0).toISOString();
  }
}

function cleanTitle(s = '') {
  return s.trim().replace(/^#+\s*/, '').replace(/["""'']+/g, '').slice(0, 100);
}

function deriveTaskTitle(message = '') {
  const t = String(message);
  const quoted = t.match(/["']([^"']+)["']/);
  if (quoted) return cleanTitle(quoted[1]);
  if (/\brapat\b/i.test(t)) return 'Rapat';
  const m = t.match(/\b(tugas|deadline|meeting|rapat|presentasi|wawancara|interview)\b/i);
  if (m) return cleanTitle(m[1].charAt(0).toUpperCase() + m[1].slice(1));
  const words = cleanTitle(t).split(/\s+/).slice(0, 5).join(' ');
  return words || 'Tugas';
}

function deriveNoteTitle(message = '') {
  const t = String(message);
  const quoted = t.match(/["']([^"']+)["']/);
  if (quoted) return cleanTitle(quoted[1]);
  const about = t.match(/\btentang\s+(.+)/i);
  if (about && about[1]) return cleanTitle(about[1].split(/[.!?]/)[0]);
  const m = t.match(/\b(catatan|note)\b\s+(?:tentang\s+)?(.+)/i);
  if (m && m[2]) return cleanTitle(m[2].split(/[.!?]/)[0]);
  const words = cleanTitle(t).split(/\s+/).slice(0, 6).join(' ');
  return words ? `Catatan: ${words}` : 'Catatan';
}

function shouldUseInternet(message = '') {
  const t = String(message).toLowerCase();
  return /(cari|riset|referensi|sumber|terbaru|update|trend|statistik|data|review|perbandingan|apa itu|siapa itu|bagaimana|jelaskan|ringkas|ringkasan|rangkuman)/.test(t) ||
    /(buat|tulis|buatkan)\s+catatan\s+(tentang|mengenai)/.test(t) ||
    /cari informasi tentang/.test(t);
}

function parseJsonResponse(input) {
  try {
    if (!input) return null;
    const text = String(input);
    const fenced = text.match(/```json([\s\S]*?)```/i);
    if (fenced) {
      return JSON.parse(fenced[1].trim());
    }
    const objStart = text.indexOf('{');
    const objEnd = text.lastIndexOf('}');
    if (objStart !== -1 && objEnd !== -1 && objEnd > objStart) {
      const candidate = text.substring(objStart, objEnd + 1);
      return JSON.parse(candidate);
    }
    return JSON.parse(text);
  } catch (e) {
    console.warn('Failed to parse JSON:', e);
    return null;
  }
}

async function synthesizeNoteFromMessage(message, useInternet) {
  const title = deriveNoteTitle(message);
  const prompt = `Buat konten catatan HTML terstruktur tentang: "${title}". Sertakan:
- Ringkasan singkat
- Poin-poin penting berurutan
- Langkah-langkah praktis
- Tips/risiko
- Daftar Referensi (tautan)
Gunakan tag HTML semantik: <h1>, <h2>, <p>, <ul>, <li>, <ol>, <a>.
Outputkan konten dalam bentuk HTML (bukan markdown).`;
  try {
    const resp = await InvokeLLM({
      prompt,
      add_context_from_internet: !!useInternet,
      response_json_schema: {
        type: 'object',
        properties: { content: { type: 'string' } },
        required: ['content']
      }
    });
    if (typeof resp === 'string') {
      const j = parseJsonResponse(resp);
      if (j && typeof j.content === 'string') return { content: j.content };
      return { content: resp };
    }
    if (resp && typeof resp === 'object' && typeof resp.content === 'string') {
      return { content: resp.content };
    }
  } catch (e) {
    console.error('Failed to synthesize note content:', e);
  }
  return { content: `<h1>${title}</h1><p>${message || ''}</p>` };
}

// Helper function to create page URLs
function createPageUrl(pageName) {
  switch (pageName) {
    case 'Tasks': return '/tasks';
    case 'Notes': return '/notes';
    default: return '/';
  }
}

// ✅ REAL cache invalidation using requestManager
import { invalidateCache as realInvalidateCache } from '@/components/utils/requestManager';

function invalidateCache(keyRegex) {
  console.log(`🗑️ Cache invalidation for: ${keyRegex}`);
  try {
    realInvalidateCache(keyRegex);
    console.log(`  ✅ Cache invalidated successfully`);
  } catch (e) {
    console.warn(`  ⚠️ Cache invalidation failed:`, e);
  }
}

// ✅ ULTIMATE RELIABLE TASK SYNC - Multiple fallback methods
async function broadcastTaskCreation(task, companyId) {
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('📡 BROADCASTING TASK CREATION - MULTIPLE METHODS');
  console.log('═══════════════════════════════════════════');
  console.log('📋 Task ID:', task.id);
  console.log('📋 Title:', task.title);
  console.log('📋 Company:', companyId || 'PERSONAL');
  console.log('');

  const broadcastData = {
    type: 'TASK_CREATED',
    companyId: companyId || null,
    taskData: task,
    timestamp: Date.now()
  };

  // ✅ METHOD 1: BroadcastChannel
  try {
    const channel = new BroadcastChannel('snishop_task_updates');
    channel.postMessage(broadcastData);
    channel.close();
    console.log('✅ Method 1: BroadcastChannel sent');
  } catch (e) {
    console.error('❌ Method 1 failed:', e);
  }

  // ✅ METHOD 2: Global Event
  try {
    window.dispatchEvent(new CustomEvent('taskCreated', {
      detail: { task, companyId: companyId || null }
    }));
    console.log('✅ Method 2: Global Event dispatched');
  } catch (e) {
    console.error('❌ Method 2 failed:', e);
  }

  // ✅ METHOD 3: AI-specific Event
  try {
    window.dispatchEvent(new CustomEvent('aiTaskCreated', {
      detail: {
        task,
        workspaceId: task.workspace_id,
        companyId: companyId || null
      }
    }));
    console.log('✅ Method 3: AI-specific Event dispatched');
  } catch (e) {
    console.error('❌ Method 3 failed:', e);
  }

  // ✅ METHOD 4: Force reload trigger
  try {
    window.dispatchEvent(new Event('forceReloadTasks'));
    console.log('✅ Method 4: Force reload triggered');
  } catch (e) {
    console.error('❌ Method 4 failed:', e);
  }

  // ✅ METHOD 5: LocalStorage sync (fallback)
  try {
    const syncData = {
      action: 'TASK_CREATED',
      task,
      companyId: companyId || null,
      timestamp: Date.now()
    };
    localStorage.setItem('SNISHOP_TASK_SYNC', JSON.stringify(syncData));
    console.log('✅ Method 5: LocalStorage sync set');

    // Remove after 5 seconds
    setTimeout(() => {
      localStorage.removeItem('SNISHOP_TASK_SYNC');
    }, 5000);
  } catch (e) {
    console.error('❌ Method 5 failed:', e);
  }

  console.log('═══════════════════════════════════════════');
  console.log('✅ BROADCAST COMPLETE - 5 METHODS ATTEMPTED');
  console.log('═══════════════════════════════════════════');
  console.log('');
}


export default function AIAssistant({ user, workspaces, onUpdateUser, onUpdateData, selectedCompany }) {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: selectedCompany ?
      `Halo! Saya asisten AI untuk **${selectedCompany.name}**. Saya bisa membantu:\n\n• Membuat tugas tim dengan jadwal otomatis\n• Membuat catatan perusahaan dengan riset mendalam\n\n🏢 Mode: **Business** | Company: ${selectedCompany.name}` :
      "Halo! Saya asisten AI Anda. Saya bisa membantu:\n\n• Membuat tugas dengan jadwal otomatis\n• Membuat catatan dengan riset mendalam\n\n🏠 Mode: **Personal**\n\nCoba: *'Buat tugas rapat jam 15:00 hari ini'* atau *'Buat catatan tentang Next.js'*"
  }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(null);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const monthlyUsage = user?.ai_monthly_usage || 0;
  const monthlyLimit = monthlyLimits[user?.subscription_plan || 'free'];
  const addonQuota = user?.ai_addon_quota || 0;
  const totalQuota = monthlyLimit + addonQuota;
  const availableQuota = totalQuota - monthlyUsage;
  const quotaUsedPercentage = totalQuota > 0 ? monthlyUsage / totalQuota * 100 : 0;

  // ✅ Filter workspaces by context + DE-DUPLICATE BY ID
  const filteredWorkspaces = useMemo(() => {
    console.log('🔍 AI ASSISTANT - WORKSPACE FILTERING');
    console.log('   - Total workspaces:', workspaces?.length || 0);
    console.log('   - Context:', selectedCompany ? `COMPANY (${selectedCompany.name})` : 'PERSONAL');

    if (!workspaces || workspaces.length === 0) {
      console.log('❌ NO WORKSPACES');
      return [];
    }

    let filtered = [];
    if (selectedCompany) {
      filtered = workspaces.filter(w => w.company_id === selectedCompany.id && !w.is_personal);
    } else {
      filtered = workspaces.filter(w => w.is_personal === true && (w.company_id === null || w.company_id === undefined));
    }

    // ✅ CRITICAL: De-duplicate by ID
    const uniqueMap = new Map();
    filtered.forEach(ws => {
      if (ws && ws.id && !uniqueMap.has(ws.id)) {
        uniqueMap.set(ws.id, ws);
      }
    });
    const uniqueWorkspaces = Array.from(uniqueMap.values());

    console.log('✅ Unique workspaces:', uniqueWorkspaces.length);
    return uniqueWorkspaces;
  }, [workspaces, selectedCompany]);

  // ✅ Auto-select first workspace if available
  useEffect(() => {
    if (filteredWorkspaces.length > 0 && !selectedWorkspaceId) {
      console.log('✅ Auto-selecting first workspace:', filteredWorkspaces[0].name);
      setSelectedWorkspaceId(filteredWorkspaces[0].id);
    }
  }, [filteredWorkspaces, selectedWorkspaceId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'id-ID';

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        setInput(finalTranscript + interimTranscript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        toast.error(`Error pengenalan suara: ${event.error}`);
        setIsListening(false);
      };
    }
  }, []);

  const handleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current.stop();
    } else if (recognitionRef.current) {
      setInput('');
      recognitionRef.current.start();
      setIsListening(true);
    } else {
      toast.error("Pengenalan suara tidak didukung di browser ini.");
    }
  };

  const createTaskFromAI = async (taskData) => {
    try {
      console.log('📝 AI: Creating task -', taskData.title);

      // ✅ Use selected workspace or first available (already de-duplicated)
      let targetWorkspace = null;

      if (selectedWorkspaceId) {
        targetWorkspace = filteredWorkspaces.find(w => w.id === selectedWorkspaceId);
        if (targetWorkspace) {
          console.log('✅ Using selected workspace:', targetWorkspace.name);
        }
      }

      if (!targetWorkspace && filteredWorkspaces.length > 0) {
        targetWorkspace = filteredWorkspaces[0];
        console.log('✅ Using first workspace:', targetWorkspace.name);
      }

      if (!targetWorkspace) {
        const context = selectedCompany ? `company ${selectedCompany.name}` : 'mode personal';
        throw new Error(`Tidak ada workspace untuk ${context}. Buat workspace terlebih dahulu.`);
      }

      console.log('');
      console.log('✅✅✅ TARGET WORKSPACE CONFIRMED:');
      console.log('   - Name:', targetWorkspace.name);
      console.log('   - ID:', targetWorkspace.id);
      console.log('   - Company ID:', targetWorkspace.company_id);
      console.log('   - Is Personal:', targetWorkspace.is_personal);
      console.log('');

      // ✅ CREATE TASK WITH FULL DATA
      const taskPayload = {
        title: taskData.title,
        content: taskData.description || '',
        due_date: taskData.due_date,
        priority: taskData.priority || 'medium',
        status: 'todo',
        workspace_id: targetWorkspace.id,
        company_id: selectedCompany?.id || null // ✅ CRITICAL - Correct company_id!
      };

      console.log('📝 CREATING TASK IN DATABASE...');
      console.log('   - Title:', taskPayload.title);
      console.log('   - Workspace ID:', taskPayload.workspace_id);
      console.log('   - Workspace Name:', targetWorkspace.name);
      console.log('   - Company ID:', taskPayload.company_id);
      console.log('   - Due Date:', taskPayload.due_date);
      console.log('   - Priority:', taskPayload.priority);
      console.log('');

      const newTask = await Task.create(taskPayload);

      console.log('');
      console.log('✅✅✅ TASK CREATED IN DATABASE!');
      console.log('═══════════════════════════════════════════');
      console.log('📊 Created Task Details:');
      console.log('   - ID:', newTask.id);
      console.log('   - Title:', newTask.title);
      console.log('   - Workspace ID:', newTask.workspace_id);
      console.log('   - Company ID:', newTask.company_id);
      console.log('   - Due Date:', newTask.due_date);
      console.log('   - Created Date:', newTask.created_date);
      console.log('   - Created By:', newTask.created_by);
      console.log('═══════════════════════════════════════════');

      // ✅ CRITICAL - Wait for DB to fully commit & propagate
      console.log('⏳ Waiting 300ms for DB propagation...');
      await new Promise((resolve) => setTimeout(resolve, 300));
      console.log('✅ DB propagation complete');

      // ✅ INVALIDATE ALL TASK CACHES - MULTIPLE PATTERNS
      console.log('🗑️ INVALIDATING CACHES...');
      invalidateCache(/Task/);
      invalidateCache(/Workspace/);
      console.log('✅ Caches invalidated');

      // ✅ BROADCAST via MULTIPLE METHODS
      await broadcastTaskCreation(newTask, selectedCompany?.id || null);

      // ✅ ALSO RELOAD IMMEDIATELY
      if (onUpdateData) {
        console.log('🔄 Calling onUpdateData...');
        onUpdateData();
      }

      // ✅ FORCE REFRESH Dashboard data IMMEDIATELY
      if (onUpdateData) {
        console.log('🔄 Triggering Dashboard onUpdateData callback...');
        onUpdateData();
      }

      // ✅ CRITICAL - FORCE DIRECT RELOAD of Tasks page (if open) - MULTIPLE METHODS
      try {
        console.log('🔄 Triggering DIRECT reload on Tasks page...');

        // Method 1: Custom event with full data
        const tasksPageReloadEvent = new CustomEvent('aiTaskCreated_DirectReload', {
          detail: {
            task: newTask,
            companyId: selectedCompany?.id || null,
            forceDirectReload: true
          }
        });
        window.dispatchEvent(tasksPageReloadEvent);
        console.log('✅ Direct reload event sent to Tasks page');

        // Method 2: Force reload event
        window.dispatchEvent(new Event('forceReloadTasks'));
        console.log('✅ Force reload event sent');

        // Method 3: Delayed second broadcast
        setTimeout(() => {
          invalidateCache(/Task/);
          window.dispatchEvent(new Event('forceReloadTasks'));
          console.log('✅ Delayed force reload sent (500ms)');
        }, 500);

      } catch (e) {
        console.error('❌ Direct reload failed:', e);
      }

      console.log('═══════════════════════════════════════════');
      console.log('✅✅✅ TASK CREATION COMPLETE!');
      console.log('═══════════════════════════════════════════');
      console.log('');

      return newTask;

    } catch (error) {
      console.error('');
      console.error('❌❌❌ CRITICAL ERROR IN TASK CREATION:');
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
      console.error('');
      throw error;
    }
  };

  const createNoteFromAI = async (noteData) => {
    try {
      console.log('📝 AI: Creating note -', noteData.title);

      // ✅ Use selected workspace or first available (already de-duplicated)
      let targetWorkspace = null;

      if (selectedWorkspaceId) {
        targetWorkspace = filteredWorkspaces.find(w => w.id === selectedWorkspaceId);
        if (targetWorkspace) {
          console.log('✅ Using selected workspace:', targetWorkspace.name);
        }
      }

      if (!targetWorkspace && filteredWorkspaces.length > 0) {
        targetWorkspace = filteredWorkspaces[0];
        console.log('✅ Using first workspace:', targetWorkspace.name);
      }

      if (!targetWorkspace) {
        const context = selectedCompany ? `company ${selectedCompany.name}` : 'mode personal';
        throw new Error(`Tidak ada workspace untuk ${context}. Buat workspace terlebih dahulu.`);
      }

      console.log('');
      console.log('✅✅✅ TARGET WORKSPACE CONFIRMED:');
      console.log('   - Name:', targetWorkspace.name);
      console.log('   - ID:', targetWorkspace.id);
      console.log('   - Company ID:', targetWorkspace.company_id);
      console.log('   - Is Personal:', targetWorkspace.is_personal);
      console.log('');

      // ✅ CREATE NOTE WITH FULL DATA
      const notePayload = {
        title: noteData.title,
        content: noteData.content,
        workspace_id: targetWorkspace.id,
        company_id: selectedCompany?.id || null, // ✅ CRITICAL - Correct company_id!
        icon: noteData.icon || '📝'
      };

      console.log('📝 CREATING NOTE IN DATABASE...');
      console.log('   - Title:', notePayload.title);
      console.log('   - Workspace ID:', notePayload.workspace_id);
      console.log('   - Workspace Name:', targetWorkspace.name);
      console.log('   - Company ID:', notePayload.company_id);
      console.log('   - Icon:', notePayload.icon);
      console.log('   - Content Length:', notePayload.content?.length || 0);
      console.log('');

      const newNote = await Note.create(notePayload);

      console.log('');
      console.log('✅✅✅ NOTE CREATED IN DATABASE!');
      console.log('═══════════════════════════════════════════');
      console.log('📊 Created Note Details:');
      console.log('   - ID:', newNote.id);
      console.log('   - Title:', newNote.title);
      console.log('   - Workspace ID:', newNote.workspace_id);
      console.log('   - Company ID:', newNote.company_id);
      console.log('   - Is Personal:', targetWorkspace.is_personal);
      console.log('   - Created Date:', newNote.created_date);
      console.log('   - Created By:', newNote.created_by);
      console.log('═══════════════════════════════════════════');

      // ✅ CRITICAL - Wait 1 second for DB to fully commit & propagate
      console.log('⏳ Waiting 1 second for DB propagation...');
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log('✅ DB propagation complete');

      // ✅ INVALIDATE ALL NOTE CACHES
      console.log('🗑️ INVALIDATING CACHES...');
      invalidateCache(/Note/);
      invalidateCache(/Workspace/);
      console.log('✅ Caches invalidated');

      console.log('');
      console.log('📡📡📡 BROADCASTING NOTE CREATION - 5 METHODS');
      console.log('═══════════════════════════════════════════');

      const broadcastData = {
        type: 'NOTE_CREATED',
        companyId: selectedCompany?.id || null,
        noteData: newNote,
        timestamp: Date.now()
      };

      // ✅ METHOD 1: BroadcastChannel
      try {
        const channel = new BroadcastChannel('snishop_note_updates');
        channel.postMessage(broadcastData);
        channel.close();
        console.log('✅ Method 1: BroadcastChannel sent');
        console.log('   - Type:', broadcastData.type);
        console.log('   - Company ID:', broadcastData.companyId);
        console.log('   - Note ID:', newNote.id);
      } catch (e) {
        console.error('❌ Method 1 failed:', e);
      }

      // ✅ METHOD 2: Global Event
      try {
        window.dispatchEvent(new CustomEvent('noteCreated', {
          detail: { note: newNote, companyId: selectedCompany?.id || null }
        }));
        console.log('✅ Method 2: Global Event dispatched (noteCreated)');
      } catch (e) {
        console.error('❌ Method 2 failed:', e);
      }

      // ✅ METHOD 3: AI-specific Event
      try {
        window.dispatchEvent(new CustomEvent('aiNoteCreated', {
          detail: {
            note: newNote,
            workspaceId: targetWorkspace.id,
            companyId: selectedCompany?.id || null
          }
        }));
        console.log('✅ Method 3: AI-specific Event dispatched (aiNoteCreated)');
      } catch (e) {
        console.error('❌ Method 3 failed:', e);
      }

      // ✅ METHOD 4: Force reload trigger
      try {
        window.dispatchEvent(new Event('forceReloadNotes'));
        console.log('✅ Method 4: Force reload triggered (forceReloadNotes)');
      } catch (e) {
        console.error('❌ Method 4 failed:', e);
      }

      // ✅ METHOD 5: LocalStorage sync (fallback)
      try {
        const syncData = {
          action: 'NOTE_CREATED',
          note: newNote,
          companyId: selectedCompany?.id || null,
          timestamp: Date.now()
        };
        localStorage.setItem('SNISHOP_NOTE_SYNC', JSON.stringify(syncData));
        console.log('✅ Method 5: LocalStorage sync set');

        // Remove after 5 seconds
        setTimeout(() => {
          localStorage.removeItem('SNISHOP_NOTE_SYNC');
        }, 5000);
      } catch (e) {
        console.error('❌ Method 5 failed:', e);
      }

      // ✅ CRITICAL - FORCE DIRECT RELOAD of Notes page (if open)
      try {
        console.log('🔄 Triggering DIRECT reload on Notes page...');

        const notesPageReloadEvent = new CustomEvent('aiNoteCreated_DirectReload', {
          detail: {
            note: newNote,
            companyId: selectedCompany?.id || null,
            forceDirectReload: true
          }
        });
        window.dispatchEvent(notesPageReloadEvent);
        console.log('✅ Direct reload event sent to Notes page');
      } catch (e) {
        console.error('❌ Direct reload failed:', e);
      }

      console.log('═══════════════════════════════════════════');
      console.log('✅✅✅ NOTE CREATION & BROADCAST COMPLETE!');
      console.log('═══════════════════════════════════════════');
      console.log('');

      // ✅ FORCE REFRESH Dashboard data IMMEDIATELY
      if (onUpdateData) {
        console.log('🔄 Triggering Dashboard onUpdateData callback...');
        onUpdateData();
      }

      return newNote;
    } catch (error) {
      console.error('');
      console.error('❌❌❌ CRITICAL ERROR IN NOTE CREATION:');
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
      console.error('');
      throw error;
    }
  };

  const handleSendMessage = async (messageContent) => {
    if (!messageContent.trim() || isLoading) return;

    const currentAvailableQuota = totalQuota - (user?.ai_monthly_usage || 0);
    if (currentAvailableQuota <= 0) {
      toast.error("Kuota AI Anda telah habis. Tidak ada kredit yang tersisa.");
      return;
    }

    const newUserMessage = { role: 'user', content: messageContent };
    setMessages((prev) => [...prev, newUserMessage]);
    setInput('');
    setIsLoading(true);

    let creditsToConsume = 1;

    try {
      const now = new Date();
      const pad2 = (n) => String(n).padStart(2, '0');
      const currentDate = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
      const currentTime24h = `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;

      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      const tomorrowDate = `${tomorrow.getFullYear()}-${pad2(tomorrow.getMonth() + 1)}-${pad2(tomorrow.getDate())}`;

      console.log('');
      console.log('🤖 AI REQUEST INITIATED');
      console.log('═══════════════════════════════════════════');
      console.log('📝 User Message:', messageContent);
      console.log('📅 Current Date:', currentDate);
      console.log('⏰ Current Time:', currentTime24h);
      console.log('📅 Tomorrow Date:', tomorrowDate);
      console.log('🏢 Context:', selectedCompany ? `COMPANY (${selectedCompany.name})` : 'PERSONAL');
      console.log('👤 User:', user?.email);
      console.log('═══════════════════════════════════════════');

      const contextPrompt = `Anda adalah asisten AI pribadi yang ahli dalam manajemen waktu, terintegrasi dalam aplikasi produktivitas SNISHOP.

**KONTEKS WAKTU SAAT INI:**
- Tanggal: ${currentDate} (${now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })})
- Jam: ${currentTime24h} (${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')})
- Format waktu: 24 jam
- Zona waktu pengguna: Asia/Bangkok (UTC+7)

Semua waktu yang disebutkan pengguna dianggap dalam WIB (UTC+7). Saat mengisi due_date, konversikan dari WIB ke UTC dan gunakan akhiran "Z" pada ISO string.

**PERMINTAAN PENGGUNA:** "${messageContent}"

**ATURAN PARSING WAKTU YANG KETAT:**

1. **"malam ini"** = hari ini (${currentDate}) malam (19:00-23:59 WIB)
2. **"siang ini"** = hari ini (${currentDate}) siang (12:00-17:59 WIB)
3. **"sore ini"** = hari ini (${currentDate}) sore (15:00-18:59 WIB) 
4. **"pagi ini"** = hari ini (${currentDate}) pagi (05:00-11:59 WIB)
5. **"besok pagi"** = besok (${tomorrowDate}) pagi (09:00 WIB = 02:00 UTC)
6. **"besok siang"** = besok (${tomorrowDate}) siang (13:00 WIB = 06:00 UTC)
7. **"besok malam"** atau "besok jam 10 malam"** = besok (${tomorrowDate}) jam 22:00 WIB = 15:00 UTC
8. **"besok jam X"** = besok (${tomorrowDate}) jam X (WIB, konversi ke UTC dengan mengurangi 7 jam)

**CONTOH KONKRET KONVERSI WIB ke UTC (Zona waktu Asia/Bangkok adalah UTC+7):**
- "rapat jam 11.40 malam ini" (23:40 WIB) → "${currentDate}T16:40:00.000Z" (23:40 - 7 jam = 16:40 UTC)
- "meeting jam 10 pagi besok" (10:00 WIB) → "${tomorrowDate}T03:00:00.000Z" (10:00 - 7 jam = 03:00 UTC)
- "deadline jam 15:30 hari ini" (15:30 WIB) → "${currentDate}T08:30:00.000Z" (15:30 - 7 jam = 08:30 UTC)
- "rapat besok jam 10 malam" (22:00 WIB) → "${tomorrowDate}T15:00:00.000Z" (22:00 - 7 jam = 15:00 UTC)

**INSTRUKSI PEMBUATAN:**

**Jika permintaan untuk membuat TUGAS:**
Response JSON KETAT:
\`\`\`json
{
  "action": "create_task",
  "task": {
    "title": "Judul tugas ringkas dan jelas",
    "description": "Deskripsi detail tugas",
    "due_date": "TANGGAL DAN WAKTU DALAM FORMAT ISO 8601 UTC (YYYY-MM-DDTHH:MM:SS.SSSZ)",
    "priority": "urgent untuk deadline dekat, high untuk penting, medium untuk normal, low untuk tidak mendesak",
    "should_notify": true,
    "reminder_config": {"value": 15, "unit": "minutes"}
  },
  "message": "Konfirmasi ramah dengan detail waktu yang BENAR dalam WIB"
}
\`\`\`

**Jika permintaan untuk membuat CATATAN:**
Response JSON KETAT:
\`\`\`json
{
  "action": "create_note",
  "note": {
    "title": "Judul catatan yang relevan",
    "content": "Konten HTML terstruktur dengan tag <h1>, <h2>, <p>, <ul>, <li>",
    "icon": "Emoji yang mewakili topik"
  },
  "message": "Konfirmasi bahwa catatan telah dibuat"
}
\`\`\`

**Jika hanya percakapan biasa:**
Response JSON KETAT:
\`\`\`json
{
  "action": "chat_response",
  "message": "Jawaban yang membantu dan ramah"
}
\`\`\`

**ATURAN KEPUTUSAN AKSI:**
- Jika pengguna meminta riset/mencari informasi di internet atau menyebut "buat/tulis catatan tentang ...", "riset", "ringkas/rangkuman", "apa itu/siapa itu" → pilih action "create_note".
- Jika pengguna meminta membuat tugas/pengingat dengan waktu tertentu → pilih action "create_task" dan WAJIB set due_date.
- Jika pengguna hanya bertanya tanpa ingin catatan/tugas → pilih action "chat_response".

**PENTING:**
- SELALU gunakan tanggal ${currentDate} untuk "hari ini"
- SELALU gunakan tanggal ${tomorrowDate} untuk "besok"
- Format waktu HARUS dalam ISO 8601 dengan timezone Z (UTC)
- Konversi WIB ke UTC: kurangi 7 jam (WIB 22:00 = UTC 15:00)`;

      console.log('🤖 Calling LLM API...');
      const response = await InvokeLLM({
        prompt: contextPrompt,
        add_context_from_internet: shouldUseInternet(messageContent),
        response_json_schema: {
          type: "object",
          properties: {
            action: { type: "string", enum: ["create_task", "create_note", "chat_response"] },
            task: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                due_date: { type: "string" },
                priority: { type: "string" },
                should_notify: { type: "boolean" },
                reminder_config: { type: "object" }
              }
            },
            note: {
              type: "object",
              properties: {
                title: { type: "string" },
                content: { type: "string" },
                icon: { type: "string" }
              }
            },
            message: { type: "string" }
          },
          required: ["action", "message"]
        }
      });

      console.log('✅ LLM Response received');
      console.log('   - Raw Type:', typeof response);

      let aiResponse = response;
      if (typeof response === 'string') {
        try {
          aiResponse = JSON.parse(response);
        } catch (e) {
          const extracted = parseJsonResponse(response);
          aiResponse = extracted || { action: 'chat_response', message: String(response) };
        }
      } else if (!response || typeof response !== 'object') {
        const extracted = parseJsonResponse(String(response || ''));
        aiResponse = extracted || { action: 'chat_response', message: '' };
      }

      console.log('📊 Parsed AI Response:');
      console.log('   - Action:', aiResponse.action);
      console.log('   - Has Task Data:', !!aiResponse.task);
      if (aiResponse.task) {
        console.log('   - Task Title:', aiResponse.task.title);
        console.log('   - Task Due Date:', aiResponse.task.due_date);
        console.log('   - Task Priority:', aiResponse.task.priority);
      }

      if (aiResponse.action === 'create_task' && aiResponse.task) {
        creditsToConsume = 1;
        if (currentAvailableQuota < creditsToConsume) {
          toast.error("Kuota AI tidak cukup untuk membuat tugas (butuh 1 kredit).");
          setIsLoading(false);
          setMessages((prev) => [...prev, { role: 'assistant', content: "Maaf, kuota AI Anda tidak cukup untuk melakukan tindakan ini." }]);
          return;
        }

        console.log('');
        console.log('🎯 ACTION DETECTED: CREATE_TASK');
        console.log('═══════════════════════════════════════════');

        try {
          // ✅ Normalize & validate data
          aiResponse.task.due_date = normalizeDueDate(aiResponse.task.due_date, messageContent, currentDate, tomorrowDate);
          console.log('   - Normalized Due Date:', aiResponse.task.due_date);

          if (!aiResponse.task.title || !aiResponse.task.title.trim()) {
            aiResponse.task.title = deriveTaskTitle(messageContent);
          }
          if (!aiResponse.task.description || !aiResponse.task.description.trim()) {
            aiResponse.task.description = messageContent;
          }
          if (!aiResponse.task.priority) {
            aiResponse.task.priority = /urgent|segera|darurat|deadline/i.test(messageContent) ? 'urgent' : 'medium';
          }

          console.log('📝 Final Validated Task Data:');
          console.log('   - Title:', aiResponse.task.title);
          console.log('   - Description:', aiResponse.task.description);
          console.log('   - Due Date:', aiResponse.task.due_date);
          console.log('   - Priority:', aiResponse.task.priority);

          // ✅ CREATE TASK
          const task = await createTaskFromAI(aiResponse.task);

          console.log('');
          console.log('✅✅✅ TASK SUCCESSFULLY CREATED & BROADCASTED!');
          console.log('   - Task ID:', task.id);
          console.log('   - Task Title:', task.title);
          console.log('   - Workspace ID:', task.workspace_id);
          console.log('   - Company ID:', task.company_id);
          console.log('');

          // ✅ SUCCESS MESSAGE with detailed info
          const dueDateDisplay = task.due_date ?
            new Date(task.due_date).toLocaleString('id-ID', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: USER_TZ_LABEL
            }) :
            'Tidak ada deadline';

          setMessages((prev) => [...prev, {
            role: 'assistant',
            content: `✅ **Tugas berhasil dibuat!**\n\n${aiResponse.message}\n\n📋 **Detail Tugas:**\n- Judul: **${task.title}**\n- Due: ${dueDateDisplay}\n- Priority: ${task.priority.toUpperCase()}\n\n✨ *Tugas sudah otomatis muncul di menu Tasks secara REALTIME!*`
          }]);

          toast.success(`✅ Tugas "${task.title}" berhasil dibuat!`, {
            description: `📅 ${dueDateDisplay}\n\n🎯 Tugas sudah muncul di menu Tasks secara REALTIME!\n\n✨ Klik "Lihat Tasks" atau buka menu Tasks untuk mengecek.`,
            duration: 10000,
            action: {
              label: '📋 Lihat Tasks',
              onClick: () => {
                window.location.href = createPageUrl('Tasks');
              }
            }
          });

        } catch (error) {
          console.error('');
          console.error('❌❌❌ TASK CREATION FAILED:');
          console.error('   Error:', error.message);
          console.error('   Stack:', error.stack);
          console.error('');

          setMessages((prev) => [...prev, {
            role: 'assistant',
            content: `❌ **Maaf, gagal membuat tugas.**\n\n**Error:** ${error.message}\n\n💡 **Solusi:**\n1. Pastikan Anda memiliki hak akses untuk membuat tugas.\n2. Coba periksa koneksi internet Anda.\n3. Hubungi support jika masalah berlanjut.`
          }]);

          toast.error('❌ Gagal membuat tugas!', {
            description: error.message,
            duration: 8000
          });

          creditsToConsume = 0;
        }
      } else if (aiResponse.action === 'create_note' && aiResponse.note) {
        creditsToConsume = 3;
        if (currentAvailableQuota < creditsToConsume) {
          toast.error("Kuota AI tidak cukup untuk membuat catatan (butuh 3 kredit).");
          setIsLoading(false);
          setMessages((prev) => [...prev, { role: 'assistant', content: "Maaf, kuota AI Anda tidak cukup untuk melakukan tindakan ini." }]);
          return;
        }
        try {
          const notePayload = { ...aiResponse.note };
          if (!notePayload.title || !notePayload.title.trim()) notePayload.title = deriveNoteTitle(messageContent);
          if (!notePayload.icon) notePayload.icon = '📝';
          if (!notePayload.content || !notePayload.content.trim()) {
            const synthesized = await synthesizeNoteFromMessage(messageContent, shouldUseInternet(messageContent));
            notePayload.content = synthesized?.content || `<h1>${notePayload.title}</h1><p>${messageContent}</p>`;
          }

          const note = await createNoteFromAI(notePayload);

          setMessages((prev) => [...prev, {
            role: 'assistant',
            content: `📝 **Catatan berhasil dibuat!**\n\n${aiResponse.message}\n\n*Catatan "${note.title}" telah disimpan. Buka halaman Notes untuk melihat. Digunakan ${creditsToConsume} kredit.*`
          }]);

          toast.success(`✅ Catatan "${note.title}" berhasil dibuat!`, {
            description: 'Catatan sudah muncul di halaman Notes secara realtime',
            duration: 5000,
            action: {
              label: 'Lihat Notes',
              onClick: () => window.location.href = createPageUrl('Notes')
            }
          });
        } catch (error) {
          console.error('❌ Error creating note:', error);
          setMessages((prev) => [...prev, {
            role: 'assistant',
            content: `❌ Maaf, gagal membuat catatan. Error: ${error.message}`
          }]);
          toast.error('Gagal membuat catatan: ' + error.message);
          creditsToConsume = 0;
        }
      } else {
        creditsToConsume = 1;
        const lower = messageContent.toLowerCase();
        const wantsNoteFromInternet = shouldUseInternet(lower) && /(buat|tulis|buatkan)\s+catatan|catatan|ringkas|rangkuman/.test(lower);

        if (wantsNoteFromInternet) {
          creditsToConsume = 3;
          if (currentAvailableQuota < creditsToConsume) {
            toast.error("Kuota AI tidak cukup untuk membuat catatan dari internet (butuh 3 kredit).");
            setIsLoading(false);
            setMessages((prev) => [...prev, { role: 'assistant', content: "Maaf, kuota AI Anda tidak cukup untuk membuat catatan dari internet." }]);
            return;
          }
          try {
            const title = deriveNoteTitle(messageContent);
            const synthesized = await synthesizeNoteFromMessage(messageContent, true);
            const note = await createNoteFromAI({ title, content: synthesized?.content || `<h1>${title}</h1>`, icon: '📝' });

            setMessages((prev) => [...prev, {
              role: 'assistant',
              content: `📝 **Catatan berhasil dibuat!**\n\nCatatan "${note.title}" telah disimpan berdasarkan hasil riset internet dan akan muncul di halaman Notes. Digunakan ${creditsToConsume} kredit.`
            }]);
            toast.success(`✅ Catatan "${note.title}" berhasil dibuat!`, {
              description: 'Buka halaman Notes untuk melihat detail',
              duration: 5000,
              action: {
                label: 'Lihat Notes',
                onClick: () => window.location.href = createPageUrl('Notes')
              }
            });
          } catch (err) {
            console.error('Auto-note creation failed, falling back to chat response:', err);
            creditsToConsume = 1;
            if (currentAvailableQuota < creditsToConsume) {
              toast.error("Kuota AI tidak cukup untuk memberikan jawaban (butuh 1 kredit).");
              setIsLoading(false);
              setMessages((prev) => [...prev, { role: 'assistant', content: "Maaf, kuota AI Anda tidak cukup untuk memberikan jawaban." }]);
              return;
            }
            setMessages((prev) => [...prev, { role: 'assistant', content: `${aiResponse.message} (Terjadi kesalahan saat membuat catatan, dikonsumsi ${creditsToConsume} kredit untuk respons ini)` }]);
            toast.info("Gagal membuat catatan otomatis, memberikan respons umum. (1 kredit)");
          }
        } else {
          creditsToConsume = 1;
          if (currentAvailableQuota < creditsToConsume) {
            toast.error("Kuota AI tidak cukup untuk menjawab (butuh 1 kredit).");
            setIsLoading(false);
            setMessages((prev) => [...prev, { role: 'assistant', content: "Maaf, kuota AI Anda tidak cukup untuk memberikan jawaban." }]);
            return;
          }
          setMessages((prev) => [...prev, {
            role: 'assistant',
            content: `${aiResponse.message} (Digunakan ${creditsToConsume} kredit)`
          }]);
        }
      }

      if (creditsToConsume > 0) {
        const newUsage = (user?.ai_monthly_usage || 0) + creditsToConsume;
        await base44.auth.updateMe({ ai_monthly_usage: newUsage });
        if (onUpdateUser) {
          onUpdateUser({ ...user, ai_monthly_usage: newUsage });
        }
      }

    } catch (error) {
      console.error("❌ AI Assistant Error:", error);
      toast.error("Maaf, terjadi kesalahan saat menghubungi asisten AI.");
      setMessages((prev) => [...prev, { role: 'assistant', content: "Maaf, saya sedang mengalami gangguan. Silakan coba lagi." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl flex flex-col h-full shadow-lg">
      {/* ✅ COMPACT HEADER */}
      <div className="p-2 sm:p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 text-sm sm:text-base">
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 flex-shrink-0" />
          AI Assistant {selectedCompany && <Badge className="bg-green-600 text-white text-xs ml-1">{selectedCompany.name}</Badge>}
        </h3>

        {/* ✅ WORKSPACE SELECTOR - ALWAYS VISIBLE */}
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            {filteredWorkspaces.length > 0 ? (
              <Select value={selectedWorkspaceId || ''} onValueChange={setSelectedWorkspaceId}>
                <SelectTrigger className="h-8 text-xs bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white flex-1">
                  <SelectValue placeholder="Pilih Workspace..." />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  {filteredWorkspaces.map((ws) => (
                    <SelectItem key={ws.id} value={ws.id} className="text-xs text-gray-900 dark:text-white">
                      {ws.icon} {ws.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex-1 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                  ⚠️ Tidak ada workspace!
                </p>
                <Button
                  size="sm"
                  className="mt-2 h-7 text-xs bg-blue-600 hover:bg-blue-700 w-full"
                  onClick={() => window.location.href = '/workspaces'}
                >
                  Buat Workspace Sekarang
                </Button>
              </div>
            )}
          </div>

          {/* ✅ Selected workspace display */}
          {selectedWorkspaceId && filteredWorkspaces.length > 0 && (
            <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
              <span>📍</span>
              <span>Task/Note akan masuk ke: <strong className="text-blue-600 dark:text-blue-400">{filteredWorkspaces.find(w => w.id === selectedWorkspaceId)?.name}</strong></span>
            </div>
          )}
        </div>

        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          <p>Sisa Kuota: {availableQuota.toLocaleString()}</p>
          <div className="w-full bg-gray-300 dark:bg-gray-600 rounded-full h-1 mt-1">
            <div className="bg-blue-500 h-1 rounded-full transition-all duration-300" style={{ width: `${Math.max(0, 100 - quotaUsedPercentage)}%` }}></div>
          </div>
        </div>
      </div>

      {/* ✅ CHAT AREA - OPTIMIZED HEIGHT */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2 sm:space-y-3" style={{ minHeight: 0 }}>
        <AnimatePresence>
          {messages.map((msg, index) =>
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>

              {msg.role === 'assistant' && <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 flex-shrink-0" />}
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs sm:text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                <ReactMarkdown className="prose prose-sm prose-invert max-w-none [&>p]:my-0 [&>ul]:my-1 [&>li]:my-0">{msg.content}</ReactMarkdown>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* ✅ COMPACT INPUT AREA */}
      <div className="p-2 sm:p-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 space-y-2">
        <div className="flex flex-wrap gap-1 sm:gap-2">
          {suggestionPills.map((pill) =>
            <Button
              key={pill}
              size="sm"
              variant="outline"
              className="text-xs text-gray-300 border-gray-600 hover:bg-gray-700 h-7 px-2"
              onClick={() => handleSendMessage(pill)}>

              {pill}
            </Button>
          )}
        </div>
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(input);
              }
            }}
            placeholder="Ketik perintah atau tanya..."
            className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 resize-none text-xs sm:text-sm"
            rows={2}
            disabled={isLoading || availableQuota <= 0} />

          <Button
            type="button"
            size="icon"
            onClick={handleVoiceInput}
            disabled={isLoading || availableQuota <= 0}
            className={`${isListening ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-gray-600 hover:bg-gray-500'} h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0`}>

            <Mic className="w-3 h-3 sm:w-4 sm:h-4" />
          </Button>
          <Button
            size="icon"
            onClick={() => handleSendMessage(input)}
            disabled={isLoading || !input.trim() || availableQuota <= 0}
            className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">

            {isLoading ? <Loader2 className="animate-spin w-3 h-3 sm:w-4 sm:h-4" /> : <Send className="w-3 h-3 sm:w-4 sm:h-4" />}
          </Button>
        </div>
      </div>
    </div>);

}