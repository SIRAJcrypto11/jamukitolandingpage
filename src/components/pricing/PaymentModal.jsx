import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UploadCloud, CheckCircle, Check, CreditCard } from 'lucide-react';
import { Voucher } from '@/entities/Voucher';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';

import { getActiveGateways, createPayment } from '@/components/utils/paymentGatewayHelper';

export default function PaymentModal({ isOpen, onClose, plan, billingPeriod, user, onSuccess }) {
  const [proofFile, setProofFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [useCommissionBalance, setUseCommissionBalance] = useState(false);
  const [availableGateways, setAvailableGateways] = useState([]);
  const [selectedGateway, setSelectedGateway] = useState(null);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setProofFile(null);
      setIsLoading(false);
      setVoucherCode('');
      setAppliedVoucher(null);
      setUseCommissionBalance(false);
      setAvailableGateways([]);
      setSelectedGateway(null);
      setIsCreatingPayment(false);
      loadGateways();
    }
  }, [isOpen]);

  const loadGateways = async () => {
    try {
      const gateways = await getActiveGateways();
      setAvailableGateways(gateways || []);
    } catch (error) {
      console.error('Error loading gateways:', error);
    }
  };

  if (!plan) {
    return null;
  }

  const isAnnual = billingPeriod === 'yearly';
  
  // Calculate base price BEFORE any discounts
  let originalPrice;
  let yearlyDiscount = 0;
  let basePrice;
  
  if (isAnnual) {
    originalPrice = plan.price * 12; // Full 12 months
    yearlyDiscount = plan.price * 2; // 2 months free
    basePrice = originalPrice - yearlyDiscount; // 10 months only
  } else {
    originalPrice = plan.price;
    basePrice = plan.price;
  }

  // Calculate voucher discount from basePrice
  let voucherDiscount = 0;
  if (appliedVoucher) {
    if (appliedVoucher.discount_type === 'percentage') {
      voucherDiscount = basePrice * (appliedVoucher.discount_value / 100);
      if (appliedVoucher.max_discount && voucherDiscount > appliedVoucher.max_discount) {
        voucherDiscount = appliedVoucher.max_discount;
      }
    } else {
      voucherDiscount = appliedVoucher.discount_value;
    }
  }

  // Price after voucher
  let priceAfterVoucher = basePrice - voucherDiscount;

  // Calculate balance usage
  const userBalance = user?.balance || 0;
  let balanceUsed = 0;
  if (useCommissionBalance && userBalance > 0) {
    balanceUsed = Math.min(userBalance, priceAfterVoucher);
  }

  // FINAL PRICE - This is what user actually pays
  const finalPrice = Math.max(0, priceAfterVoucher - balanceUsed);

  console.log('💰 PAYMENT CALCULATION FINAL:', {
    plan: plan.name,
    isAnnual,
    originalPrice,
    yearlyDiscount,
    basePrice,
    voucherCode: appliedVoucher?.code,
    voucherType: appliedVoucher?.discount_type,
    voucherValue: appliedVoucher?.discount_value,
    voucherDiscount,
    priceAfterVoucher,
    balanceUsed,
    finalPrice
  });

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Ukuran file terlalu besar. Maksimum 5MB.");
        e.target.value = null;
        return;
      }
      setProofFile(file);
    }
  };

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) {
      toast.error('Masukkan kode voucher');
      return;
    }

    try {
      const vouchers = await Voucher.filter({
        code: voucherCode.toUpperCase(),
        is_active: true
      });

      if (vouchers.length === 0) {
        toast.error('Kode voucher tidak valid');
        setVoucherCode('');
        return;
      }

      const voucher = vouchers[0];

      const now = new Date();
      if (new Date(voucher.valid_until) < now) {
        toast.error('Voucher sudah kadaluarsa');
        setVoucherCode('');
        return;
      }

      if (new Date(voucher.valid_from) > now) {
        toast.error('Voucher belum aktif');
        setVoucherCode('');
        return;
      }

      if (!voucher.applicable_plans.includes(plan.planKey)) {
        toast.error('Voucher tidak berlaku untuk paket ini');
        setVoucherCode('');
        return;
      }

      if (basePrice < (voucher.min_purchase || 0)) {
        toast.error(`Minimum pembelian ${formatPrice(voucher.min_purchase || 0)}`);
        setVoucherCode('');
        return;
      }

      if (voucher.usage_limit && voucher.usage_count >= voucher.usage_limit) {
        toast.error('Voucher sudah mencapai batas penggunaan');
        setVoucherCode('');
        return;
      }

      setAppliedVoucher(voucher);
      
      // Calculate actual discount for display
      let actualDiscount = 0;
      if (voucher.discount_type === 'percentage') {
        actualDiscount = basePrice * (voucher.discount_value / 100);
        if (voucher.max_discount && actualDiscount > voucher.max_discount) {
          actualDiscount = voucher.max_discount;
        }
      } else {
        actualDiscount = voucher.discount_value;
      }
      
      toast.success(`✅ Voucher diterapkan! Hemat ${formatPrice(actualDiscount)}`, {
        duration: 3000
      });
    } catch (error) {
      console.error('Error applying voucher:', error);
      toast.error('Gagal menerapkan voucher');
    }
  };

  const handleGatewayPayment = async () => {
    if (!selectedGateway) {
      toast.error('Pilih metode pembayaran!');
      return;
    }
    if (finalPrice <= 0) {
      toast.error('Total pembayaran harus lebih dari Rp 0');
      return;
    }

    try {
      setIsCreatingPayment(true);

      const upgradeRequest = await base44.entities.UpgradeRequest.create({
        user_id: user.id,
        user_email: user.email,
        user_full_name: user.full_name || user.email,
        requested_plan: plan.planKey,
        proof_image_url: `${selectedGateway.gateway_name}_payment_pending`,
        status: 'pending',
        billing_period: billingPeriod,
        price_paid: Math.round(finalPrice),
        original_price: Math.round(basePrice),
        voucher_code_used: appliedVoucher?.code || null,
        balance_used: Math.round(balanceUsed),
        payment_method: selectedGateway.gateway_name
      });

      if (balanceUsed > 0) {
        const newBalance = (user.balance || 0) - balanceUsed;
        await base44.auth.updateMe({ balance: newBalance });
      }

      const paymentData = {
        amount: Math.round(finalPrice),
        description: `Upgrade ${plan.name} - ${billingPeriod === 'yearly' ? 'Tahunan' : 'Bulanan'}`,
        payment_purpose: 'upgrade_subscription',
        order_items: [{
          sku: `MEMBERSHIP-${plan.planKey.toUpperCase()}`,
          name: `Membership SNISHOP ${plan.name} - ${billingPeriod === 'yearly' ? 'Tahunan' : 'Bulanan'}`,
          price: Math.round(finalPrice),
          quantity: 1
        }],
        customer_name: user.full_name || user.email,
        customer_email: user.email,
        customer_phone: user.phone || '08123456789',
        related_request_id: upgradeRequest.id
      };

      const result = await createPayment(selectedGateway.gateway_name, paymentData);

      if (result && result.success !== false) {
        toast.success('✅ Pembayaran berhasil dibuat!');
        
        if (result.checkout_url) {
          setTimeout(() => {
            window.open(result.checkout_url, '_blank');
          }, 1000);
        }

        onClose();
        if (onSuccess) onSuccess();
      } else {
        throw new Error(result.message || 'Gagal membuat pembayaran');
      }

    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Error: ' + (error.message || 'Gagal membuat pembayaran'));
    } finally {
      setIsCreatingPayment(false);
    }
  };

  const handleSubmit = async () => {
    if (selectedGateway) {
      await handleGatewayPayment();
      return;
    }

    if (finalPrice > 0 && !proofFile) {
      toast.error("Silakan unggah bukti pembayaran.");
      return;
    }

    setIsLoading(true);
    try {
      let file_url = '';

      if (proofFile && finalPrice > 0) {
        const uploadResult = await base44.integrations.Core.UploadFile({ file: proofFile });
        file_url = uploadResult.file_url;
        if (!file_url) {
          throw new Error("Gagal mengunggah bukti pembayaran.");
        }
      } else if (finalPrice === 0) {
        file_url = 'paid_with_balance';
      }

      await base44.entities.UpgradeRequest.create({
        user_id: user.id,
        user_email: user.email,
        user_full_name: user.full_name || user.email,
        requested_plan: plan.planKey,
        proof_image_url: file_url,
        status: 'pending',
        billing_period: billingPeriod,
        price_paid: Math.round(finalPrice),
        original_price: Math.round(basePrice),
        voucher_code_used: appliedVoucher?.code || null,
        balance_used: Math.round(balanceUsed),
        payment_method: 'manual_transfer'
      });

      if (balanceUsed > 0) {
        const newBalance = (user.balance || 0) - balanceUsed;
        await base44.auth.updateMe({ balance: newBalance });
      }

      toast.success("Permintaan upgrade berhasil dikirim!");

      if (onSuccess) {
        onSuccess();
      } else {
        onClose();
        window.location.reload();
      }

    } catch (error) {
      console.error("Error submitting request:", error);
      toast.error(error.message || "Gagal mengirim permintaan upgrade.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price) => {
    return `Rp ${Math.round(price || 0).toLocaleString('id-ID')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-white">
            Upgrade ke {plan.name}
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            {isAnnual ? `Paket Tahunan - Hemat 2 bulan (${formatPrice(plan.price * 2)})` : 'Paket Bulanan'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {userBalance > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="useCommissionBalance"
                  checked={useCommissionBalance}
                  onChange={(e) => setUseCommissionBalance(e.target.checked)}
                  className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <label htmlFor="useCommissionBalance" className="flex-1 cursor-pointer">
                  <p className="font-semibold text-green-800 dark:text-green-200">
                    Gunakan Saldo Deposit
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-300">
                    Saldo tersedia: {formatPrice(userBalance)}
                  </p>
                  {useCommissionBalance && (
                    <p className="text-sm text-green-600 dark:text-green-300 mt-1 font-semibold">
                      ✓ Akan digunakan: {formatPrice(balanceUsed)}
                    </p>
                  )}
                </label>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-gray-900 dark:text-white font-medium">Kode Voucher (Opsional)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Masukkan kode voucher"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                disabled={!!appliedVoucher}
                className="flex-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
              />
              {!appliedVoucher ? (
                <Button 
                  onClick={handleApplyVoucher} 
                  variant="outline" 
                  disabled={isLoading || isCreatingPayment}
                  className="border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Terapkan
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    setAppliedVoucher(null);
                    setVoucherCode('');
                    toast.info('Voucher dihapus');
                  }}
                  variant="outline"
                  disabled={isLoading || isCreatingPayment}
                  className="border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Hapus
                </Button>
              )}
            </div>
            {appliedVoucher && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3">
                <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-1 font-semibold">
                  <Check className="w-5 h-5" />
                  ✅ Voucher "{appliedVoucher.code}" diterapkan!
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {appliedVoucher.discount_type === 'percentage' 
                    ? `Diskon ${appliedVoucher.discount_value}%` 
                    : `Potongan ${formatPrice(appliedVoucher.discount_value)}`}
                  {' '}- Hemat {formatPrice(voucherDiscount)}
                </p>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 p-5 rounded-lg space-y-3 border-2 border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-3">Rincian Pembayaran</h3>
            
            {isAnnual && (
              <>
                <div className="flex justify-between text-gray-700 dark:text-gray-300 text-sm">
                  <span>Harga Bulanan x 12 bulan:</span>
                  <span className="font-semibold">{formatPrice(originalPrice)}</span>
                </div>
                <div className="flex justify-between text-sm text-green-600 dark:text-green-400 font-semibold bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded">
                  <span>🎉 Diskon Paket Tahunan (2 bulan gratis):</span>
                  <span>- {formatPrice(yearlyDiscount)}</span>
                </div>
                <div className="border-t border-gray-300 dark:border-gray-600 pt-2 flex justify-between font-semibold text-gray-900 dark:text-white">
                  <span>Subtotal Harga Tahunan:</span>
                  <span className="text-lg">{formatPrice(basePrice)}</span>
                </div>
              </>
            )}
            {!isAnnual && (
              <div className="flex justify-between font-semibold text-gray-900 dark:text-white">
                <span>Harga Bulanan:</span>
                <span className="text-lg">{formatPrice(basePrice)}</span>
              </div>
            )}
            
            {voucherDiscount > 0 && (
              <>
                <div className="border-t border-gray-300 dark:border-gray-600 pt-2"></div>
                <div className="flex justify-between text-green-600 dark:text-green-400 font-bold bg-green-100 dark:bg-green-900/30 px-3 py-2 rounded-lg">
                  <span>💎 Potongan Voucher "{appliedVoucher?.code}":</span>
                  <span className="text-lg">- {formatPrice(voucherDiscount)}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-900 dark:text-white">
                  <span>Setelah Voucher:</span>
                  <span className="text-lg">{formatPrice(priceAfterVoucher)}</span>
                </div>
              </>
            )}
            
            {balanceUsed > 0 && (
              <>
                <div className="border-t border-gray-300 dark:border-gray-600 pt-2"></div>
                <div className="flex justify-between text-sm text-green-600 dark:text-green-400 font-semibold bg-green-50 dark:bg-green-900/20 p-2 rounded">
                  <span>💰 Potongan Saldo Deposit:</span>
                  <span>- {formatPrice(balanceUsed)}</span>
                </div>
              </>
            )}
            
            <div className="border-t-2 border-blue-500 dark:border-blue-600 pt-3 mt-3 bg-blue-50 dark:bg-blue-900/30 px-3 py-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-900 dark:text-white font-bold text-lg">Total Pembayaran:</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold text-2xl">
                  {formatPrice(finalPrice)}
                </span>
              </div>
              {isAnnual && finalPrice > 0 && (
                <p className="text-xs text-gray-600 dark:text-gray-400 text-right mt-1">
                  Setara {formatPrice(Math.round(finalPrice / 12))}/bulan
                </p>
              )}
            </div>
          </div>

          {finalPrice > 0 && (
            <>
              {availableGateways.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-gray-900 dark:text-white font-semibold text-lg">💳 Pilih Payment Gateway</Label>
                  <div className="grid gap-3">
                    {availableGateways.map((gateway) => (
                      <motion.div
                        key={gateway.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <Card
                          className={`cursor-pointer transition-all ${
                            selectedGateway?.id === gateway.id ?
                            'border-blue-500 border-2 bg-blue-50 dark:bg-blue-900/20' :
                            'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 bg-white dark:bg-gray-800'
                          }`}
                          onClick={() => {
                            setSelectedGateway(gateway);
                            setProofFile(null);
                          }}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-gray-900 dark:text-white">
                                  {gateway.display_name || gateway.gateway_name.toUpperCase()}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  Mode: {gateway.mode}
                                </p>
                              </div>
                              {selectedGateway?.id === gateway.id && (
                                <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                  {selectedGateway && (
                    <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                      <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <AlertDescription className="text-blue-800 dark:text-blue-200">
                        Pembayaran {formatPrice(finalPrice)} akan diproses via {selectedGateway.display_name || selectedGateway.gateway_name.toUpperCase()}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {!selectedGateway && (
                <div className="space-y-4">
                  <Label className="text-gray-900 dark:text-white font-semibold text-lg">📱 Transfer Manual</Label>
                  
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">QR</span>
                      </div>
                      <div>
                        <p className="font-bold text-blue-900 dark:text-blue-100">QRIS SNISHOP</p>
                        <p className="text-xs text-blue-700 dark:text-blue-300">Scan untuk semua e-wallet & bank</p>
                      </div>
                    </div>
                    <img
                      src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/688a42916670b89e7b51038c/9417c4cf3_QRISNEW.jpg"
                      alt="QRIS SNISHOP"
                      className="w-full max-w-xs mx-auto rounded-lg border-4 border-white shadow-lg"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">Bank BRI</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">a.n. SIRAJ NUR IHROM</p>
                      <code className="text-xs font-mono text-gray-900 dark:text-gray-200 font-bold">0318-0104-4901-506</code>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">Bank BNI</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">a.n. SIRAJ NUR IHROM</p>
                      <code className="text-xs font-mono text-gray-900 dark:text-gray-200 font-bold">1764316134</code>
                    </div>
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">Bank JAGO</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">a.n. SIRAJ NUR IHROM</p>
                      <code className="text-xs font-mono text-gray-900 dark:text-gray-200 font-bold">104860686195</code>
                    </div>
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">DANA / OVO / GOPAY</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">a.n. SIRAJ NUR IHROM</p>
                      <code className="text-xs font-mono text-gray-900 dark:text-gray-200 font-bold">082374139054</code>
                    </div>
                    <div className="p-3 bg-pink-50 dark:bg-pink-900/20 rounded-lg border border-pink-200 dark:border-pink-700">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">SHOPEEPAY</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">a.n. SIRAJ NUR IHROM</p>
                      <code className="text-xs font-mono text-gray-900 dark:text-gray-200 font-bold">085758102073</code>
                    </div>
                  </div>

                  <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700">
                    <AlertDescription className="text-yellow-800 dark:text-yellow-200 text-xs">
                      ⚠️ Transfer dari BANK ke E-wallet dikenakan biaya Rp.1.000
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label className="text-gray-900 dark:text-white font-medium">Upload Bukti Pembayaran *</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white file:bg-gray-100 dark:file:bg-gray-700 file:text-gray-700 dark:file:text-gray-300 file:border-0 file:mr-4 file:py-2 file:px-4 file:rounded-md file:font-semibold"
                    />
                    {proofFile && (
                      <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                        ✓ {proofFile.name}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {finalPrice === 0 && (
            <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                🎉 Pembayaran lunas menggunakan saldo! Klik "Upgrade Sekarang"
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={onClose} 
              disabled={isLoading || isCreatingPayment}
              className="border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
            >
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                isLoading ||
                isCreatingPayment ||
                (finalPrice > 0 && !selectedGateway && !proofFile)
              }
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              {isLoading || isCreatingPayment ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : finalPrice === 0 ? (
                '✨ Upgrade Sekarang (Gratis)'
              ) : selectedGateway ? (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Bayar {formatPrice(finalPrice)}
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4 mr-2" />
                  Kirim Permintaan
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}