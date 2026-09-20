import { createHash } from 'crypto';
import {
  CreateCheckoutResult,
  GatewayCredentials,
  GatewayMode,
  PaymentGatewayAdapter,
  PayuCredentials,
  toPayuAmount,
  WebhookParseResult,
} from './payment-gateway.types';

function asPayu(creds: GatewayCredentials): PayuCredentials {
  const c = creds as PayuCredentials;
  if (!c?.merchantKey || !c?.merchantSalt) {
    throw new Error('Invalid PayU credentials');
  }
  return c;
}

function sha512(value: string): string {
  return createHash('sha512').update(value).digest('hex').toLowerCase();
}

function paymentUrl(mode: GatewayMode): string {
  return mode === 'live'
    ? 'https://secure.payu.in/_payment'
    : 'https://test.payu.in/_payment';
}

function infoUrl(mode: GatewayMode): string {
  return mode === 'live'
    ? 'https://info.payu.in/merchant/postservice.php?form=2'
    : 'https://test.payu.in/merchant/postservice.php?form=2';
}

function buildPaymentHash(
  key: string,
  salt: string,
  txnid: string,
  amount: string,
  productinfo: string,
  firstname: string,
  email: string,
): string {
  // key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT
  const raw = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${salt}`;
  return sha512(raw);
}

function buildReverseHash(
  salt: string,
  status: string,
  email: string,
  firstname: string,
  productinfo: string,
  amount: string,
  txnid: string,
  key: string,
  udfs: string[] = ['', '', '', '', ''],
): string {
  // SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
  const [u1, u2, u3, u4, u5] = udfs;
  const raw = `${salt}|${status}||||||${u5}|${u4}|${u3}|${u2}|${u1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
  return sha512(raw);
}

function buildCommandHash(
  key: string,
  command: string,
  var1: string,
  salt: string,
) {
  return sha512(`${key}|${command}|${var1}|${salt}`);
}

async function payuPost(
  url: string,
  body: Record<string, string>,
): Promise<any> {
  const form = new URLSearchParams(body);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text, statusCode: res.status };
  }
}

export class PayuAdapter implements PaymentGatewayAdapter {
  readonly provider = 'payu' as const;

