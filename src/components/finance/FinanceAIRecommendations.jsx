import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { TrendingUp, AlertCircle, Lightbulb, Loader2, RefreshCw, BarChart as BarChartIcon, Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, subMonths, isAfter } from 'date-fns';

// Skema JSON tidak perlu diubah, karena sudah cukup fleksibel
const analysisSchema = {
    type: "object",
    properties: {
        response_title: { type: "string", description: "Judul singkat dan menarik untuk analisis ini, misal: 'Analisis Keuangan 6 Bulan Terakhir'" },
        response_summary: { type: "string", description: "Ringkasan tekstual 2-3 kalimat dari analisis dalam Bahasa Indonesia, berdasarkan data dan metrik yang diberikan." },
        actionable_insights: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    priority: { type: "string", enum: ["high", "medium", "low"] },
                    title: { type: "string", description: "Judul insight yang bisa ditindaklanjuti." },
                    description: { type: "string", description: "Deskripsi detail dari insight." }
                }
            }
        }
    },
    required: ["response_title", "response_summary", "actionable_insights"]
};

export default function FinanceAIRecommendations({ user, records }) {
    const [analysis, setAnalysis] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [isQuerying, setIsQuerying] = useState(false);
    const [chartType, setChartType] = useState('bar');
    const [timeRange, setTimeRange] = useState('12');

    const processedData = useMemo(() => {
        if (!records || records.length === 0) return [];
        const cutoffDate = subMonths(new Date(), parseInt(timeRange));
        const filteredRecords = records.filter((record) => isAfter(new Date(record.date), cutoffDate));
        const monthlyData = new Map();
        filteredRecords.forEach((record) => {
            const monthKey = format(startOfMonth(new Date(record.date)), 'yyyy-MM');
            if (!monthlyData.has(monthKey)) {
                monthlyData.set(monthKey, { name: format(new Date(monthKey), 'MMM yy'), Pemasukan: 0, Pengeluaran: 0, monthKey: monthKey });
            }
            const data = monthlyData.get(monthKey);
            if (record.type === 'income') data.Pemasukan += record.amount; else data.Pengeluaran += record.amount;
        });
        return Array.from(monthlyData.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
    }, [records, timeRange]);

    const keyMetrics = useMemo(() => {
        if (!processedData || processedData.length === 0) return [];
        const totalIncome = processedData.reduce((sum, data) => sum + data.Pemasukan, 0);
        const totalExpense = processedData.reduce((sum, data) => sum + data.Pengeluaran, 0);
        const netFlow = totalIncome - totalExpense;
        let mostExpensiveMonth = processedData.length > 0 ? processedData.reduce((max, month) => max.Pengeluaran > month.Pengeluaran ? max : month) : null;
        const formatCurrency = (value) => `Rp ${new Intl.NumberFormat('id-ID').format(value)}`;
        return [
            { label: "Total Pemasukan", value: formatCurrency(totalIncome) },
            { label: "Total Pengeluaran", value: formatCurrency(totalExpense) },
            { label: "Arus Kas Bersih", value: formatCurrency(netFlow) },
            { label: "Bulan Terboros", value: mostExpensiveMonth ? mostExpensiveMonth.name : '-' }
        ];
    }, [processedData]);

    // --- BARU: Menyiapkan 20 transaksi mentah terakhir untuk AI ---
    const recentTransactionsForAI = useMemo(() => {
        if (!records || records.length === 0) return [];
        // Mengambil 20 transaksi terakhir dan memformatnya untuk prompt
        return records.slice(-20).map(r =>
            `- Tanggal: ${r.date}, Tipe: ${r.type}, Jumlah: Rp ${r.amount.toLocaleString('id-ID')}, Deskripsi: ${r.description}`
        ).join('\n');
    }, [records]);

    // ✅ API KEYS & HELPERS (Added for Recommendations)
    const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || "";
    const CLAUDE_API_KEY = import.meta.env.VITE_CLAUDE_API_KEY || "";

    const callOpenAI = async (prompt, schema) => {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [{ role: "system", content: "You are a helpful financial analyst." }, { role: "user", content: prompt }],
                response_format: { type: "json_object" },
                temperature: 0.3
            })
        });
        if (!res.ok) throw new Error(`OpenAI Error: ${res.statusText}`);
        const data = await res.json();
        return JSON.parse(data.choices[0].message.content);
    };

    const callClaude = async (prompt, schema) => {
        // Claude fallback: Force JSON in prompt
        const claudePrompt = prompt + "\n\nCRITICAL: OUTPUT MUST BE VALID JSON matching this schema: " + JSON.stringify(schema);
        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-api-key': CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerously-allow-browser': 'true'
            },
            body: JSON.stringify({
                model: "claude-3-5-sonnet-latest",
                max_tokens: 2000,
                messages: [{ role: "user", content: claudePrompt }]
            })
        });
        if (!res.ok) throw new Error(`Claude Error: ${res.statusText}`);
        const data = await res.json();
        const content = data.content[0].text;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    };

    // --- PERBAIKAN: Fungsi `runAIAnalysis` kini menggunakan prompt yang jauh lebih cerdas ---
    const runAIAnalysis = useCallback(async (userQuery = "", showLoader = true) => {
        if (processedData.length === 0) {
            setIsLoading(false); return;
        }
        if (showLoader) userQuery ? setIsQuerying(true) : setIsLoading(true);

        try {
            const dataForPrompt = JSON.stringify(processedData);
            const metricsForPrompt = JSON.stringify(keyMetrics);

            // --- INI ADALAH BAGIAN UTAMA PENINGKATAN KECERDASAN AI ---
            const prompt = `
                Anda adalah TODOIT AI, seorang penasihat keuangan pribadi yang cerdas, empatik, dan proaktif untuk pengguna bernama ${user.full_name}.
                Tugas Anda adalah menganalisis data keuangan pengguna dan menjawab pertanyaan mereka dengan cara yang kontekstual dan bermanfaat.

                Berikut adalah data yang Anda miliki:
                1.  **Ringkasan Keuangan Bulanan (untuk melihat tren):**
                    ${dataForPrompt}

                2.  **Metrik Kunci Akurat (sebagai sumber kebenaran angka):**
                    ${metricsForPrompt}
                
                3.  **Daftar 20 Transaksi Terbaru (untuk detail spesifik):**
                    ${recentTransactionsForAI}

                ---
                PERMINTAAN PENGGUNA: "${userQuery || "Berikan saya analisis umum dan saran untuk keuangan saya saat ini."}"
                ---

                INSTRUKSI:
                -   Jawab pertanyaan pengguna secara langsung dan akurat berdasarkan data yang ada.
                -   Jika pertanyaannya umum (misal: "bagaimana cara mengelola keuangan"), berikan nasihat umum TAPI selipkan contoh yang diambil dari data keuangan pengguna agar terasa personal (misal: "Anda bisa mulai dengan mengurangi pengeluaran di kategori Makanan & Minuman, yang merupakan pengeluaran terbesar Anda bulan lalu sebesar...").
                -   Jika pertanyaannya spesifik tentang data (misal: "keuangan kemarin"), gunakan daftar transaksi terbaru untuk menjawab.
                -   Selalu berikan jawaban yang mendukung, positif, dan mudah ditindaklanjuti.
                -   Gunakan format JSON yang diminta untuk output Anda. Judul dan ringkasan harus sesuai dengan jawaban Anda.
            `;

            // Kita hapus `key_metrics` dari skema karena kini dihitung lokal, AI hanya fokus pada insight
            const { key_metrics, ...schemaWithoutMetrics } = analysisSchema.properties;
            const newSchema = { ...analysisSchema, properties: schemaWithoutMetrics, required: ["response_title", "response_summary", "actionable_insights"] };

            // ✅ EXECUTE AI CALL (OpenAI -> Followed by Claude Fallback)
            let result;
            try {
                result = await callOpenAI(prompt, newSchema);
            } catch (e1) {
                console.warn('⚠️ OpenAI Analysis failed, attempting Claude...', e1);
                try {
                    result = await callClaude(prompt, newSchema);
                } catch (e2) {
                    throw new Error('Semua layanan AI gagal memberikan analisis.');
                }
            }

            // Gabungkan hasil dari AI dengan metrik akurat yang sudah kita hitung
            const finalAnalysis = { ...result, key_metrics: keyMetrics };

            setAnalysis(finalAnalysis);
            localStorage.setItem(`financeAnalysisCache_${timeRange}`, JSON.stringify({ data: processedData, result: finalAnalysis }));
        } catch (error) {
            toast.error("Gagal menghasilkan analisis AI");
            console.error(error);
        } finally {
            if (showLoader) userQuery ? setIsQuerying(false) : setIsLoading(false);
        }
    }, [processedData, keyMetrics, recentTransactionsForAI, timeRange, user.full_name]);

    useEffect(() => {
        const cachedData = localStorage.getItem(`financeAnalysisCache_${timeRange}`);
        if (cachedData) {
            const { data: cachedProcessedData, result } = JSON.parse(cachedData);
            if (JSON.stringify(cachedProcessedData) === JSON.stringify(processedData)) {
                setAnalysis(result);
                setIsLoading(false);
                return;
            }
        }
        runAIAnalysis("", true);
    }, [processedData, timeRange, runAIAnalysis]);

    const handleQuerySubmit = (e) => {
        e.preventDefault();
        if (!query.trim()) return;
        runAIAnalysis(query, true);
        setQuery('');
    };

    // ... Sisa kode (tampilan JSX) tidak ada perubahan sama sekali ...
    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">AI sedang menganalisis keuangan Anda...</p>
                </div>
            </div>
        );
    }

    if (!processedData || processedData.length === 0) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Belum Ada Data Cukup</h3>
                <p className="text-muted-foreground mb-4">
                    Tambahkan transaksi untuk periode yang dipilih untuk melihat analisis.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="text-primary" />
                        Tanyakan Sesuatu Pada AI
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleQuerySubmit} className="flex items-center gap-2">
                        <Textarea value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Contoh: Bagaimana cara saya mengurangi pengeluaran?" rows={1} className="flex-1 resize-none" disabled={isQuerying} />
                        <Button type="submit" size="icon" disabled={!query.trim() || isQuerying}>
                            {isQuerying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex flex-wrap items-center justify-between gap-4">
                        <span className="flex items-center gap-2">
                            <BarChartIcon className="text-blue-500" />
                            Grafik Keuangan
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                            <select value={chartType} onChange={(e) => setChartType(e.target.value)} className="bg-background border rounded-md px-2 py-1 text-sm">
                                <option value="bar">Bar Chart</option>
                                <option value="line">Line Chart</option>
                            </select>
                            <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="bg-background border rounded-md px-2 py-1 text-sm">
                                <option value="6">6 Bulan Terakhir</option>
                                <option value="12">12 Bulan Terakhir</option>
                                <option value="24">24 Bulan Terakhir</option>
                            </select>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        {chartType === 'bar' ? (
                            <BarChart data={processedData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(val)} />
                                <Tooltip cursor={{ fill: 'rgba(100, 116, 139, 0.1)' }} contentStyle={{ backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }} formatter={(val) => `Rp${new Intl.NumberFormat('id-ID').format(val)}`} />
                                <Legend />
                                <Bar dataKey="Pemasukan" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        ) : (
                            <LineChart data={processedData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(val)} />
                                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }} formatter={(val) => `Rp${new Intl.NumberFormat('id-ID').format(val)}`} />
                                <Legend />
                                <Line type="monotone" dataKey="Pemasukan" stroke="#22c55e" strokeWidth={2} activeDot={{ r: 8 }} />
                                <Line type="monotone" dataKey="Pengeluaran" stroke="#ef4444" strokeWidth={2} activeDot={{ r: 8 }} />
                            </LineChart>
                        )}
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {analysis && (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <TrendingUp className="text-blue-500" />
                                    {analysis.response_title}
                                </span>
                                <Button variant="outline" size="sm" onClick={() => runAIAnalysis(query || "", true)} disabled={isQuerying || isLoading}>
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Analisa Ulang
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-muted-foreground">{analysis.response_summary}</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                {analysis.key_metrics?.map((metric, index) => (
                                    <div key={index} className="bg-slate-100 dark:bg-gray-800 p-3 rounded-lg">
                                        <p className="text-sm text-muted-foreground">{metric.label}</p>
                                        <p className="text-lg font-bold">{metric.value}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Lightbulb className="text-yellow-500" />
                                Insight & Rekomendasi
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {analysis.actionable_insights?.map((insight, index) => (
                                    <div key={index} className="border dark:border-gray-700 rounded-lg p-4 space-y-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <h4 className="font-semibold">{insight.title}</h4>
                                            <Badge variant={insight.priority === 'high' ? 'destructive' : insight.priority === 'medium' ? 'secondary' : 'outline'}>
                                                Prioritas {insight.priority}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">{insight.description}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}