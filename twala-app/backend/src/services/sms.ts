import config from '../config.js';

export interface SmsResult {
  success: boolean;
  message: string;
  recipient?: string;
}

function buildSmsContent(params: {
  recipientName: string;
  amountUgx: number;
  senderName: string;
}): string {
  const ref = `TW-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const date = new Date().toLocaleDateString('en-UG', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  return [
    `TWAALA`,
    ``,
    `Hi ${params.recipientName},`,
    ``,
    `UGX ${params.amountUgx.toLocaleString()} has been sent to you by ${params.senderName}.`,
    ``,
    `Reference: ${ref}`,
    `Date: ${date}`,
    ``,
    `Thank you for using Twaala.`,
  ].join('\n');
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/[\s\-\(\)]/g, '');
  return digits.startsWith('+') ? digits : `+${digits}`;
}

function logToConsole(phone: string, message: string) {
  console.log(`  📱 SMS → ${phone}:\n${'-'.repeat(40)}\n${message}\n${'-'.repeat(40)}`);
}

async function trySendViaApi(to: string, message: string): Promise<SmsResult | null> {
  const { apiKey, username, sandboxUrl, baseUrl } = config.africasTalking;
  if (!apiKey) return null;

  const body = new URLSearchParams({ username, to, message, bulkSMSMode: '1' });

  const entries: { url: string; label: string }[] = [
    { url: `${sandboxUrl}/messaging`, label: 'sandbox' },
    { url: `${sandboxUrl}/messaging`, label: 'sandbox' },
    { url: `${baseUrl}/messaging`, label: 'live' },
  ];

  for (const { url, label } of entries) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', apikey: apiKey, Accept: 'application/json' },
        body: body.toString(),
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        return { success: true, message: `SMS sent (${label})`, recipient: to };
      }
      if (res.status !== 401) {
        return { success: false, message: `AT ${label}: HTTP ${res.status}`, recipient: to };
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function sendTransferNotification(params: {
  phoneNumber: string;
  recipientName: string;
  amountUgx: number;
  amountUsdc: number;
  senderName: string;
}): Promise<SmsResult> {
  const phone = formatPhone(params.phoneNumber || '');
  if (!phone) {
    return { success: false, message: 'No phone number provided' };
  }
  const message = buildSmsContent({
    recipientName: params.recipientName,
    amountUgx: params.amountUgx,
    senderName: params.senderName,
  });

  if (!config.africasTalking.apiKey) {
    logToConsole(phone, message);
    return { success: true, message: 'SMS logged (AT key not configured)', recipient: phone };
  }

  const apiResult = await trySendViaApi(phone, message);
  if (apiResult && apiResult.success) {
    console.log(`  ✅ SMS sent to ${phone}`);
    return apiResult;
  }

  console.warn(`  ⚠️ AT SMS unavailable (${apiResult?.message || 'auth failed'}) — logging to console`);
  logToConsole(phone, message);
  return { success: true, message: 'SMS logged to console (AT unavailable)', recipient: phone };
}

export async function sendTransferNotificationAsync(params: {
  phoneNumber: string;
  recipientName: string;
  amountUgx: number;
  amountUsdc: number;
  senderName: string;
}): Promise<void> {
  try {
    await sendTransferNotification(params);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logToConsole(formatPhone(params.phoneNumber || ''), buildSmsContent({
      recipientName: params.recipientName,
      amountUgx: params.amountUgx,
      senderName: params.senderName,
    }));
    console.warn(`  ⚠️ SMS error: ${msg}`);
  }
}
