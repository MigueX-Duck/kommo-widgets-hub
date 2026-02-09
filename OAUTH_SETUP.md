# 🔐 Configurar OAuth - Pasos Finales

## Paso 1: Configurar Variables de Entorno en Vercel

1. Ve a: https://vercel.com/dashboard
2. Selecciona el proyecto **kommo-widgets-hub**
3. Ve a **Settings** → **Environment Variables**
4. Agrega las siguientes variables (una por una):

| Variable | Value |
|----------|-------|
| `KOMMO_CLIENT_ID` | `9870dc80-b67c-48ec-b0ae-5012c9be6d70` |
| `KOMMO_CLIENT_SECRET` | `SAU0AF9zgktwvBQeBfOKnzpasbSCmFTOnjJzzWrzxIqIZeNbWvRxTFdTgBEPrJef` |
| `KOMMO_SUBDOMAIN` | `funinabox` |
| `KOMMO_REDIRECT_URI` | `https://kommo-widgets-hub.vercel.app/api/oauth/callback` |

**IMPORTANTE**: Selecciona **Production**, **Preview** y **Development** para cada variable.

---

## Paso 2: Redeploy del Proyecto

Después de agregar las variables:

1. Ve a **Deployments**
2. Click en el último deployment
3. Click en los tres puntos (⋯) → **Redeploy**
4. Espera 30-60 segundos

---

## Paso 3: Autorizar la Integración

Una vez que Vercel termine de desplegar:

1. Abre esta URL en tu navegador:
   ```
   https://kommo-widgets-hub.vercel.app/api/oauth/authorize
   ```

2. Te redirigirá a Kommo para autorizar

3. **Autoriza** los permisos solicitados

4. Te redirigirá de vuelta y verás un JSON con los tokens

5. **COPIA** los valores de `access_token` y `refresh_token`

---

## Paso 4: Agregar Tokens a Vercel

Vuelve a **Settings** → **Environment Variables** y agrega:

| Variable | Value |
|----------|-------|
| `KOMMO_ACCESS_TOKEN` | (el access_token que copiaste) |
| `KOMMO_REFRESH_TOKEN` | (el refresh_token que copiaste) |

---

## Paso 5: Redeploy Final

1. Ve a **Deployments**
2. Click en el último deployment
3. Click en los tres puntos (⋯) → **Redeploy**
4. Espera 30-60 segundos

---

## Paso 6: Probar la API

Abre esta URL para probar que funciona:

```
https://kommo-widgets-hub.vercel.app/api/kommo/leads?period=month
```

Deberías ver un JSON con tus leads reales de Kommo.

---

## ✅ Siguiente Paso

Una vez que confirmes que la API funciona, actualizaremos el widget para usar datos reales en lugar de datos de demostración.
