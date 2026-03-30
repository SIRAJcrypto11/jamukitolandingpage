/**
 * PAYMENT GATEWAY HELPER
 * Abstract layer untuk multiple payment gateways
 */

import { base44 } from '@/api/base44Client';

/**
 * Get active payment gateways
 */
export const getActiveGateways = async () => {
  try {
    const gateways = await base44.entities.PaymentGatewaySettings.filter({
      is_active: true
    });
    return gateways || [];
  } catch (error) {
    console.error('Error fetching gateways:', error);
    return [];
  }
};

/**
 * Get gateway by name
 */
export const getGatewayByName = async (gatewayName) => {
  try {
    const gateways = await base44.entities.PaymentGatewaySettings.filter({
      gateway_name: gatewayName,
      is_active: true
    });
    return gateways && gateways.length > 0 ? gateways[0] : null;
  } catch (error) {
    console.error('Error fetching gateway:', error);
    return null;
  }
};

/**
 * Create payment via selected gateway
 */
export const createPayment = async (gatewayName, paymentData) => {
  const gatewayFunctions = {
    'tripay': 'createTripayPayment',
    'stripe': 'createStripePayment',
    'paypal': 'createPaypalPayment',
    'midtrans': 'createMidtransPayment'
  };

  const functionName = gatewayFunctions[gatewayName];
  if (!functionName) {
    throw new Error(`Gateway ${gatewayName} not supported`);
  }

  try {
    const response = await base44.functions.invoke(functionName, paymentData);
    return response.data;
  } catch (error) {
    console.error(`Error creating ${gatewayName} payment:`, error);
    throw error;
  }
};

/**
 * Get gateway display info
 */
export const getGatewayInfo = (gatewayName) => {
  const gatewayInfoMap = {
    'tripay': {
      name: 'Tripay',
      description: 'Payment Gateway Indonesia',
      logo: 'https://tripay.co.id/asset/images/logo.png',
      color: 'from-blue-500 to-blue-600',
      supportedMethods: ['bank_transfer', 'e-wallet', 'retail']
    },
    'stripe': {
      name: 'Stripe',
      description: 'International Payment Gateway',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg',
      color: 'from-purple-500 to-purple-600',
      supportedMethods: ['credit_card', 'debit_card', 'google_pay', 'apple_pay']
    },
    'paypal': {
      name: 'PayPal',
      description: 'Global Payment Platform',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg',
      color: 'from-blue-400 to-blue-500',
      supportedMethods: ['paypal_account', 'credit_card']
    },
    'midtrans': {
      name: 'Midtrans',
      description: 'Payment Gateway Indonesia',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Midtrans_logo.svg',
      color: 'from-green-500 to-green-600',
      supportedMethods: ['bank_transfer', 'e-wallet', 'credit_card', 'convenience_store']
    }
  };

  return gatewayInfoMap[gatewayName] || {
    name: gatewayName,
    description: 'Payment Gateway',
    logo: null,
    color: 'from-gray-500 to-gray-600',
    supportedMethods: []
  };
};

/**
 * Format gateway credentials for display
 */
export const formatCredentials = (gateway) => {
  const credentialMaps = {
    'tripay': ['api_key', 'private_key', 'merchant_code'],
    'stripe': ['publishable_key', 'secret_key'],
    'paypal': ['client_id', 'client_secret'],
    'midtrans': ['server_key', 'client_key', 'merchant_id']
  };

  const requiredFields = credentialMaps[gateway.gateway_name] || [];
  const credentials = {};

  requiredFields.forEach(field => {
    credentials[field] = gateway[field] || '';
  });

  return credentials;
};

/**
 * Validate gateway configuration
 */
export const validateGatewayConfig = (gatewayName, config) => {
  const requiredFields = {
    'tripay': ['api_key', 'private_key', 'merchant_code'],
    'stripe': ['publishable_key', 'secret_key'],
    'paypal': ['client_id', 'client_secret'],
    'midtrans': ['server_key', 'client_key', 'merchant_id']
  };

  const required = requiredFields[gatewayName] || [];
  const missing = required.filter(field => !config[field]);

  if (missing.length > 0) {
    return {
      valid: false,
      missing: missing,
      message: `Missing required fields: ${missing.join(', ')}`
    };
  }

  return { valid: true, missing: [], message: 'Configuration valid' };
};