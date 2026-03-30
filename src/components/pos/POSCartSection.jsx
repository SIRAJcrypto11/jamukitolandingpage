import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Minus, Plus, Trash2, CreditCard, User, Award, X
} from 'lucide-react';
import TransferDropdown from './POSTransferDropdown';
import POSSalesChannel from './POSSalesChannel';

export default function POSCartSection({
  cart,
  selectedCustomer,
  selectedTherapist,
  companyMembers,
  accounts,
  selectedPaymentAccount,
  discount,
  shippingCost,
  otherCost,
  note,
  salesChannel,
  membershipLevels,
  locations,
  selectedLocation,
  getProductStock,
  getStockAtLocation,
  updateQuantity,
  removeFromCart,
  updateCartItemTransferLocation,
  setSelectedCustomer,
  setSelectedTherapist,
  setSelectedPaymentAccount,
  setDiscount,
  setShippingCost,
  setOtherCost,
  setNote,
  setSalesChannel,
  calculateSubtotal,
  calculateTotal,
  getMembershipDiscount,
  calculatePointsEarned,
  calculateStampsEarned,
  handleCheckout,
}) {
  return (
    <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
      <CardHeader className="p-3 sm:p-4">
        <CardTitle className="text-gray-900 dark:text-white flex items-center justify-between text-sm sm:text-base">
          <span>Keranjang</span>
          <div className="flex items-center gap-2">
            {selectedCustomer && (
              <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 text-[10px] px-1.5 py-0 h-5">
                Poin: {selectedCustomer.membership_points || 0}
              </Badge>
            )}
            <Badge className="bg-green-600 text-white text-xs">{cart.length} item</Badge>
          </div>
        </CardTitle>
        {selectedCustomer && (
          <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">Info Pelanggan</span>
              <Badge className="bg-purple-600 hover:bg-purple-700 text-[10px] px-1 h-4">
                {selectedCustomer.membership_level_name || 'Reguler'}
              </Badge>
            </div>
            <div className="grid grid-cols-1 gap-1 text-[11px]">
              <div className="flex items-start gap-1.5 text-gray-700 dark:text-gray-300">
                <Badge variant="ghost" className="p-0 h-auto text-blue-600 dark:text-blue-400"><User className="w-3 h-3" /></Badge>
                <span className="font-medium truncate">{selectedCustomer.name}</span>
                <span className="text-gray-400">({selectedCustomer.whatsapp_number || selectedCustomer.phone || '-'})</span>
              </div>
              <div className="flex items-start gap-1.5 text-gray-600 dark:text-gray-400">
                <Badge variant="ghost" className="p-0 h-auto text-blue-600 dark:text-blue-400"><X className="w-3 h-3 opacity-0" /></Badge>
                <span className="line-clamp-2 italic">{selectedCustomer.address || 'Alamat tidak tersedia'}</span>
              </div>
              {selectedCustomer.maps_url && (
                <button 
                  onClick={() => window.open(selectedCustomer.maps_url, '_blank')}
                  className="flex items-center gap-1.5 text-red-600 dark:text-red-400 hover:underline font-medium mt-0.5"
                >
                  <Badge variant="ghost" className="p-0 h-auto text-red-600 dark:text-red-400">📍</Badge>
                  Lihat di Google Maps
                </button>
              )}
              {selectedCustomer.image_url && (
                <div className="mt-1 flex items-center gap-2">
                  <div className="w-10 h-10 rounded border border-blue-200 dark:border-blue-800 overflow-hidden flex-shrink-0 cursor-pointer" onClick={() => window.open(selectedCustomer.image_url, '_blank')}>
                    <img src={selectedCustomer.image_url} alt="House" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] text-gray-500 italic">Foto Rumah tersedia</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4 pt-0">
        <div className="space-y-2 max-h-48 sm:max-h-64 overflow-y-auto">
          {cart.map((item) => (
            <div key={item.product_id} className="p-2 bg-gray-100 dark:bg-gray-800 rounded space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 dark:text-white text-xs sm:text-sm font-medium truncate">
                    {item.product_name}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-xs">Rp {item.price.toLocaleString('id-ID')}</p>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  <Button size="icon" variant="outline" className="h-7 w-7 sm:h-8 sm:w-8"
                    onClick={() => updateQuantity(item.product_id, item.quantity - 1)}>
                    <Minus className="w-3 h-3" />
                  </Button>
                  <Input type="number" value={item.quantity}
                    onChange={(e) => updateQuantity(item.product_id, Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-10 sm:w-12 h-7 sm:h-8 text-center p-0 text-xs sm:text-sm bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                    min="1" />
                  <Button size="icon" variant="outline" className="h-7 w-7 sm:h-8 sm:w-8"
                    onClick={() => updateQuantity(item.product_id, item.quantity + 1)}>
                    <Plus className="w-3 h-3" />
                  </Button>
                  <Button size="icon" variant="ghost"
                    className="h-7 w-7 sm:h-8 sm:w-8 text-red-600 dark:text-red-400"
                    onClick={() => removeFromCart(item.product_id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <TransferDropdown
                item={item}
                locations={locations}
                selectedLocation={selectedLocation}
                getProductStock={getProductStock}
                getStockAtLocation={getStockAtLocation}
                updateCartItemTransferLocation={updateCartItemTransferLocation}
              />
            </div>
          ))}
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-3 sm:pt-4 space-y-3 text-xs sm:text-sm">
          {/* Sales Channel */}
          <POSSalesChannel value={salesChannel} onChange={setSalesChannel} />

          {/* Therapist */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Terapis / Penanggung Jawab</Label>
            <div className="relative">
              <User className="absolute left-2 top-2.5 w-3 h-3 text-gray-400" />
              <select value={selectedTherapist ? selectedTherapist.id : ''}
                onChange={(e) => {
                  const id = e.target.value;
                  const member = companyMembers.find(m => m.user_id === id);
                  setSelectedTherapist(member ? { id: member.user_id, full_name: member.user_name || member.email, name: member.user_name || member.email } : null);
                }}
                className="w-full pl-8 pr-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-xs">
                <option value="">-- Pilih Terapis --</option>
                {companyMembers && companyMembers.length > 0 ? (
                  companyMembers.map((member) => (
                    <option key={member.id} value={member.user_id}>
                      {member.user_name || member.user_email || member.email} ({member.role})
                    </option>
                  ))
                ) : (
                  <option disabled>Loading members...</option>
                )}
              </select>
            </div>
          </div>

          {/* Payment Account */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Metode Pembayaran / Rekening *</Label>
            <div className="relative">
              <CreditCard className="absolute left-2 top-2.5 w-3 h-3 text-gray-400" />
              <select value={selectedPaymentAccount?.id || ''}
                onChange={(e) => {
                  const account = accounts.find(a => a.id === e.target.value);
                  setSelectedPaymentAccount(account || null);
                }}
                className="w-full pl-8 pr-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-xs" required>
                <option value="">-- Pilih Rekening Pembayaran --</option>
                {accounts && accounts.length > 0 ? (
                  accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.icon} {account.name} {account.bank_name ? `(${account.bank_name})` : ''}
                    </option>
                  ))
                ) : (
                  <option disabled>Tidak ada rekening - Buat di Finance</option>
                )}
              </select>
            </div>
            {!selectedPaymentAccount && accounts.length === 0 && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                ⚠️ Belum ada rekening. Buat rekening di Finance › Rekening
              </p>
            )}
          </div>

          <div className="flex justify-between text-gray-600 dark:text-gray-400">
            <span>Subtotal</span>
            <span>Rp {calculateSubtotal().toLocaleString('id-ID')}</span>
          </div>
          {getMembershipDiscount() > 0 && (
            <div className="flex justify-between text-yellow-600 dark:text-yellow-400">
              <span>Diskon Member</span>
              <span>- Rp {getMembershipDiscount().toLocaleString('id-ID')}</span>
            </div>
          )}

          {/* Discount */}
          <div className="space-y-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Diskon Tambahan</Label>
            <div className="grid grid-cols-4 gap-1 mb-2">
              {[5, 10, 15, 20].map((pct) => (
                <Button key={pct} size="sm"
                  variant={discount.type === 'percentage' && discount.value === pct ? 'default' : 'outline'}
                  className="h-7 text-xs px-1"
                  onClick={() => setDiscount({ type: 'percentage', value: pct })}>{pct}%</Button>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-1 mb-2">
              {[5000, 10000, 20000, 50000].map((amount) => (
                <Button key={amount} size="sm"
                  variant={discount.type === 'fixed' && discount.value === amount ? 'default' : 'outline'}
                  className="h-7 text-xs px-1"
                  onClick={() => setDiscount({ type: 'fixed', value: amount })}>
                  {amount >= 1000 ? `${amount / 1000}K` : amount}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <select value={discount.type}
                onChange={(e) => setDiscount({ type: e.target.value, value: '' })}
                className="w-20 px-2 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-900 dark:text-white">
                <option value="percentage">%</option>
                <option value="fixed">Rp</option>
              </select>
              <Input type="number" value={discount.value}
                onChange={(e) => setDiscount({ ...discount, value: e.target.value })}
                placeholder={discount.type === 'percentage' ? 'Custom %' : 'Custom Rp'}
                className="flex-1 h-8 text-xs bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                min="0" max={discount.type === 'percentage' ? 100 : undefined} />
              {discount.value && (
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0"
                  onClick={() => setDiscount({ ...discount, value: '' })}>
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
            {discount.value && parseFloat(discount.value) > 0 && (
              <p className="text-xs text-green-600 dark:text-green-400 font-semibold">
                Diskon: -Rp {(discount.type === 'percentage'
                  ? calculateSubtotal() * parseFloat(discount.value) / 100
                  : parseFloat(discount.value)).toLocaleString('id-ID')}
              </p>
            )}
          </div>

          {/* Extras */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-gray-600">Ongkos Kirim</Label>
              <Input type="number" value={shippingCost}
                onChange={(e) => setShippingCost(e.target.value)}
                className="h-8 text-xs bg-gray-100 dark:bg-gray-800" placeholder="Rp 0" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-600">Biaya Lain</Label>
              <Input type="number" value={otherCost}
                onChange={(e) => setOtherCost(e.target.value)}
                className="h-8 text-xs bg-gray-100 dark:bg-gray-800" placeholder="Rp 0" />
            </div>
          </div>

          {/* Note */}
          <div className="space-y-1">
            <Label className="text-xs text-gray-600">Catatan Transaksi</Label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)}
              className="w-full h-16 px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-xs resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Tambahkan catatan untuk struk..." />
          </div>

          <div className="flex justify-between text-gray-900 dark:text-white text-base sm:text-lg font-bold">
            <span>Total</span>
            <span>Rp {calculateTotal().toLocaleString('id-ID')}</span>
          </div>
          {selectedCustomer && calculatePointsEarned() > 0 && (
            <div className="flex justify-between text-yellow-600 dark:text-yellow-400 text-xs sm:text-sm">
              <span className="flex items-center gap-1"><Award className="w-3 h-3 sm:w-4 sm:h-4" />Poin yang didapat</span>
              <span>+{calculatePointsEarned()} poin</span>
            </div>
          )}
          {selectedCustomer && calculateStampsEarned() > 0 && (
            <div className="flex justify-between text-purple-600 dark:text-purple-400 text-xs sm:text-sm">
              <span className="flex items-center gap-1">🎫 Stamp yang didapat</span>
              <span className="font-semibold">+{calculateStampsEarned()} stamp</span>
            </div>
          )}
        </div>

        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-sm sm:text-base h-10 sm:h-11"
          onClick={handleCheckout} disabled={cart.length === 0 || !selectedLocation}>
          <CreditCard className="w-4 h-4 mr-2" />
          Bayar
        </Button>
      </CardContent>
    </Card>
  );
}