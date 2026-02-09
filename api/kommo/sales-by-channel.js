import { getValidAccessToken } from '../../lib/tokenManager.js';

export default async function handler(req, res) {
    const { period = 'month', date_from, date_to } = req.query;

    const subdomain = process.env.KOMMO_SUBDOMAIN;

    try {
        // Obtener token válido
        const accessToken = await getValidAccessToken();

        // Calcular fechas según el período
        const dates = getPeriodDates(period, date_from, date_to);

        // Obtener pipelines para identificar status ganados
        const pipelinesUrl = `https://${subdomain}.kommo.com/api/v4/leads/pipelines`;
        const pipelinesResponse = await fetch(pipelinesUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!pipelinesResponse.ok) {
            throw new Error(`Pipelines API error: ${pipelinesResponse.status}`);
        }

        const pipelinesData = await pipelinesResponse.json();

        // Identificar status ganados
        let wonStatusIds = [];

        if (pipelinesData._embedded && pipelinesData._embedded.pipelines) {
            pipelinesData._embedded.pipelines.forEach(pipeline => {
                if (pipeline._embedded && pipeline._embedded.statuses) {
                    pipeline._embedded.statuses.forEach(status => {
                        const statusName = status.name.toLowerCase();
                        if (statusName.includes('ganado') ||
                            statusName.includes('exitoso') ||
                            statusName.includes('won')) {
                            wonStatusIds.push(status.id);
                        }
                    });
                }
            });
        }

        // Obtener leads ganados del período actual
        const currentWonLeads = await getWonLeads(subdomain, accessToken, wonStatusIds, dates.current);

        // Obtener leads ganados del período anterior
        const previousWonLeads = await getWonLeads(subdomain, accessToken, wonStatusIds, dates.previous);

        // Agrupar por canal
        const currentByChannel = groupLeadsByChannel(currentWonLeads);
        const previousByChannel = groupLeadsByChannel(previousWonLeads);

        // Calcular totales
        const currentTotal = currentWonLeads.length;
        const previousTotal = previousWonLeads.length;

        // Calcular cambio porcentual
        const percentChange = previousTotal > 0
            ? Math.round(((currentTotal - previousTotal) / previousTotal) * 100)
            : 0;

        return res.status(200).json({
            success: true,
            data: {
                current: {
                    total: currentTotal,
                    by_channel: currentByChannel,
                },
                previous: {
                    total: previousTotal,
                    by_channel: previousByChannel,
                },
                change: {
                    percent: percentChange,
                },
            },
        });

    } catch (error) {
        console.error('Sales by channel API error:', error);
        return res.status(500).json({
            error: 'Failed to fetch sales by channel data',
            details: error.message,
        });
    }
}

async function getWonLeads(subdomain, accessToken, wonStatusIds, dateRange) {
    if (wonStatusIds.length === 0) {
        return [];
    }

    try {
        const statusFilter = wonStatusIds.map(id => `filter[statuses][0][status_id][]=${id}`).join('&');

        // Incluimos 'custom_fields_values' para buscar el origen
        const url = `https://${subdomain}.kommo.com/api/v4/leads?` +
            `${statusFilter}&` +
            `filter[closed_at][from]=${dateRange.start}&` +
            `filter[closed_at][to]=${dateRange.end}&` +
            `with=contacts&` +
            `limit=250`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            console.error('Error fetching won leads:', response.status);
            return [];
        }

        const text = await response.text();
        if (!text || text.trim() === '') {
            return [];
        }

        const data = JSON.parse(text);
        return data._embedded?.leads || [];

    } catch (error) {
        console.error('Error in getWonLeads:', error);
        return [];
    }
}

