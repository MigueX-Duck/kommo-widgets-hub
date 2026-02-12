export async function fetchAllLeads(url, accessToken) {
    let allLeads = [];
    let page = 1;
    let hasMore = true;
    const urlObj = new URL(url);

    // Forzamos límite de 250
    urlObj.searchParams.set('limit', 250);

    while (hasMore && page <= 10) { // Límite de 2500 leads para seguridad
        urlObj.searchParams.set('page', page);
        const currentUrl = urlObj.toString();

        console.log(`Fetching page ${page}: ${currentUrl}`);

        const response = await fetch(currentUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 204) {
            hasMore = false;
            break;
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Kommo API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const leads = data._embedded?.leads || [];

        if (leads.length > 0) {
            allLeads = allLeads.concat(leads);
            if (leads.length < 250) {
                hasMore = false;
            } else {
                page++;
            }
        } else {
            hasMore = false;
        }

        // Si no hay más páginas según la API
        if (!data._links?.next) {
            hasMore = false;
        }
    }

    return allLeads;
}
