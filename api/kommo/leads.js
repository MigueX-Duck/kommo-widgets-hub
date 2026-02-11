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

        // ==========================================
        // 1. Obtener Pipelines para identificar Ganados/Perdidos
        // ==========================================
        const pipelinesUrl = `https://${subdomain}.kommo.com/api/v4/leads/pipelines`;
        const pipelinesResponse = await fetch(pipelinesUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        let closedStatusIds = [];

        if (pipelinesResponse.ok) {
            const pipelinesData = await pipelinesResponse.json();
            if (pipelinesData._embedded && pipelinesData._embedded.pipelines) {
                pipelinesData._embedded.pipelines.forEach(pipeline => {
                    if (pipeline._embedded && pipeline._embedded.statuses) {
                        pipeline._embedded.statuses.forEach(status => {
                            // En Kommo API v4:
                            // type 142 = Ganado (Won)
                            // type 143 = Perdido (Lost)
                            if (status.type === 143) {
                                closedStatusIds.push(status.id);
                            } else {
                                // Fallback por si el type no viene (depende de la versión/configuración)
                                const statusName = status.name.toLowerCase();
                                if (statusName.includes('perdido') ||
                                    statusName.includes('no realizado') ||
                                    statusName.includes('rechazado') ||
                                    statusName.includes('cancelado') ||
                                    statusName.includes('spam') ||
                                    statusName.includes('descartado')) {
                                    if (!closedStatusIds.includes(status.id)) {
                                        closedStatusIds.push(status.id);
                                    }
                                }
                            }
                        });
                    }
                });
            }
        } else {
            console.error('Failed to fetch pipelines, proceeding without status filtering');
        }

        // ==========================================
        // 2. Obtener leads del período actual
        // ==========================================
        const currentLeadsUrl = `https://${subdomain}.kommo.com/api/v4/leads?` +
            `filter[created_at][from]=${dates.current.start}&` +
            `filter[created_at][to]=${dates.current.end}`;

        // Usar fetchAllLeads para obtener TODOS los leads (paginación)
        let currentLeads = [];
        try {
            currentLeads = await fetchAllLeads(currentLeadsUrl, accessToken);
        } catch (apiError) {
            if (apiError.message.includes('401')) {
                return res.status(401).json({
                    error: 'Token expired',
                    message: 'Please refresh the token',
                    refreshUrl: '/api/oauth/refresh'
                });
            }
            throw apiError;
        }

        // ==========================================
        // 3. Filtrar leads activos (Excluir Ganados/Perdidos)
        // ==========================================
        // El usuario quiere ver "Leads Nuevos" pero que coincida con "Etapas activas" del CRM
        // Por defecto filtramos, a menos que se especifique lo contrario
        const currentActiveLeads = currentLeads.filter(lead => !closedStatusIds.includes(lead.status_id));


        // ==========================================
        // 4. Obtener leads del período anterior (para comparación)
        // ==========================================
        const previousLeadsUrl = `https://${subdomain}.kommo.com/api/v4/leads?` +
            `filter[created_at][from]=${dates.previous.start}&` +
            `filter[created_at][to]=${dates.previous.end}`;

        let previousLeads = [];
        let previousActiveLeads = [];
        try {
            previousLeads = await fetchAllLeads(previousLeadsUrl, accessToken);
            previousActiveLeads = previousLeads.filter(lead => !closedStatusIds.includes(lead.status_id));
        } catch (error) {
            console.error('Error fetching previous leads:', error);
            // No fallar todo si falla el periodo anterior
        }

        // Contar leads ACTIVOS
        const currentCount = currentActiveLeads.length;
        const previousCount = previousActiveLeads.length;

        // Calcular porcentaje de cambio
        let percentChange = 0;
        if (previousCount > 0) {
            percentChange = Math.round(((currentCount - previousCount) / previousCount) * 100);
        } else if (currentCount > 0) {
            percentChange = 100;
        }

        return res.status(200).json({
            success: true,
            data: {
                current: {
                    count: currentCount,
                    total_created: currentLeads.length, // Dato extra por si acaso
                    period: period,
                },
                previous: {
                    count: previousCount,
                },
                change: {
                    percent: percentChange,
                    direction: percentChange > 0 ? 'up' : percentChange < 0 ? 'down' : 'neutral',
                },
            },
        });

    } catch (error) {
        console.error('Leads API error:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            period: req.query.period
        });
        return res.status(500).json({
            error: 'Failed to fetch leads data',
            details: error.message
        });
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

                // Calcular período anterior (mismo número de días)
                const durationMs = endDate.getTime() - startDate.getTime();
                prevEndDate = new Date(startDate.getTime() - 1);
                prevStartDate = new Date(prevEndDate.getTime() - durationMs);

                // Asegurar que timestamps sean válidos
                if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                    console.error('Invalid Date object created:', { startDate, endDate });
                    period = 'month';
                    break;
                }

                console.log('Custom period:', {
                    from: dateFrom,
                    to: dateTo,
                    startDate,
                    endDate,
                    prevStartDate,
                    prevEndDate
                });

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

                console.log('Custom period dates:', result);
                return result;
            }
            // Si no hay fechas, usar mes por defecto
            period = 'month';
        // Continuar al caso 'month'

        case 'day':
            // Hoy: desde las 00:00 de hoy hasta ahora
            startDate = new Date(now);
            startDate.setHours(0, 0, 0, 0);

            // Ayer: todo el día de ayer
            prevStartDate = new Date(now);
            prevStartDate.setDate(now.getDate() - 1);
            prevStartDate.setHours(0, 0, 0, 0);

            prevEndDate = new Date(now);
            prevEndDate.setDate(now.getDate() - 1);
            prevEndDate.setHours(23, 59, 59, 999);
            break;

        case 'week':
            // Esta semana: desde el lunes hasta ahora
            const dayOfWeek = now.getDay();
            const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Domingo = 0, ajustar a lunes

            startDate = new Date(now);
            startDate.setDate(now.getDate() - daysFromMonday);
            startDate.setHours(0, 0, 0, 0);

            // Semana anterior: 7 días antes
            prevStartDate = new Date(startDate);
            prevStartDate.setDate(startDate.getDate() - 7);

            prevEndDate = new Date(startDate);
            prevEndDate.setDate(startDate.getDate() - 1);
            prevEndDate.setHours(23, 59, 59, 999);
            break;

        case 'month':
        default:
            // Este mes: desde el día 1 hasta ahora
            startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

            // Mes anterior: todo el mes anterior
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
