import config from '../config.js';

export interface SmsResult {
  success: boolean;
  message: string;
  recipient?: string;
}

function isDemoMode(): boolean {
  return !config.africasTalking.apiKey;
}

async function sendViaApi(to: string, message: string): Promise<SmsResult> {
  try {
    const params = new URLSearchParams({
      username: config.africasTalking.username,
      to,
      message,
    });
    if (config.africasTalking.senderId && config.africasTalking.username !== 'sandbox') {
      params.append('from', config.africasTalking.senderId);
    }

    const url = `${config.africasTalking.baseUrl}/messaging`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'apiKey': config.africasTalking.apiKey,
        'Accept': 'application/json',
      },
      body: params.toString(),
      signal: AbortSignal.timeout(8000),
    });

    const data = await res.json() as any;
    if (res.ok && data?.SMSMessageData?.Recipients?.[0]?.status === 'Success') {
      return { success: true, message: 'SMS sent', recipient: to };
    }
    const errMsg = data?.SMSMessageData?.Message || data?.error || `HTTP ${res.status}`;
    return { success: false, message: `SMS failed: ${errMsg}`, recipient: to };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `SMS error: ${msg}`, recipient: to };
  }
}

function buildSmsContent(params: {
  recipientName: string;
  amountUgx: number;
  amountUsdc: number;
  senderName: string;
}): string {
  const ref = `TWALA-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const date = new Date().toLocaleDateString('en-UG', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  return [
    `TWALA`,
    ``,
    `Hi ${params.recipientName},`,
    ``,
    `You've received UGX ${params.amountUgx.toLocaleString()} from ${params.senderName}.`,
    `Converted from $${params.amountUsdc.toFixed(2)} USDC at 1 USDC = UGX ${(params.amountUgx / params.amountUsdc).toFixed(0)}.`,
    ``,
    `Reference: ${ref}`,
    `Date: ${date}`,
    ``,
    `Sent via Twala — Secure cross-border payments`,
  ].join('\n');
}

export async function sendTransferNotification(params: {
  phoneNumber: string;
  recipientName: string;
  amountUgx: number;
  amountUsdc: number;
  senderName: string;
}): Promise<SmsResult> {
  if (isDemoMode()) {
    const message = buildSmsContent(params);
    console.log(`  📱 SMS (demo) → ${params.phoneNumber}:\n${'-'.repeat(40)}\n${message}\n${'-'.repeat(40)}`);
    return { success: true, message: 'SMS logged (demo mode)', recipient: params.phoneNumber };
  }

  if (!params.phoneNumber) {
    return { success: false, message: 'No phone number provided' };
  }

  const formattedPhone = params.phoneNumber.startsWith('+') ? params.phoneNumber : `+${params.phoneNumber}`;
  return sendViaApi(formattedPhone, buildSmsContent(params));
}

export async function sendTransferNotificationAsync(params: {
  phoneNumber: string;
  recipientName: string;
  amountUgx: number;
  amountUsdc: number;
  senderName: string;
}): Promise<void> {
  try {
    const result = await sendTransferNotification(params);
    if (result.success) {
      console.log(`  ✅ SMS sent to ${params.phoneNumber}`);
    } else {
      console.warn(`  ⚠️ SMS: ${result.message}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`  ⚠️ SMS error: ${msg}`);
  }
}
