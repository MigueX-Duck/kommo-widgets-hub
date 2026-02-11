import { kv } from '@vercel/kv';
import { getTokens, isTokenExpired } from '../../lib/tokenManager.js';

export default async function handler(req, res) {
    try {
        const tokens = await getTokens();
        const subdomain = process.env.KOMMO_SUBDOMAIN;
        const clientId = process.env.KOMMO_CLIENT_ID ? 'Configured' : 'MISSING';
        const clientSecret = process.env.KOMMO_CLIENT_SECRET ? 'Configured' : 'MISSING';

        const debugInfo = {
            kv_connection: 'Check below',
            subdomain: subdomain,
            environment_config: {
                client_id: clientId,
                client_secret: clientSecret,
            },
            token_status: tokens ? {
                has_access_token: !!tokens.access_token,
                has_refresh_token: !!tokens.refresh_token,
                expires_at: tokens.expires_at,
                expires_at_human: new Date(tokens.expires_at).toLocaleString(),
                is_expired_now: isTokenExpired(tokens),
                now: Date.now(),
                diff_ms: tokens.expires_at - Date.now()
            } : 'No tokens found in KV'
        };

        // Test KV connection specifically
        try {
            await kv.set('test_connection', 'ok');
            const testResult = await kv.get('test_connection');
            debugInfo.kv_connection = `Working (Test: ${testResult})`;
        } catch (kvError) {
            debugInfo.kv_connection = `KV Error: ${kvError.message}`;
        }

        return res.status(200).json(debugInfo);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
