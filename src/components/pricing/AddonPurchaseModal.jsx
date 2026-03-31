import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AddonPackage } from '@/entities/AddonPackage';
import { AddonRequest } from '@/entities/AddonRequest';
import { Zap, Upload, Check, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function AddonPurchaseModal({ isOpen, onClose, user }) {
  const [addonPackages, setAddonPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [proofImage, setProofImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadAddons = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      
      // ✅ REALTIME: Load dari database
      const packages = await AddonPackage.filter({ isActive: true });
      setAddonPackages(packages.sort((a, b) => (a.order || 0) - (b.order || 0)));
      console.log('🔄 ADDON REALTIME: Loaded', packages.length, 'packages');
      
    } catch (error) {
      console.error('Error loading addons:', error);
      toast.error('Gagal memuat paket addon');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAddons();
      
      // ✅ AUTO-REFRESH DATA ONLY - NO PAGE RELOAD
      const interval = setInterval(() => {
        loadAddons(true); // Silent refresh
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 5MB');
        return;
      }
      setProofImage(file);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPackage || !proofImage) {
      toast.error('Pilih paket dan upload bukti pembayaran');
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: proofImage });

      await AddonRequest.create({
        user_id: user.id,
        user_email: user.email,
        user_full_name: user.full_name,
        request_type: 'ai_quota',
        requested_package: selectedPackage.key,
        price_paid: selectedPackage.price,
        proof_image_url: file_url,
        status: 'pending'
      });

      toast.success('✅ Permintaan berhasil dikirim! Admin akan review segera.');
      onClose();
      setSelectedPackage(null);
      setProofImage(null);
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error('Gagal mengirim permintaan');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white text-2xl flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-400" />
            Beli Kuota AI Tambahan
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-6">
            <Alert className="bg-blue-900/20 border-blue-700">
              <Info className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-blue-200 text-sm">
                💡 Kuota AI tambahan langsung ditambahkan ke akun Anda setelah admin approve pembayaran (realtime update)
              </AlertDescription>
            </Alert>

            <div className="grid md:grid-cols-3 gap-4">
              {addonPackages.map((pkg) => (
                <Card
                  key={pkg.id}
                  onClick={() => setSelectedPackage(pkg)}
                  className={`cursor-pointer transition-all ${
                    selectedPackage?.id === pkg.id
                      ? 'ring-4 ring-purple-500 bg-purple-900/20'
                      : 'bg-gray-800 hover:bg-gray-700'
                  } border-gray-700`}
                >
                  <CardContent className="p-6 text-center">
                    {pkg.popular && (
                      <Badge className="mb-3 bg-yellow-500 text-white">⭐ Popular</Badge>
                    )}
                    <div className="text-3xl font-bold text-purple-400 mb-2">
                      {pkg.requests.toLocaleString('id-ID')}
                    </div>
                    <p className="text-gray-400 text-sm mb-4">AI Requests</p>
                    <div className="text-2xl font-bold text-green-400">
                      Rp {pkg.price.toLocaleString('id-ID')}
                    </div>
                    {selectedPackage?.id === pkg.id && (
                      <div className="mt-4">
                        <Check className="w-8 h-8 text-green-500 mx-auto" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {addonPackages.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <Zap className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Belum ada paket addon tersedia</p>
              </div>
            )}

            {selectedPackage && (
              <div className="space-y-4 bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h3 className="font-semibold text-white">Upload Bukti Pembayaran</h3>
                
                <div className="bg-gray-700 p-4 rounded-lg">
                  <p className="text-sm text-gray-300 mb-2">Transfer ke:</p>
                  <p className="text-white font-semibold">BRI - 0183 0103 7515 303</p>
                  <p className="text-gray-400 text-sm">a.n. Siraj Nur Ihrom</p>
                  <p className="text-green-400 font-bold text-lg mt-2">
                    Rp {selectedPackage.price.toLocaleString('id-ID')}
                  </p>
                </div>

                <div>
                  <Label className="text-gray-300">Bukti Transfer *</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="bg-gray-700 border-gray-600 text-white mt-2"
                  />
                  {proofImage && (
                    <p className="text-green-400 text-sm mt-2">
                      <Check className="w-4 h-4 inline mr-1" />
                      {proofImage.name}
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={!proofImage || uploading}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Kirim Permintaan
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}