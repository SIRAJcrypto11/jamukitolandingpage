import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <img 
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694cc3048109b291dcf39d6d/0002ba199_logo_jamu_kito-removebg-preview1.png" 
          alt="SNISHOP" 
          className="h-16 w-auto mx-auto mb-4 animate-pulse"
        />
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
        <p className="text-gray-600 dark:text-gray-400 text-sm">Memuat aplikasi...</p>
      </div>
    </div>
  );
}