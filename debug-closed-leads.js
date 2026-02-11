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

async function debugClosedLeads() {
    console.log('Starting Detailed Closed Leads Debug...');
    const subdomain = process.env.KOMMO_SUBDOMAIN;
    const accessToken = await getValidAccessToken();

    // 1. Get ALL closed leads for current month
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const dateRange = {
        start: Math.floor(startDate.getTime() / 1000),
        end: Math.floor(now.getTime() / 1000)
    };

    console.log(`Checking range: ${new Date(dateRange.start * 1000).toLocaleString()} to ${new Date(dateRange.end * 1000).toLocaleString()}`);

    // Fetch without status filter but with closed_at filter
    // Note: Kommo allows filtering by closed_at
    const url = `https://${subdomain}.kommo.com/api/v4/leads?filter[closed_at][from]=${dateRange.start}&filter[closed_at][to]=${dateRange.end}`;
    const allClosedLeads = await fetchAllLeads(url, accessToken);

    console.log(`\nTotal closed leads found: ${allClosedLeads.length}`);

    const statusCounts = {};
    allClosedLeads.forEach(lead => {
        statusCounts[lead.status_id] = (statusCounts[lead.status_id] || 0) + 1;
    });

    console.log('Status distribution:', statusCounts);

    // 2. Get Pipelines to map IDs to names
    const pipelinesUrl = `https://${subdomain}.kommo.com/api/v4/leads/pipelines`;
    const response = await fetch(pipelinesUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const pipelinesData = await response.json();

    const statusMap = {};
    if (pipelinesData._embedded && pipelinesData._embedded.pipelines) {
        pipelinesData._embedded.pipelines.forEach(pipeline => {
            if (pipeline._embedded && pipeline._embedded.statuses) {
                pipeline._embedded.statuses.forEach(status => {
                    statusMap[status.id] = { name: status.name, pipeline_id: pipeline.id };
                });
            }
        });
    }

    console.log('\nStatus Mapping for found leads:');
    Object.keys(statusCounts).forEach(statusId => {
        const info = statusMap[statusId] || { name: 'Unknown' };
        console.log(`- Status ${statusId} (${info.name}): ${statusCounts[statusId]} leads`);
    });
}

debugClosedLeads().catch(console.error);
