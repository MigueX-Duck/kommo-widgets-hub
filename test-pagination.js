import { fetchAllLeads } from './lib/kommoApi.js';
import { getValidAccessToken } from './lib/tokenManager.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Manually load .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '.env.local');

if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
}

async function runTest() {
    console.log('Starting pagination test...');

    try {
        const accessToken = await getValidAccessToken();
        const subdomain = process.env.KOMMO_SUBDOMAIN;

        console.log('Got access token, fetching leads...');

        // Fetch leads for January 2026 (expecting ~700)
        // Date(year, monthIndex) -> Month is 0-indexed (0 = Jan)
        const startTimestamp = Math.floor(new Date(2026, 0, 1, 0, 0, 0, 0).getTime() / 1000);
        const endTimestamp = Math.floor(new Date(2026, 0, 31, 23, 59, 59, 999).getTime() / 1000);

        const url = `https://${subdomain}.kommo.com/api/v4/leads?` +
            `filter[created_at][from]=${startTimestamp}&` +
            `filter[created_at][to]=${endTimestamp}`;

        console.log(`URL: ${url}`);

        const leads = await fetchAllLeads(url, accessToken);

        console.log(`\nTest Results:`);
        console.log(`Total leads fetched: ${leads.length}`);

        if (leads.length > 250) {
            console.log('✅ SUCCESS: Pagination is working (more than 250 leads fetched)');
        } else {
            console.log('⚠️ WARNING: Less than 250 leads fetched. This might be correct if there are few leads, or pagination failed.');
        }

        if (leads.length > 0) {
            console.log('First lead ID:', leads[0].id);
            console.log('Last lead ID:', leads[leads.length - 1].id);
        }

    } catch (error) {
        console.error('❌ Test Failed:', error);
    }
}

runTest();
