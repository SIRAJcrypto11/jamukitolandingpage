import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { whatsappSendMessage } from '@/functions/whatsappSendMessage';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Smartphone, Send, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Customer } from '@/entities/Customer';

export default function WhatsAppQuickSend({ customer, isOpen, onClose, selectedCompany, currentUser }) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [session, setSession] = useState(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  useEffect(() => {
    if (isOpen && currentUser && selectedCompany) {
      loadSession();
    }
  }, [isOpen, currentUser, selectedCompany]);

  const loadSession = async () => {
    try {
      setIsLoadingSession(true);
      
      const sessions = await base44.entities.WhatsAppSession.filter({
        user_email: currentUser.email,
        company_id: selectedCompany.id,
        status: 'connected'
      });

      if (sessions && sessions.length > 0) {
        setSession(sessions[0]);
      } else {
        setSession(null);
      }
    } catch (error) {
      console.error('Load session error:', error);
      setSession(null);
    } finally {
      setIsLoadingSession(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();

    if (!message.trim()) {
      toast.error('Pesan tidak boleh kosong');
      return;
    }

    if (!customer.phone && !customer.whatsapp_number) {
      toast.error('Customer tidak memiliki nomor WhatsApp');
      return;
    }

    try {
      setIsSending(true);

      const phoneNumber = customer.whatsapp_number || customer.phone;

      const response = await whatsappSendMessage({
        sessionId: session.id,
        phoneNumbers: [phoneNumber],
        message: message
      });

      if (response.data.success) {
        toast.success(`✅ Pesan terkirim ke ${customer.name}`);
        
        // Update last contact
        await Customer.update(customer.id, {
          last_contact_date: new Date().toISOString(),
          last_contact_method: 'whatsapp',
          last_contact_notes: message.substring(0, 200)
        });

        setMessage('');
        onClose();
      } else {
        toast.error('Gagal mengirim pesan');
      }
    } catch (error) {
      console.error('Send error:', error);
      toast.error('Error: ' + error.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-gray-900 max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-green-600" />
            Kirim WhatsApp ke {customer?.name}
          </DialogTitle>
        </DialogHeader>

        {isLoadingSession ? (
          <div className="py-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
            <p className="text-sm text-gray-500 mt-2">Checking connection...</p>
          </div>
        ) : !session ? (
          <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200">
            <AlertCircle className="w-4 h-4 text-yellow-600" />
            <AlertDescription>
              WhatsApp belum connected. 
              <a href="https://solo.wablas.com/login" target="_blank" className="text-blue-600 hover:underline ml-1 inline-flex items-center gap-1">
                Login ke Wablas <ExternalLink className="w-3 h-3" />
              </a> untuk connect device, lalu klik Check Connection.
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Nomor Tujuan</label>
              <Input
                value={customer.whatsapp_number || customer.phone}
                disabled
                className="bg-gray-100 dark:bg-gray-800"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Pesan *</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ketik pesan Anda..."
                rows={6}
                className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
              <p className="text-xs text-gray-500 mt-1">{message.length} karakter</p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSending}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Kirim
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}