function groupLeadsByChannel(leads) {
    const grouped = {};

    leads.forEach(lead => {
        let channel = 'Desconocido';

        // Intentar encontrar el canal en custom fields
        if (lead.custom_fields_values) {
            // Buscar campos que parezcan ser el origen/canal
            const sourceField = lead.custom_fields_values.find(field => {
                const name = field.field_name.toLowerCase();
                return name.includes('origen') ||
                    name.includes('source') ||
                    name.includes('canal') ||
                    name.includes('channel') ||
                    name.includes('fuente');
            });

            if (sourceField && sourceField.values && sourceField.values.length > 0) {
                channel = sourceField.values[0].value;
            }
        }

        // Si no se encuentra en custom fields, intentar con tags si channel sigue siendo Desconocido
        if (channel === 'Desconocido' && lead._embedded && lead._embedded.tags) {
            // Esto es más arriesgado porque pueden haber muchos tags, 
            // pero a veces se usan tags como "Instagram", "Facebook", etc.
            // Por ahora lo dejaremos como fallback simple si hay un tag que coincida con redes conocidas
            const knownChannels = ['instagram', 'facebook', 'whatsapp', 'telegram', 'email', 'web', 'sitio web', 'referido'];
            const foundTag = lead._embedded.tags.find(tag => knownChannels.includes(tag.name.toLowerCase()));
            if (foundTag) {
                channel = foundTag.name;
            }
        }

        // Normalizar nombre del canal (primera letra mayúscula)
        channel = channel.charAt(0).toUpperCase() + channel.slice(1);

        if (!grouped[channel]) {
            grouped[channel] = 0;
        }
        grouped[channel]++;
    });

    // Convertir a array y ordenar descilindemente
    return Object.entries(grouped)
        .map(([channel, count]) => ({ channel, count }))
        .sort((a, b) => b.count - a.count);
}

function getPeriodDates(period, dateFrom, dateTo) {
    const now = new Date();
    let startDate, prevStartDate, prevEndDate;

    switch (period) {
        case 'custom':
            if (dateFrom && dateTo) {
                const [dayFrom, monthFrom, yearFrom] = dateFrom.split('/');
                const [dayTo, monthTo, yearTo] = dateTo.split('/');

                startDate = new Date(yearFrom, monthFrom - 1, dayFrom, 0, 0, 0, 0);
                const endDate = new Date(yearTo, monthTo - 1, dayTo, 23, 59, 59, 999);

                const durationMs = endDate.getTime() - startDate.getTime();
                prevEndDate = new Date(startDate.getTime() - 1);
                prevStartDate = new Date(prevEndDate.getTime() - durationMs);

                return {
                    current: {
                        start: Math.floor(startDate.getTime() / 1000),
                        end: Math.floor(endDate.getTime() / 1000),
                    },
                    previous: {
                        start: Math.floor(prevStartDate.getTime() / 1000),
                        end: Math.floor(prevEndDate.getTime() / 1000),
                    },
                };
            }
            period = 'month';

        case 'day':
            startDate = new Date(now);
            startDate.setHours(0, 0, 0, 0);

            prevStartDate = new Date(now);
            prevStartDate.setDate(now.getDate() - 1);
            prevStartDate.setHours(0, 0, 0, 0);

            prevEndDate = new Date(now);
            prevEndDate.setDate(now.getDate() - 1);
            prevEndDate.setHours(23, 59, 59, 999);
            break;

        case 'week':
            const dayOfWeek = now.getDay();
            const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

            startDate = new Date(now);
            startDate.setDate(now.getDate() - daysFromMonday);
            startDate.setHours(0, 0, 0, 0);

            prevStartDate = new Date(startDate);
            prevStartDate.setDate(startDate.getDate() - 7);

            prevEndDate = new Date(startDate);
            prevEndDate.setDate(startDate.getDate() - 1);
            prevEndDate.setHours(23, 59, 59, 999);
            break;

        case 'month':
        default:
            startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
            prevEndDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
            break;
    }

    return {
        current: {
            start: Math.floor(startDate.getTime() / 1000),
            end: Math.floor(now.getTime() / 1000),
        },
        previous: {
            start: Math.floor(prevStartDate.getTime() / 1000),
            end: Math.floor(prevEndDate.getTime() / 1000),
        },
    };
}
