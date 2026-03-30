import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

const pricingPlans = [
  {
    name: 'Gratis',
    price: 'Rp 0',
    description: 'Untuk individu yang baru memulai.',
    features: ['3 Workspace', '50 Blok Catatan', 'Kolaborasi Terbatas', 'Storage 500MB'],
    buttonText: 'Mulai Gratis',
    isPopular: false,
    gradient: 'from-gray-500 to-gray-600'
  },
  {
    name: 'Pro',
    price: 'Rp 79.000',
    description: 'Untuk profesional dan tim kecil.',
    features: ['Workspace Tanpa Batas', 'Blok Catatan Tanpa Batas', 'AI Assistant', 'Kolaborasi Penuh', 'Storage 5GB', 'Prioritas Support'],
    buttonText: 'Pilih Pro',
    isPopular: true,
    gradient: 'from-blue-600 to-blue-700'
  },
  {
    name: 'Advanced',
    price: 'Rp 149.000',
    description: 'Untuk tim yang berkembang.',
    features: ['Semua fitur Pro', 'Analitik Workspace', 'Izin Lanjutan', 'Storage 50GB', 'Integrasi API', 'White-label Option'],
    buttonText: 'Pilih Advanced',
    isPopular: false,
    gradient: 'from-purple-600 to-purple-700'
  },
  {
    name: 'Enterprise',
    price: 'Rp 299.000',
    description: 'Untuk organisasi besar.',
    features: ['Semua fitur Advanced', 'SSO & Keamanan Enterprise', 'Dukungan Prioritas 24/7', 'Branding Kustom', 'Storage Unlimited', 'Dedicated Account Manager'],
    buttonText: 'Kontak Sales',
    isPopular: false,
    gradient: 'from-indigo-600 to-indigo-700'
  },
];

export default function PricingSection() {
  return (
    <section id="pricing" className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Pilih Paket yang Tepat untuk Anda</h2>
          <p className="mt-4 text-lg text-gray-600">Harga disesuaikan dengan biaya server dan penyimpanan premium</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {pricingPlans.map((plan) => (
            <div key={plan.name} className={`bg-white rounded-2xl shadow-xl p-8 flex flex-col relative transform transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${plan.isPopular ? 'border-2 border-blue-500 scale-105' : 'border border-gray-200'}`}>
              {plan.isPopular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-bold px-6 py-2 rounded-full shadow-lg">
                    PALING POPULER
                  </span>
                </div>
              )}
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                <p className="mt-2 text-gray-600">{plan.description}</p>
                <div className="mt-6">
                  <span className="text-4xl font-extrabold text-gray-900">{plan.price}</span>
                  {plan.price !== 'Hubungi Kami' && <span className="text-gray-600">/bulan</span>}
                </div>
              </div>
              
              <ul className="space-y-4 flex-grow mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <div className="flex-shrink-0">
                      <Check className="w-5 h-5 text-green-500 mt-0.5" />
                    </div>
                    <span className="ml-3 text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <div className="mt-auto">
                <Link to={createPageUrl("Dashboard")}>
                  <Button className={`w-full py-3 text-lg font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 ${
                    plan.isPopular 
                      ? `bg-gradient-to-r ${plan.gradient} text-white shadow-lg hover:shadow-xl` 
                      : 'bg-gray-800 hover:bg-gray-900 text-white'
                  }`}>
                    {plan.buttonText}
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mt-12">
          <p className="text-gray-600">
            * Harga sudah termasuk biaya server premium dan penyimpanan berkecepatan tinggi di Hostinger
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Semua paket dilengkapi dengan backup otomatis dan keamanan tingkat enterprise
          </p>
        </div>
      </div>
    </section>
  );
}