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

// COPIED FROM lost-sales.js
function getPeriodDates(period, dateFrom, dateTo) {
    const now = new Date();
    let startDate, prevStartDate, prevEndDate;

    switch (period) {
        case 'custom':
            // Fechas personalizadas: parsear date_from y date_to
            if (dateFrom && dateTo) {
                console.log(`Parsing custom dates: from=${dateFrom}, to=${dateTo}`);

                let dayFrom, monthFrom, yearFrom;
                let dayTo, monthTo, yearTo;

                if (dateFrom.includes('/')) {
                    [dayFrom, monthFrom, yearFrom] = dateFrom.split('/');
                } else if (dateFrom.includes('-')) {
                    [yearFrom, monthFrom, dayFrom] = dateFrom.split('-');
                }

                if (dateTo.includes('/')) {
                    [dayTo, monthTo, yearTo] = dateTo.split('/');
                } else if (dateTo.includes('-')) {
                    [yearTo, monthTo, dayTo] = dateTo.split('-');
                }

                console.log(`Parsed From: Y=${yearFrom}, M=${monthFrom}, D=${dayFrom}`);
                console.log(`Parsed To: Y=${yearTo}, M=${monthTo}, D=${dayTo}`);

                // Check if parsing failed
                if (!yearFrom || !monthFrom || !dayFrom) {
                    console.error('Failed to parse DATE FROM');
                    return null;
                }

                startDate = new Date(yearFrom, monthFrom - 1, dayFrom, 0, 0, 0, 0);
                const endDate = new Date(yearTo, monthTo - 1, dayTo, 23, 59, 59, 999);

                console.log('Start Date Timestamp:', startDate.getTime());
                console.log('End Date Timestamp:', endDate.getTime());

                const durationMs = endDate.getTime() - startDate.getTime();
                prevEndDate = new Date(startDate.getTime() - 1);
                prevStartDate = new Date(prevEndDate.getTime() - durationMs);

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
                return result;
            }
            period = 'month';
        // fallthrough
        default:
            // ... simplified for debug
            return { current: { start: 0, end: 0 }, previous: { start: 0, end: 0 } };
    }
}

async function debugLostSalesV2() {
    console.log('Starting Lost Sales Debug V2 (with deduplication & date check)...');

    try {
        const accessToken = await getValidAccessToken();
        const subdomain = process.env.KOMMO_SUBDOMAIN;

        // 1. Fetch Pipelines
        console.log('Fetching pipelines...');
        const pipelinesUrl = `https://${subdomain}.kommo.com/api/v4/leads/pipelines`;
        const pipelinesResponse = await fetch(pipelinesUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });
        const pipelinesData = await pipelinesResponse.json();

        // 2. Deduplicate Status Logic (COPIED FROM FIXED lost-sales.js)
        const lostStatusesMap = new Map();

        if (pipelinesData._embedded && pipelinesData._embedded.pipelines) {
            pipelinesData._embedded.pipelines.forEach(pipeline => {
                if (pipeline._embedded && pipeline._embedded.statuses) {
                    pipeline._embedded.statuses.forEach(status => {
                        const statusName = status.name.toLowerCase();
                        if (statusName.includes('perdido') ||
                            statusName.includes('no realizado') ||
                            statusName.includes('rechazado') ||
                            statusName.includes('cancelado')) {

                            if (!lostStatusesMap.has(status.id)) {
                                lostStatusesMap.set(status.id, {
                                    id: status.id,
                                    name: status.name,
                                });
                            }
                        }
                    });
                }
            });
        }

        const lostStatuses = Array.from(lostStatusesMap.values());
        console.log(`Unique Lost Statuses found: ${lostStatuses.length}`);
        console.log(lostStatuses.map(s => `${s.name} (${s.id})`));

        // 3. Test Date Parsing (simulate User Input)
        // User likely sends 'YYYY-MM-DD' from HTML input type="date"
        const dateFromInput = '2026-01-01';
        const dateToInput = '2026-02-11';

        console.log(`\nTesting with dates: ${dateFromInput} -> ${dateToInput}`);

        // Use the parser I *want* to implement (capable of both)
        const dates = getPeriodDates('custom', dateFromInput, dateToInput);

        if (!dates) {
            console.error('Date parsing FAILED.');
            return;
        }

        console.log('Date timestamps:', dates.current);

        // 4. Fetch Leads
        const statusFilter = lostStatuses.map(s => `filter[statuses][0][status_id][]=${s.id}`).join('&');

        const url = `https://${subdomain}.kommo.com/api/v4/leads?` +
            `${statusFilter}&` +
            `filter[closed_at][from]=${dates.current.start}&` +
            `filter[closed_at][to]=${dates.current.end}`;

        console.log(`URL: ${url}`);

        const leads = await fetchAllLeads(url, accessToken);
        console.log(`\nTotal Lost Leads: ${leads.length}`);

        // Agrupar por motivo (Usando Custom Field ID: 263326 "Razón de pérdida")
        const LOSS_REASON_FIELD_ID = 263326;
        const currentByReason = groupByLossReason(leads, LOSS_REASON_FIELD_ID);
        console.log('Grouped by Reason:', currentByReason);

    } catch (error) {
        console.error('Debug Error:', error);
    }
}

function groupByLossReason(leads, fieldId) {
    const grouped = {};

    leads.forEach(lead => {
        let reason = 'Sin motivo especificado';

        // Buscar el custom field específico
        if (lead.custom_fields_values) {
            const field = lead.custom_fields_values.find(f => f.field_id === fieldId);
            if (field && field.values && field.values.length > 0) {
                // Tomar el valor (enum o text)
                reason = field.values[0].value;
            }
        }

        if (!grouped[reason]) {
            grouped[reason] = 0;
        }
        grouped[reason]++;
    });

    // Convertir a array y ordenar por cantidad
    const result = Object.entries(grouped)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count);

    return result;
}

debugLostSalesV2();
