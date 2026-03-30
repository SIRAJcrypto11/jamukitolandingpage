
import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

/**
 * Background component to check for low stock and trigger notifications
 */
export default function LowStockNotifier({ selectedCompany, currentUser }) {
  const [lowStockItems, setLowStockItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const lastCheckRef = useRef(0); // Initialize to 0 for the rate limit check

  useEffect(() => {
    if (selectedCompany && currentUser) {
      // INCREASED DELAY - Prevent rate limit on mount
      const initialTimeout = setTimeout(() => {
        checkLowStock();
      }, 20000); // 20 second delay before first check

      return () => {
        clearTimeout(initialTimeout);
      };
    }
    // No periodic interval is set up based on the provided outline.
    // The component will perform an initial check after a delay on mount/props change.
  }, [selectedCompany, currentUser]);

  const checkLowStock = async () => {
    if (!selectedCompany || isLoading) return;

    // Rate limit protection - minimum 2 minutes between checks
    const now = Date.now();
    if (now - lastCheckRef.current < 120000) { // Increased from 60s to 120s (2 minutes)
      console.log('⏭️ Skipping low stock check (rate limit)');
      return;
    }

    try {
      lastCheckRef.current = now; // Update last check time only if not rate-limited
      setIsLoading(true);

      const inventoryData = await base44.entities.Inventory.filter({
        company_id: selectedCompany.id,
        stock_status: { $in: ['low_stock', 'out_of_stock'] }
      });

      const lowStockAlerts = (inventoryData || []).filter(item => 
        // Assuming 'quantity' is current stock and 'min_stock' is the threshold
        item.quantity <= item.min_stock
      );

      setLowStockItems(lowStockAlerts);

      if (lowStockAlerts.length > 0) {
        toast.warning(`⚠️ ${lowStockAlerts.length} produk stok rendah!`, {
          description: 'Cek menu Inventory untuk detail',
          duration: 5000
        });
      }

      // The original browser notification logic is removed as per the outline.
      // The original active alerts logic is removed as per the outline.

    } catch (error) {
      console.log('Low stock check error:', error?.message || 'Unknown');
    } finally {
      setIsLoading(false);
    }
  };

  return null; // Background component
}
