export default async function handler(req, res) {
  // Configuración OAuth
  const clientId = process.env.KOMMO_CLIENT_ID;
  const subdomain = process.env.KOMMO_SUBDOMAIN;
  const redirectUri = process.env.KOMMO_REDIRECT_URI;

  // Generar state para seguridad CSRF
  const state = Math.random().toString(36).substring(7);

  // Construir URL de autorización de Kommo
  const authUrl = `https://${subdomain}.kommo.com/oauth?` +
    `client_id=${clientId}&` +
    `state=${state}&` +
    `mode=post_message`;

  // Guardar state en cookie para validar después
  res.setHeader('Set-Cookie', `oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax`);

  // Redirigir a Kommo para autorización
  res.redirect(302, authUrl);
}
