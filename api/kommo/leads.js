export default async function handler(req, res) {
    const { period = 'month', date_from, date_to } = req.query;

    const subdomain = process.env.KOMMO_SUBDOMAIN;
    const accessToken = process.env.KOMMO_ACCESS_TOKEN;

    if (!accessToken) {
        return res.status(401).json({
            error: 'Not authorized',
            message: 'Please authorize the integration first',
            authUrl: '/api/oauth/authorize'
        });
    }

    try {
        // Calcular fechas según el período
        const dates = getPeriodDates(period, date_from, date_to);

        // Obtener leads del período actual
        const currentLeadsUrl = `https://${subdomain}.kommo.com/api/v4/leads?` +
            `filter[created_at][from]=${dates.current.start}&` +
            `filter[created_at][to]=${dates.current.end}&` +
            `limit=250`;

        const currentResponse = await fetch(currentLeadsUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!currentResponse.ok) {
            const errorText = await currentResponse.text();
            console.error('Kommo API error:', {
                status: currentResponse.status,
                statusText: currentResponse.statusText,
                body: errorText,
                url: currentLeadsUrl
            });

            if (currentResponse.status === 401) {
                return res.status(401).json({
                    error: 'Token expired',
                    message: 'Please refresh the token',
                    refreshUrl: '/api/oauth/refresh'
                });
            }
            throw new Error(`API error: ${currentResponse.status} - ${errorText}`);
        }

        let currentData;
        try {
            const responseText = await currentResponse.text();
            currentData = responseText ? JSON.parse(responseText) : { _embedded: { leads: [] } };
        } catch (parseError) {
            console.error('Failed to parse current leads response:', parseError);
            currentData = { _embedded: { leads: [] } };
        }

        // Obtener leads del período anterior
        const previousLeadsUrl = `https://${subdomain}.kommo.com/api/v4/leads?` +
            `filter[created_at][from]=${dates.previous.start}&` +
            `filter[created_at][to]=${dates.previous.end}&` +
            `limit=250`;

        const previousResponse = await fetch(previousLeadsUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        let previousData;
        try {
            const responseText = await previousResponse.text();
            previousData = responseText ? JSON.parse(responseText) : { _embedded: { leads: [] } };
        } catch (parseError) {
            console.error('Failed to parse previous leads response:', parseError);
            previousData = { _embedded: { leads: [] } };
        }

        // Contar leads
        const currentCount = currentData._embedded?.leads?.length || 0;
        const previousCount = previousData._embedded?.leads?.length || 0;

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
                // Formato: DD/MM/YYYY
                const [dayFrom, monthFrom, yearFrom] = dateFrom.split('/');
                const [dayTo, monthTo, yearTo] = dateTo.split('/');

                startDate = new Date(yearFrom, monthFrom - 1, dayFrom, 0, 0, 0, 0);
                const endDate = new Date(yearTo, monthTo - 1, dayTo, 23, 59, 59, 999);

                // Calcular período anterior (mismo número de días)
                const durationMs = endDate.getTime() - startDate.getTime();
                prevEndDate = new Date(startDate.getTime() - 1);
                prevStartDate = new Date(prevEndDate.getTime() - durationMs);

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
