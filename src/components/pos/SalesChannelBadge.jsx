import { SALES_CHANNELS } from './SalesChannelSelector';

export default function SalesChannelBadge({ channelId, className = '' }) {
  const ch = SALES_CHANNELS.find(c => c.id === channelId) || SALES_CHANNELS[0];
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 ${className}`}>
      <span>{ch.icon}</span>
      <span>{ch.name}</span>
    </span>
  );
}