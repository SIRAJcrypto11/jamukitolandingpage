// =====================================================
// INVENTORY SYNC BROADCAST - Realtime Cross-Menu Sync
// =====================================================
// Memastikan semua menu (Inventory, POS, Produk, Kasir) 
// selalu tersinkronisasi secara realtime

const CHANNEL_NAME = 'snishop_inventory_updates';

// Event types
export const SYNC_EVENTS = {
  PRODUCT_CREATED: 'PRODUCT_CREATED',
  PRODUCT_UPDATED: 'PRODUCT_UPDATED',
  PRODUCT_DELETED: 'PRODUCT_DELETED',
  PRODUCT_IMPORTED: 'PRODUCT_IMPORTED',
  INVENTORY_UPDATED: 'INVENTORY_UPDATED',
  STOCK_ADJUSTED: 'STOCK_ADJUSTED',
  STOCK_TRANSFERRED: 'STOCK_TRANSFERRED',
  LOCATION_CHANGED: 'LOCATION_CHANGED',
  TRANSACTION_COMPLETED: 'TRANSACTION_COMPLETED'
};

/**
 * Broadcast inventory/product change to all listening components
 */
export function broadcastInventoryChange(eventType, data) {
  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    
    const message = {
      type: eventType,
      ...data,
      timestamp: Date.now(),
      source: window.location.pathname
    };
    
    channel.postMessage(message);
    channel.close();
    
    console.log(`📡 BROADCAST [${eventType}]:`, message);
    
    // Also dispatch local event for same-page components
    window.dispatchEvent(new CustomEvent('inventorySync', { detail: message }));
    
    return true;
  } catch (error) {
    console.warn('BroadcastChannel not supported:', error);
    return false;
  }
}

/**
 * Subscribe to inventory changes
 * Returns cleanup function
 */
export function subscribeToInventoryChanges(companyId, callback) {
  const handleBroadcast = (event) => {
    if (event.data.companyId === companyId) {
      console.log('📡 RECEIVED:', event.data.type);
      callback(event.data);
    }
  };
  
  const handleLocalEvent = (event) => {
    if (event.detail.companyId === companyId) {
      callback(event.detail);
    }
  };
  
  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = handleBroadcast;
  window.addEventListener('inventorySync', handleLocalEvent);
  
  console.log('🔔 Subscribed to inventory changes for company:', companyId);
  
  // Return cleanup function
  return () => {
    channel.close();
    window.removeEventListener('inventorySync', handleLocalEvent);
    console.log('🔕 Unsubscribed from inventory changes');
  };
}

/**
 * Hook untuk React components
 */
export function useInventorySync(companyId, onUpdate) {
  if (typeof window === 'undefined') return;
  
  // Subscribe on mount
  const cleanup = subscribeToInventoryChanges(companyId, (data) => {
    if (onUpdate) onUpdate(data);
  });
  
  return cleanup;
}

// =====================================================
// SPECIFIC BROADCAST HELPERS
// =====================================================

/**
 * Broadcast product creation
 */
export function broadcastProductCreated(companyId, productId, productData) {
  return broadcastInventoryChange(SYNC_EVENTS.PRODUCT_CREATED, {
    companyId,
    productId,
    productData
  });
}

/**
 * Broadcast product update
 */
export function broadcastProductUpdated(companyId, productId, productData) {
  return broadcastInventoryChange(SYNC_EVENTS.PRODUCT_UPDATED, {
    companyId,
    productId,
    productData
  });
}

/**
 * Broadcast inventory adjustment
 */
export function broadcastStockAdjusted(companyId, productId, locationId, newQuantity, oldQuantity) {
  return broadcastInventoryChange(SYNC_EVENTS.STOCK_ADJUSTED, {
    companyId,
    productId,
    locationId,
    newQuantity,
    oldQuantity,
    change: newQuantity - oldQuantity
  });
}

/**
 * Broadcast stock transfer
 */
export function broadcastStockTransferred(companyId, productId, fromLocationId, toLocationId, quantity) {
  return broadcastInventoryChange(SYNC_EVENTS.STOCK_TRANSFERRED, {
    companyId,
    productId,
    fromLocationId,
    toLocationId,
    quantity
  });
}

/**
 * Broadcast transaction completed (from POS)
 */
export function broadcastTransactionCompleted(companyId, locationId, items) {
  return broadcastInventoryChange(SYNC_EVENTS.TRANSACTION_COMPLETED, {
    companyId,
    locationId,
    items: items.map(i => ({
      productId: i.product_id || i.id,
      quantity: i.quantity
    }))
  });
}

/**
 * Broadcast product import
 */
export function broadcastProductImported(companyId, count) {
  return broadcastInventoryChange(SYNC_EVENTS.PRODUCT_IMPORTED, {
    companyId,
    count
  });
}