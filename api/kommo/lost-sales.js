import { getValidAccessToken } from '../../lib/tokenManager.js';

export default async function handler(req, res) {
    const { period = 'month', date_from, date_to } = req.query;

    const subdomain = process.env.KOMMO_SUBDOMAIN;

    try {
        // Obtener token válido
        const accessToken = await getValidAccessToken();

        // Calcular fechas según el período
        const dates = getPeriodDates(period, date_from, date_to);

        // Obtener pipelines para identificar status perdidos
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

        // Identificar status perdidos con sus nombres
        const lostStatusesMap = new Map();

        if (pipelinesData._embedded && pipelinesData._embedded.pipelines) {
            pipelinesData._embedded.pipelines.forEach(pipeline => {
                if (pipeline._embedded && pipeline._embedded.statuses) {
                    pipeline._embedded.statuses.forEach(status => {
                        const statusName = status.name.toLowerCase();
                        // Usar la misma lógica que closed-leads.js para consistencia
                        if (statusName.includes('perdido') ||
                            statusName.includes('no realizado') ||
                            statusName.includes('rechazado') ||
                            statusName.includes('cancelado')) {

                            // Usar Map para evitar duplicados por ID
                            if (!lostStatusesMap.has(status.id)) {
                                lostStatusesMap.set(status.id, {
                                    id: status.id,
                                    name: status.name,
                                });
                            }
                        }
                    });
                }
            });
        }

        const lostStatuses = Array.from(lostStatusesMap.values());
        console.log('Lost statuses:', lostStatuses);

        // Obtener leads perdidos del período actual
        const currentLostLeads = await getLostLeads(subdomain, accessToken, lostStatuses, dates.current);

        // Obtener leads perdidos del período anterior
        const previousLostLeads = await getLostLeads(subdomain, accessToken, lostStatuses, dates.previous);


        // Agrupar por motivo (Usando Custom Field ID: 263326 "Razón de pérdida")
        const LOSS_REASON_FIELD_ID = 263326;
        const currentByReason = groupByLossReason(currentLostLeads, LOSS_REASON_FIELD_ID);
        const previousByReason = groupByLossReason(previousLostLeads, LOSS_REASON_FIELD_ID);

        // Calcular totales
        const currentTotal = currentLostLeads.length;
        const previousTotal = previousLostLeads.length;

        // Calcular cambio porcentual
        const percentChange = previousTotal > 0
            ? Math.round(((currentTotal - previousTotal) / previousTotal) * 100)
            : 0;

        return res.status(200).json({
            success: true,
            data: {
                current: {
                    total: currentTotal,
                    by_reason: currentByReason,
                },
                previous: {
                    total: previousTotal,
                    by_reason: previousByReason,
                },
                change: {
                    percent: percentChange,
                },
            },
        });

    } catch (error) {
        console.error('Lost sales API error:', error);
        return res.status(500).json({
            error: 'Failed to fetch lost sales data',
            details: error.message,
        });
    }
}

async function getLostLeads(subdomain, accessToken, lostStatuses, dateRange) {
    if (lostStatuses.length === 0) {
        return [];
    }

    try {
        // Construir filtro para múltiples status
        const statusFilter = lostStatuses.map(s => `filter[statuses][0][status_id][]=${s.id}`).join('&');

        const url = `https://${subdomain}.kommo.com/api/v4/leads?` +
            `${statusFilter}&` +
            `filter[closed_at][from]=${dateRange.start}&` +
            `filter[closed_at][to]=${dateRange.end}`;

        // Usar fetchAllLeads para paginación
        // NOTA: fetchAllLeads ya devuelve los leads con _embedded, pero necesitamos asegurar
        // que vengan los custom_fields_values. Por defecto vienen, así que debería estar bien.
        return await fetchAllLeads(url, accessToken);

    } catch (error) {
        console.error('Error in getLostLeads:', error);
        return [];
    }
}

function groupByLossReason(leads, fieldId) {
    const grouped = {};

    leads.forEach(lead => {
        let reason = 'Sin motivo especificado';

        // Buscar el custom field específico
        if (lead.custom_fields_values) {
            const field = lead.custom_fields_values.find(f => f.field_id === fieldId);
            if (field && field.values && field.values.length > 0) {
                // Tomar el valor (enum o text)
                reason = field.values[0].value;
            }
        }

        if (!grouped[reason]) {
            grouped[reason] = 0;
        }
        grouped[reason]++;
    });

    // Convertir a array y ordenar por cantidad
    const result = Object.entries(grouped)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count);

    return result;
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
