import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Check, X, Eye, Loader2, Info } from 'lucide-react';
import { AddonRequest } from '@/entities/AddonRequest';
import { AddonPackage } from '@/entities/AddonPackage';
import { User } from '@/entities/User';
import { Notification } from '@/entities/Notification';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

export default function AddonRequestsTab({ requests, onUpdateRequest }) {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [actionType, setActionType] = useState("");
  const [addonPackages, setAddonPackages] = useState({});

  useEffect(() => {
    loadAddonPackages();
  }, []);

  const loadAddonPackages = async () => {
    try {
      const packages = await AddonPackage.list();
      const packagesMap = {};
      packages.forEach(pkg => {
        packagesMap[pkg.key] = {
          name: pkg.name,
          requests: pkg.requests,
          price: pkg.price
        };
      });
      setAddonPackages(packagesMap);
    } catch (error) {
      console.error('Error loading addon packages:', error);
    }
  };

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;
    setIsProcessing(true);
    
    try {
      const packageInfo = addonPackages[selectedRequest.requested_package] || {
        name: 'Kuota Tambahan',
        requests: 0
      };

      if (actionType === 'approve') {
        const userToUpdate = await User.filter({ email: selectedRequest.user_email });
        if (!userToUpdate || userToUpdate.length === 0) {
          throw new Error("User not found");
        }
        
        const user = userToUpdate[0];
        const quotaToAdd = packageInfo.requests;
        
        // ✅ ADD TO ADDON QUOTA
        const currentAddonQuota = user.ai_addon_quota || 0;
        const newAddonQuota = currentAddonQuota + quotaToAdd;

        console.log(`✅ ADDON APPROVED:
          - User: ${user.email}
          - Package: ${selectedRequest.requested_package}
          - Quota to add: ${quotaToAdd}
          - Old addon quota: ${currentAddonQuota}
          - New addon quota: ${newAddonQuota}`);

        await User.update(user.id, { 
          ai_addon_quota: newAddonQuota 
        });
        
        await AddonRequest.update(selectedRequest.id, {
          status: 'approved',
          admin_notes: adminNotes || `Disetujui - ${quotaToAdd} AI requests ditambahkan`
        });

        await Notification.create({
          user_id: selectedRequest.user_email,
          title: '✅ Pembelian Kuota AI Berhasil!',
          message: `Selamat! ${packageInfo.name} Anda telah disetujui. Kuota AI bertambah ${quotaToAdd} requests. Total kuota add-on: ${newAddonQuota}`,
          url: createPageUrl('AI')
        });

        toast.success(`✅ ${selectedRequest.user_full_name} mendapat ${quotaToAdd} AI requests!`);
        
      } else if (actionType === 'reject') {
        await AddonRequest.update(selectedRequest.id, {
          status: 'rejected',
          admin_notes: adminNotes || "Ditolak oleh admin"
        });

        await Notification.create({
          user_id: selectedRequest.user_email,
          title: '❌ Pembelian Kuota AI Ditolak',
          message: `Mohon maaf, pembelian ${packageInfo.name} Anda ditolak. ${adminNotes ? `Alasan: ${adminNotes}` : 'Silakan hubungi support.'}`,
          url: createPageUrl('Pricing')
        });

        toast.warning(`Permintaan ${selectedRequest.user_full_name} ditolak.`);
      }
      
      onUpdateRequest();
      setSelectedRequest(null);
      setAdminNotes("");
      setActionType("");
      
    } catch (error) {
      console.error(`Error ${actionType}ing request:`, error);
      toast.error(`Gagal memproses: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending': return <Badge className="bg-yellow-500 text-white">⏳ Menunggu</Badge>;
      case 'approved': return <Badge className="bg-green-500 text-white">✅ Disetujui</Badge>;
      case 'rejected': return <Badge className="bg-red-500 text-white">❌ Ditolak</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <>
      <Alert className="bg-blue-900/20 border-blue-700 mb-4">
        <Info className="h-4 w-4 text-blue-400" />
        <AlertDescription className="text-blue-200 text-sm">
          💡 Saat approve, kuota AI otomatis ditambahkan ke <strong>ai_addon_quota</strong> user (langsung bisa dipakai)
        </AlertDescription>
      </Alert>

      <div className="overflow-x-auto border border-gray-700 rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700 bg-gray-800">
              <TableHead className="text-gray-300">Pengguna</TableHead>
              <TableHead className="text-gray-300">Paket Addon</TableHead>
              <TableHead className="text-gray-300">Kuota AI</TableHead>
              <TableHead className="text-gray-300">Harga</TableHead>
              <TableHead className="text-gray-300">Tanggal</TableHead>
              <TableHead className="text-gray-300">Status</TableHead>
              <TableHead className="text-gray-300">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                  Tidak ada permintaan addon
                </TableCell>
              </TableRow>
            ) : (
              requests.map(req => {
                const packageInfo = addonPackages[req.requested_package] || {
                  name: req.requested_package,
                  requests: 0
                };
                
                return (
                  <TableRow key={req.id} className="border-gray-700 hover:bg-gray-700/50">
                    <TableCell className="text-white">
                      <div>
                        <p className="font-semibold">{req.user_full_name}</p>
                        <p className="text-xs text-gray-400">{req.user_email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-300">{packageInfo.name}</TableCell>
                    <TableCell>
                      <Badge className="bg-purple-600 text-white">
                        +{packageInfo.requests} AI Requests
                      </Badge>
                    </TableCell>
                    <TableCell className="text-green-400 font-semibold">
                      Rp {(req.price_paid || 0).toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {new Date(req.created_date).toLocaleDateString('id-ID')}
                    </TableCell>
                    <TableCell>{getStatusBadge(req.status)}</TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        onClick={() => {
                          setSelectedRequest(req);
                          setAdminNotes('');
                          setActionType('');
                        }}
                        variant="outline"
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Detail
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      
      <Dialog open={!!selectedRequest} onOpenChange={() => {
        setSelectedRequest(null);
        setAdminNotes('');
        setActionType('');
      }}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Review Permintaan Add-on</DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedRequest?.user_full_name} - {addonPackages[selectedRequest?.requested_package]?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-gray-700 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Paket:</span>
                  <span className="text-white font-semibold">{addonPackages[selectedRequest.requested_package]?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Kuota AI:</span>
                  <span className="text-purple-400 font-bold">+{addonPackages[selectedRequest.requested_package]?.requests || 0} requests</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Harga Dibayar:</span>
                  <span className="text-green-400 font-bold">Rp {(selectedRequest.price_paid || 0).toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div>
                <Label className="text-gray-300 mb-2 block">Bukti Pembayaran:</Label>
                <a href={selectedRequest.proof_image_url} target="_blank" rel="noopener noreferrer" className="block">
                  <img 
                    src={selectedRequest.proof_image_url} 
                    alt="Bukti Transfer" 
                    className="rounded-lg border border-gray-600 max-h-64 w-full object-contain cursor-pointer hover:opacity-80 transition"
                  />
                </a>
              </div>
              
              {selectedRequest.status === 'pending' ? (
                <>
                  <div>
                    <Label className="text-gray-300">Catatan Admin (Opsional)</Label>
                    <Input 
                      placeholder="Catatan untuk user..."
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white mt-1"
                    />
                  </div>
                  
                  <DialogFooter className="gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => { 
                        setActionType('reject'); 
                        handleAction(); 
                      }} 
                      disabled={isProcessing}
                      className="bg-red-600 hover:bg-red-700 text-white border-0"
                    >
                      {isProcessing && actionType === 'reject' ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <X className="w-4 h-4 mr-2" />
                      )}
                      Tolak
                    </Button>
                    <Button 
                      onClick={() => { 
                        setActionType('approve'); 
                        handleAction(); 
                      }} 
                      disabled={isProcessing}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isProcessing && actionType === 'approve' ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 mr-2" />
                      )}
                      Setujui
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <div className="bg-gray-700 p-3 rounded">
                  <Label className="text-gray-300">Catatan Admin:</Label>
                  <p className="text-white text-sm mt-1">{selectedRequest.admin_notes || '-'}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}