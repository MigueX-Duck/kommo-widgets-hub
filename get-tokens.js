// Script temporal para intercambiar código por tokens
const code = 'def502005ffec8f95f622076fc3c33a3916ff2eb37801cd05d1bd12c11bb03c78077184af6956c3bc4619100c4856f3b4266870e6a27c013514d41b837276630ba8faba1ef8917e2b4c4a66d617cf9483ad3395d893020402d632139c432d5876028c574a2107036a55a33677ab414143990400a31e70fb22ee632fbec161afc9078bd0b46c37504f8cd3cf1a271d2870077b423f2eb54544091f59845fdaa999cfbcdd8c861381b6844222f6833bc95ce8dc4b7af9f0fd8a55335101454d67c374ba00866ab7f8c7b23afa65fadd8a42df1c32020f0f909d896748d5fca3128c8b98b5621b26c4110240fd6d380db41cefdab4438cdf30e2abd06a02a7b47abe887128e2df00a0f1d7e8caef5f93ec41ecc051d1d796ee674f7e9e06ac9c016f1d737176278e25c15a9eb03cab893eeb692cd36beba377700e345600512945a8a0e3d4ded7616e9eccc56212b9e745a53920558b4349f920c3d2f5f6f415117fdf3e50e0e2f9202577babe1809ca48240c7622f4adac0d2bc08995818eebffb9c4da4559a4859bc61aaea620ff92ef33b0860dbd78076efc6d4b79bd79d7ef43dcbb59f4b9e0b259f8fcdeed101130bc04acc76ce3ef36fefa7584aa7239d4341b6feb4a1e4c5d4934aeac3c45c6abb82418a59a7a25e26d91e99739aa64f49a7af35afd0e88141c1b96701af766dbefa2120412841d62618fded76735d16af0459ab4de139bbd383252f';

const clientId = '9870dc80-b67c-48ec-b0ae-5012c9be6d70';
const clientSecret = 'SAU0AF9zgktwvBQeBfOKnzpasbSCmFTOnjJzzWrzxIqIZeNbWvRxTFdTgBEPrJef';
const redirectUri = 'https://kommo-widgets-hub.vercel.app/api/oauth/callback';
const subdomain = 'funinabox';

async function getTokens() {
    const tokenUrl = `https://${subdomain}.kommo.com/oauth2/access_token`;

    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri,
        }),
    });

    const data = await response.json();
    console.log('Tokens obtenidos:');
    console.log(JSON.stringify(data, null, 2));
}

getTokens();
