import { saveTokens } from '../../lib/tokenManager.js';

export default async function handler(req, res) {
    const { code, state, referer } = req.query;

    // Validar que tenemos el código
    if (!code) {
        return res.status(400).json({ error: 'No authorization code provided' });
    }

    // Configuración
    const clientId = process.env.KOMMO_CLIENT_ID;
    const clientSecret = process.env.KOMMO_CLIENT_SECRET;
    const redirectUri = process.env.KOMMO_REDIRECT_URI;
    const subdomain = process.env.KOMMO_SUBDOMAIN;

    try {
        // Intercambiar código por tokens
        const tokenUrl = `https://${subdomain}.kommo.com/oauth2/access_token`;

        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: redirectUri,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Token exchange error:', error);
            return res.status(500).json({ error: 'Failed to exchange code for token', details: error });
        }

        const tokens = await response.json();

        // Guardar tokens en Vercel KV
        const saved = await saveTokens(
            tokens.access_token,
            tokens.refresh_token,
            tokens.expires_in
        );

        if (!saved) {
            return res.status(500).json({ error: 'Failed to save tokens to storage' });
        }

        // Retornar éxito
        return res.status(200).json({
            success: true,
            message: '¡OAuth configurado exitosamente! Los tokens se guardaron automáticamente.',
            expires_in: tokens.expires_in,
            expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        });

    } catch (error) {
        console.error('OAuth callback error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}
