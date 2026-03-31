import { Label } from '@/components/ui/label';

const SALES_CHANNELS = [
  { id: 'OFFLINE', name: 'Offline Store', icon: '🏪' },
  { id: 'SHOPEE', name: 'Shopee', icon: '🛒' },
  { id: 'TOKOPEDIA', name: 'Tokopedia', icon: '🟢' },
  { id: 'TIKTOK', name: 'TikTok Shop', icon: '🎵' },
  { id: 'GRAB', name: 'GrabFood/Mart', icon: '🚗' },
  { id: 'GOJEK', name: 'GoFood/GoShop', icon: '🛵' },
  { id: 'WHATSAPP', name: 'WhatsApp Order', icon: '📱' },
  { id: 'WEBSITE', name: 'Website', icon: '🌐' },
  { id: 'ONLINE_DALAM_KOTA', name: 'Online Dalam Kota', icon: '🏙️' },
  { id: 'ONLINE_LUAR_KOTA', name: 'Online Luar Kota', icon: '🏘️' },
  { id: 'ONLINE_LUAR_PROVINSI', name: 'Online Luar Provinsi', icon: '🗾' },
  { id: 'OTHER', name: 'Lainnya', icon: '🔹' }
];

export { SALES_CHANNELS };

export default function POSSalesChannel({ value, onChange }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
        Channel Penjualan
      </Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-xs text-gray-900 dark:text-white"
      >
        {SALES_CHANNELS.map(ch => (
          <option key={ch.id} value={ch.id}>
            {ch.icon} {ch.name}
          </option>
        ))}
      </select>
    </div>
  );
}