export async function fetchAllLeads(url, accessToken) {
    let allLeads = [];
    let nextUrl = url;

    // Asegurar que el límite sea 250 si no está en la URL
    if (!nextUrl.includes('limit=')) {
        nextUrl += (nextUrl.includes('?') ? '&' : '?') + 'limit=250';
    }

    let iterations = 0;
    const maxIterations = 20; // Seguridad para evitar bucles infinitos

    while (nextUrl && iterations < maxIterations) {
        iterations++;

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
            const errorText = await response.text();
            throw new Error(`Kommo API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const leads = data._embedded?.leads || [];

        if (leads.length > 0) {
            allLeads = allLeads.concat(leads);
        }

        // Seguir el enlace de la siguiente página
        const nextHref = data._links?.next?.href;
        if (nextHref) {
            // Manejar URLs relativas
            if (nextHref.startsWith('/')) {
                const urlObj = new URL(nextUrl);
                nextUrl = `${urlObj.protocol}//${urlObj.host}${nextHref}`;
            } else {
                nextUrl = nextHref;
            }
        } else {
            nextUrl = null;
        }
    }

    return allLeads;
}
