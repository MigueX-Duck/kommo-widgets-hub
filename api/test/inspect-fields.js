import { getValidAccessToken } from '../../lib/tokenManager.js';

export default async function handler(req, res) {
    const subdomain = process.env.KOMMO_SUBDOMAIN;

    try {
        const accessToken = await getValidAccessToken();

        // 1. Obtener definiciones de campos personalizados
        const fieldsUrl = `https://${subdomain}.kommo.com/api/v4/leads/custom_fields`;
        const fieldsResponse = await fetch(fieldsUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });
        const fieldsData = await fieldsResponse.json();

        // Filtrar campos que podrían ser el origen
        const potentialSourceFields = [];
        if (fieldsData._embedded && fieldsData._embedded.custom_fields) {
            fieldsData._embedded.custom_fields.forEach(field => {
                const name = field.name.toLowerCase();
                if (
                    name.includes('origen') ||
                    name.includes('source') ||
                    name.includes('canal') ||
                    name.includes('channel') ||
                    name.includes('medio') ||
                    name.includes('fuente')
                ) {
                    potentialSourceFields.push({
                        id: field.id,
                        name: field.name,
                        type: field.type,
                        enums: field.enums // Opciones disponibles si es tipo lista
                    });
                }
            });
        }

        // 2. Obtener 5 leads cualquiera para ver sus datos
        const leadsUrl = `https://${subdomain}.kommo.com/api/v4/leads?limit=5&with=contacts`;
        const leadsResponse = await fetch(leadsUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });
        const leadsData = await leadsResponse.json();

        // Extraer info relevante de los leads
        const sampleLeads = (leadsData._embedded?.leads || []).map(lead => ({
            id: lead.id,
            name: lead.name,
            tags: lead._embedded?.tags || [],
            custom_fields: lead.custom_fields_values ? lead.custom_fields_values.map(cf => ({
                field_id: cf.field_id,
                field_name: cf.field_name,
                values: cf.values
            })) : null
        }));

        return res.status(200).json({
            success: true,
            potential_source_fields: potentialSourceFields,
            all_fields_count: fieldsData._embedded?.custom_fields?.length || 0,
            sample_leads: sampleLeads
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
