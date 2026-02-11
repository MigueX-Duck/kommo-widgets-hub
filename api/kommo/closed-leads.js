import { getValidAccessToken } from '../../lib/tokenManager.js';
import { fetchAllLeads } from '../../lib/kommoApi.js';

export default async function handler(req, res) {
    const { period = 'month', date_from, date_to } = req.query;

    const subdomain = process.env.KOMMO_SUBDOMAIN;

    try {
        // Obtener token válido (auto-refresh si es necesario)
        const accessToken = await getValidAccessToken();

        // Calcular fechas según el período
        const dates = getPeriodDates(period, date_from, date_to);

        // Primero, obtener los pipelines para identificar los status IDs
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

        // Buscar los status IDs de "Leads ganados" y "Leads perdidos"
        let wonStatusIds = [];
        let lostStatusIds = [];

        if (pipelinesData._embedded && pipelinesData._embedded.pipelines) {
            pipelinesData._embedded.pipelines.forEach(pipeline => {
                if (pipeline._embedded && pipeline._embedded.statuses) {
                    pipeline._embedded.statuses.forEach(status => {
                        const statusName = status.name.toLowerCase();
                        if (statusName.includes('ganado') || statusName.includes('exitoso')) {
                            wonStatusIds.push(status.id);
                        } else if (statusName.includes('perdido') || statusName.includes('no realizado')) {
                            lostStatusIds.push(status.id);
                        }
                    });
                }
            });
        }

        console.log('Won status IDs:', wonStatusIds);
        console.log('Lost status IDs:', lostStatusIds);

        // Obtener leads cerrados del período actual
        const currentWonLeads = await getLeadsByStatus(subdomain, accessToken, wonStatusIds, dates.current);
        const currentLostLeads = await getLeadsByStatus(subdomain, accessToken, lostStatusIds, dates.current);

        // Obtener leads cerrados del período anterior
        const previousWonLeads = await getLeadsByStatus(subdomain, accessToken, wonStatusIds, dates.previous);
        const previousLostLeads = await getLeadsByStatus(subdomain, accessToken, lostStatusIds, dates.previous);

        // Calcular totales
        const currentTotal = currentWonLeads + currentLostLeads;
        const previousTotal = previousWonLeads + previousLostLeads;

        // Calcular porcentajes
        const wonPercent = currentTotal > 0 ? Math.round((currentWonLeads / currentTotal) * 100) : 0;
        const lostPercent = currentTotal > 0 ? Math.round((currentLostLeads / currentTotal) * 100) : 0;

        // Calcular cambios
        const totalChange = previousTotal > 0
            ? Math.round(((currentTotal - previousTotal) / previousTotal) * 100)
            : 0;

        const wonChange = previousWonLeads > 0
            ? Math.round(((currentWonLeads - previousWonLeads) / previousWonLeads) * 100)
            : 0;

        const lostChange = previousLostLeads > 0
            ? Math.round(((currentLostLeads - previousLostLeads) / previousLostLeads) * 100)
            : 0;

        return res.status(200).json({
            success: true,
            data: {
                current: {
                    total: currentTotal,
                    won: currentWonLeads,
                    lost: currentLostLeads,
                    won_percent: wonPercent,
                    lost_percent: lostPercent,
                },
                previous: {
                    total: previousTotal,
                    won: previousWonLeads,
                    lost: previousLostLeads,
                },
                change: {
                    total_percent: totalChange,
                    won_percent: wonChange,
                    lost_percent: lostChange,
                },
            },
        });

    } catch (error) {
        console.error('Closed leads API error:', error);
        return res.status(500).json({
            error: 'Failed to fetch closed leads data',
            details: error.message,
        });
    }
}

async function getLeadsByStatus(subdomain, accessToken, statusIds, dateRange) {
    if (statusIds.length === 0) {
        return 0;
    }

    try {
        // Construir filtro para múltiples status (deduplicados)
        const uniqueStatusIds = [...new Set(statusIds)];
        const statusFilter = uniqueStatusIds.map(id => `filter[status][]=${id}`).join('&');

        const url = `https://${subdomain}.kommo.com/api/v4/leads?` +
            `${statusFilter}&` +
            `filter[closed_at][from]=${dateRange.start}&` +
            `filter[closed_at][to]=${dateRange.end}`;

        // Usar fetchAllLeads para paginación
        const leads = await fetchAllLeads(url, accessToken);
        return leads.length;

    } catch (error) {
        console.error('Error in getLeadsByStatus:', error);
        return 0;
    }
}

function getPeriodDates(period, dateFrom, dateTo) {
    const now = new Date();
    let startDate, prevStartDate, prevEndDate;

    switch (period) {
        case 'custom':
            // Fechas personalizadas: parsear date_from y date_to
            if (dateFrom && dateTo) {
                let dayFrom, monthFrom, yearFrom;
                let dayTo, monthTo, yearTo;

                // Parse date_from
                if (dateFrom.includes('/')) {
                    [dayFrom, monthFrom, yearFrom] = dateFrom.split('/');
                } else if (dateFrom.includes('-')) {
                    [yearFrom, monthFrom, dayFrom] = dateFrom.split('-');
                }

                // Parse date_to
                if (dateTo.includes('/')) {
                    [dayTo, monthTo, yearTo] = dateTo.split('/');
                } else if (dateTo.includes('-')) {
                    [yearTo, monthTo, dayTo] = dateTo.split('-');
                }

                if (!yearFrom || !monthFrom || !dayFrom || !yearTo || !monthTo || !dayTo) {
                    console.error('Invalid date format:', { dateFrom, dateTo });
                    // Fallback to month if parsing fails
                    period = 'month';
                    break;
                }

                startDate = new Date(yearFrom, monthFrom - 1, dayFrom, 0, 0, 0, 0);
                const endDate = new Date(yearTo, monthTo - 1, dayTo, 23, 59, 59, 999);

                const durationMs = endDate.getTime() - startDate.getTime();
                prevEndDate = new Date(startDate.getTime() - 1);
                prevStartDate = new Date(prevEndDate.getTime() - durationMs);

                // Asegurar que timestamps sean válidos
                if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                    console.error('Invalid Date object created:', { startDate, endDate });
                    period = 'month';
                    break;
                }

                const result = {
                    current: {
                        start: Math.floor(startDate.getTime() / 1000),
                        end: Math.floor(endDate.getTime() / 1000),
                    },
                    previous: {
                        start: Math.floor(prevStartDate.getTime() / 1000),
                        end: Math.floor(prevEndDate.getTime() / 1000),
                    },
                };

                return result;
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

    const result = {
        current: {
            start: Math.floor(startDate.getTime() / 1000),
            end: Math.floor(now.getTime() / 1000),
        },
        previous: {
            start: Math.floor(prevStartDate.getTime() / 1000),
            end: Math.floor(prevEndDate.getTime() / 1000),
        },
    };

    console.log('Period dates:', period, result);
    return result;
}
