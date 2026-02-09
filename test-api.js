// Test API con token de larga duración
const accessToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6ImY3NjlhYmMxY2RhOWJjM2U2NmZlYmYxNGZiMDMwZmJmNTQzOTA1NWYxNThiMGY2ZGZmMGE5NzQyNDllZWQzMWM2MmU4ZDdiNDQxNmVkOTgxIn0.eyJhdWQiOiI5ODcwZGM4MC1iNjdlLTQ4ZWMtYjFhZS01MDEyYzliZTZmNzAiLCJqdGkiOiJmNzY5YWJjMWNkYTliYzNlNjZmZWJmMTRmYjAzMGZiZjU0MzkwNTVmMTU4YjBmNmRmZjBhOTc0MjQ5ZWVkMzFjNjJlOGQ3YjQ0MTZlZDk4MSIsImlhdCI6MTc3MDQyNzczMSwibmJmIjoxNzcwNDI3NzMxLCJleHAiOjE3NzA2ODE2MDAsInN1YiI6IjEzMDg2OTMxIiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjMzOTEwMjU5LCJiYXNlX2RvbWFpbiI6ImtvbW1vLmNvbSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJjcm0iLCJmaWxlcyIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiLCJwdXNoX25vdGlmaWNhdGlvbnMiXSwiaGFzaF91dWlkIjoiZDU0MjQyMDUtZTA3OC00MmJjLWE3NGEtNWJlYzBhYzBmOTVkIiwiYXBpX2RvbWFpbiI6ImFwaS1nLmtvbW1vLmNvbSJ9.Yb7cYuHmNCORmEHTItr5Nbd2kddx6HtI0bH-e8uNBInyJAnmu7No-Wwu1wO1u2LvK-Yt-gCMM3rH9jLkOq-w_Uesu3rEuEr5gwFP9IGjvE6dBVfCqymi0Cd77gKsQcnJvboarj5r1fsak6Rw3LZKCObGztepTPg1wXdMCoeJhpI9vfdKgs73AwCwfn5g6nExEm5zhV_lsVzHiiFEf54FD6HFJYS4muNnoYsSc6GBLIp-JKDCYsL9d7iCv-hHTODy5QzMDawjf9dihFekWkdTr7DS6955LuHnUn6NKceQFT1bdrjLmNHi-5_Xty4YoGBKS-zUBg2gvJaDZzWkQjDaRw';
const subdomain = 'funinabox';

async function testAPI() {
    // Probar obtener leads del mes actual
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startTimestamp = Math.floor(startOfMonth.getTime() / 1000);
    const nowTimestamp = Math.floor(now.getTime() / 1000);

    const url = `https://${subdomain}.kommo.com/api/v4/leads?filter[created_at][from]=${startTimestamp}&filter[created_at][to]=${nowTimestamp}&limit=10`;

    console.log('Probando API de Kommo...');
    console.log('URL:', url);

    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
    });

    console.log('Status:', response.status);

    if (response.ok) {
        const data = await response.json();
        console.log('\n✅ ¡API funcionando!');
        console.log('Leads encontrados:', data._embedded?.leads?.length || 0);
        console.log('\nPrimeros leads:');
        console.log(JSON.stringify(data._embedded?.leads?.slice(0, 2) || [], null, 2));
    } else {
        const error = await response.text();
        console.log('\n❌ Error:');
        console.log(error);
    }
}

testAPI();