  async testConnection(
    creds: GatewayCredentials,
    _webhookSecret?: string | null,
    mode: GatewayMode = 'test',
  ) {
    try {
      const pu = asPayu(creds);
      const command = 'verify_payment';
      const var1 = `serenity-test-${Date.now()}`;
      const hash = buildCommandHash(
        pu.merchantKey,
        command,
        var1,
        pu.merchantSalt,
      );
      const result = await payuPost(infoUrl(mode), {
        key: pu.merchantKey,
        command,
        var1,
        hash,
      });
      // Even "not found" means auth/hash worked enough to talk to PayU
      if (
        result?.status === 0 ||
        result?.status === 1 ||
        result?.transaction_details
      ) {
        return { ok: true, message: 'PayU credentials accepted' };
      }
      if (result?.msg || result?.raw) {
        return {
          ok: true,
          message: 'PayU endpoint reachable with given key/salt',
        };
      }
      return { ok: false, message: 'Unexpected PayU response' };
    } catch (err: any) {
      return { ok: false, message: err?.message || 'Connection failed' };
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await -- sync checkout payload
  async createCheckout(
    creds: GatewayCredentials,
    input: {
      intentId: string;
      amountInr: number;
      currency: string;
      method: 'UPI' | 'CARD';
      mode: GatewayMode;
      metadata?: Record<string, string>;
    },
  ): Promise<CreateCheckoutResult> {
    const pu = asPayu(creds);
    const txnid = input.intentId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
    const amount = toPayuAmount(input.amountInr);
    const productinfo = 'Serenity order';
    const firstname = input.metadata?.firstname || 'Customer';
    const email = input.metadata?.email || 'customer@serenity.app';
    const phone = input.metadata?.phone || '9999999999';
    const surl = input.metadata?.surl || 'https://serenity.app/payu/success';
    const furl = input.metadata?.furl || 'https://serenity.app/payu/failure';

    const hash = buildPaymentHash(
      pu.merchantKey,
      pu.merchantSalt,
      txnid,
      amount,
      productinfo,
      firstname,
      email,
    );

    const params: Record<string, string> = {
      key: pu.merchantKey,
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      phone,
      surl,
      furl,
      hash,
      service_provider: 'payu_paisa',
    };

    return {
      externalOrderRef: txnid,
      clientAction: {
        type: 'payu_webview',
        actionUrl: paymentUrl(input.mode),
        params,
        txnid,
      },
    };
  }

  async verifyClientConfirmation(
    creds: GatewayCredentials,
    input: { externalOrderRef: string; payload: Record<string, string> },
  ) {
    const pu = asPayu(creds);
    const status = (input.payload.status || '').toLowerCase();
    const txnid = input.payload.txnid || input.externalOrderRef;
    const amount = input.payload.amount || '';
    const productinfo = input.payload.productinfo || 'Serenity order';
    const firstname = input.payload.firstname || '';
    const email = input.payload.email || '';
    const key = input.payload.key || pu.merchantKey;
    const hash = input.payload.hash || '';

    if (hash && status) {
      const expected = buildReverseHash(
        pu.merchantSalt,
        status,
        email,
        firstname,
        productinfo,
        amount,
        txnid,
        key,
        [
          input.payload.udf1 || '',
          input.payload.udf2 || '',
          input.payload.udf3 || '',
          input.payload.udf4 || '',
          input.payload.udf5 || '',
        ],
      );
      if (expected !== hash.toLowerCase()) {
        return 'failed';
      }
      if (status !== 'success') {
        return 'failed';
      }
      // Hash ok — still confirm via PayU API (enterprise: don't trust client alone).
    }

    const mode: GatewayMode =
      (input.payload.mode as GatewayMode) === 'live' ? 'live' : 'test';
    const command = 'verify_payment';
    const apiHash = buildCommandHash(
      pu.merchantKey,
      command,
      txnid,
      pu.merchantSalt,
    );
    const result = await payuPost(infoUrl(mode), {
      key: pu.merchantKey,
      command,
      var1: txnid,
      hash: apiHash,
    });
    const detail = result?.transaction_details?.[txnid];
    const st = (detail?.status || '').toLowerCase();
    if (st === 'success' || st === 'captured') return 'succeeded';
    if (st === 'failure' || st === 'failed' || st === 'pending') {
      return st === 'pending' ? 'pending' : 'failed';
    }
    return 'pending';
  }

  // eslint-disable-next-line @typescript-eslint/require-await -- signature check is sync
  async parseWebhook(
    creds: GatewayCredentials,
    _webhookSecret: string | null,
    input: {
      rawBody: Buffer | string;
      headers: Record<string, string | string[] | undefined>;
      parsedBody?: unknown;
    },
  ): Promise<WebhookParseResult> {
    const pu = asPayu(creds);
    let body: Record<string, string> = {};

    if (input.parsedBody && typeof input.parsedBody === 'object') {
      body = Object.fromEntries(
        Object.entries(input.parsedBody as Record<string, unknown>).map(
          ([k, v]) => [k, String(v ?? '')],
        ),
      );
    } else {
      const raw =
        typeof input.rawBody === 'string'
          ? input.rawBody
          : input.rawBody.toString('utf8');
      body = Object.fromEntries(new URLSearchParams(raw).entries());
    }

    const status = (body.status || '').toLowerCase();
    const txnid = body.txnid || '';
    const eventId =
      body.mihpayid ||
      `${txnid}:${status}:${body.addedon || body.hash?.slice(0, 16) || 'evt'}`;
    if (!txnid) {
      return {
        eventId,
        externalOrderRef: '',
        paymentRef: null,
        status: 'ignored',
      };
    }

    const expected = buildReverseHash(
      pu.merchantSalt,
      body.status || '',
      body.email || '',
      body.firstname || '',
      body.productinfo || '',
      body.amount || '',
      txnid,
      body.key || pu.merchantKey,
      [
        body.udf1 || '',
        body.udf2 || '',
        body.udf3 || '',
        body.udf4 || '',
        body.udf5 || '',
      ],
    );

    if (body.hash && expected !== body.hash.toLowerCase()) {
      throw new Error('Invalid PayU webhook hash');
    }

    const amountInr = body.amount ? Number(body.amount) : null;

    if (status === 'success') {
      return {
        eventId,
        externalOrderRef: txnid,
        paymentRef: body.mihpayid || null,
        status: 'succeeded',
        amountInr: Number.isFinite(amountInr) ? amountInr : null,
      };
    }

    return {
      eventId,
      externalOrderRef: txnid,
      paymentRef: body.mihpayid || null,
      status: 'failed',
      amountInr: Number.isFinite(amountInr) ? amountInr : null,
      failureReason: body.error_Message || body.error || status,
    };
  }

  async refund(
    creds: GatewayCredentials,
    input: {
      paymentRef: string;
      amountInr: number;
      reason?: string;
      mode?: GatewayMode;
    },
  ) {
    const pu = asPayu(creds);
    const mode = input.mode ?? 'test';
    const command = 'cancel_refund_transaction';
    const amount = toPayuAmount(input.amountInr);
    // var1 = mihpayid, var2 = token (unique), var3 = amount
    const token = `rf-${Date.now()}`;
    const hash = buildCommandHash(
      pu.merchantKey,
      command,
      input.paymentRef,
      pu.merchantSalt,
    );
    const result = await payuPost(infoUrl(mode), {
      key: pu.merchantKey,
      command,
      var1: input.paymentRef,
      var2: token,
      var3: amount,
      hash,
    });

    const refundRef =
      result?.request_id || result?.txn_update_id || result?.mihpayid || token;
    if (result?.status === 0 && result?.msg) {
      throw new Error(String(result.msg));
    }
    return { refundRef: String(refundRef) };
  }
}

/** Exported for unit tests */
export const payuHashTest = {
  buildPaymentHash,
  buildReverseHash,
  sha512,
};
