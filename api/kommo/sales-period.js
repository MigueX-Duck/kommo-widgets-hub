import { getValidAccessToken } from '../../lib/tokenManager.js';
import { fetchAllLeads } from '../../lib/kommoApi.js';

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

        console.log('Won status IDs:', wonStatusIds);

        // Obtener leads ganados del período actual
        const currentWonLeads = await getWonLeads(subdomain, accessToken, wonStatusIds, dates.current);

        // Obtener leads ganados del período anterior
        const previousWonLeads = await getWonLeads(subdomain, accessToken, wonStatusIds, dates.previous);

        // Calcular ventas totales
        const currentSales = calculateTotalSales(currentWonLeads);
        const previousSales = calculateTotalSales(previousWonLeads);

        // Calcular cambio porcentual
        const percentChange = previousSales > 0
            ? Math.round(((currentSales - previousSales) / previousSales) * 100)
            : 0;

        return res.status(200).json({
            success: true,
            data: {
                current: {
                    total_sales: currentSales,
                    total_sales_formatted: formatCurrency(currentSales),
                    total_leads: currentWonLeads.length,
                },
                previous: {
                    total_sales: previousSales,
                    total_sales_formatted: formatCurrency(previousSales),
                    total_leads: previousWonLeads.length,
                },
                change: {
                    percent: percentChange,
                },
            },
        });

    } catch (error) {
        console.error('Sales API error:', error);
        return res.status(500).json({
            error: 'Failed to fetch sales data',
            details: error.message,
        });
    }
}

async function getWonLeads(subdomain, accessToken, wonStatusIds, dateRange) {
    if (wonStatusIds.length === 0) {
        return [];
    }

    try {
        // Construir filtro para múltiples status (deduplicados)
        const uniqueWonIds = [...new Set(wonStatusIds)];
        const statusFilter = uniqueWonIds.map(id => `filter[status][]=${id}`).join('&');

        const url = `https://${subdomain}.kommo.com/api/v4/leads?` +
            `${statusFilter}&` +
            `filter[closed_at][from]=${dateRange.start}&` +
            `filter[closed_at][to]=${dateRange.end}`;

        // Usar fetchAllLeads para paginación
        return await fetchAllLeads(url, accessToken);

    } catch (error) {
        console.error('Error in getWonLeads:', error);
        return [];
    }
}

function calculateTotalSales(leads) {
    if (leads.length === 0) {
        return 0;
    }

    let totalSales = 0;

    leads.forEach(lead => {
        // El campo 'price' contiene el valor del lead
        if (lead.price && lead.price > 0) {
            totalSales += lead.price;
        }
    });

    return totalSales;
}

function formatCurrency(amount) {
    if (amount === 0) {
        return '₡0';
    }

    // Formatear con separadores de miles y símbolo de colones
    if (amount >= 1000000) {
        return '₡' + (amount / 1000000).toFixed(1) + 'M';
    } else if (amount >= 1000) {
        return '₡' + (amount / 1000).toFixed(1) + 'K';
    }

    return '₡' + amount.toLocaleString('en-US'); // en-US usa comas para miles
}

function getPeriodDates(period, dateFrom, dateTo) {
    const now = new Date();
    let startDate, prevStartDate, prevEndDate;

    switch (period) {
        case 'custom':
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
