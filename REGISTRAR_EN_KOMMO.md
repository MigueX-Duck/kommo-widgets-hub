# 🎯 Registrar Widget en Kommo - Paso a Paso

## ✅ URLs del Proyecto

- **Manifest**: `https://kommo-widgets-pq8ztpilf-duckstudios.vercel.app/clientes/funinabox/manifest.json`
- **Widget**: `https://kommo-widgets-pq8ztpilf-duckstudios.vercel.app/clientes/funinabox/widgets/leads_nuevos/widget.html`

---

## 📋 Pasos para Registrar en Kommo

### 1. Ir a Configuración de Integraciones

1. Abre tu cuenta de **Kommo**
2. Ve a **Configuración** (⚙️ arriba derecha)
3. En el menú lateral, busca **"Integraciones"** o **"Integrations"**

### 2. Desinstalar Integración Anterior (si existe)

Si ya instalaste "Analytics Avanzados" antes:
1. Búscala en la lista
2. Click en ella
3. Click en **"Desinstalar"** o **"Uninstall"**
4. Confirma

### 3. Crear Nueva Integración

1. Click en **"Crear integración"** o **"Create integration"**
2. Completa el formulario:

   **Información Básica:**
   - **Nombre**: `Analytics Avanzados FuninaBox`
   - **Descripción**: `Widgets personalizados de análisis de leads y ventas`
   - **Logo**: (opcional, puedes dejarlo en blanco)

   **URLs:**
   - **Redireccionador URL** (o **Redirect URI**):
     ```
     https://kommo-widgets-pq8ztpilf-duckstudios.vercel.app/clientes/funinabox/manifest.json
     ```

   **Permisos** (selecciona los necesarios):
   - ✅ Lectura de leads
   - ✅ Lectura de contactos
   - ✅ Lectura de transacciones
   - ✅ Lectura de tareas

3. Click en **"Guardar"** o **"Save"**

### 4. Instalar la Integración

1. Una vez creada, aparecerá en tu lista de integraciones
2. Click en ella
3. Click en **"Instalar"** o **"Install"**
4. Autoriza los permisos
5. La integración se activará

### 5. Agregar Widget al Dashboard

1. Ve a tu **Dashboard** de Kommo
2. Busca el botón de **"Agregar widget"** o **"Add widget"** (generalmente arriba o en el menú de widgets)
3. En el modal que aparece:
   - **Ancho**: `2`
   - **Altura**: `1`
   - **Ingrese el enlace a su recurso**: Pega la URL del manifest:
     ```
     https://kommo-widgets-pq8ztpilf-duckstudios.vercel.app/clientes/funinabox/manifest.json
     ```
4. Click en **"Guardar"**

### 6. Verificar

El widget **"Leads Nuevos"** debería aparecer en tu dashboard mostrando:
- Número de leads nuevos
- Comparación con período anterior
- Gráfico de tendencia

---

## ⚠️ Solución de Problemas

### Si el widget no aparece:
1. Verifica que la URL del manifest sea correcta
2. Abre la URL del manifest en tu navegador para confirmar que funciona
3. Verifica que los permisos estén autorizados
4. Refresca el dashboard (F5)

### Si muestra "Cargando..." indefinidamente:
1. Abre la consola del navegador (F12)
2. Busca errores de CORS o de red
3. Verifica que la URL del widget en el manifest sea correcta

### Si muestra "-" o "0":
- Es normal al principio
- El widget está funcionando pero no hay datos aún
- Kommo necesita tiempo para cargar los datos de la API

---

## 🎉 ¡Listo!

Una vez que veas el widget en tu dashboard, el proyecto está completamente funcional.

**Próximos pasos:**
- Agregar más widgets (Leads Cerrados, Ventas, etc.)
- Personalizar estilos
- Agregar más clientes en `/clientes/`

---

**¿Necesitas ayuda? Avísame si algo no funciona.** 😊
