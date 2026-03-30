import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Send, Loader2, CheckCircle, FileText, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { base44 } from '@/api/base44Client';

const { Invoice, FinancialRecord, Customer } = base44.entities;

export default function InvoiceAIAssistant({ selectedCompany, currentUser, onInvoiceCreated, customers }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `👋 Halo! Saya AI Assistant untuk Invoice.\n\n**Saya bisa bantu:**\n- Buat invoice otomatis dari deskripsi\n- Catat ke keuangan perusahaan\n- Track pembayaran customer\n- Reminder invoice jatuh tempo\n\n**Contoh:** *"Buatkan invoice untuk PT ABC senilai 5 juta untuk jasa konsultasi website, jatuh tempo 30 hari"*`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `INV-${year}${month}-${random}`;
  };

  const createFinancialRecord = async (invoice, paymentInfo) => {
    try {
      const record = {
        company_id: selectedCompany.id,
        type: 'income',
        amount: paymentInfo.amount,
        category: 'Penjualan',
        description: `${paymentInfo.memo} - Invoice #${invoice.invoice_number} - ${invoice.customer_name}`,
        date: new Date().toISOString(),
        source: 'ai_invoice',
        mode: 'business'
      };

      await FinancialRecord.create(record);
      return true;
    } catch (error) {
      console.error('Error creating financial record:', error);
      return false;
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Use direct base44 usage
      const InvokeLLM = base44.integrations.Core.InvokeLLM;

      const now = new Date();
      const contextPrompt = `Anda adalah AI Assistant untuk pembuatan invoice profesional.

**KONTEKS:**
- Perusahaan: ${selectedCompany.name}
- User: ${currentUser.full_name}
- Tanggal: ${now.toLocaleDateString('id-ID')}

**PERMINTAAN USER:** "${input}"

**TUGAS ANDA:**
Analisis permintaan dan tentukan apakah user ingin:
1. Membuat invoice baru
2. Update status pembayaran invoice
3. Informasi umum tentang invoice

**JIKA MEMBUAT INVOICE BARU:**
Response JSON:
\`\`\`json
{
  "action": "create_invoice",
  "invoice": {
    "customer_name": "Nama customer",
    "customer_email": "email@customer.com",
    "customer_phone": "081234567890",
    "customer_address": "Alamat lengkap",
    "items": [
      {
        "description": "Deskripsi item/jasa",
        "quantity": 1,
        "unit_price": 5000000,
        "total": 5000000
      }
    ],
    "subtotal": 5000000,
    "tax_percentage": 11,
    "tax_amount": 550000,
    "discount_percentage": 0,
    "discount_amount": 0,
    "total": 5550000,
    "due_days": 30,
    "notes": "Catatan tambahan",
    "terms": "Syarat & ketentuan pembayaran"
  },
  "message": "Konfirmasi pembuatan invoice"
}
\`\`\`

**JIKA UPDATE PEMBAYARAN:**
Response JSON:
\`\`\`json
{
  "action": "record_payment",
  "payment": {
    "invoice_number": "INV-xxx",
    "amount": 2500000,
    "percentage": 50,
    "memo": "Pembayaran DP 50%",
    "payment_date": "2024-01-15"
  },
  "message": "Konfirmasi pencatatan pembayaran"
}
\`\`\`

**JIKA CHAT BIASA:**
\`\`\`json
{
  "action": "chat_response",
  "message": "Jawaban yang membantu"
}
\`\`\`

**ATURAN PENTING:**
- Hitung PPN 11% jika tidak disebutkan
- Default jatuh tempo 30 hari
- Extract semua detail dari permintaan user
- Gunakan format Rupiah untuk harga`;

      const response = await InvokeLLM({
        prompt: contextPrompt,
        add_context_from_internet: false,
        response_json_schema: {
          type: 'object',
          properties: {
            action: { type: 'string' },
            invoice: { type: 'object' },
            payment: { type: 'object' },
            message: { type: 'string' }
          },
          required: ['action', 'message']
        }
      });

      let aiResponse = typeof response === 'string' ? JSON.parse(response) : response;

      if (aiResponse.action === 'create_invoice' && aiResponse.invoice) {
        try {
          const invoiceNumber = generateInvoiceNumber();
          const issueDate = new Date().toISOString();
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + (aiResponse.invoice.due_days || 30));

          const invoiceData = {
            company_id: selectedCompany.id,
            invoice_number: invoiceNumber,
            invoice_type: 'invoice',
            customer_name: aiResponse.invoice.customer_name,
            customer_email: aiResponse.invoice.customer_email || '',
            customer_phone: aiResponse.invoice.customer_phone || '',
            customer_address: aiResponse.invoice.customer_address || '',
            issue_date: issueDate,
            due_date: dueDate.toISOString(),
            items: aiResponse.invoice.items,
            subtotal: aiResponse.invoice.subtotal,
            tax_percentage: aiResponse.invoice.tax_percentage || 11,
            tax_amount: aiResponse.invoice.tax_amount,
            discount_percentage: aiResponse.invoice.discount_percentage || 0,
            discount_amount: aiResponse.invoice.discount_amount || 0,
            total: aiResponse.invoice.total,
            notes: aiResponse.invoice.notes || '',
            terms: aiResponse.invoice.terms || 'Pembayaran dilakukan sesuai tanggal jatuh tempo',
            status: 'sent',
            paid_amount: 0
          };

          const createdInvoice = await Invoice.create(invoiceData);
          const fullInvoiceData = { ...invoiceData, id: createdInvoice?.id || Date.now() };

          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `✅ **Invoice berhasil dibuat!**\n\n${aiResponse.message}\n\n📄 **Invoice #${invoiceNumber}**\n💰 Total: Rp ${aiResponse.invoice.total.toLocaleString('id-ID')}\n📅 Jatuh Tempo: ${dueDate.toLocaleDateString('id-ID')}\n\nInvoice telah tersimpan dan siap dikirim ke customer.`
          }]);

          toast.success(`Invoice #${invoiceNumber} berhasil dibuat!`);
          if (onInvoiceCreated) onInvoiceCreated(fullInvoiceData);

        } catch (error) {
          console.error('Error creating invoice:', error);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: '❌ Maaf, gagal membuat invoice. Silakan coba lagi atau buat manual.'
          }]);
          toast.error('Gagal membuat invoice');
        }

      } else if (aiResponse.action === 'record_payment' && aiResponse.payment) {
        try {
          // Find invoice
          const invoices = await Invoice.filter({
            company_id: selectedCompany.id,
            invoice_number: aiResponse.payment.invoice_number
          });

          if (invoices.length === 0) {
            throw new Error('Invoice tidak ditemukan');
          }

          const invoice = invoices[0];
          const newPaidAmount = (invoice.paid_amount || 0) + aiResponse.payment.amount;
          const newStatus = newPaidAmount >= invoice.total ? 'paid' : 'sent';

          // Update invoice
          await Invoice.update(invoice.id, {
            paid_amount: newPaidAmount,
            status: newStatus,
            paid_date: newPaidAmount >= invoice.total ? new Date().toISOString() : invoice.paid_date
          });

          // Create financial record
          await createFinancialRecord(invoice, aiResponse.payment);

          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `✅ **Pembayaran berhasil dicatat!**\n\n${aiResponse.message}\n\n💵 Jumlah: Rp ${aiResponse.payment.amount.toLocaleString('id-ID')}\n📝 Memo: ${aiResponse.payment.memo}\n\n**Status Invoice:**\n- Total: Rp ${invoice.total.toLocaleString('id-ID')}\n- Terbayar: Rp ${newPaidAmount.toLocaleString('id-ID')}\n- Sisa: Rp ${(invoice.total - newPaidAmount).toLocaleString('id-ID')}\n\n${newStatus === 'paid' ? '🎉 Invoice LUNAS!' : '⏳ Menunggu pelunasan'}\n\n✅ Transaksi sudah tercatat di keuangan perusahaan.`
          }]);

          toast.success('Pembayaran berhasil dicatat!');
          if (onInvoiceCreated) onInvoiceCreated();

        } catch (error) {
          console.error('Error recording payment:', error);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `❌ Gagal mencatat pembayaran: ${error.message}`
          }]);
          toast.error('Gagal mencatat pembayaran');
        }

      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: aiResponse.message
        }]);
      }

    } catch (error) {
      console.error('AI Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Maaf, terjadi kesalahan. Silakan coba lagi.'
      }]);
      toast.error('Gagal memproses permintaan');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="h-[600px] flex flex-col bg-gray-900 border-gray-700">
      <CardHeader className="border-b border-gray-700">
        <CardTitle className="flex items-center gap-2 text-white">
          <Sparkles className="w-5 h-5 text-purple-400" />
          AI Invoice Assistant
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-4 overflow-hidden">
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-200'
                  }`}
              >
                <ReactMarkdown className="prose prose-sm prose-invert max-w-none">
                  {msg.content}
                </ReactMarkdown>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-lg px-4 py-2 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                <span className="text-gray-400 text-sm">AI sedang memproses...</span>
              </div>
            </div>
          )}
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
            placeholder="Contoh: Buatkan invoice untuk PT ABC senilai 5 juta..."
            className="bg-gray-800 border-gray-700 text-white resize-none"
            rows={2}
            disabled={isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}