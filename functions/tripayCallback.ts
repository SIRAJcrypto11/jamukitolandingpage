import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    console.log('');
    console.log('═════════════════════════════════════════════════');
    console.log('🔔 TRIPAY CALLBACK RECEIVED');
    console.log('⏰ Time:', new Date().toISOString());
    console.log('═════════════════════════════════════════════════');
    
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError);
      return Response.json({ success: false, message: 'Invalid JSON' }, { status: 400 });
    }
    
    console.log('📦 Callback Body:', JSON.stringify(body, null, 2));
    console.log('');
    
    const base44 = createClientFromRequest(req);
    
    // ✅ LOAD PRIVATE KEY
    let privateKey = null;
    
    try {
      const settings = await base44.asServiceRole.entities.PaymentGatewaySettings.filter({
        gateway_name: 'tripay'
      });
      
      if (settings && settings.length > 0 && settings[0].private_key) {
        privateKey = settings[0].private_key;
        console.log('✅ Private Key loaded from DATABASE');
      }
    } catch (dbError) {
      console.warn('⚠️ Database error:', dbError.message);
    }
    
    if (!privateKey) {
      privateKey = Deno.env.get('TRIPAY_PRIVATE_KEY');
      if (privateKey) {
        console.log('✅ Private Key loaded from ENVIRONMENT');
      }
    }
    
    if (!privateKey) {
      console.error('❌ NO PRIVATE KEY!');
      return Response.json({ success: false }, { status: 500 });
    }
    
    // ✅ VALIDATE SIGNATURE (HMAC-SHA256)
    const callbackSignature = req.headers.get('X-Callback-Signature');
    
    console.log('🔐 SIGNATURE VALIDATION:');
    console.log('   Received:', callbackSignature);
    
    if (!callbackSignature) {
      console.error('❌ Missing X-Callback-Signature header!');
      return Response.json({ success: false }, { status: 403 });
    }
    
    // ✅ CORRECT METHOD: HMAC-SHA256 (sesuai dokumentasi Tripay)
    const jsonString = JSON.stringify(body);
    
    const encoder = new TextEncoder();
    const keyData = encoder.encode(privateKey);
    const messageData = encoder.encode(jsonString);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    const computedSignature = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    console.log('   Computed:', computedSignature);
    console.log('   Match:', computedSignature === callbackSignature ? '✅ YES' : '❌ NO');
    
    if (callbackSignature !== computedSignature) {
      console.error('❌ SIGNATURE INVALID!');
      console.error('   Expected:', callbackSignature);
      console.error('   Got:', computedSignature);
      return Response.json({ success: false }, { status: 403 });
    }
    
    console.log('✅ SIGNATURE VALID!');
    console.log('');
    
    // ✅ EXTRACT DATA
    const reference = body.reference;
    const status = body.status;
    
    console.log('💳 Transaction:');
    console.log('   Reference:', reference);
    console.log('   Status:', status);
    console.log('');
    
    // ✅ FIND TRANSACTION
    const transactions = await base44.asServiceRole.entities.PaymentTransaction.filter({
      reference_id: reference
    });
    
    if (!transactions || transactions.length === 0) {
      console.error('❌ Transaction not found:', reference);
      return Response.json({ success: false }, { status: 404 });
    }
    
    const transaction = transactions[0];
    console.log('✅ Found:', transaction.id);
    console.log('   User:', transaction.user_email);
    console.log('   Purpose:', transaction.payment_purpose);
    console.log('   Amount:', transaction.amount);
    console.log('');
    
    // ✅ MAP STATUS
    let newStatus = 'UNPAID';
    if (status === 'PAID') newStatus = 'PAID';
    else if (status === 'EXPIRED') newStatus = 'EXPIRED';
    else if (status === 'FAILED') newStatus = 'FAILED';
    else if (status === 'REFUND') newStatus = 'REFUND';
    
    // ✅ UPDATE TRANSACTION
    await base44.asServiceRole.entities.PaymentTransaction.update(transaction.id, {
      status: newStatus,
      callback_data: body,
      paid_at: status === 'PAID' ? new Date().toISOString() : null
    });
    
    console.log('✅ Status updated:', newStatus);
    console.log('');
    
    // ✅ PROCESS IF PAID
    if (status === 'PAID') {
      console.log('💰 PAYMENT SUCCESS - PROCESSING...');
      console.log('═════════════════════════════════════════════════');
      
      // ✅ DEPOSIT
      if (transaction.payment_purpose === 'deposit') {
        console.log('💵 DEPOSIT PROCESSING...');
        
        try {
          const users = await base44.asServiceRole.entities.User.filter({ 
            id: transaction.user_id 
          });
          
          if (users && users.length > 0) {
            const targetUser = users[0];
            const oldBalance = targetUser.balance || 0;
            const newBalance = oldBalance + transaction.amount;
            
            console.log('💰 UPDATING BALANCE:');
            console.log('   User:', targetUser.email);
            console.log('   Old:', oldBalance);
            console.log('   +Amount:', transaction.amount);
            console.log('   New:', newBalance);
            
            await base44.asServiceRole.entities.User.update(targetUser.id, {
              balance: newBalance
            });
            
            console.log('✅✅✅ BALANCE UPDATED! ✅✅✅');
            
            // ✅ UPDATE DEPOSIT REQUEST
            if (transaction.related_request_id) {
              try {
                await base44.asServiceRole.entities.DepositRequest.update(
                  transaction.related_request_id,
                  { status: 'approved', admin_notes: 'Auto-approved via Tripay' }
                );
              } catch (e) {
                console.warn('DepositRequest update failed:', e.message);
              }
            } else {
              try {
                await base44.asServiceRole.entities.DepositRequest.create({
                  user_id: targetUser.id,
                  user_email: targetUser.email,
                  user_full_name: targetUser.full_name || targetUser.email,
                  amount: transaction.amount,
                  proof_image_url: 'tripay_auto',
                  status: 'approved',
                  payment_method: 'tripay'
                });
              } catch (e) {
                console.warn('DepositRequest create failed:', e.message);
              }
            }
            
            // ✅ NOTIFICATION
            try {
              await base44.asServiceRole.entities.Notification.create({
                user_id: targetUser.email,
                title: "✅ Deposit Berhasil!",
                message: `+Rp ${transaction.amount.toLocaleString('id-ID')}. Saldo: Rp ${newBalance.toLocaleString('id-ID')}`,
                url: '/saldo'
              });
            } catch (e) {
              console.warn('Notification failed:', e.message);
            }
            
            console.log('✅ DEPOSIT COMPLETED!');
          }
        } catch (error) {
          console.error('❌ Deposit error:', error);
        }
      }
      
      // ✅ MEMBERSHIP
      else if (transaction.payment_purpose === 'upgrade_subscription' && transaction.related_request_id) {
        console.log('🚀 MEMBERSHIP UPGRADE...');
        
        try {
          const upgradeRequests = await base44.asServiceRole.entities.UpgradeRequest.filter({
            id: transaction.related_request_id
          });
          
          if (upgradeRequests && upgradeRequests.length > 0) {
            const request = upgradeRequests[0];
            console.log('   Request:', request.id);
            console.log('   Plan:', request.requested_plan);
            
            const users = await base44.asServiceRole.entities.User.filter({ 
              email: request.user_email 
            });
            
            if (users && users.length > 0) {
              const targetUser = users[0];
              const now = new Date();
              
              const isYearly = request.billing_period === 'yearly';
              const subscriptionEnd = new Date(now); 
              if (isYearly) {
                subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + 1);
              } else {
                subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);
              }

              let newAdminTier = 'none';
              if (request.requested_plan === 'business') newAdminTier = 'business';
              else if (request.requested_plan === 'advanced') newAdminTier = 'advanced';
              else if (request.requested_plan === 'enterprise') newAdminTier = 'enterprise';
              
              await base44.asServiceRole.entities.User.update(targetUser.id, {
                subscription_plan: request.requested_plan,
                membership_start_date: now.toISOString().split('T')[0],
                membership_end_date: subscriptionEnd.toISOString().split('T')[0],
                membership_duration_type: isYearly ? 'yearly' : 'monthly',
                admin_tier: newAdminTier,
                trial_plan: null,
                trial_expires: null
              });
              
              console.log('✅✅✅ MEMBERSHIP UPGRADED! ✅✅✅');
              
              // ✅ COMMISSION
              if (targetUser.referred_by) {
                const existingCommissions = await base44.asServiceRole.entities.Commission.filter({ 
                  purchase_id: request.id
                });
                
                if (!existingCommissions || existingCommissions.length === 0) {
                  const allCommissions = await base44.asServiceRole.entities.Commission.filter({ 
                    referee_id: targetUser.id 
                  });
                  
                  const isFirst = allCommissions.length === 0;
                  
                  const settings = await base44.asServiceRole.entities.ReferralSetting.filter({ 
                    plan_key: request.requested_plan 
                  });
                  
                  let rate = 0.15;
                  if (settings.length > 0) {
                    rate = isFirst ? settings[0].first_purchase_commission_rate : settings[0].renewal_commission_rate;
                  }
                  
                  const commissionAmount = (request.price_paid || 0) * rate;
                  
                  await base44.asServiceRole.entities.Commission.create({
                    referrer_id: targetUser.referred_by,
                    referee_id: targetUser.id,
                    purchase_id: request.id,
                    purchase_amount: request.price_paid,
                    commission_rate: rate,
                    commission_amount: commissionAmount,
                    plan_purchased: request.requested_plan,
                    purchase_type: isFirst ? 'first_time' : 'renewal',
                    status: 'paid_to_balance'
                  });
                  
                  const referrers = await base44.asServiceRole.entities.User.filter({ 
                    email: targetUser.referred_by 
                  });
                  
                  if (referrers.length > 0) {
                    const ref = referrers[0];
                    await base44.asServiceRole.entities.User.update(ref.id, {
                      commission_balance: (ref.commission_balance || 0) + commissionAmount,
                      total_earnings: (ref.total_earnings || 0) + commissionAmount
                    });
                    
                    try {
                      await base44.asServiceRole.entities.Notification.create({
                        user_id: ref.email,
                        title: "💰 Komisi!",
                        message: `+Rp ${commissionAmount.toLocaleString('id-ID')} dari ${targetUser.full_name || targetUser.email}`,
                        url: '/referral'
                      });
                    } catch (e) {
                      console.warn('Referrer notif failed');
                    }
                  }
                  
                  if (isFirst) {
                    const refs = await base44.asServiceRole.entities.Referral.filter({
                      referrer_id: targetUser.referred_by,
                      referee_id: targetUser.id
                    });
                    for (const r of refs) {
                      await base44.asServiceRole.entities.Referral.update(r.id, { status: 'purchased' });
                    }
                  }
                }
              }
              
              // ✅ UPDATE REQUEST
              await base44.asServiceRole.entities.UpgradeRequest.update(request.id, {
                status: 'approved',
                proof_image_url: 'tripay_auto',
                admin_notes: 'Auto-approved via Tripay'
              });
              
              // ✅ VOUCHER
              if (request.voucher_code_used) {
                const vouchers = await base44.asServiceRole.entities.Voucher.filter({ 
                  code: request.voucher_code_used 
                });
                if (vouchers.length > 0) {
                  await base44.asServiceRole.entities.Voucher.update(vouchers[0].id, {
                    usage_count: (vouchers[0].usage_count || 0) + 1
                  });
                }
              }
              
              // ✅ NOTIFICATION
              try {
                await base44.asServiceRole.entities.Notification.create({
                  user_id: request.user_email,
                  title: "✅ Membership Aktif!",
                  message: `Membership ${request.requested_plan.toUpperCase()} aktif! Refresh halaman.`,
                  url: '/dashboard'
                });
              } catch (e) {
                console.warn('User notif failed');
              }
              
              console.log('✅ MEMBERSHIP COMPLETED!');
            }
          }
        } catch (error) {
          console.error('❌ Membership error:', error);
        }
      }
      
      // ✅ ADDON
      else if (transaction.payment_purpose === 'addon_purchase' && transaction.related_request_id) {
        console.log('🎁 Addon...');
        
        try {
          const addonRequests = await base44.asServiceRole.entities.AddonRequest.filter({
            id: transaction.related_request_id
          });
          
          if (addonRequests && addonRequests.length > 0) {
            await base44.asServiceRole.entities.AddonRequest.update(
              addonRequests[0].id,
              { status: 'approved' }
            );
            
            try {
              await base44.asServiceRole.entities.Notification.create({
                user_id: transaction.user_email,
                title: "✅ Add-on Aktif!",
                message: "Add-on berhasil!",
                url: '/dashboard'
              });
            } catch (e) {
              console.warn('Addon notif failed');
            }
          }
        } catch (error) {
          console.error('❌ Addon error:', error);
        }
      }
      
      console.log('═════════════════════════════════════════════════');
    }
    
    console.log('');
    console.log('✅ CALLBACK COMPLETED');
    console.log('═════════════════════════════════════════════════');
    console.log('');
    
    return Response.json({ success: true });
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
    return Response.json({ success: false }, { status: 500 });
  }
});