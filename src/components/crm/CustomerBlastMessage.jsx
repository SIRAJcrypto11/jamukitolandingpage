import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { whatsappSendMessage } from '@/functions/whatsappSendMessage';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Smartphone, Send, Loader2, AlertCircle, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function CustomerBlastMessage({ customers, isOpen, onClose, selectedCompany, currentUser }) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [session, setSession] = useState(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

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

  const handleToggleCustomer = (customerId) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedCustomers([]);
    } else {
      const customerIds = customersWithPhone.map(c => c.id);
      setSelectedCustomers(customerIds);
    }
    setSelectAll(!selectAll);
  };

  const handleSend = async (e) => {
    e.preventDefault();

    if (!message.trim()) {
      toast.error('Pesan tidak boleh kosong');
      return;
    }

    if (selectedCustomers.length === 0) {
      toast.error('Pilih minimal 1 customer');
      return;
    }

    try {
      setIsSending(true);

      const phoneNumbers = customers
        .filter(c => selectedCustomers.includes(c.id))
        .map(c => c.whatsapp_number || c.phone)
        .filter(Boolean);

      if (phoneNumbers.length === 0) {
        toast.error('Tidak ada nomor WhatsApp yang valid');
        return;
      }

      const response = await whatsappSendMessage({
        sessionId: session.id,
        phoneNumbers,
        message: message
      });

      if (response.data.success) {
        toast.success(`✅ ${response.data.sentCount} pesan terkirim!`);
        setMessage('');
        setSelectedCustomers([]);
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

  const customersWithPhone = customers.filter(c => c.phone || c.whatsapp_number);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-gray-900 max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-green-600" />
            Broadcast WhatsApp ke Customer
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
              WhatsApp belum connected. Hubungkan device Wablas Anda terlebih dahulu di menu WhatsApp Web.
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSend} className="space-y-4">
            <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
              <AlertDescription>
                <strong>✅ Connected:</strong> {session.phone_number}
              </AlertDescription>
            </Alert>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium">
                  Pilih Customer ({selectedCustomers.length}/{customersWithPhone.length})
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectAll ? 'Unselect All' : 'Select All'}
                </Button>
              </div>

              <div className="border rounded-lg max-h-60 overflow-y-auto">
                {customersWithPhone.map((customer) => (
                  <div
                    key={customer.id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 border-b last:border-b-0"
                  >
                    <Checkbox
                      checked={selectedCustomers.includes(customer.id)}
                      onCheckedChange={() => handleToggleCustomer(customer.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{customer.name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {customer.whatsapp_number || customer.phone}
                      </p>
                    </div>
                    <Badge className="text-xs">
                      {customer.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Pesan Broadcast *</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ketik pesan untuk semua customer yang dipilih..."
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
                disabled={isSending || selectedCustomers.length === 0}
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
                    Kirim ke {selectedCustomers.length} Customer
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