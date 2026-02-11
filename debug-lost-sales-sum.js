
import { getValidAccessToken } from './lib/tokenManager.js';
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

async function debugLostSalesData() {
    const accessToken = await getValidAccessToken();
    const apiUrl = `https://kommo-widgets-hub.vercel.app/api/kommo/lost-sales?period=month`;

    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.success) {
        console.log('Total:', data.data.current.total);
        console.log('Breakdown:');
        data.data.current.by_reason.forEach(item => {
            console.log(`- ${item.reason}: ${item.count}`);
        });

        const sum = data.data.current.by_reason.reduce((acc, item) => acc + item.count, 0);
        console.log('Sum of parts:', sum);
    } else {
        console.error('API Error:', data);
    }
}

debugLostSalesData().catch(console.error);
