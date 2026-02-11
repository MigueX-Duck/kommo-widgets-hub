export async function fetchAllLeads(url, accessToken) {
    let allLeads = [];
    let nextUrl = url;
    const subdomain = new URL(url).hostname.split('.')[0];

    // Asegurar límite de 250 para eficiencia
    const urlObj = new URL(url);
    if (!urlObj.searchParams.has('limit')) {
        urlObj.searchParams.set('limit', 250);
    }
    nextUrl = urlObj.toString();

    while (nextUrl) {
        // Asegurar que la URL sea absoluta si viene relativa de Kommo
        if (nextUrl.startsWith('/')) {
            nextUrl = `https://${subdomain}.kommo.com${nextUrl}`;
        }

        const response = await fetch(nextUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 204) { // No content
            break;
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Kommo API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        const leads = data._embedded?.leads || [];

        if (leads.length > 0) {
            allLeads = allLeads.concat(leads);
        }

        // Seguir el enlace de la siguiente página
        nextUrl = data._links?.next?.href || null;

        // Evitar bucles infinitos por error de API
        if (nextUrl === urlObj.toString()) {
            break;
        }
    }

    return allLeads;
}
