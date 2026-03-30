import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@14.11.0';

Deno.serve(async (req) => {
  try {
    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('💳 STRIPE WEBHOOK RECEIVED');
    console.log('═══════════════════════════════════════════');

    const base44 = createClientFromRequest(req);

    // Get Stripe credentials
    let secretKey = null;
    let webhookSecret = null;
    
    try {
      const settings = await base44.asServiceRole.entities.PaymentGatewaySettings.filter({
        gateway_name: 'stripe',
        is_active: true
      });
      
      if (settings && settings.length > 0) {
        secretKey = settings[0].secret_key;
        webhookSecret = settings[0].webhook_secret;
      }
    } catch (dbError) {
      console.warn('⚠️ Database credentials not found');
    }

    if (!secretKey) {
      secretKey = Deno.env.get('STRIPE_SECRET_KEY');
    }
    if (!webhookSecret) {
      webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    }

    if (!secretKey) {
      return Response.json({
        success: false,
        message: 'Stripe not configured'
      }, { status: 400 });
    }

    const stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16'
    });

    // Get raw body and signature
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    let event;
    
    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        console.log('✅ Webhook signature verified');
      } catch (err) {
        console.error('❌ Webhook signature verification failed:', err.message);
        return Response.json({ error: 'Invalid signature' }, { status: 400 });
      }
    } else {
      event = JSON.parse(body);
      console.log('⚠️ No signature verification');
    }

    console.log('Event type:', event.type);

    // Handle different event types
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      console.log('Session ID:', session.id);
      console.log('Amount:', session.amount_total);

      // Find transaction
      const transactions = await base44.asServiceRole.entities.PaymentTransaction.filter({
        reference_id: session.id
      });

      if (transactions && transactions.length > 0) {
        const transaction = transactions[0];
        
        // Update transaction status
        await base44.asServiceRole.entities.PaymentTransaction.update(transaction.id, {
          status: 'PAID',
          callback_data: event.data.object
        });

        console.log('✅ Transaction updated:', transaction.id);

        // Process based on payment purpose
        if (transaction.payment_purpose === 'deposit') {
          // Update user balance
          const user = await base44.asServiceRole.entities.User.get({ id: transaction.user_id });
          
          await base44.asServiceRole.entities.User.update(user.id, {
            balance: (user.balance || 0) + transaction.amount
          });

          // Create/approve deposit request
          if (transaction.related_request_id) {
            await base44.asServiceRole.entities.DepositRequest.update(transaction.related_request_id, {
              status: 'approved'
            });
          } else {
            await base44.asServiceRole.entities.DepositRequest.create({
              user_id: user.id,
              user_email: user.email,
              user_full_name: user.full_name || user.email,
              amount: transaction.amount,
              proof_image_url: 'stripe_auto',
              status: 'approved',
              payment_method: 'stripe'
            });
          }

          // Send notification
          await base44.asServiceRole.entities.Notification.create({
            user_id: user.email,
            title: '✅ Deposit Berhasil',
            message: `Deposit Rp ${transaction.amount.toLocaleString('id-ID')} via Stripe telah berhasil`,
            url: '/saldo'
          });

          console.log('✅ Deposit processed for user:', user.email);
        }
      }
    }

    console.log('═══════════════════════════════════════════');
    console.log('');

    return Response.json({ received: true });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});