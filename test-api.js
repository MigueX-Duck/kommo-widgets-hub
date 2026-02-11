// Test API con token de larga duración
const accessToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6ImM5MjI3NjdiY2I2Yzg4MTQzMzA2Mzk4MTBiYjlkOTJmYjI2Zjk1ZGIyYmE0ZjFiOTRmNWU5MGI2NTU0YjRlZTdjMDI0ZTE0ZjRmZmY5OTg3In0.eyJhdWQiOiI5ODcwZGM4MC1iNjdlLTQ4ZWMtYjFhZS01MDEyYzliZTZmNzAiLCJqdGkiOiJjOTIyNzY3YmNiNmM4ODE0MzMwNjM5ODEwYmI5ZDkyZmIyNmY5NWRiMmJhNGYxYjk0ZjVlOTBiNjU1NGI0ZWU3YzAyNGUxNGY0ZmZmOTk4NyIsImlhdCI6MTc3MDg0MDI2NSwibmJmIjoxNzcwODQwMjY1LCJleHAiOjE5Mjg1MzQ0MDAsInN1YiI6IjEzMDg2OTMxIiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjMzOTEwMjU5LCJiYXNlX2RvbWFpbiI6ImtvbW1vLmNvbSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJjcm0iLCJmaWxlcyIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiLCJwdXNoX25vdGlmaWNhdGlvbnMiXSwiaGFzaF91dWlkIjoiZWUxNTgzNDctNGQ3NS00YTljLWJkNjUtNTY1NDJlNmEyZGE4IiwiYXBpX2RvbWFpbiI6ImFwaS1nLmtvbW1vLmNvbSJ9.fHMgr1ap1669PqiytpakwYc9xaHzzpx6nHL-QyjgBWtjf0j-aHRbaJ1NEQEaGVjU_wpThFfnBICyofJp-ThDlrD5U81EaWESHmNWVg63GKbJocJh8iCVBMl2rhn40LkMw9nMtFw7Mu7WNeNCNE2BsC_wgX97PaTSxX-0mWnTiqqO8Bdz4VVsumUQIPw-S-gSHuIwoTamZAAbFuejwGHYan58V9HTf8CoyEsms_UXvPmtclIy6E4YVHrS_1x-0FMVb6F3UzlkkDWDl4_l9Y4vfv3QlqX1NihSFIceXYMm8iYW9kNN_kk-I7txQyOs3-wmk_bbNgvflgHEhnkhBq2WlQ';
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
