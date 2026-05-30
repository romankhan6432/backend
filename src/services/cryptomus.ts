import crypto from 'crypto';
import axios from 'axios';
import { env } from '@/config';

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

    const merchant = merchantId || env.CRYPTOMUS_MERCHANT_ID;
    const key = apiKey || env.CRYPTOMUS_API_KEY;

    if (!merchant || !key) {
        const err: any = new Error('Cryptomus payment gateway not configured or invalid credentials. Contact support.');
        err.response = { status: 401 };
        throw err;
    }

    const payload = {
        amount: amount.toFixed(2),
        currency,
        order_id: orderId,
    };

    const sign = generateSign(payload, key);

    let res: any;
    try {
        res = await axios.post(`${CRYPTOMUS_API_URL}/payment`, payload, {
            headers: {
                'merchant': merchant,
                'sign': sign,
                'Content-Type': 'application/json',
            },
        });
    } catch (e: any) {
        // Cryptomus returned an HTTP error (4xx/5xx)
        const msg: string = e.response?.data?.message || e.message || 'Unknown error';
        const err: any = new Error(msg);
        err.response = { status: msg.toLowerCase().includes('merchant') || msg.toLowerCase().includes('sign') ? 401 : 502 };
        throw err;
    }

    const { data } = res;

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
