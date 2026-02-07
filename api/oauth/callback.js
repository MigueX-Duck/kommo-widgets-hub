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
            return res.status(500).json({ error: 'Failed to exchange code for token' });
        }

        const tokens = await response.json();

        // En producción, guardaríamos estos tokens en una base de datos
        // Por ahora, los retornamos para que se configuren manualmente en Vercel

        return res.status(200).json({
            success: true,
            message: 'Authorization successful! Please save these tokens in Vercel environment variables:',
            tokens: {
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expires_in: tokens.expires_in,
            },
            instructions: [
                '1. Go to Vercel Dashboard → Settings → Environment Variables',
                '2. Add KOMMO_ACCESS_TOKEN with the access_token value',
                '3. Add KOMMO_REFRESH_TOKEN with the refresh_token value',
                '4. Redeploy the project',
            ],
        });

    } catch (error) {
        console.error('OAuth callback error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
