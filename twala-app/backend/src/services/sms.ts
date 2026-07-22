import config from '../config.js';

// ---------------------------------------------------------------------------
// Africa's Talking SMS — sends notifications to recipients
// In demo mode (no API key), logs to console instead
// ---------------------------------------------------------------------------

function isDemoMode(): boolean {
  return !config.africasTalking.apiKey;
}

export interface SmsResult {
  success: boolean;
  message: string;
  recipient?: string;
}

async function sendViaApi(to: string, message: string): Promise<SmsResult> {
  try {
    const params = new URLSearchParams({
      username: config.africasTalking.username,
      to,
      message,
    });
    // Only include 'from' if we have a non-sandbox sender ID (sandbox ignores custom IDs)
    if (config.africasTalking.senderId && config.africasTalking.username !== 'sandbox') {
      params.append('from', config.africasTalking.senderId);
    }

    const res = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'apiKey': config.africasTalking.apiKey,
        'Accept': 'application/json',
      },
      body: params.toString(),
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json() as any;
    if (res.ok && data?.SMSMessageData?.Recipients?.[0]?.status === 'Success') {
      return { success: true, message: 'SMS sent', recipient: to };
    }
    const errMsg = data?.SMSMessageData?.Message || data?.error || 'Unknown error';
    return { success: false, message: `SMS API error: ${errMsg}`, recipient: to };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `SMS network error: ${msg}`, recipient: to };
  }
}

export async function sendTransferNotification(params: {
  phoneNumber: string;
  recipientName: string;
  amountUgx: number;
  amountUsdc: number;
  senderName?: string;
}): Promise<SmsResult> {
  const message = `Twala: ${params.senderName || 'Someone'} sent you UGX ${params.amountUgx.toLocaleString()} ($${params.amountUsdc.toFixed(2)} USDC). Check your mobile money wallet. Ref: TWALA-${Date.now().toString(36).toUpperCase().slice(-6)}`;

  if (isDemoMode()) {
    console.log(`  📱 SMS (demo) → ${params.phoneNumber}: "${message}"`);
    return { success: true, message: 'SMS logged (demo mode)', recipient: params.phoneNumber };
  }

  if (!params.phoneNumber) {
    return { success: false, message: 'No phone number provided' };
  }

  const formattedPhone = params.phoneNumber.startsWith('+') ? params.phoneNumber : `+${params.phoneNumber}`;
  return sendViaApi(formattedPhone, message);
}

// Africa's Talking sandbox test numbers: +254711XXXYYY, +254733YYYZZZ
export function isValidPhoneNumber(phone: string): boolean {
  return /^\+?256\d{9}$/.test(phone) || /^\+?254\d{9}$/.test(phone);
}
