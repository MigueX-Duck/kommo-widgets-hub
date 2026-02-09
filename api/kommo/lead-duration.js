import { getValidAccessToken } from '../../lib/tokenManager.js';

export default async function handler(req, res) {
    const { period = 'month', date_from, date_to } = req.query;

    const subdomain = process.env.KOMMO_SUBDOMAIN;

    try {
        // Obtener token válido
        const accessToken = await getValidAccessToken();

        // Calcular fechas según el período
        const dates = getPeriodDates(period, date_from, date_to);

        // Obtener pipelines para identificar status cerrados
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

        // Identificar status cerrados (ganados y perdidos)
        let closedStatusIds = [];

        if (pipelinesData._embedded && pipelinesData._embedded.pipelines) {
            pipelinesData._embedded.pipelines.forEach(pipeline => {
                if (pipeline._embedded && pipeline._embedded.statuses) {
                    pipeline._embedded.statuses.forEach(status => {
                        const statusName = status.name.toLowerCase();
                        if (statusName.includes('ganado') ||
                            statusName.includes('perdido') ||
                            statusName.includes('exitoso') ||
                            statusName.includes('no realizado') ||
                            statusName.includes('cerrad')) {
                            closedStatusIds.push(status.id);
                        }
                    });
                }
            });
        }

        console.log('Closed status IDs:', closedStatusIds);

        // Obtener leads cerrados del período actual
        const currentClosedLeads = await getClosedLeads(subdomain, accessToken, closedStatusIds, dates.current);

        // Obtener leads cerrados del período anterior
        const previousClosedLeads = await getClosedLeads(subdomain, accessToken, closedStatusIds, dates.previous);

        // Calcular duración promedio
        const currentDuration = calculateAverageDuration(currentClosedLeads);
        const previousDuration = calculateAverageDuration(previousClosedLeads);

        // Calcular cambio porcentual
        const percentChange = previousDuration > 0
            ? Math.round(((currentDuration - previousDuration) / previousDuration) * 100)
            : 0;

        return res.status(200).json({
            success: true,
            data: {
                current: {
                    avg_duration_seconds: currentDuration,
                    avg_duration_formatted: formatDuration(currentDuration),
                    total_leads: currentClosedLeads.length,
                },
                previous: {
                    avg_duration_seconds: previousDuration,
                    avg_duration_formatted: formatDuration(previousDuration),
                    total_leads: previousClosedLeads.length,
                },
                change: {
                    percent: percentChange,
                },
            },
        });

    } catch (error) {
        console.error('Lead duration API error:', error);
        return res.status(500).json({
            error: 'Failed to fetch lead duration data',
            details: error.message,
        });
    }
}

async function getClosedLeads(subdomain, accessToken, closedStatusIds, dateRange) {
    if (closedStatusIds.length === 0) {
        return [];
    }

    try {
        // Construir filtro para múltiples status
        const statusFilter = closedStatusIds.map(id => `filter[statuses][0][status_id][]=${id}`).join('&');

        const url = `https://${subdomain}.kommo.com/api/v4/leads?` +
            `${statusFilter}&` +
            `filter[closed_at][from]=${dateRange.start}&` +
            `filter[closed_at][to]=${dateRange.end}&` +
            `limit=250`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            console.error('Error fetching closed leads:', response.status);
            return [];
        }

        const text = await response.text();
        if (!text || text.trim() === '') {
            return [];
        }

        const data = JSON.parse(text);
        return data._embedded?.leads || [];

    } catch (error) {
        console.error('Error in getClosedLeads:', error);
        return [];
    }
}

function calculateAverageDuration(leads) {
    if (leads.length === 0) {
        return 0;
    }

    let totalDuration = 0;
    let validLeads = 0;

    leads.forEach(lead => {
        if (lead.created_at && lead.closed_at) {
            const duration = lead.closed_at - lead.created_at;
            if (duration > 0) {
                totalDuration += duration;
                validLeads++;
            }
        }
    });

    if (validLeads === 0) {
        return 0;
    }

    return Math.round(totalDuration / validLeads);
}

function formatDuration(seconds) {
    if (seconds === 0) {
        return '0 min';
    }

    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        const remainingHours = hours % 24;
        if (remainingHours > 0) {
            return `${days}d ${remainingHours}h`;
        }
        return `${days} días`;
    }

    if (hours > 0) {
        const remainingMinutes = minutes % 60;
        if (remainingMinutes > 0) {
            return `${hours}h ${remainingMinutes}m`;
        }
        return `${hours} horas`;
    }

    return `${minutes} min`;
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
