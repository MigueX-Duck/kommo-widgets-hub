export async function fetchAllLeads(url, accessToken) {
    let allLeads = [];
    let page = 1;
    let hasMore = true;
    const baseUrl = new URL(url);

    while (hasMore) {
        // Asegurar que el parámetro de página esté correcto
        baseUrl.searchParams.set('page', page);
        // Explicitly set limit to 250 just in case, though it should be in the base URL
        baseUrl.searchParams.set('limit', 250);

        const response = await fetch(baseUrl.toString(), {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            if (response.status === 204) {
                // No content, end of list
                break;
            }
            throw new Error(`Kommo API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const leads = data._embedded?.leads || [];

        if (leads.length === 0) {
            hasMore = false;
        } else {
            allLeads = allLeads.concat(leads);
            // Si devolvió menos de 250, es la última página
            if (leads.length < 250) {
                hasMore = false;
            } else {
                page++;
            }
        }
    }

    return allLeads;
}
