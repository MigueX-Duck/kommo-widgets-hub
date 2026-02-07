export default async function handler(req, res) {
    const subdomain = process.env.KOMMO_SUBDOMAIN;
    const clientId = process.env.KOMMO_CLIENT_ID;
    const clientSecret = process.env.KOMMO_CLIENT_SECRET;
    const refreshToken = process.env.KOMMO_REFRESH_TOKEN;
    const redirectUri = process.env.KOMMO_REDIRECT_URI;

    if (!refreshToken) {
        return res.status(400).json({ error: 'No refresh token configured' });
    }

    try {
        const tokenUrl = `https://${subdomain}.kommo.com/oauth2/access_token`;

        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                redirect_uri: redirectUri,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Token refresh error:', error);
            return res.status(500).json({ error: 'Failed to refresh token' });
        }

        const tokens = await response.json();

        return res.status(200).json({
            success: true,
            message: 'Token refreshed! Please update these in Vercel environment variables:',
            tokens: {
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expires_in: tokens.expires_in,
            },
        });

    } catch (error) {
        console.error('Token refresh error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
