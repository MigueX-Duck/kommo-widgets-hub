import { kv } from '@vercel/kv';

const TOKEN_KEY = 'kommo_tokens';

/**
 * Obtiene los tokens guardados en KV
 */
export async function getTokens() {
    try {
        const tokens = await kv.get(TOKEN_KEY);
        return tokens || null;
    } catch (error) {
        console.error('Error getting tokens from KV:', error);
        return null;
    }
}

/**
 * Guarda los tokens en KV
 */
export async function saveTokens(accessToken, refreshToken, expiresIn) {
    try {
        // Si no hay expiresIn (token manual), ponemos 5 años por defecto
        const secondsIn5Years = 5 * 365 * 24 * 60 * 60;
        const expiresAt = Date.now() + ((expiresIn || secondsIn5Years) * 1000);

        await kv.set(TOKEN_KEY, {
            access_token: accessToken,
            refresh_token: refreshToken || null,
            expires_at: expiresAt
        });

        console.log('Tokens saved to KV, expires at:', new Date(expiresAt));
        return true;
    } catch (error) {
        console.error('Error saving tokens to KV:', error);
        return false;
    }
}

/**
 * Verifica si el token actual está expirado
 */
export function isTokenExpired(tokens) {
    if (!tokens || !tokens.expires_at) {
        return true;
    }

    // Considerar expirado si faltan menos de 5 minutos
    const bufferTime = 5 * 60 * 1000; // 5 minutos
    return Date.now() >= (tokens.expires_at - bufferTime);
}

/**
 * Refresca el access token usando el refresh token
 */
export async function refreshAccessToken(refreshToken) {
    const clientId = process.env.KOMMO_CLIENT_ID;
    const clientSecret = process.env.KOMMO_CLIENT_SECRET;
    const subdomain = process.env.KOMMO_SUBDOMAIN;
    const redirectUri = process.env.KOMMO_REDIRECT_URI;

    try {
        const response = await fetch(`https://${subdomain}.kommo.com/oauth2/access_token`, {
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
            const errorText = await response.text();
            throw new Error(`Token refresh failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        // Guardar los nuevos tokens
        await saveTokens(data.access_token, data.refresh_token, data.expires_in);

        console.log('Access token refreshed successfully');
        return data.access_token;
    } catch (error) {
        console.error('Error refreshing access token:', error);
        throw error;
    }
}

/**
 * Obtiene un access token válido (refresca si es necesario)
 */
export async function getValidAccessToken() {
    // Primero intentar obtener de KV
    let tokens = await getTokens();

    // Si no hay tokens en KV, usar el de las variables de entorno (fallback)
    if (!tokens) {
        const envToken = process.env.KOMMO_ACCESS_TOKEN;
        if (envToken) {
            console.log('Using token from environment variables');
            return envToken;
        }
        throw new Error('No tokens available in KV and no fallback found.');
    }

    // Si el token está expirado, intentar refrescarlo
    if (isTokenExpired(tokens)) {
        console.log('Token expired, checking for refresh token...');

        if (!tokens.refresh_token) {
            // Es un token manual o de larga duración sin refresh
            console.log('No refresh token available, using current token as last resort');
            return tokens.access_token;
        }

        try {
            const newAccessToken = await refreshAccessToken(tokens.refresh_token);
            return newAccessToken;
        } catch (error) {
            console.error('Refresh failed, using current token as fallback');
            return tokens.access_token;
        }
    }

    // Token válido en KV
    return tokens.access_token;
}
