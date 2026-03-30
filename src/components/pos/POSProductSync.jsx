import React, { useEffect, useRef } from 'react';
import { DigitalProduct } from '@/entities/DigitalProduct';
import { POSProduct } from '@/entities/POSProduct';
import { cacheManager, CACHE_KEYS } from '@/components/utils/cacheManager';

// Real-time sync component untuk POS Products
export default function POSProductSync({ onProductsUpdate }) {
  const syncIntervalRef = useRef(null);
  const lastSyncRef = useRef(null);

  useEffect(() => {
    // Initial sync
    syncProducts();

    // Poll every 10 seconds for changes
    syncIntervalRef.current = setInterval(() => {
      syncProducts();
    }, 10000);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  const syncProducts = async () => {
    try {
      // Get latest digital products
      const digitalProducts = await DigitalProduct.filter({ is_active: true });
      
      // Check if there are any changes
      const currentHash = JSON.stringify(digitalProducts.map(p => ({ 
        id: p.id, 
        name: p.name, 
        price: p.price, 
        updated_date: p.updated_date 
      })));

      if (lastSyncRef.current === currentHash) {
        return; // No changes
      }

      lastSyncRef.current = currentHash;

      // Get existing POS products
      const posProducts = await POSProduct.filter({ is_synced_from_digital: true });

      // Sync each digital product to POS
      for (const product of digitalProducts) {
        const existingPOS = posProducts.find(p => p.digital_product_id === product.id);

        const posData = {
          name: product.name,
          description: product.description,
          category: product.category,
          price: product.price,
          cost: product.price * 0.7,
          stock: 9999,
          is_active: product.is_active,
          digital_product_id: product.id,
          is_synced_from_digital: true,
          last_synced: new Date().toISOString(),
          image_url: product.images?.[0] || product.image_url
        };

        if (existingPOS) {
          // Update if changed
          const hasChanges = existingPOS.name !== posData.name ||
                            existingPOS.price !== posData.price ||
                            existingPOS.is_active !== posData.is_active;

          if (hasChanges) {
            await POSProduct.update(existingPOS.id, posData);
            console.log(`✅ Updated POS product: ${product.name}`);
          }
        } else {
          // Create new
          await POSProduct.create({
            ...posData,
            sku: `DIG-${product.id.slice(0, 8).toUpperCase()}`
          });
          console.log(`✅ Created POS product: ${product.name}`);
        }
      }

      // Invalidate POS products cache
      cacheManager.invalidate(CACHE_KEYS.POS_PRODUCTS);
      
      // Notify parent component
      if (onProductsUpdate) {
        onProductsUpdate();
      }

    } catch (error) {
      console.error('Product sync error:', error);
    }
  };

  return null; // This is a background sync component
}