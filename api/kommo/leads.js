export default async function handler(req, res) {
    const { period = 'month' } = req.query;

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
        const dates = getPeriodDates(period);

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
            if (currentResponse.status === 401) {
                return res.status(401).json({
                    error: 'Token expired',
                    message: 'Please refresh the token',
                    refreshUrl: '/api/oauth/refresh'
                });
            }
            throw new Error(`API error: ${currentResponse.status}`);
        }

        const currentData = await currentResponse.json();

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

        const previousData = await previousResponse.json();

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
        return res.status(500).json({ error: 'Failed to fetch leads data' });
    }
}

function getPeriodDates(period) {
    const now = new Date();
    const startDate = new Date();
    const prevStartDate = new Date();
    const prevEndDate = new Date();

    switch (period) {
        case 'day':
            startDate.setHours(0, 0, 0, 0);
            prevStartDate.setDate(now.getDate() - 1);
            prevStartDate.setHours(0, 0, 0, 0);
            prevEndDate.setDate(now.getDate() - 1);
            prevEndDate.setHours(23, 59, 59, 999);
            break;
        case 'week':
            const dayOfWeek = now.getDay() || 7;
            startDate.setDate(now.getDate() - dayOfWeek + 1);
            startDate.setHours(0, 0, 0, 0);
            prevStartDate.setDate(startDate.getDate() - 7);
            prevEndDate.setDate(startDate.getDate() - 1);
            prevEndDate.setHours(23, 59, 59, 999);
            break;
        case 'month':
        default:
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);
            prevStartDate.setMonth(now.getMonth() - 1);
            prevStartDate.setDate(1);
            prevStartDate.setHours(0, 0, 0, 0);
            prevEndDate.setMonth(now.getMonth());
            prevEndDate.setDate(0);
            prevEndDate.setHours(23, 59, 59, 999);
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
