import dotenv from 'dotenv';
import { getValidAccessToken } from './lib/tokenManager.js';

dotenv.config({ path: '.env.local' });

async function debugRaw() {
    const subdomain = process.env.KOMMO_SUBDOMAIN;
    const accessToken = await getValidAccessToken();

    // Probar Febrero sin filtros complejos, solo por fecha de creación
    // 01/02/2026 00:00:00 = 1738382400 (UTC approx)
    // Usamos un rango amplio para ver qué hay
    const start = 1738382400;
    const end = Math.floor(Date.now() / 1000);

    const url = `https://${subdomain}.kommo.com/api/v4/leads?filter[created_at][from]=${start}&filter[created_at][to]=${end}&limit=250`;

    console.log(`Debug Fetch: ${url}`);
    const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
    const data = await response.json();

    const leads = data._embedded?.leads || [];
    console.log(`Leads on page 1: ${leads.length}`);
    if (leads.length > 0) {
        console.log(`First lead created_at: ${new Date(leads[0].created_at * 1000).toLocaleString()}`);
        console.log(`Last lead created_at: ${new Date(leads[leads.length - 1].created_at * 1000).toLocaleString()}`);
    }

    console.log(`Next page link: ${data._links?.next?.href || 'None'}`);
}

debugRaw();
