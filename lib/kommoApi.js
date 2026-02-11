export async function fetchAllLeads(url, accessToken) {
    let allLeads = [];
    let nextUrl = url;

    // Asegurar que el límite sea consistente si no viene en la URL
    const urlObj = new URL(url);
    if (!urlObj.searchParams.has('limit')) {
        urlObj.searchParams.set('limit', 250);
    }
    nextUrl = urlObj.toString();

    while (nextUrl) {
        const response = await fetch(nextUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 204) {
            break;
        }

        if (!response.ok) {
            throw new Error(`Kommo API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const leads = data._embedded?.leads || [];

        if (leads.length > 0) {
            allLeads = allLeads.concat(leads);
        }

        // Seguir el enlace de la siguiente página si existe
        nextUrl = data._links?.next?.href || null;
    }

    return allLeads;
}
