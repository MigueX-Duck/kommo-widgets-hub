import { getValidAccessToken } from '../../lib/tokenManager.js';

export default async function handler(req, res) {
    const subdomain = process.env.KOMMO_SUBDOMAIN;

    try {
        const accessToken = await getValidAccessToken();
        
        // Obtener pipelines para identificar status ganados
        const pipelinesUrl = `https://${subdomain}.kommo.com/api/v4/leads/pipelines`;
        const pipelinesResponse = await fetch(pipelinesUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });
        const pipelinesData = await pipelinesResponse.json();
        
        let wonStatusIds = [];
        if (pipelinesData._embedded && pipelinesData._embedded.pipelines) {
            pipelinesData._embedded.pipelines.forEach(pipeline => {
                if (pipeline._embedded && pipeline._embedded.statuses) {
                    pipeline._embedded.statuses.forEach(status => {
                        const statusName = status.name.toLowerCase();
                        if (statusName.includes('ganado') || statusName.includes('exitoso') || statusName.includes('won')) {
                            wonStatusIds.push(status.id);
                        }
                    });
                }
            });
        }

        // Obtener 1 lead ganado para inspeccionar
        const statusFilter = wonStatusIds.map(id => `filter[statuses][0][status_id][]=${id}`).join('&');
        const url = `https://${subdomain}.kommo.com/api/v4/leads?${statusFilter}&with=contacts&limit=1`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        const data = await response.json();

        return res.status(200).json({
            success: true,
            won_status_ids: wonStatusIds,
            sample_lead: data._embedded?.leads?.[0] || 'No won leads found',
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
