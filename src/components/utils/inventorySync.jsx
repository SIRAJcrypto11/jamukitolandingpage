// ✅ INVENTORY SYNCHRONIZATION SYSTEM
// Pastikan stok sinkron di semua modul: POS, Products, Inventory

import { base44 } from '@/api/base44Client';

/**
 * SYNC STOCK: Update stok di CompanyPOSProduct dan Inventory secara bersamaan
 * @param {string} companyId - ID perusahaan
 * @param {string} productId - ID produk
 * @param {number} newStock - Stok baru
 * @param {string} reason - Alasan perubahan stok
 * @param {string} performedBy - Email user yang melakukan perubahan
 * @returns {Promise<boolean>} - Success status
 */
export async function syncStockAcrossModules(companyId, productId, newStock, reason, performedBy) {
  try {
    console.log('🔄 SYNC: Starting stock sync for product:', productId, '| New stock:', newStock);

    // 1. Update CompanyPOSProduct
    await base44.entities.CompanyPOSProduct.update(productId, {
      stock: newStock
    });
    console.log('✅ SYNC: CompanyPOSProduct updated');

    // 2. Update semua Inventory yang terkait dengan produk ini
    const inventoryItems = await base44.entities.Inventory.filter({
      company_id: companyId,
      product_id: productId
    });

    console.log(`📦 SYNC: Found ${inventoryItems?.length || 0} inventory locations for this product`);

    if (inventoryItems && inventoryItems.length > 0) {
      for (const inv of inventoryItems) {
        const stockStatus = newStock === 0 ? 'out_of_stock' :
          newStock <= (inv.min_stock || 5) ? 'low_stock' : 'in_stock';

        await base44.entities.Inventory.update(inv.id, {
          quantity: newStock,
          available_quantity: newStock,
          total_value: newStock * (inv.unit_cost || 0),
          stock_status: stockStatus
        });

        console.log(`✅ SYNC: Inventory updated for location: ${inv.location_name}`);
      }
    }

    // 3. Broadcast update to all listeners
    try {
      const channel = new BroadcastChannel('snishop_inventory_updates');
      channel.postMessage({
        type: 'STOCK_SYNCED',
        companyId: companyId,
        productId: productId,
        newStock: newStock,
        reason: reason,
        timestamp: Date.now()
      });
      channel.close();
      console.log('📡 SYNC: Broadcast sent to all modules');
    } catch (e) {
      console.warn('BroadcastChannel error:', e);
    }

    return true;
  } catch (error) {
    console.error('❌ SYNC ERROR:', error);
    throw error;
  }
}

/**
 * CALCULATE TOTAL STOCK: Hitung total stok dari semua lokasi
 * @param {string} companyId
 * @param {string} productId
 * @returns {Promise<number>}
 */
export async function calculateTotalStock(companyId, productId) {
  try {
    const inventoryItems = await base44.entities.Inventory.filter({
      company_id: companyId,
      product_id: productId
    });

    const total = (inventoryItems || []).reduce((sum, inv) => sum + (inv.quantity || 0), 0);
    console.log(`📊 CALC: Total stock for product ${productId}: ${total}`);
    return total;
  } catch (error) {
    console.error('Error calculating total stock:', error);
    return 0;
  }
}

/**
 * SYNC PRODUCT TO INVENTORY: Pastikan produk ada di semua lokasi aktif
 * @param {string} companyId
 * @param {object} product
 * @returns {Promise<void>}
 */
