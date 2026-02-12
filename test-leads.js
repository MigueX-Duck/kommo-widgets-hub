import dotenv from 'dotenv';
import { getValidAccessToken } from './lib/tokenManager.js';
import { fetchAllLeads } from './lib/kommoApi.js';

dotenv.config({ path: '.env.local' });

async function testLeads(period = 'month', date_from, date_to) {
    console.log(`\n--- Testing Leads: ${period} ---`);
    const subdomain = process.env.KOMMO_SUBDOMAIN;

    try {
        const accessToken = await getValidAccessToken();

        // Simular lógica de getPeriodDates simplificada para el test
        const now = new Date();
        let start, end;

        if (period === 'last_month') {
            const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const endPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
            start = Math.floor(prevMonth.getTime() / 1000);
            end = Math.floor(endPrevMonth.getTime() / 1000);
        } else if (date_from && date_to) {
            // Formato básico para test dd/mm/yyyy
            const [d1, m1, y1] = date_from.split('/');
            const [d2, m2, y2] = date_to.split('/');
            start = Math.floor(new Date(y1, m1 - 1, d1).getTime() / 1000);
            end = Math.floor(new Date(y2, m2 - 1, d2, 23, 59, 59).getTime() / 1000);
        } else {
            // Mes actual
            const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            start = Math.floor(thisMonth.getTime() / 1000);
            end = Math.floor(now.getTime() / 1000);
        }

        console.log(`Dates: ${new Date(start * 1000).toISOString()} to ${new Date(end * 1000).toISOString()}`);

        const pipelinesUrl = `https://${subdomain}.kommo.com/api/v4/leads/pipelines`;
        const pResp = await fetch(pipelinesUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        const pData = await pResp.json();

        let lostIds = [];
        pData._embedded.pipelines.forEach(p => {
            p._embedded.statuses.forEach(s => {
                const name = s.name.toLowerCase();
                if (name.includes('perdido') || name.includes('no realizado') || name.includes('rechazado') || name.includes('cancelado') || s.type === 143) {
                    lostIds.push(s.id);
                }
            });
        });

        const url = `https://${subdomain}.kommo.com/api/v4/leads?filter[created_at][from]=${start}&filter[created_at][to]=${end}`;
        console.log(`Fetching from: ${url}`);

        const leads = await fetchAllLeads(url, accessToken);
        console.log(`Total leads retrieved: ${leads.length}`);

        const activeLeads = leads.filter(l => !lostIds.includes(l.status_id));
        console.log(`Active/Won leads (Net): ${activeLeads.length}`);
        console.log(`Lost leads excluded: ${leads.length - activeLeads.length}`);

    } catch (e) {
        console.error('Test failed:', e);
    }
}

// Ejecutar pruebas
async function run() {
    // 1. Probar Enero (El 599)
    await testLeads('custom', '01/01/2026', '31/01/2026');
    // 2. Probar Febrero (El 351)
    await testLeads('month');
}

run();
