
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Gift, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { User } from '@/entities/User';
import { Referral } from '@/entities/Referral';
import { ReferralCode } from '@/entities/ReferralCode'; // Added ReferralCode import
import { toast } from 'sonner';

export default function ReferralCodeModal({ isOpen, onClose, user, onSuccess }) {
  const [referralCode, setReferralCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validationStatus, setValidationStatus] = useState(null);

  const validateAndSubmit = async () => {
    const code = referralCode.trim().toUpperCase();
    
    if (!code) {
      toast.error('Mohon masukkan kode referral');
      return;
    }

    if (code.length !== 8) {
      toast.error('Kode referral harus 8 karakter');
      return;
    }

    setIsLoading(true);
    setValidationStatus(null);

    try {
      console.log('🔍 Modal: Searching in ReferralCode entity:', code);
      
      // SEARCH IN PUBLIC READABLE ReferralCode ENTITY
      const referralCodes = await ReferralCode.filter({ 
        code: code,
        is_active: true
      });
      
      console.log('✅ Modal: Found codes:', referralCodes.length);
      
      if (referralCodes.length === 0) {
        console.log('❌ Code not found');
        setValidationStatus('invalid');
        toast.error('Kode tidak ditemukan');
        setIsLoading(false);
        return;
      }

      const referralCodeObj = referralCodes[0];
      console.log('✅ Modal: Found owner:', referralCodeObj.user_email);

      // Validate
      if (referralCodeObj.user_id === user.id) {
        setValidationStatus('invalid');
        toast.error('Tidak bisa gunakan kode sendiri');
        setIsLoading(false);
        return;
      }

      if (user.referred_by) {
        setValidationStatus('invalid');
        toast.error('Anda sudah punya referrer');
        setIsLoading(false);
        return;
      }

      console.log('💾 Modal: Updating user...');

      // Update user
      await User.updateMyUserData({
        referred_by: referralCodeObj.user_id,
        preferences: {
          ...(user.preferences || {}),
          referral_modal_dismissed: true
        }
      });

      console.log('📝 Modal: Creating referral record...');

      // Create referral record
      await Referral.create({
        referrer_id: referralCodeObj.user_id,
        referee_id: user.id,
        referee_email: user.email,
        referee_name: user.full_name || user.email,
        status: 'signed_up'
      });

      console.log('✅ Modal: SUCCESS!');

      setValidationStatus('valid');
      toast.success(`Berhasil! Direferensikan oleh ${referralCodeObj.user_name}`);
      
      if (onSuccess) {
        onSuccess({
          ...user,
          referred_by: referralCodeObj.user_id,
          preferences: {
            ...(user.preferences || {}),
            referral_modal_dismissed: true
          }
        });
      }

      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error) {
      console.error('❌ Modal error:', error);
      setValidationStatus('invalid');
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    setIsLoading(true);
    try {
      await User.updateMyUserData({
        preferences: {
          ...(user.preferences || {}),
          referral_modal_dismissed: true
        }
      });

      if (onSuccess) {
        onSuccess({
          ...user,
          preferences: {
            ...(user.preferences || {}),
            referral_modal_dismissed: true
          }
        });
      }

      onClose();
    } catch (error) {
      console.error('Error skipping:', error);
      toast.error('Terjadi kesalahan');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full">
              <Gift className="w-8 h-8 text-white" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            Selamat Datang! 🎉
          </DialogTitle>
          <DialogDescription className="text-center">
            Punya kode referral dari teman? Masukkan sekarang!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-semibold">Cara menggunakan:</p>
                <ol className="list-decimal ml-4 mt-1 space-y-1">
                  <li>Minta kode 8 karakter dari teman</li>
                  <li>Masukkan dengan HURUF KAPITAL</li>
                  <li>Klik "Terapkan Kode"</li>
                </ol>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="referral-code">Kode Referral (8 karakter)</Label>
            <div className="relative">
              <Input
                id="referral-code"
                placeholder="Contoh: ABC12345"
                value={referralCode}
                onChange={(e) => {
                  setReferralCode(e.target.value.toUpperCase().replace(/\s/g, ''));
                  setValidationStatus(null);
                }}
                disabled={isLoading}
                className={`pr-10 font-mono text-2xl text-center tracking-widest ${
                  validationStatus === 'valid' ? 'border-green-500' :
                  validationStatus === 'invalid' ? 'border-red-500' : ''
                }`}
                maxLength={8}
              />
              {validationStatus === 'valid' && (
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
              )}
              {validationStatus === 'invalid' && (
                <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
              )}
            </div>
            <p className="text-xs text-gray-500">
              Masukkan 8 karakter dengan huruf kapital
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleSkip}
              disabled={isLoading}
            >
              Lewati
            </Button>
            <Button
              className="flex-1"
              onClick={validateAndSubmit}
              disabled={isLoading || referralCode.length !== 8}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Proses...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Terapkan
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-center text-gray-500">
            Modal ini hanya muncul sekali. Lewati jika tidak ada kode.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
