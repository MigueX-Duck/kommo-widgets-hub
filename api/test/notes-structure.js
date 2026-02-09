import { getValidAccessToken } from '../../lib/tokenManager.js';

export default async function handler(req, res) {
    const subdomain = process.env.KOMMO_SUBDOMAIN;

    try {
        const accessToken = await getValidAccessToken();

        // Obtener un lead de ejemplo
        const leadsUrl = `https://${subdomain}.kommo.com/api/v4/leads?limit=1`;
        const leadsResponse = await fetch(leadsUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!leadsResponse.ok) {
            throw new Error(`Leads API error: ${leadsResponse.status}`);
        }

        const leadsData = await leadsResponse.json();
        const lead = leadsData._embedded?.leads?.[0];

        if (!lead) {
            return res.status(200).json({
                success: false,
                message: 'No leads found',
            });
        }

        // Obtener notas/mensajes del lead
        const notesUrl = `https://${subdomain}.kommo.com/api/v4/leads/${lead.id}/notes`;
        const notesResponse = await fetch(notesUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!notesResponse.ok) {
            throw new Error(`Notes API error: ${notesResponse.status}`);
        }

        const notesData = await notesResponse.json();

        return res.status(200).json({
            success: true,
            lead: {
                id: lead.id,
                name: lead.name,
                created_at: lead.created_at,
                closed_at: lead.closed_at,
            },
            notes: notesData._embedded?.notes || [],
            notes_structure: notesData._embedded?.notes?.[0] || null,
        });

    } catch (error) {
        console.error('Test API error:', error);
        return res.status(500).json({
            error: 'Failed to fetch test data',
            details: error.message,
        });
    }
}
