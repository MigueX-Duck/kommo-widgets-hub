# 🔐 Configurar OAuth para Widget de Kommo

## 📋 Información Necesaria

Necesitamos obtener las credenciales OAuth de la integración que creaste en Kommo.

### Paso 1: Obtener Credenciales

1. Ve a **Kommo** → **Configuración** → **Integraciones**
2. Click en **"Analytics Avanzados FuninaBox"**
3. Ve a la pestaña **"Llaves y alcances"**
4. Copia los siguientes valores:

   - **ID de la integración**: `9870dc80-b67c-48ec-b0ae-5012c9be6d70` (ya lo tienes)
   - **Clave secreta**: Click en "Generar clave secreta" si no la tienes
   - **Código de autorización**: Lo generaremos en el siguiente paso

### Paso 2: URLs de Redirección

Para OAuth, necesitamos configurar una URL de redirección. Agrega esta URL en la configuración de la integración:

```
https://kommo-widgets-hub.vercel.app/oauth/callback
```

### Paso 3: Flujo OAuth

El flujo será:
1. Usuario hace click en "Conectar" en el widget
2. Se redirige a Kommo para autorizar
3. Kommo redirige de vuelta con un código
4. Intercambiamos el código por un token de acceso
5. Usamos el token para llamar a la API

---

## 🚨 Problema Actual

El problema es que **OAuth requiere un servidor backend** para:
- Guardar el `client_secret` de forma segura
- Intercambiar el código de autorización por tokens
- Refrescar tokens cuando expiren

**No podemos hacer esto solo con archivos estáticos en Vercel.**

---

## 💡 Soluciones Alternativas

### Opción A: Usar Vercel Serverless Functions
Crear funciones serverless en Vercel para manejar OAuth.

**Pros:**
- Todo en el mismo proyecto
- Gratis en el plan de Vercel

**Contras:**
- Requiere código Node.js
- Más complejo

### Opción B: Widget Simple con Filtros de Kommo
Usar la funcionalidad nativa de Kommo para crear widgets desde filtros (sin código).

**Pros:**
- Muy fácil, sin código
- Funciona de inmediato

**Contras:**
- Menos personalización
- No puedes usar tu diseño custom

### Opción C: Datos de Demostración
Mostrar datos de ejemplo en el widget (sin API real).

**Pros:**
- Funciona de inmediato
- Puedes ver el diseño

**Contras:**
- No son datos reales

---

## 🎯 Mi Recomendación

**Opción A** es la mejor si quieres un widget completamente funcional y personalizado. Puedo crear las funciones serverless necesarias.

**¿Quieres que implemente OAuth con Vercel Serverless Functions?**
