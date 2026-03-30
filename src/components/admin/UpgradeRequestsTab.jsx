import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { UpgradeRequest } from '@/entities/UpgradeRequest';
import { Notification } from '@/entities/Notification';
import { Referral } from '@/entities/Referral';
import { Commission } from '@/entities/Commission';
import { ReferralSetting } from '@/entities/ReferralSetting';
import { Voucher } from '@/entities/Voucher';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Eye, Check, X, Upload, Clock, Tag } from 'lucide-react'; 
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';

export default function UpgradeRequestsTab() {
  const [allRequests, setAllRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const loadRequests = async () => {
    try {
      const fetchedRequests = await UpgradeRequest.filter({});
      fetchedRequests.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
      setAllRequests(fetchedRequests);
    } catch (error) {
      console.error('Error loading upgrade requests:', error);
      toast.error('Gagal memuat permintaan upgrade.');
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleViewImage = (request) => {
    setSelectedRequest(request);
    setShowImageModal(true);
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setIsProcessing(true);
    
    try {
      const request = selectedRequest;
      const now = new Date();
      
      const isYearly = request.billing_period === 'yearly';
      const subscriptionEnd = new Date(now); 
      if (isYearly) {
        subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + 1);
      } else {
        subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);
      }

      const users = await User.filter({ email: request.user_email });
      if (users.length === 0) {
        throw new Error('User not found');
      }
      
      const targetUser = users[0];
      
      let newAdminTier = 'none';
      if (request.requested_plan === 'business') newAdminTier = 'business';
      else if (request.requested_plan === 'advanced') newAdminTier = 'advanced';
      else if (request.requested_plan === 'enterprise') newAdminTier = 'enterprise';
      
      // ✅ UPDATE USER SUBSCRIPTION
      await User.update(targetUser.id, {
        subscription_plan: request.requested_plan,
        membership_start_date: now.toISOString().split('T')[0],
        membership_end_date: subscriptionEnd.toISOString().split('T')[0],
        membership_duration_type: isYearly ? 'yearly' : 'monthly',
        admin_tier: newAdminTier,
        trial_plan: null,
        trial_expires: null
      });

      console.log(`✅ User upgraded: ${request.user_email} to ${request.requested_plan}`);

      // ✅ Broadcast refresh
      try {
        const channel = new BroadcastChannel('snishop_user_updates');
        channel.postMessage({
          type: 'USER_UPDATED',
          userId: targetUser.id,
          userEmail: request.user_email,
          timestamp: Date.now()
        });
        channel.close();
      } catch (e) {
        console.warn('BroadcastChannel not supported:', e);
      }

      // ✅ UPDATE REQUEST STATUS
      await UpgradeRequest.update(request.id, {
        status: 'approved',
        admin_notes: `Disetujui pada ${format(now, 'dd MMM yyyy HH:mm', { locale: id })}${adminNotes ? '. ' + adminNotes : ''}`
      });

      // ✅ UPDATE VOUCHER USAGE COUNT
      if (request.voucher_code_used) {
        const vouchers = await Voucher.filter({ code: request.voucher_code_used });
        if (vouchers.length > 0) {
          const voucher = vouchers[0];
          await Voucher.update(voucher.id, {
            usage_count: (voucher.usage_count || 0) + 1
          });
          console.log(`✅ Voucher ${request.voucher_code_used} usage updated`);
        }
      }

      // ✅ COMMISSION LOGIC - ANTI DOUBLE!
      if (targetUser.referred_by) {
        console.log('🎯 Processing commission for referrer:', targetUser.referred_by);
        
        // ✅ CHECK IF COMMISSION ALREADY EXISTS (PREVENT DOUBLE!)
        const existingCommission = await Commission.filter({ 
          purchase_id: request.id 
        });
        
        if (existingCommission && existingCommission.length > 0) {
          console.log('⚠️ COMMISSION ALREADY EXISTS - SKIPPING to prevent double!');
          toast.warning('Komisi sudah pernah dibuat untuk transaksi ini');
        } else {
          console.log('✅ No existing commission - Creating new...');
          
          // Check if this is first purchase
          const allUserCommissions = await Commission.filter({ 
            referee_id: targetUser.id 
          });
          
          const isFirstPurchase = allUserCommissions.length === 0;
          console.log(`📊 First purchase: ${isFirstPurchase} (existing commissions: ${allUserCommissions.length})`);
          
          // Get commission rate from settings
          const settings = await ReferralSetting.filter({ plan_key: request.requested_plan });
          let commissionRate = isFirstPurchase ? 0.50 : 0.15; // Default: 50% first, 15% renewal
          
          if (settings && settings.length > 0) {
            const setting = settings[0];
            commissionRate = isFirstPurchase 
              ? setting.first_purchase_commission_rate 
              : setting.renewal_commission_rate;
          }
          
          console.log(`💰 Commission rate: ${commissionRate * 100}%`);
          
          // ✅ CALCULATE COMMISSION FROM FINAL PRICE (price_paid)
          const finalPricePaid = request.price_paid || 0;
          const commissionAmount = Math.round(finalPricePaid * commissionRate);
          
          console.log(`💵 Commission calculation:
            - Final price paid: Rp ${finalPricePaid.toLocaleString('id-ID')}
            - Commission rate: ${commissionRate * 100}%
            - Commission amount: Rp ${commissionAmount.toLocaleString('id-ID')}`);
          
          // ✅ CREATE COMMISSION RECORD (UNIQUE!)
          const newCommission = await Commission.create({
            referrer_id: targetUser.referred_by,
            referee_id: targetUser.id,
            purchase_id: request.id, // UNIQUE identifier to prevent double
            purchase_amount: finalPricePaid,
            commission_rate: commissionRate,
            commission_amount: commissionAmount,
            plan_purchased: request.requested_plan,
            purchase_type: isFirstPurchase ? 'first_time' : 'renewal',
            status: 'paid_to_balance'
          });
          
          console.log('✅ Commission record created:', newCommission.id);
          
          // ✅ UPDATE REFERRER BALANCE IMMEDIATELY
          const referrerUsers = await User.filter({ id: targetUser.referred_by });
          if (referrerUsers && referrerUsers.length > 0) {
            const referrer = referrerUsers[0];
            const oldCommissionBalance = referrer.commission_balance || 0;
            const oldTotalEarnings = referrer.total_earnings || 0;
            
            const newCommissionBalance = oldCommissionBalance + commissionAmount;
            const newTotalEarnings = oldTotalEarnings + commissionAmount;
            
            await User.update(referrer.id, {
              commission_balance: newCommissionBalance,
              total_earnings: newTotalEarnings
            });
            
            console.log(`✅ REFERRER BALANCE UPDATED:
              - Old commission balance: Rp ${oldCommissionBalance.toLocaleString('id-ID')}
              - New commission balance: Rp ${newCommissionBalance.toLocaleString('id-ID')}
              - Old total earnings: Rp ${oldTotalEarnings.toLocaleString('id-ID')}
              - New total earnings: Rp ${newTotalEarnings.toLocaleString('id-ID')}`);
            
            // ✅ NOTIFY REFERRER
            await Notification.create({
              user_id: referrer.email,
              title: "💰 Komisi Referral Masuk!",
              message: `Selamat! Komisi Rp ${commissionAmount.toLocaleString('id-ID')} dari ${targetUser.full_name || targetUser.email} telah masuk ke saldo komisi Anda. Saldo komisi: Rp ${newCommissionBalance.toLocaleString('id-ID')}`,
              url: '/referral'
            });
            
            console.log('✅ Referrer notified');
          } else {
            console.warn('⚠️ Referrer user not found:', targetUser.referred_by);
          }
          
          // ✅ UPDATE REFERRAL STATUS TO "PURCHASED"
          if (isFirstPurchase) {
            const referralRecords = await Referral.filter({
              referrer_id: targetUser.referred_by,
              referee_id: targetUser.id
            });
            
            for (const ref of referralRecords) {
              await Referral.update(ref.id, { status: 'purchased' });
            }
            console.log('✅ Referral status updated to PURCHASED');
          }
          
          toast.success(`✅ Komisi Rp ${commissionAmount.toLocaleString('id-ID')} dibayarkan ke referrer!`);
        }
      } else {
        console.log('ℹ️ No referrer for this user');
      }

      // ✅ NOTIFY USER ABOUT APPROVAL
      await Notification.create({
        user_id: request.user_email,
        title: "✅ Upgrade Berhasil!",
        message: `Selamat! Paket ${request.requested_plan.toUpperCase()} Anda telah aktif. Silakan REFRESH halaman (F5) untuk melihat fitur baru!`,
        url: '/dashboard'
      });

      toast.success(`✅ Request approved! User: ${request.user_email}`);
      setSelectedRequest(null);
      setAdminNotes('');
      loadRequests();
      
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Gagal approve: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    setIsProcessing(true);
    
    try {
      await UpgradeRequest.update(selectedRequest.id, {
        status: 'rejected',
        admin_notes: adminNotes
      });

      await Notification.create({
        user_id: selectedRequest.user_email,
        title: "Permintaan Upgrade Ditolak",
        message: `Maaf, permintaan upgrade ke ${selectedRequest.requested_plan.toUpperCase()} ditolak. ${adminNotes ? 'Catatan: ' + adminNotes : ''}`,
        url: '/pricing'
      });

      toast.success("Request ditolak");
      setSelectedRequest(null);
      setAdminNotes('');
      loadRequests();
    } catch (error) {
      console.error('Error rejecting:', error);
      toast.error("Gagal menolak request");
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    const configs = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Menunggu' },
      approved: { color: 'bg-green-100 text-green-800', icon: Check, label: 'Disetujui' },
      rejected: { color: 'bg-red-100 text-red-800', icon: X, label: 'Ditolak' }
    };

    const config = configs[status] || configs.pending;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <>
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Permintaan Upgrade ({allRequests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border rounded-lg border-gray-700">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-300">Pengguna</TableHead>
                  <TableHead className="text-gray-300">Paket</TableHead>
                  <TableHead className="text-gray-300">Periode</TableHead>
                  <TableHead className="text-gray-300">Harga Asli</TableHead>
                  <TableHead className="text-gray-300">Harga Dibayar</TableHead>
                  <TableHead className="text-gray-300">Metode</TableHead>
                  <TableHead className="text-gray-300">Tanggal</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allRequests.map(request => (
                  <TableRow key={request.id} className="border-gray-700 hover:bg-gray-700/50">
                    <TableCell>
                      <div>
                        <p className="font-medium text-white">{request.user_full_name}</p>
                        <p className="text-sm text-gray-400">{request.user_email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-blue-600 text-white">
                        {request.requested_plan.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-gray-300">
                        {request.billing_period === 'yearly' ? 'Tahunan' : 'Bulanan'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-300">
                      Rp {(request.original_price || 0).toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      <div>
                        <p className="font-semibold text-green-400">Rp {(request.price_paid || 0).toLocaleString('id-ID')}</p>
                        {request.voucher_code_used && (
                          <p className="text-xs text-green-400 flex items-center gap-1 mt-1">
                            <Tag className="w-3 h-3" />
                            {request.voucher_code_used}
                          </p>
                        )}
                        {request.balance_used > 0 && (
                          <p className="text-xs text-blue-400 mt-1">
                            Saldo: Rp {request.balance_used.toLocaleString('id-ID')}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        request.payment_method?.includes('tripay') || request.payment_method?.includes('stripe') 
                          ? 'border-green-600 text-green-400' 
                          : 'text-gray-400 border-gray-600'
                      }>
                        {request.payment_method?.includes('tripay') ? '💳 Tripay' : 
                         request.payment_method?.includes('stripe') ? '💳 Stripe' :
                         '📧 Manual'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {format(new Date(request.created_date), 'dd MMM yyyy', { locale: id })}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(request.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewImage(request)}
                          className="border-gray-600 text-gray-300 hover:bg-gray-700"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {request.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => {
                                setSelectedRequest(request);
                                setAdminNotes('');
                              }}
                              disabled={isProcessing}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              className="bg-red-600 hover:bg-red-700"
                              onClick={() => {
                                setSelectedRequest(request);
                                setAdminNotes('');
                              }}
                              disabled={isProcessing}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {allRequests.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <Upload className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Tidak ada permintaan upgrade.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Image View Modal */}
      <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
        <DialogContent className="max-w-2xl bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Bukti Transfer</DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedRequest?.user_full_name}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="text-center">
              <img
                src={selectedRequest.proof_image_url}
                alt="Bukti Transfer"
                className="max-w-full max-h-96 mx-auto rounded-lg border border-gray-600"
                onError={(e) => {
                  e.target.alt = 'Gambar tidak dapat dimuat';
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approval Modal */}
      <Dialog open={!!selectedRequest && !showImageModal} onOpenChange={() => {
        setSelectedRequest(null);
        setAdminNotes('');
      }}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              Proses Request Upgrade
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedRequest?.user_full_name} → {selectedRequest?.requested_plan.toUpperCase()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-700 p-4 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Paket:</span>
                <span className="text-white font-semibold">{selectedRequest?.requested_plan.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Periode:</span>
                <span className="text-white font-semibold">
                  {selectedRequest?.billing_period === 'yearly' ? 'Tahunan (12 bulan)' : 'Bulanan'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Harga Asli:</span>
                <span className="text-white">Rp {(selectedRequest?.original_price || 0).toLocaleString('id-ID')}</span>
              </div>
              {selectedRequest?.voucher_code_used && (
                <div className="flex justify-between text-green-400">
                  <span>Voucher:</span>
                  <span className="font-semibold">{selectedRequest.voucher_code_used}</span>
                </div>
              )}
              {selectedRequest?.balance_used > 0 && (
                <div className="flex justify-between text-blue-400">
                  <span>Saldo Digunakan:</span>
                  <span>- Rp {selectedRequest.balance_used.toLocaleString('id-ID')}</span>
                </div>
              )}
              <div className="border-t border-gray-600 pt-2 flex justify-between font-bold text-lg">
                <span className="text-white">Dibayar:</span>
                <span className="text-green-400">
                  Rp {(selectedRequest?.price_paid || 0).toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="admin-notes" className="text-gray-300">Catatan Admin (Opsional)</Label>
              <Textarea
                id="admin-notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Catatan untuk user..."
                className="bg-gray-700 border-gray-600 text-white mt-1"
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={handleApprove}
                disabled={isProcessing}
              >
                <Check className="w-4 h-4 mr-2" />
                {isProcessing ? 'Memproses...' : 'Setujui'}
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={handleReject}
                disabled={isProcessing}
              >
                <X className="w-4 h-4 mr-2" />
                Tolak
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}