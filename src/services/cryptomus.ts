import crypto from 'crypto';
import { API_CALL } from 'auth-fingerprint';

const CRYPTOMUS_API_URL = 'https://api.cryptomus.com/v1';

interface CreateInvoiceParams {
    amount: number;
    currency?: string;
    orderId: string;
    merchantId?: string;
    apiKey?: string;
}

interface CreateInvoiceResponse {
    url: string;
    invoiceId: string;
}

function generateSign(body: object, apiKey: string): string {
    const json = JSON.stringify(body);
    const base64 = Buffer.from(json).toString('base64');
    return crypto.createHash('md5').update(base64 + apiKey).digest('hex');
}

export async function createInvoice(params: CreateInvoiceParams): Promise<CreateInvoiceResponse> {
    const { amount, currency = 'USD', orderId, merchantId, apiKey } = params;

    if (!merchantId || !apiKey) {
        const err: any = new Error('Cryptomus payment gateway not configured or invalid credentials. Contact support.');
        err.response = { status: 401 };
        throw err;
    }

    const payload = {
        amount: amount.toFixed(2),
        currency,
        order_id: orderId,
    };

    const sign = generateSign(payload, apiKey);

    const res = await API_CALL({
        method: 'POST',
        url: '/payment',
        baseURL: CRYPTOMUS_API_URL,
        body: payload,
        headers: {
            'merchant': merchantId,
            'sign': sign,
        },
    });

    if (res.status >= 400) {
        const msg: string = res.response?.message || 'Cryptomus payment error';
        const err: any = new Error(msg);
        err.response = { status: msg.toLowerCase().includes('merchant') || msg.toLowerCase().includes('sign') ? 401 : 502 };
        throw err;
    }

    const data = res.response;

    if (!data?.result?.url || !data?.result?.uuid) {
        const msg: string = data?.message || 'Cryptomus: unexpected response';
        const err: any = new Error(msg);
        err.response = { status: msg.toLowerCase().includes('merchant') || msg.toLowerCase().includes('sign') ? 401 : 502 };
        throw err;
    }

    return {
        url: data.result.url,
        invoiceId: data.result.uuid,
    };
}
