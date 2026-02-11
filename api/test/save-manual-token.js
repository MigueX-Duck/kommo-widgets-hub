import { saveTokens } from '../../lib/tokenManager.js';

export default async function handler(req, res) {
    const { token } = req.query;

    if (!token) {
        return res.status(400).json({
            error: 'Missing token parameter',
            usage: '/api/test/save-manual-token?token=TU_TOKEN_AQUI'
        });
    }

    try {
        // Guardamos el token manual con una expiración muy larga (5 años)
        const saved = await saveTokens(token, null, null);

        if (saved) {
            return res.status(200).json({
                success: true,
                message: 'Token manual guardado exitosamente en Vercel KV. Los widgets deberían funcionar ahora.'
            });
        } else {
            throw new Error('Failed to save to KV');
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
