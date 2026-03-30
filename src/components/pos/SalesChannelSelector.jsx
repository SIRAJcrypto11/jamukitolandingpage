import React from 'react';

export const SALES_CHANNELS = [
  { id: 'OFFLINE', name: 'Offline Store', icon: '🏪', color: 'bg-gray-600' },
  { id: 'SHOPEE', name: 'Shopee', icon: '🛒', color: 'bg-orange-600' },
  { id: 'TOKOPEDIA', name: 'Tokopedia', icon: '🟢', color: 'bg-green-600' },
  { id: 'TIKTOK', name: 'TikTok Shop', icon: '🎵', color: 'bg-pink-600' },
  { id: 'GRAB', name: 'GrabFood/GrabMart', icon: '🚗', color: 'bg-emerald-600' },
  { id: 'GOJEK', name: 'GoFood/GoShop', icon: '🛵', color: 'bg-teal-600' },
  { id: 'WHATSAPP', name: 'WhatsApp Order', icon: '📱', color: 'bg-green-700' },
  { id: 'WEBSITE', name: 'Website', icon: '🌐', color: 'bg-blue-600' },
  { id: 'ONLINE_DALAM_KOTA', name: 'Online Dalam Kota', icon: '🏙️', color: 'bg-sky-600' },
  { id: 'ONLINE_LUAR_KOTA', name: 'Online Luar Kota', icon: '🏘️', color: 'bg-indigo-600' },
  { id: 'ONLINE_LUAR_PROVINSI', name: 'Online Luar Provinsi', icon: '🗾', color: 'bg-cyan-600' },
  { id: 'OTHER', name: 'Lainnya', icon: '🔹', color: 'bg-purple-600' }
];

export default function SalesChannelSelector({ value, onChange, className = '' }) {
  return (
    <select
      value={value || 'OFFLINE'}
      onChange={e => onChange(e.target.value)}
      className={`px-2 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded text-xs ${className}`}
    >
      {SALES_CHANNELS.map(ch => (
        <option key={ch.id} value={ch.id}>
          {ch.icon} {ch.name}
        </option>
      ))}
    </select>
  );
}

export function getSalesChannelLabel(channelId) {
  const ch = SALES_CHANNELS.find(c => c.id === channelId);
  return ch ? `${ch.icon} ${ch.name}` : '🏪 Offline Store';
}