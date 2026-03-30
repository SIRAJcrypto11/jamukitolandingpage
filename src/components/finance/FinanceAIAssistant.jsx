import { useState, useRef, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { UploadFile, InvokeLLM, ExtractDataFromUploadedFile } from '@/api/integrations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Paperclip, Loader2, Mic, Send, Camera, FileText, MicOff, Wallet } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { formatRupiah } from '@/components/utils/currencyFormatter';

const monthlyLimits = {
  free: 300, pro: 1500, business: 3000, advanced: 6000, enterprise: 9000
};

export default function FinanceAIAssistant({ user, mode = 'personal', companyId = null, accounts = [], onRecordCreated, onUpdateData }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Halo! Saya asisten keuangan AI Anda. 🧠\n\n💬 **Chat (OFFLINE, 0 kredit)**:\n• "makan 10rb" → otomatis tercatat\n• "gaji 5jt kemarin" → tanggal kemarin\n• "bensin 50rb dan kopi 15rb" → 2 transaksi\n• "bayar listrik 200rb kemarin jam 3 siang"\n\n📄 Upload struk/PDF (butuh kredit AI)\n📷 Foto struk (butuh kredit AI)\n🎤 Voice (butuh kredit AI)\n\n💡 Pilih rekening di bawah sebelum mencatat!' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [customCategories, setCustomCategories] = useState([]);
  const [budgetCategories, setBudgetCategories] = useState([]); // ✅ NEW: Store budget categories for AI Priority
  const [progress, setProgress] = useState(0);
  const [selectedAccountId, setSelectedAccountId] = useState('');

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);

  const monthlyUsage = user?.ai_monthly_usage || 0;
  const addonQuota = user?.ai_addon_quota || 0;
  const totalQuota = (monthlyLimits[user?.subscription_plan || 'free'] || 0) + addonQuota;
  const canUseAI = monthlyUsage < totalQuota;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Update welcome message dynamically based on mode
    if (messages.length === 1) {
      if (mode === 'business') {
        setMessages([{ role: 'assistant', content: `Halo! Saya asisten keuangan AI Anda. 🧠\n\n💬 **Chat (OFFLINE, 0 kredit)**:\n• "makan 10rb" → otomatis tercatat\n• "gaji 5jt kemarin" → tanggal kemarin\n• "bensin 50rb dan kopi 15rb" → 2 transaksi\n• "bayar listrik 200rb kemarin jam 3 siang"\n\n📄 Upload struk/PDF (butuh kredit AI)\n📷 Foto struk (butuh kredit AI)\n🎤 Voice (butuh kredit AI)\n\n💡 Pilih rekening di bawah sebelum mencatat!\n\n🏢 **Mode Bisnis Aktif:** AI secara otomatis memprioritaskan kategori dari tab Anggaran (Budget) Anda.` }]);
      } else {
        setMessages([{ role: 'assistant', content: `Halo! Saya asisten keuangan AI Anda. 🧠\n\n💬 **Chat (OFFLINE, 0 kredit)**:\n• "makan 10rb" → otomatis tercatat\n• "gaji 5jt kemarin" → tanggal kemarin\n• "bensin 50rb dan kopi 15rb" → 2 transaksi\n• "bayar listrik 200rb kemarin jam 3 siang"\n\n📄 Upload struk/PDF (butuh kredit AI)\n📷 Foto struk (butuh kredit AI)\n🎤 Voice (butuh kredit AI)\n\n💡 Pilih rekening di bawah sebelum mencatat!` }]);
      }
    }
  }, [mode]);

  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        try {
          let query = {};
          if (mode === 'business' && companyId) {
            query = { user_id: user.id, mode: 'business', company_id: companyId };
          } else {
            query = { user_id: user.id, mode: 'personal', company_id: null };
          }

          const [cats, budgs] = await Promise.all([
            base44.entities.TransactionCategory.filter(query),
            base44.entities.Budget.filter(query)
          ]);

          console.log(`🏷️ AI Categories loaded for ${mode} mode:`, cats?.length || 0);
          setCustomCategories(cats || []);

          if (budgs) {
            const bCats = budgs.map(b => b.category).filter(Boolean);
            setBudgetCategories([...new Set(bCats)]);
            console.log(`🎯 AI Budget Targets loaded:`, bCats?.length || 0);
          } else {
            setBudgetCategories([]);
          }
        } catch (error) {
          console.error('Error fetching data for AI:', error);
          setCustomCategories([]);
          setBudgetCategories([]);
        }
      }
    };
    fetchData();
  }, [user, mode, companyId]);

  const updateUsage = async (credits) => {
    try {
      const newUsage = (user?.ai_monthly_usage || 0) + credits;
      await base44.auth.updateMe({ ai_monthly_usage: newUsage });
    } catch (error) {
      console.error('Error updating usage:', error);
    }
  };

  const processAndCreateRecords = async (transactions, source) => {
    const isImage = source === 'ai_scan';
    let creditsConsumed = isImage ? 5 : transactions.length;
    const currentAvailableQuota = totalQuota - (user?.ai_monthly_usage || 0);

    if (currentAvailableQuota < creditsConsumed) {
      toast.error(`Gagal mencatat. Butuh ${creditsConsumed} kredit, kuota Anda tidak cukup.`);
      setMessages((prev) => [...prev, { role: 'assistant', content: `Analisis berhasil, ditemukan ${transactions.length} transaksi. Namun kuota tidak cukup untuk mencatat (butuh ${creditsConsumed} kredit).` }]);
      return false;
    }

    const recordsToCreate = transactions.map((tx) => ({
      ...tx,
      user_id: user.id,
      source: source,
      mode: mode,
      company_id: companyId || null,
      account_id: selectedAccountId || null
    }));

    console.log('💾 Creating records:', recordsToCreate.length, '| Mode:', mode, '| Company:', companyId || 'Personal');

    try {
      setProgress(80);
      await base44.entities.FinancialRecord.bulkCreate(recordsToCreate);
      setProgress(100);
      await updateUsage(creditsConsumed);

      try {
        const channel = new BroadcastChannel('snishop_finance_updates');
        channel.postMessage({
          type: 'RECORDS_CREATED',
          companyId: companyId || null,
          mode: mode,
          count: transactions.length,
          timestamp: Date.now()
        });
        channel.close();
        console.log('📡 Finance records broadcasted | Mode:', mode, '| Company:', companyId || 'Personal');
      } catch (e) {
        console.warn('BroadcastChannel error:', e);
      }

      toast.success(`✅ ${transactions.length} transaksi berhasil dicatat!`, {
        description: `${creditsConsumed} kredit AI telah digunakan.`,
        duration: 3000
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: `Sukses! ${transactions.length} transaksi telah dicatat ke mode ${mode}. Digunakan ${creditsConsumed} kredit.` }]);

      // ✅ INSTANT OPTIMISTIC UPDATE: Send data back to parent immediately
      if (onRecordCreated) {
        console.log('⚡ Sending optimistic update to parent...');
        onRecordCreated(recordsToCreate);
      }

      // ✅ Trigger data reload via callback - with small delay for DB consistency
      if (onUpdateData) {
        console.log('📡 Triggering data refresh after DB save...');
        // Small delay to ensure DB has committed the writes
        await new Promise(resolve => setTimeout(resolve, 800)); // Increased slightly to be safe
        console.log('📡 Calling loadData() now...');
        await onUpdateData();
        console.log('✅ Data refresh completed!');
      }

      return true;
    } catch (error) {
      console.error('Error creating records:', error);
      toast.error('Gagal menyimpan transaksi ke database.');
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Maaf, gagal menyimpan ke database. Coba lagi.' }]);
      return false;
    }
  };

  const handleFileUpload = useCallback(async (file) => {
    if (!file) return;

    const currentAvailableQuota = totalQuota - (user?.ai_monthly_usage || 0);
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    const isExcel = file.type.includes('spreadsheet') || file.type.includes('excel') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (!isImage && !isPdf && !isExcel) {
      toast.error('Hanya file gambar (JPG, PNG), PDF, atau Excel yang didukung.');
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Maaf, hanya file gambar (JPG, PNG), PDF, atau Excel yang didukung.' }]);
      return;
    }

    let requiredCredits = isImage ? 5 : 1;
    if (currentAvailableQuota < requiredCredits) {
      toast.error(`Kuota AI tidak cukup. Memindai ${isImage ? 'gambar' : isPdf ? 'PDF' : 'Excel'} butuh minimal ${requiredCredits} kredit.`);
      setMessages((prev) => [...prev, { role: 'assistant', content: `Kuota AI tidak cukup. Butuh minimal ${requiredCredits} kredit.` }]);
      return;
    }

    setIsLoading(true);
    setProgress(10);
    setMessages((prev) => [...prev, { role: 'assistant', content: `Menganalisis file ${file.name}...` }]);

    try {
      setProgress(20);
      const uploadResult = await UploadFile({ file });
      if (!uploadResult?.file_url) throw new Error('Gagal mengunggah file.');
      setProgress(40);

      const jsonSchema = {
        type: "object",
        properties: {
          transactions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                date: {
                  type: "string",
                  format: "date-time",
                  description: "Date in ISO 8601 format (YYYY-MM-DDTHH:mm:ss). Indonesian date format DD/MM/YYYY"
                },
                description: { type: "string" },
                category: { type: "string" },
                amount: { type: "number" },
                type: { type: "string", enum: ["income", "expense"] }
              },
              required: ["date", "description", "amount", "type"]
            }
          }
        }
      };

      const extractionResult = await ExtractDataFromUploadedFile({
        file_url: uploadResult.file_url,
        json_schema: jsonSchema
      });
      setProgress(70);

      if (extractionResult.status !== 'success' || !extractionResult.output?.transactions) {
        throw new Error(extractionResult.details || 'Gagal mengekstrak data dari dokumen.');
      }

      const transactions = extractionResult.output.transactions;
      if (transactions.length === 0) {
        toast.info('Tidak ada transaksi yang ditemukan di dalam dokumen.');
        setIsLoading(false);
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Analisis selesai, namun tidak ada transaksi yang dapat dicatat.' }]);
        return;
      }

      const validatedTransactions = transactions.map((tx) => {
        try {
          const date = new Date(tx.date);
          if (isNaN(date.getTime())) {
            return { ...tx, date: new Date().toISOString() };
          }
          return tx;
        } catch (error) {
          return { ...tx, date: new Date().toISOString() };
        }
      });

      await processAndCreateRecords(validatedTransactions, isImage ? 'ai_scan' : 'ai_text');

    } catch (error) {
      console.error('Gagal memproses file:', error);
      toast.error(error.message || 'Terjadi kesalahan saat memproses file.');
      setMessages((prev) => [...prev, { role: 'assistant', content: `Maaf, terjadi kesalahan: ${error.message}` }]);
    } finally {
      setIsLoading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  }, [user, totalQuota, mode, companyId, onRecordCreated]);

  // ════════════════════════════════════════════════════════════════
  // ✅ SUPER SMART PARSER v2.0 — 100% OFFLINE, 0 CREDIT
  // Deep Indonesian NLP: date/time intelligence, category-first matching,
  // multi-transaction, enhanced amount parsing
  // ════════════════════════════════════════════════════════════════

  // ── HELPER: Parse Amount (shared by single & multi-transaction) ──
  const parseAmount = (str) => {
    const original = str;
    let s = str.toLowerCase().trim();

    // Remove "rp" / "rp." prefix
    s = s.replace(/^rp\.?\s*/i, '');

    // Handle decimal juta: "2.5jt", "2,5jt", "1.5 juta", "2,5 juta"
    const decJtMatch = s.match(/(\d+)[.,](\d+)\s*(?:jt|juta)/i);
    if (decJtMatch) return parseFloat(`${decJtMatch[1]}.${decJtMatch[2]}`) * 1_000_000;

    // Handle integer juta: "5jt", "10juta"
    const intJtMatch = s.match(/(\d+)\s*(?:jt|juta)/i);
    if (intJtMatch) return parseInt(intJtMatch[1]) * 1_000_000;

    // Handle decimal ribu: "2.5rb", "7,5 ribu"
    const decRbMatch = s.match(/(\d+)[.,](\d+)\s*(?:rb|ribu|k)/i);
    if (decRbMatch) return parseFloat(`${decRbMatch[1]}.${decRbMatch[2]}`) * 1_000;

    // Handle integer ribu: "50rb", "10ribu", "150k"
    const intRbMatch = s.match(/(\d+)\s*(?:rb|ribu|k)/i);
    if (intRbMatch) return parseInt(intRbMatch[1]) * 1_000;

    // Indonesian word numbers (longest match first)
    const wordNumbers = {
      'sepuluh juta': 10_000_000, 'lima juta': 5_000_000, 'tiga juta': 3_000_000,
      'dua juta': 2_000_000, 'satu juta': 1_000_000, 'sejuta': 1_000_000,
      'lima ratus ribu': 500_000, 'tiga ratus ribu': 300_000, 'dua ratus ribu': 200_000,
      'seratus ribu': 100_000, 'lima puluh ribu': 50_000, 'empat puluh ribu': 40_000,
      'tiga puluh ribu': 30_000, 'dua puluh ribu': 20_000, 'lima belas ribu': 15_000,
      'sepuluh ribu': 10_000, 'sembilan ribu': 9_000, 'delapan ribu': 8_000,
      'tujuh ribu': 7_000, 'enam ribu': 6_000, 'lima ribu': 5_000,
      'empat ribu': 4_000, 'tiga ribu': 3_000, 'dua ribu': 2_000, 'seribu': 1_000
    };
    for (const [word, val] of Object.entries(wordNumbers)) {
      if (s.includes(word)) return val;
    }

    // Handle "X ribu" with space: "10 ribu" → 10000
    const numRibuMatch = s.match(/(\d+)\s+ribu/i);
    if (numRibuMatch) return parseInt(numRibuMatch[1]) * 1_000;

    // Handle "X juta" with space: "5 juta" → 5000000
    const numJutaMatch = s.match(/(\d+)\s+juta/i);
    if (numJutaMatch) return parseInt(numJutaMatch[1]) * 1_000_000;

    // Handle formatted numbers: "50.000", "1.500.000" (Indonesian dot-separator)
    const formattedMatch = s.match(/(\d{1,3}(?:\.\d{3})+)/)
    if (formattedMatch) {
      return parseInt(formattedMatch[1].replace(/\./g, '')) || 0;
    }

    // Plain number (e.g. "10000", "50000")
    const plainNum = s.match(/\d+/);
    if (plainNum) {
      return parseInt(plainNum[0]) || 0;
    }

    return 0;
  };

  // ── HELPER: Deep Date/Time Intelligence ──
  const parseDateTime = (text) => {
    const now = new Date();
    const lower = text.toLowerCase();
    let resultDate = new Date(now); // default = now
    let dateModified = false;

    // ── RELATIVE DATE ──
    if (lower.includes('kemarin') || lower.includes('kemaren')) {
      resultDate.setDate(resultDate.getDate() - 1);
      dateModified = true;
    } else if (lower.includes('lusa') || lower.match(/2\s*hari\s*(?:yang\s*)?lalu/) || lower.includes('dua hari lalu')) {
      resultDate.setDate(resultDate.getDate() - 2);
      dateModified = true;
    } else if (lower.match(/3\s*hari\s*(?:yang\s*)?lalu/) || lower.includes('tiga hari lalu')) {
      resultDate.setDate(resultDate.getDate() - 3);
      dateModified = true;
    } else {
      // Generic "X hari lalu" / "X hari yang lalu"
      const nDaysAgo = lower.match(/(\d+)\s*hari\s*(?:yang\s*)?lalu/);
      if (nDaysAgo) {
        resultDate.setDate(resultDate.getDate() - parseInt(nDaysAgo[1]));
        dateModified = true;
      }
    }

    // "minggu lalu" / "seminggu lalu"
    if (lower.includes('minggu lalu') || lower.includes('seminggu lalu') || lower.includes('seminggu yang lalu')) {
      resultDate.setDate(resultDate.getDate() - 7);
      dateModified = true;
    }

    // "bulan lalu" / "sebulan lalu"
    if (lower.includes('bulan lalu') || lower.includes('sebulan lalu') || lower.includes('sebulan yang lalu')) {
      resultDate.setMonth(resultDate.getMonth() - 1);
      dateModified = true;
    }

    // "tadi" / "barusan" = today (already default)
    if (lower.includes('tadi') || lower.includes('barusan') || lower.includes('baru saja')) {
      dateModified = true; // keep today
    }

    // ── ABSOLUTE DATE: "tanggal 15" / "tgl 1" ──
    const tglMatch = lower.match(/(?:tanggal|tgl|tg)\s*(\d{1,2})/);
    if (tglMatch) {
      const day = parseInt(tglMatch[1]);
      if (day >= 1 && day <= 31) {
        // If "bulan lalu tanggal X", the month is already adjusted
        resultDate.setDate(day);
        dateModified = true;
      }
    }

    // Full date: "20 Februari", "5 Maret 2026"
    const monthNames = {
      'januari': 0, 'jan': 0, 'februari': 1, 'feb': 1, 'maret': 2, 'mar': 2,
      'april': 3, 'apr': 3, 'mei': 4, 'juni': 5, 'jun': 5, 'juli': 6, 'jul': 6,
      'agustus': 7, 'ags': 7, 'agu': 7, 'september': 8, 'sep': 8, 'sept': 8,
      'oktober': 9, 'okt': 9, 'november': 10, 'nov': 10, 'desember': 11, 'des': 11
    };
    for (const [mName, mIdx] of Object.entries(monthNames)) {
      const fullDateMatch = lower.match(new RegExp(`(\\d{1,2})\\s+${mName}(?:\\s+(\\d{4}))?`));
      if (fullDateMatch) {
        const day = parseInt(fullDateMatch[1]);
        const year = fullDateMatch[2] ? parseInt(fullDateMatch[2]) : now.getFullYear();
        resultDate = new Date(year, mIdx, day);
        dateModified = true;
        break;
      }
    }

    // ── TIME PARSING ──
    // "jam 3 siang" → 15:00, "jam 10 pagi" → 10:00, "jam 8 malam" → 20:00
    const jamMatch = lower.match(/jam\s*(\d{1,2})(?:\.(\d{1,2}))?\s*(pagi|siang|sore|malam|subuh)?/);
    if (jamMatch) {
      let hour = parseInt(jamMatch[1]);
      const minutes = jamMatch[2] ? parseInt(jamMatch[2]) : 0;
      const period = jamMatch[3];

      if (period === 'siang' && hour < 12) hour += 12; // jam 3 siang → 15
      if (period === 'sore' && hour < 12) hour += 12; // jam 4 sore → 16
      if (period === 'malam' && hour < 12) hour += 12; // jam 8 malam → 20
      if (period === 'pagi' && hour === 12) hour = 0; // jam 12 pagi → 0
      if (period === 'subuh' && hour > 6) hour = hour; // subuh = 3-5

      resultDate.setHours(hour, minutes, 0, 0);
    } else if (!jamMatch) {
      // Contextual time words without "jam"
      if (lower.includes('tadi pagi') || lower.includes('pagi ini') || lower.includes('pagi tadi')) {
        resultDate.setHours(8, 0, 0, 0);
      } else if (lower.includes('tadi siang') || lower.includes('siang ini') || lower.includes('siang tadi')) {
        resultDate.setHours(12, 0, 0, 0);
      } else if (lower.includes('tadi sore') || lower.includes('sore ini') || lower.includes('sore tadi')) {
        resultDate.setHours(16, 0, 0, 0);
      } else if (lower.includes('tadi malam') || lower.includes('malam ini') || lower.includes('malam tadi') || lower.includes('semalam')) {
        resultDate.setHours(20, 0, 0, 0);
      } else if (lower.includes('subuh')) {
        resultDate.setHours(4, 30, 0, 0);
      }
    }

    return resultDate.toISOString();
  };

  // ── HELPER: Detect Type ──
  const detectType = (lower) => {
    const incomeKeywords = ['gaji', 'terima', 'dapat', 'masuk', 'pemasukan', 'pendapatan', 'bayaran', 'bonus', 'transfer masuk', 'penjualan', 'laba', 'untung', 'revenue', 'income', 'fee', 'komisi', 'dividen', 'hadiah', 'cashback', 'honor', 'honorarium', 'thr', 'refund'];
    const expenseKeywords = ['beli', 'bayar', 'keluar', 'pengeluaran', 'belanja', 'makan', 'buat', 'sewa', 'biaya', 'ongkos', 'parkir', 'bensin', 'listrik', 'air', 'pulsa', 'internet', 'transport', 'ojol', 'grab', 'gojek', 'laundry', 'langganan', 'cicilan', 'utang', 'kredit', 'tagihan', 'iuran', 'donasi', 'sedekah', 'infaq', 'zakat', 'pajak', 'grocery', 'expense', 'jajan', 'kopi', 'cemilan', 'snack', 'rokok', 'obat', 'dokter', 'rumah sakit', 'rs', 'tiket', 'hotel', 'jalan-jalan', 'wisata', 'top up', 'topup', 'isi ulang', 'service', 'servis'];

    let type = 'expense'; // default
    for (const kw of incomeKeywords) {
      if (lower.includes(kw)) { type = 'income'; break; }
    }
    // Expense keywords override if at start or explicit
    for (const kw of expenseKeywords) {
      if (lower.startsWith(kw) || lower.includes('beli') || lower.includes('bayar')) {
        type = 'expense'; break;
      }
    }
    return type;
  };

  // ── HELPER: Detect Category ──
  const detectCategory = (lower, detectedType) => {
    const categoryMap = {
      'Makanan & Minuman': ['makan', 'minum', 'kopi', 'jajan', 'cemilan', 'snack', 'sarapan', 'nasi', 'bakso', 'mie', 'ayam', 'ikan', 'sayur', 'buah', 'resto', 'restaurant', 'warteg', 'warung', 'cafe', 'starbucks', 'kfc', 'mcd', 'pizza', 'burger', 'roti', 'es', 'teh', 'juice', 'susu', 'gorengan', 'sate', 'soto', 'rawon', 'pecel', 'gudeg', 'rendang', 'martabak', 'indomie', 'nongkrong'],
      'Transportasi': ['bensin', 'bbm', 'solar', 'pertalite', 'pertamax', 'transport', 'ojol', 'grab', 'gojek', 'uber', 'taxi', 'taksi', 'bus', 'kereta', 'mrt', 'lrt', 'krl', 'tol', 'parkir', 'angkot', 'ojek', 'tiket pesawat', 'tiket kereta', 'maxim', 'ongkir', 'pengiriman'],
      'Belanja': ['belanja', 'shopping', 'tokopedia', 'shopee', 'lazada', 'bukalapak', 'blibli', 'toko', 'mall', 'pasar', 'minimarket', 'indomaret', 'alfamart', 'supermarket', 'hypermart'],
      'Tagihan & Utilitas': ['listrik', 'air', 'pdam', 'gas', 'pln', 'pulsa', 'paket data', 'internet', 'wifi', 'indihome', 'telkom', 'iuran', 'ipkl', 'sampah', 'keamanan', 'token listrik'],
      'Kesehatan': ['obat', 'dokter', 'rumah sakit', 'rs', 'apotek', 'farmasi', 'vitamin', 'supplement', 'bpjs', 'asuransi kesehatan', 'klinik', 'lab', 'rawat'],
      'Hiburan': ['nonton', 'bioskop', 'film', 'game', 'musik', 'spotify', 'netflix', 'youtube premium', 'disney', 'langganan', 'subscription', 'konser', 'wisata', 'jalan-jalan', 'hotel', 'airbnb', 'liburan', 'piknik', 'rekreasi'],
      'Pendidikan': ['buku', 'kursus', 'les', 'sekolah', 'kuliah', 'spp', 'pelatihan', 'sertifikasi', 'seminar', 'workshop', 'udemy', 'coursera', 'tutor'],
      'Gaji & Pendapatan': ['gaji', 'salary', 'pendapatan', 'pemasukan', 'honor', 'honorarium', 'bonus', 'thr', 'upah', 'fee karyawan', 'insentif', 'pekerja'],
      'Operasional': ['operasional', 'ops', 'opr'],
      'Modal': ['modal', 'investasi awal', 'capex', 'aset'],
      'Transfer': ['transfer', 'kirim', 'tf'],
      'Cicilan & Hutang': ['cicilan', 'kredit', 'utang', 'hutang', 'angsuran', 'pinjaman', 'kpr', 'kta'],
      'Sedekah & Donasi': ['sedekah', 'infaq', 'zakat', 'donasi', 'sumbangan', 'amal', 'infak'],
      'Laundry & Kebersihan': ['laundry', 'cuci', 'dry clean', 'setrika'],
      'Rokok & Lainnya': ['rokok', 'vape']
    };

    let category = 'Lainnya';
    let matchedType = detectedType;

    // PRIORITY 0: Exact Match against Budget Categories (Highest Priority for Company)
    for (const bCatName of budgetCategories) {
      const bCatLower = bCatName.toLowerCase();
      if (lower.includes(bCatLower)) {
        category = bCatName;
        const matchedCustomCat = customCategories.find(c => c.name.toLowerCase() === bCatLower);
        if (matchedCustomCat) matchedType = matchedCustomCat.type;
        return { category, type: matchedType };
      }
    }

    // PRIORITY 0.5: Word-level match against Budget Categories
    for (const bCatName of budgetCategories) {
      const catWords = bCatName.toLowerCase().split(/\s+/);
      for (const word of catWords) {
        if (word.length >= 3 && lower.includes(word)) {
          category = bCatName;
          const matchedCustomCat = customCategories.find(c => c.name.toLowerCase() === bCatName.toLowerCase());
          if (matchedCustomCat) matchedType = matchedCustomCat.type;
          return { category, type: matchedType };
        }
      }
    }

    // PRIORITY 1: Exact match against user's custom categories
    for (const cat of customCategories) {
      const catLower = cat.name.toLowerCase();
      if (lower.includes(catLower)) {
        category = cat.name;
        if (cat.type === 'income' || cat.type === 'expense') matchedType = cat.type;
        return { category, type: matchedType };
      }
    }

    // PRIORITY 2: Word-level fuzzy match against custom categories
    // e.g. user has category "Operasional" and text contains "operasional"
    // or user has "Bahan Baku" and text contains "bahan"
    for (const cat of customCategories) {
      const catWords = cat.name.toLowerCase().split(/\s+/);
      for (const word of catWords) {
        if (word.length >= 3 && lower.includes(word)) {
          category = cat.name;
          if (cat.type === 'income' || cat.type === 'expense') matchedType = cat.type;
          return { category, type: matchedType };
        }
      }
    }

    // PRIORITY 3: Built-in category map
    for (const [catName, keywords] of Object.entries(categoryMap)) {
      for (const kw of keywords) {
        if (lower.includes(kw)) {
          return { category: catName, type: matchedType };
        }
      }
    }

    return { category, type: matchedType };
  };

  // ── HELPER: Clean Description ──
  const cleanDescription = (text) => {
    let desc = text
      .replace(/rp\.?\s*/gi, '')
      .replace(/\d+[.,]\d+\s*(?:jt|juta|rb|ribu|k)/gi, '') // "2.5jt"
      .replace(/\d+\s*(?:ribu|rb|k|juta|jt)/gi, '') // "10rb"
      .replace(/\d{1,3}(?:\.\d{3})+/g, '') // "50.000"
      .replace(/\d{4,}/g, '') // "50000"
      .replace(/\b(?:kemarin|kemaren|lusa|tadi|barusan|baru saja|pagi|siang|sore|malam|subuh)\b/gi, '')
      .replace(/\b(?:jam\s*\d+(?:\.\d+)?\s*(?:pagi|siang|sore|malam|subuh)?)\b/gi, '')
      .replace(/\b(?:tanggal|tgl|tg)\s*\d+/gi, '')
      .replace(/\b\d+\s*hari\s*(?:yang\s*)?lalu\b/gi, '')
      .replace(/\b(?:minggu|seminggu|bulan|sebulan)\s*(?:yang\s*)?lalu\b/gi, '')
      .replace(/\b(?:dan|\&|\+)\b/gi, '') // multi-tx delimiters
      .replace(/^\s*(?:beli|bayar|dapat|terima)\s*/i, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (!desc || desc.length < 2) desc = text.trim();
    return desc.charAt(0).toUpperCase() + desc.slice(1);
  };

  // ── MAIN: superSmartParser with multi-transaction support ──
  const superSmartParser = (text) => {
    const lower = text.toLowerCase().trim();

    // ── STEP 1: Check for multi-transaction ──
    // Split by "dan", "&", "+", "," delimiter when EACH segment has an amount
    const multiDelimiterRegex = /\s+(?:dan|\&)\s+|\s*\+\s*|\s*,\s+/gi;
    const segments = text.split(multiDelimiterRegex).filter(s => s.trim().length > 0);

    // Only treat as multi-transaction if:
    // - More than 1 segment
    // - EACH segment contains a number (amount)
    const isMulti = segments.length > 1 && segments.every(seg => /\d/.test(seg));

    if (isMulti) {
      console.log(`🧠 MULTI-TRANSACTION DETECTED: ${segments.length} segments`);
      const transactions = [];
      // Parse shared date from the full text
      const sharedDate = parseDateTime(text);

      for (const segment of segments) {
        const segLower = segment.toLowerCase().trim();
        const amount = parseAmount(segment);
        if (amount <= 0) continue;

        const detectedType = detectType(segLower);
        const { category, type } = detectCategory(segLower, detectedType);
        const description = cleanDescription(segment);

        transactions.push({
          type,
          amount,
          category,
          description,
          date: sharedDate
        });
      }

      if (transactions.length > 0) {
        console.log(`🧠 MULTI-TX SUCCESS: ${transactions.length} transactions parsed`);
        return { transactions };
      }
    }

    // ── STEP 2: Single transaction parse ──
    const amount = parseAmount(text);
    if (amount <= 0) return null; // Cannot parse → fall through to AI

    const detectedType = detectType(lower);
    const { category, type } = detectCategory(lower, detectedType);
    const description = cleanDescription(text);
    const date = parseDateTime(text);

    console.log(`🧠 LOCAL PARSER: type=${type}, amount=${amount}, category=${category}, desc="${description}", date=${date}`);
    return {
      transactions: [{
        type,
        amount,
        category,
        description,
        date
      }]
    };
  };


  const handleSendMessage = async () => {
    const userMessage = input.trim();
    if (!userMessage || isLoading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      setProgress(20);

      // ════════════════════════════════════════════════════════════
      // 🧠 STEP 1: TRY LOCAL PARSER FIRST (0 credits, INSTANT)
      // ════════════════════════════════════════════════════════════
      let parsedResult = null;
      try {
        parsedResult = superSmartParser(userMessage);
        if (parsedResult && parsedResult.transactions?.length > 0 && parsedResult.transactions.every(tx => tx.amount > 0)) {
          console.log(`🧠 LOCAL PARSER SUCCESS (0 credits): ${parsedResult.transactions.length} transaction(s)`, parsedResult);
          setProgress(60);
        } else {
          parsedResult = null; // Reset if parser couldn't extract amount
        }
      } catch (parserError) {
        console.warn('⚠️ Local parser error:', parserError.message);
        parsedResult = null;
      }

      // ════════════════════════════════════════════════════════════
      // 🤖 STEP 2: IF LOCAL FAILS, TRY AI (uses credits)
      // ════════════════════════════════════════════════════════════
      if (!parsedResult) {
        if (!canUseAI) {
          toast.error('Parser lokal gagal dan kredit AI habis! Coba format: "beli makan 10 ribu" atau "gaji 5jt"');
          setMessages((prev) => [...prev, { role: 'assistant', content: '⚠️ Saya gagal parsing otomatis dan kredit AI habis.\n\nCoba format yang lebih jelas:\n• "beli makan 10 ribu"\n• "bensin 50rb"\n• "dapat gaji 5jt"\n• "bayar listrik 200000"' }]);
          setProgress(0);
          return;
        }

        console.log('🤖 Local parser failed, trying AI...');
        setProgress(40);

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const currentDay = currentDate.getDate();

        const fullPrompt = `Kamu adalah asisten keuangan AI cerdas. Tanggal HARI INI adalah ${currentDay} ${getMonthName(currentMonth)} ${currentYear}.

TUGAS UTAMA:
1. Parse tanggal (HARI INI: ${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')})
2. Ekstrak data transaksi: type (income/expense), amount, category, description.
3. KATEGORI ANGGARAN (PRIORITAS): Jika ini pengeluaran, 90% harus menggunakan salah satu kategori anggaran berikut jika sesuai konteks:
   ${budgetCategories.length > 0 ? budgetCategories.map(c => `- ${c}`).join('\n   ') : '(Belum ada anggaran)'}
4. JANGAN buat kategori baru jika ada yang mirip di daftar kategori user.

DAFTAR KATEGORI USER KESELURUHAN:
${customCategories.length > 0 ? customCategories.map(c => `- ${c.name} (${c.type})`).join('\n') : '(Belum ada, gunakan umum)'}

OUTPUT FORMAT (JSON ONLY):
{
  "transactions": [
    {
      "type": "income/expense",
      "amount": number,
      "category": "string (Matches user list if possible)",
      "description": "string",
      "date": "YYYY-MM-DDTHH:mm:ss"
    }
  ]
}

Pesan user: ${userMessage}`;

        try {
          const response = await InvokeLLM({
            prompt: fullPrompt,
            response_json_schema: {
              type: 'object',
              properties: {
                transactions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string', enum: ['income', 'expense'] },
                      amount: { type: 'number' },
                      category: { type: 'string' },
                      description: { type: 'string' },
                      date: { type: 'string' }
                    },
                    required: ['type', 'amount', 'category', 'description', 'date']
                  }
                }
              }
            }
          });
          parsedResult = response;
          console.log('🤖 AI SUCCESS:', parsedResult);
        } catch (aiError) {
          console.error('❌ AI juga gagal:', aiError.message);
          toast.error('Parser lokal & AI gagal. Coba format: "beli makan 10 ribu"');
          setMessages((prev) => [...prev, { role: 'assistant', content: '❌ Semua layanan gagal. Coba format yang lebih sederhana:\n• "beli makan 10 ribu"\n• "bensin 50rb"\n• "gaji 5jt"' }]);
          setProgress(0);
          return;
        }
      }

      // ════════════════════════════════════════════════════════════
      // ✅ STEP 3: PROCESS RESULT
      // ════════════════════════════════════════════════════════════
      const transactions = parsedResult?.transactions || [];
      console.log('📊 Final transactions:', transactions);

      if (transactions.length === 0) {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Maaf, saya tidak menemukan transaksi dari pesan Anda. Coba sebutkan dengan lebih jelas: jenis transaksi, jumlah, dan tanggalnya.' }]);
        setProgress(0);
        return;
      }

      const validatedTransactions = transactions.map((tx) => {
        let finalDate = tx.date;
        try {
          const parsedDate = new Date(finalDate);
          if (isNaN(parsedDate.getTime())) {
            finalDate = new Date().toISOString();
            console.warn('⚠️ Invalid date, using today:', finalDate);
          } else {
            finalDate = parsedDate.toISOString();
          }
        } catch (e) {
          finalDate = new Date().toISOString();
        }
        return { ...tx, date: finalDate };
      });

      console.log('✅ Validated transactions with dates:', validatedTransactions);
      await processAndCreateRecords(validatedTransactions, 'ai_text');
      setProgress(0);

    } catch (error) {
      console.error('❌ Error in Finance AI handleSendMessage:', error);
      toast.error('Gagal memproses pesan: ' + (error.message || 'Unknown error'));
      setMessages((prev) => [...prev, { role: 'assistant', content: `Maaf, terjadi kesalahan: ${error.message || 'Unknown error'}` }]);
      setProgress(0);
    } finally {
      setIsLoading(false);
    }
  };

  const getMonthName = (month) => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    return months[month - 1] || months[0];
  };

  const handleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Browser tidak mendukung voice recognition.");
      return;
    }

    try {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'id-ID';
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        toast.info('🎤 Mulai berbicara...', { duration: 2000 });
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      };

      recognitionRef.current.onerror = (event) => {
        setIsListening(false);
        const errorMessages = {
          'no-speech': 'Tidak ada suara terdeteksi. Coba lagi.',
          'audio-capture': 'Microphone tidak terdeteksi.',
          'not-allowed': 'Akses microphone ditolak. Aktifkan di browser.'
        };
        toast.error(errorMessages[event.error] || 'Error: ' + event.error);
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      };

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        toast.success('✅ Terdeteksi: "' + transcript + '"');

        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (transcript.trim()) handleSendMessage();
        }, 2000);
      };

      recognitionRef.current.start();
    } catch (error) {
      toast.error('Gagal memulai voice recognition');
      setIsListening(false);
    }
  };

  const openFileDialog = () => {
    if (isLoading || !canUseAI) {
      if (!canUseAI) toast.error("Kuota AI habis.");
      return;
    }
    fileInputRef.current?.click();
  };

  const openCameraDialog = () => {
    if (isLoading || !canUseAI) {
      if (!canUseAI) toast.error("Kuota AI habis.");
      return;
    }
    cameraInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
      e.target.value = null;
    }
  };

  const quotaPercentage = monthlyUsage / totalQuota * 100;

  return (
    <Card className="bg-gray-900/50 border-gray-800 h-full flex flex-col overflow-hidden">
      <CardHeader className="border-b border-gray-800 p-1.5 sm:p-2 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-white flex items-center gap-1.5 text-xs sm:text-sm">
            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400 flex-shrink-0" />
            Asisten Keuangan AI
          </CardTitle>
          <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30 text-xs h-4 px-1.5">
            {((totalQuota - monthlyUsage) / 1000).toFixed(1)}K / {(totalQuota / 1000).toFixed(1)}K
          </Badge>
        </div>
        <Progress value={quotaPercentage} className="h-0.5 mt-1" />
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-1.5 sm:p-2 gap-2" style={{ minHeight: 0 }}>
        <div className="flex-1 overflow-y-auto space-y-2 p-2 bg-gray-800/30 rounded-lg" style={{ minHeight: 0, maxHeight: '100%' }}>
          {messages.map((msg, index) =>
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`rounded-lg px-2.5 py-1.5 max-w-[85%] text-xs ${msg.role === 'user' ?
                'bg-blue-600 text-white' :
                'bg-gray-800 text-gray-200 border border-gray-700'}`
              }>
                <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          )}
          {isLoading &&
            <div className="flex flex-col items-start gap-1.5">
              <div className="rounded-lg px-2.5 py-1.5 bg-gray-800 border border-gray-700">
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              </div>
              {progress > 0 &&
                <div className="w-full">
                  <Progress value={progress} className="h-1" />
                  <p className="text-xs text-center mt-0.5 text-gray-400">{Math.round(progress)}%</p>
                </div>
              }
            </div>
          }
          <div ref={messagesEndRef} />
        </div>

        <div className="flex-shrink-0 space-y-1.5">
          {/* Account Selector */}
          <div className="flex items-center gap-2 p-2 bg-gray-800/50 rounded-lg border border-gray-700">
            <Wallet className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <Select
              value={selectedAccountId}
              onValueChange={setSelectedAccountId}
            >
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-xs h-7 flex-1">
                <SelectValue placeholder="Pilih rekening untuk mencatat" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                {accounts && accounts.length > 0 ? (
                  accounts.filter(a => a.is_active).map(account => (
                    <SelectItem key={account.id} value={account.id} className="text-white text-xs">
                      {account.icon} {account.name} - {formatRupiah(account.calculated_balance || 0)}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-account" disabled className="text-gray-400 text-xs">
                    Belum ada rekening. Buat di tab Rekening
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ketik: 'makan 10rb' atau 'gaji 5jt kemarin' (OFFLINE, 0 kredit)"
              className="pr-9 bg-gray-800 border-gray-700 text-white resize-none text-xs"
              rows={2}
              disabled={isLoading} />

            <Button
              variant="ghost"
              size="icon"
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim()}
              className="absolute right-0.5 bottom-0.5 text-blue-400 hover:bg-gray-700 h-6 w-6">

              <Send className="w-3 h-3" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={openFileDialog}
              disabled={isLoading || !canUseAI}
              className="border-gray-700 text-gray-300 text-xs h-6 px-1.5">

              <Paperclip className="w-3 h-3 mr-1" />
              File
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={openCameraDialog}
              disabled={isLoading || !canUseAI}
              className="border-gray-700 text-gray-300 text-xs h-6 px-1.5">

              <Camera className="w-3 h-3 mr-1" />
              Foto
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleVoiceInput}
              disabled={isLoading || !canUseAI}
              className={`border-gray-700 text-xs h-6 px-1.5 ${isListening ? 'bg-red-600 text-white animate-pulse' : 'text-gray-300'}`}>

              {isListening ? <MicOff className="w-3 h-3 mr-1" /> : <Mic className="w-3 h-3 mr-1" />}
              Voice
            </Button>
          </div>

          {!canUseAI &&
            <p className="text-yellow-500 text-xs text-center">
              ⚡ Kredit AI habis. Chat teks tetap bisa (offline, 0 kredit). File/Foto/Voice butuh kredit.
            </p>
          }
        </div>
      </CardContent>

      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        accept="image/*,application/pdf,.xlsx,.xls"
        className="hidden" />

      <input
        ref={cameraInputRef}
        type="file"
        capture="environment"
        onChange={handleFileChange}
        accept="image/*"
        className="hidden" />

    </Card>);

}
