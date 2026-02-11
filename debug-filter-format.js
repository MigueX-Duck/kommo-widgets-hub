import { getValidAccessToken } from './lib/tokenManager.js';
import { fetchAllLeads } from './lib/kommoApi.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

async function debugFilterFormat() {
    const subdomain = process.env.KOMMO_SUBDOMAIN;
    const accessToken = await getValidAccessToken();

    // Use current month
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const dateRange = {
        start: Math.floor(startDate.getTime() / 1000),
        end: Math.floor(now.getTime() / 1000)
    };

    console.log(`Period: ${new Date(dateRange.start * 1000).toLocaleDateString()} to now`);

    const formats = [
        { name: 'Current Format: filter[statuses][0][status_id][]', param: 'filter[statuses][0][status_id][]' },
        { name: 'Alt Format 1: filter[status][]', param: 'filter[status][]' },
        { name: 'Alt Format 2: filter[pipeline][PIPELINE_ID][status][]', param: 'filter[pipeline][33910259][status][]' } // Example ID from first debug
    ];

    // IDs from previous debug
    const WON_ID = 142;
    const LOST_ID = 143;

    for (const format of formats) {
        console.log(`\nTesting format: ${format.name}`);

        const wonUrl = `https://${subdomain}.kommo.com/api/v4/leads?${format.param}=${WON_ID}&filter[closed_at][from]=${dateRange.start}&filter[closed_at][to]=${dateRange.end}`;
        const lostUrl = `https://${subdomain}.kommo.com/api/v4/leads?${format.param}=${LOST_ID}&filter[closed_at][from]=${dateRange.start}&filter[closed_at][to]=${dateRange.end}`;

        const wonLeads = await fetchAllLeads(wonUrl, accessToken);
        const lostLeads = await fetchAllLeads(lostUrl, accessToken);

        console.log(`- Result WON Filter: ${wonLeads.length} leads`);
        console.log(`- Result LOST Filter: ${lostLeads.length} leads`);

        if (wonLeads.length > 0) {
            console.log(`  Sample WON lead status: ${wonLeads[0].status_id}`);
        }
        if (lostLeads.length > 0) {
            console.log(`  Sample LOST lead status: ${lostLeads[0].status_id}`);
        }
    }
}

debugFilterFormat().catch(console.error);
