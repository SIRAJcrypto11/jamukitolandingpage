import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Award, CheckCircle, Loader2, MessageSquare, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { printReceipt } from '@/components/pos/ReceiptTemplate';
import { printReceiptBluetooth } from '@/components/pos/BluetoothPrinter';

export default function POSSuccessDialog({
  open, onClose, lastTransaction, posSettings, selectedCompany,
  printerStatus, isSendingWhatsApp, sendWhatsAppReceipt
}) {
  if (!lastTransaction) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white max-w-md mx-4 sm:mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600 dark:text-green-500 text-base sm:text-lg">
            <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6" />
            Transaksi Berhasil!
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">No. Transaksi</p>
            <p className="text-lg sm:text-xl font-bold">{lastTransaction.transaction_number}</p>
            {lastTransaction.saved_customer &&
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs">
                <p className="font-semibold text-blue-800 dark:text-blue-300">👤 {lastTransaction.saved_customer.name}</p>
                <p className="text-gray-600 dark:text-gray-400 mt-1">📞 {lastTransaction.saved_customer.phone || 'NO PHONE'}</p>
                {lastTransaction.saved_customer.whatsapp_number &&
                  <p className="text-gray-600 dark:text-gray-400">📱 WA: {lastTransaction.saved_customer.whatsapp_number}</p>
                }
              </div>
            }
          </div>

          {lastTransaction.saved_customer && (lastTransaction.saved_customer.phone || lastTransaction.saved_customer.whatsapp_number) &&
            <div className="border-2 border-green-500 dark:border-green-600 rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
              <p className="text-sm font-bold text-green-800 dark:text-green-300 mb-3 text-center">📱 Kirim Struk ke WhatsApp Member</p>
              <Button className="w-full bg-green-600 hover:bg-green-700 text-sm font-bold h-12" onClick={() => sendWhatsAppReceipt(lastTransaction)} disabled={isSendingWhatsApp}>
                {isSendingWhatsApp ?
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Mengirim...</> :
                  <><MessageSquare className="w-5 h-5 mr-2" />Kirim via Wablas ke {lastTransaction.saved_customer.whatsapp_number || lastTransaction.saved_customer.phone}</>
                }
              </Button>
              <p className="text-xs text-center text-gray-600 dark:text-gray-400 mt-2">Klik untuk kirim detail transaksi via WhatsApp</p>
            </div>
          }

          {lastTransaction.saved_customer && !lastTransaction.saved_customer.phone && !lastTransaction.saved_customer.whatsapp_number &&
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg">
              <p className="text-xs text-red-700 dark:text-red-300 text-center font-semibold">⚠️ Customer {lastTransaction.saved_customer.name} tidak memiliki nomor WhatsApp</p>
            </div>
          }

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Total</span><span className="font-bold">Rp {lastTransaction.total?.toLocaleString('id-ID')}</span></div>
            <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Bayar</span><span>Rp {lastTransaction.payment_amount?.toLocaleString('id-ID')}</span></div>
            {lastTransaction.change > 0 && <div className="flex justify-between text-green-600 dark:text-green-500"><span>Kembalian</span><span className="font-bold">Rp {lastTransaction.change?.toLocaleString('id-ID')}</span></div>}
            {lastTransaction.points_earned > 0 && <div className="flex justify-between text-yellow-600 dark:text-yellow-400"><span className="flex items-center gap-1"><Award className="w-3 h-3 sm:w-4 sm:h-4" />Poin</span><span className="font-bold">+{lastTransaction.points_earned}</span></div>}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
            {printerStatus.connected ?
              <>
                <div className="p-2 bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded text-xs text-green-700 dark:text-green-300 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /><span>Struk sudah otomatis tercetak</span>
                </div>
                <Button className="w-full bg-purple-600 hover:bg-purple-700 text-xs sm:text-sm" onClick={async () => {
                  try { const logo = posSettings?.receipt_settings?.logo_url || selectedCompany?.logo_url; await printReceiptBluetooth(lastTransaction, posSettings, selectedCompany.name, logo); toast.success('✅ Print ulang berhasil!'); } catch(e) { toast.error(e.message); }
                }}>
                  <Printer className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />Print Ulang
                </Button>
              </> :
              <Button className="w-full bg-purple-600 hover:bg-purple-700 text-xs sm:text-sm" onClick={() => {
                const logo = posSettings?.receipt_settings?.logo_url || selectedCompany?.logo_url; printReceipt(lastTransaction, posSettings, selectedCompany.name, logo);
              }}>
                <Printer className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />Print Struk
              </Button>
            }
            <Button className="w-full text-xs sm:text-sm" onClick={onClose}>Selesai</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}