export async function syncProductToAllLocations(companyId, product) {
  try {
    console.log('🔄 SYNC: Syncing product to all active locations:', product.name);

    const activeLocations = await base44.entities.WarehouseLocation.filter({
      company_id: companyId,
      is_active: true
    });

    if (!activeLocations || activeLocations.length === 0) {
      console.warn('⚠️ No active locations found');
      return;
    }

    for (const location of activeLocations) {
      const existingInv = await base44.entities.Inventory.filter({
        company_id: companyId,
        product_id: product.id,
        location_id: location.id
      });

      if (!existingInv || existingInv.length === 0) {
        // Create inventory if not exists
        const stockStatus = (product.stock || 0) === 0 ? 'out_of_stock' :
          (product.stock || 0) <= (product.min_stock || 5) ? 'low_stock' : 'in_stock';

        await base44.entities.Inventory.create({
          company_id: companyId,
          product_id: product.id,
          product_name: product.name,
          product_sku: product.sku || 'N/A',
          location_id: location.id,
          location_name: location.location_name,
          quantity: product.stock || 0,
          available_quantity: product.stock || 0,
          reserved_quantity: 0,
          min_stock: product.min_stock || 5,
          max_stock: 1000,
          reorder_point: product.min_stock || 10,
          unit_cost: product.cost || 0,
          total_value: (product.stock || 0) * (product.cost || 0),
          stock_status: stockStatus
        });

        console.log(`✅ SYNC: Created inventory for ${location.location_name}`);
      } else {
        console.log(`ℹ️ SYNC: Inventory already exists for ${location.location_name}`);
      }
    }
  } catch (error) {
    console.error('❌ SYNC ERROR in syncProductToAllLocations:', error);
    throw error;
  }
}

/**
 * UPDATE STOCK FROM TRANSACTION: Update stok setelah transaksi POS
 * @param {string} companyId
 * @param {array} transactionItems - Array of {product_id, quantity}
 * @param {string} locationId - ID lokasi transaksi
 * @param {string} performedBy
 * @returns {Promise<boolean>}
 */
export async function updateStockFromTransaction(companyId, transactionItems, locationId, performedBy) {
  try {
    console.log('🔄 TRANSACTION SYNC: Processing', transactionItems.length, 'items');

    for (const item of transactionItems) {
      // 1. Get current product
      const product = await base44.entities.CompanyPOSProduct.get(item.product_id);
      if (!product) {
        console.warn(`⚠️ Product not found: ${item.product_id}`);
        continue;
      }

      // 2. Calculate new stock
      const newStock = Math.max(0, (product.stock || 0) - item.quantity);
      console.log(`📦 ${product.name}: ${product.stock} → ${newStock} (sold: ${item.quantity})`);

      // 3. Update CompanyPOSProduct
      await base44.entities.CompanyPOSProduct.update(product.id, {
        stock: newStock
      });

      // 4. Update Inventory for this location
      const inventoryItems = await base44.entities.Inventory.filter({
        company_id: companyId,
        product_id: product.id,
        location_id: locationId
      });

      if (inventoryItems && inventoryItems.length > 0) {
        const inv = inventoryItems[0];
        const invNewStock = Math.max(0, (inv.quantity || 0) - item.quantity);
        const stockStatus = invNewStock === 0 ? 'out_of_stock' :
          invNewStock <= (inv.min_stock || 5) ? 'low_stock' : 'in_stock';

        await base44.entities.Inventory.update(inv.id, {
          quantity: invNewStock,
          available_quantity: invNewStock,
          total_value: invNewStock * (inv.unit_cost || 0),
          stock_status: stockStatus,
          last_stock_out: new Date().toISOString()
        });

        // Log stock movement
        await base44.entities.StockMovement.create({
          company_id: companyId,
          inventory_id: inv.id,
          product_id: product.id,
          product_name: product.name,
          location_id: locationId,
          location_name: inv.location_name,
          movement_type: 'out',
          quantity: item.quantity,
          stock_before: inv.quantity || 0,
          stock_after: invNewStock,
          reference_type: 'pos_sale',
          reason: 'POS transaction',
          performed_by: performedBy,
          performed_by_name: performedBy,
          unit_cost: inv.unit_cost || 0,
          total_value: item.quantity * (inv.unit_cost || 0)
        }).catch(err => console.warn('Stock movement log failed:', err));
      }
    }

    // 5. Broadcast update
    try {
      const channel = new BroadcastChannel('snishop_inventory_updates');
      channel.postMessage({
        type: 'TRANSACTION_COMPLETED',
        companyId: companyId,
        timestamp: Date.now()
      });
      channel.close();
      console.log('📡 TRANSACTION SYNC: Broadcast sent');
    } catch (e) {
      console.warn('BroadcastChannel error:', e);
    }

    return true;
  } catch (error) {
    console.error('❌ TRANSACTION SYNC ERROR:', error);
    throw error;
  }
}