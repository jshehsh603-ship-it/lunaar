/**
 * PayPal API Integration Utilities
 */

const getPayPalBaseUrl = (): string => {
  const mode = process.env.PAYPAL_MODE || 'sandbox';
  return mode === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
};

/**
 * Fetches an OAuth 2.0 access token from PayPal using client credentials
 */
export async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('PayPal Client ID or Client Secret environment variable is missing.');
  }

  const baseUrl = getPayPalBaseUrl();
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to retrieve PayPal access token: ${response.status} ${errorText}`);
  }

  const data = await response.json() as { access_token: string };
  return data.access_token;
}

interface PayPalOrderResponse {
  id: string;
  status: string;
  purchase_units: Array<{
    amount: {
      currency_code: string;
      value: string;
    };
  }>;
}

/**
 * Fetches order details from PayPal for verification
 */
export async function verifyPayPalOrder(orderId: string): Promise<PayPalOrderResponse> {
  const accessToken = await getPayPalAccessToken();
  const baseUrl = getPayPalBaseUrl();

  const response = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch PayPal order details: ${response.status} ${errorText}`);
  }

  return await response.json() as PayPalOrderResponse;
}

interface PayPalCardDetails {
  number: string;
  expiry: string; // Format: YYYY-MM
  securityCode: string;
  name: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
}

/**
 * Creates and captures a payment immediately using PayPal's direct card processing source
 */
export async function processPayPalCardPayment(
  cardDetails: PayPalCardDetails,
  amount: string
): Promise<{ success: boolean; orderId?: string; error?: string }> {
  try {
    const accessToken = await getPayPalAccessToken();
    const baseUrl = getPayPalBaseUrl();

    const orderPayload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value: amount,
          },
        },
      ],
      payment_source: {
        card: {
          number: cardDetails.number,
          expiry: cardDetails.expiry,
          security_code: cardDetails.securityCode,
          name: cardDetails.name,
          billing_address: {
            address_line_1: cardDetails.streetAddress,
            admin_area_2: cardDetails.city,
            admin_area_1: cardDetails.state,
            postal_code: cardDetails.postalCode,
            country_code: cardDetails.countryCode,
          },
        },
      },
    };

    const requestId = `req-${Math.random().toString(36).substring(2, 11)}-${Date.now()}`;
    const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': requestId,
      },
      body: JSON.stringify(orderPayload),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      console.error('[PayPal Card Payment Error]', data);
      const detail = data.details?.[0]?.description || data.message || 'PayPal card processing failed.';
      return { success: false, error: detail };
    }

    if (data.status === 'COMPLETED' || data.status === 'APPROVED') {
      return { success: true, orderId: data.id };
    } else {
      return { success: false, error: `Transaction status: ${data.status}` };
    }
  } catch (error: any) {
    console.error('[PayPal Card Payment Exception]', error);
    return { success: false, error: error.message || 'Server exception during PayPal card capture.' };
  }
}
