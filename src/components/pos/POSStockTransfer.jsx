import { base44 } from '@/api/base44Client';

export async function executeStockTransfer({ productId, fromLocationId, toLocationId, quantity, reason, transactionId, companyId, userEmail }) {
  const sourceInv = await base44.entities.Inventory.filter({ company_id: companyId, product_id: productId, location_id: fromLocationId });
  if (!sourceInv || sourceInv.length === 0) throw new Error('Inventory tidak ditemukan di lokasi sumber');
  const source = sourceInv[0];
  if (source.quantity < quantity) throw new Error(`Stok tidak cukup! Tersedia: ${source.quantity}, Dibutuhkan: ${quantity}`);
  const destInv = await base44.entities.Inventory.filter({ company_id: companyId, product_id: productId, location_id: toLocationId });
  const dest = destInv?.length > 0 ? destInv[0] : null;
  await base44.entities.Inventory.update(source.id, { quantity: source.quantity - quantity, available_quantity: Math.max(0, (source.available_quantity || source.quantity) - quantity), stock_status: (source.quantity - quantity) <= 0 ? 'out_of_stock' : (source.quantity - quantity) < 10 ? 'low_stock' : 'in_stock' });
  if (dest) {
    await base44.entities.Inventory.update(dest.id, { quantity: dest.quantity + quantity, available_quantity: (dest.available_quantity || dest.quantity) + quantity, stock_status: 'in_stock' });
  } else {
    await base44.entities.Inventory.create({ company_id: companyId, product_id: productId, location_id: toLocationId, quantity, available_quantity: quantity, unit_cost: source.unit_cost || 0, selling_price: source.selling_price || 0, stock_status: 'in_stock' });
  }
  await base44.entities.StockMovement.create({ company_id: companyId, inventory_id: source.id, product_id: productId, location_id: fromLocationId, movement_type: 'transfer_out', quantity, stock_before: source.quantity, stock_after: source.quantity - quantity, reference_type: 'pos_transfer', reference_id: transactionId, reason, performed_by: userEmail, notes: `Auto-transfer to ${toLocationId} for POS sale` });
  await base44.entities.StockMovement.create({ company_id: companyId, inventory_id: dest?.id, product_id: productId, location_id: toLocationId, movement_type: 'transfer_in', quantity, stock_before: dest?.quantity || 0, stock_after: (dest?.quantity || 0) + quantity, reference_type: 'pos_transfer', reference_id: transactionId, reason, performed_by: userEmail, notes: `Auto-transfer from ${fromLocationId} for POS sale` });
  return true;
}