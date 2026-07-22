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
  if (!config.africasTalking.apiKey) return null;
  const body = new URLSearchParams({ username: config.africasTalking.username, to, message });

  const attempts: { name: string; url: string; headers: Record<string, string> }[] = [
    {
      name: 'api-key',
      url: `${config.africasTalking.baseUrl}/messaging`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'apikey': config.africasTalking.apiKey, 'Accept': 'application/json' },
    },
    {
      name: 'sandbox-url',
      url: `${config.africasTalking.sandboxUrl}/messaging`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'apikey': config.africasTalking.apiKey, 'Accept': 'application/json' },
    },
  ];

  for (const attempt of attempts) {
    try {
      const res = await fetch(attempt.url, {
        method: 'POST',
        headers: attempt.headers,
        body: body.toString(),
        signal: AbortSignal.timeout(10000),
      });
      const text = await res.text();
      if (res.status === 201 || res.status === 200) {
        let data: any;
        try { data = JSON.parse(text); } catch { continue; }
        if (data?.SMSMessageData?.Recipients?.[0]?.status === 'Success') {
          return { success: true, message: 'SMS sent', recipient: to };
        }
      }
      if (res.status !== 401) {
        return { success: false, message: `${attempt.name}: HTTP ${res.status}`, recipient: to };
      }
    } catch { continue; }
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
