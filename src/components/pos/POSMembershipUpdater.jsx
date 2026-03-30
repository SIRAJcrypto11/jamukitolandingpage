import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export async function updateCustomerMembership({ customerId, currentTotal, membershipLevels, companyId }) {
  if (!customerId) return;
  const Customer = base44.entities.Customer;
  const CustomerMembership = base44.entities.CustomerMembership;

  const customerData = await Customer.filter({ id: customerId });
  const customer = customerData?.[0];
  const allLevels = await CustomerMembership.filter({ company_id: companyId, is_active: true });
  const sortedLevels = allLevels?.sort((a, b) => (a.order || 0) - (b.order || 0)) || [];

  if (!customer || sortedLevels.length === 0) return;

  const baseLevel = sortedLevels[0];
  let currentLevel = null;
  let currentLevelIndex = -1;

  if (customer.membership_level_id) {
    currentLevelIndex = sortedLevels.findIndex(l => String(l.id) === String(customer.membership_level_id));
    if (currentLevelIndex === -1 && customer.membership_level_name) {
      currentLevelIndex = sortedLevels.findIndex(l => l.level_name === customer.membership_level_name);
    }
    if (currentLevelIndex !== -1) currentLevel = sortedLevels[currentLevelIndex];
  }

  if (!customer.membership_level_id && baseLevel) {
    await Customer.update(customer.id, { membership_level_id: baseLevel.id, membership_level_name: baseLevel.level_name, membership_since: new Date().toISOString(), stamps: 0, membership_points: 0 });
    currentLevel = baseLevel; currentLevelIndex = 0;
    toast.success(`🎉 ${customer.name} bergabung sebagai ${baseLevel.icon} ${baseLevel.level_name}!`, { duration: 4000 });
  }

  const minPurchase = currentLevel?.min_purchase > 0 ? currentLevel.min_purchase : 100000;
  const pointsToAdd = currentTotal >= minPurchase ? 10 : 0;
  const stampsEarned = pointsToAdd > 0 ? 1 : 0;

  let existingStamps = 0;
  if (customer.stamps !== undefined && customer.stamps !== null) existingStamps = Number(customer.stamps);
  else existingStamps = Math.floor(Number(customer.membership_points || 0) / 10);

  const newStamps = existingStamps + stampsEarned;
  const newPoints = newStamps * 10;
  const newVisits = (customer.total_orders || 0) + 1;
  const newLifetimeValue = (customer.lifetime_value || 0) + currentTotal;

  let updatePayload = { total_orders: newVisits, membership_points: newPoints, stamps: newStamps, lifetime_value: newLifetimeValue, last_purchase_date: new Date().toISOString() };

  let upgradedLevel = null;
  if (currentLevelIndex >= 0 && currentLevelIndex < sortedLevels.length - 1) {
    const nextLevel = sortedLevels[currentLevelIndex + 1];
    if (nextLevel && nextLevel.auto_upgrade !== false && (nextLevel.order > (currentLevel?.order || 0))) {
      const stampsReq = Number(nextLevel.stamps_required) > 0 ? Number(nextLevel.stamps_required) : 10;
      const safeThreshold = Math.max(stampsReq, 2);
      const forceStamp = nextLevel.stamps_required > 0;
      const scheme = forceStamp ? 'stamp' : nextLevel.scheme_type;

      let shouldUpgrade = false;
      switch (scheme) {
        case 'stamp': shouldUpgrade = newStamps >= safeThreshold; break;
        case 'visits': shouldUpgrade = newVisits >= (nextLevel.visits_required || 20); break;
        case 'points': shouldUpgrade = newPoints >= (nextLevel.points_required || 1000); break;
        case 'spending': shouldUpgrade = newLifetimeValue >= (nextLevel.min_purchase || 1000000); break;
        default: shouldUpgrade = newLifetimeValue >= (nextLevel.min_purchase || 1000000);
      }

      const gateStamps = Number(nextLevel.stamps_required) > 0 ? Number(nextLevel.stamps_required) : 10;
      if (shouldUpgrade && newStamps < gateStamps) { shouldUpgrade = false; toast.info(`⚠️ Belum cukup stamp untuk naik level (${newStamps}/${gateStamps})`); }

      if (shouldUpgrade) {
        upgradedLevel = nextLevel;
        updatePayload.membership_level_id = nextLevel.id;
        updatePayload.membership_level_name = nextLevel.level_name;
        updatePayload.membership_points = 0;
        updatePayload.stamps = 0;
      }
    }
  }

  await Customer.update(customer.id, updatePayload);

  if (upgradedLevel) {
    toast.success(`🎉 ${customer.name} naik level ke ${upgradedLevel.icon} ${upgradedLevel.level_name}!`, { duration: 5000 });
    toast.info(`Mulai mengumpulkan stamp dari awal untuk level ${upgradedLevel.level_name}`);
  } else if (stampsEarned > 0) {
    toast.success(`🎫 +1 Stamp! Total: ${Math.floor(newPoints / 10)} stamp`, { duration: 3000 });
  }
}