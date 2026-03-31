import { useState } from 'react';
import { DigitalProduct } from '@/entities/DigitalProduct';
import { POSProduct } from '@/entities/POSProduct';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ProductSyncPOS() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState(null);

  const syncProductsToPOS = async () => {
    setIsSyncing(true);
    setSyncResults(null);
    
    try {
      // Get all active digital products
      const digitalProducts = await DigitalProduct.filter({ is_active: true });
      
      // Get existing POS products that are synced
      const existingPOSProducts = await POSProduct.filter({ is_synced_from_digital: true });
      
      let created = 0;
      let updated = 0;
      let skipped = 0;
      
      for (const product of digitalProducts) {
        // Check if product already exists in POS
        const existingPOS = existingPOSProducts.find(
          p => p.digital_product_id === product.id
        );
        
        // Prepare POS product data
        const posData = {
          name: product.name,
          description: product.description,
          category: product.category,
          price: product.price,
          cost: product.price * 0.7, // Assume 30% margin
          stock: 9999, // Digital products have unlimited stock
          is_active: product.is_active,
          digital_product_id: product.id,
          is_synced_from_digital: true,
          last_synced: new Date().toISOString()
        };
        
        if (existingPOS) {
          // Update existing POS product
          await POSProduct.update(existingPOS.id, posData);
          updated++;
        } else {
          // Create new POS product
          await POSProduct.create({
            ...posData,
            sku: `DIG-${product.id.slice(0, 8).toUpperCase()}`
          });
          created++;
        }
      }
      
      setSyncResults({ created, updated, skipped, total: digitalProducts.length });
      toast.success(`Sinkronisasi berhasil! ${created} produk baru, ${updated} diperbarui`);
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Gagal sinkronisasi produk');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          Sinkronisasi Produk ke POS
        </CardTitle>
        <CardDescription>
          Sinkronkan produk digital ke sistem Point of Sale untuk dijual offline
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <AlertCircle className="w-4 h-4 inline mr-2" />
            Produk digital akan disinkronkan ke POS dengan stok unlimited dan dapat dijual secara offline
          </p>
        </div>

        <Button 
          onClick={syncProductsToPOS}
          disabled={isSyncing}
          className="w-full"
        >
          {isSyncing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Menyinkronkan...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Sinkronkan Sekarang
            </>
          )}
        </Button>

        {syncResults && (
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-green-800 dark:text-green-200 font-semibold">
              <CheckCircle className="w-5 h-5" />
              Sinkronisasi Selesai
            </div>
            <div className="grid grid-cols-3 gap-4 mt-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{syncResults.created}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Dibuat</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{syncResults.updated}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Diperbarui</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-600">{syncResults.total}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Total</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}