# 🚀 Desplegar en Vercel - Guía Completa

## 📋 Paso 1: Crear Cuenta en Vercel

1. Ve a: https://vercel.com/signup
2. **Recomendado**: Regístrate con **GitHub** (facilita el despliegue automático)
3. Autoriza a Vercel para acceder a tus repositorios

---

## 📦 Paso 2: Crear Repositorio en GitHub

### Opción A: Desde GitHub Web

1. Ve a: https://github.com/new
2. **Repository name**: `kommo-widgets`
3. **Description**: `Servidor centralizado de widgets para Kommo CRM`
4. **Public** (o Private si prefieres)
5. **NO marques** "Add a README file" (ya lo tenemos)
6. Click en **"Create repository"**

### Opción B: Desde la Línea de Comandos

```powershell
# Ir a la carpeta del proyecto
cd c:\Desarrollo\kommo

# Inicializar Git
git init

# Agregar todos los archivos
git add .

# Hacer commit
git commit -m "Initial commit: Kommo widgets multi-cliente"

# Agregar repositorio remoto (reemplaza TU-USUARIO con tu usuario de GitHub)
git remote add origin https://github.com/TU-USUARIO/kommo-widgets.git

# Subir a GitHub
git push -u origin main
```

---

## 🚀 Paso 3: Desplegar en Vercel

### Método 1: Desde Vercel Dashboard (MÁS FÁCIL)

1. Ve a: https://vercel.com/dashboard
2. Click en **"Add New..."** → **"Project"**
3. Verás una lista de tus repositorios de GitHub
4. Busca **"kommo-widgets"**
5. Click en **"Import"**
6. Configuración:
   - **Project Name**: `kommo-widgets` (o el que prefieras)
   - **Framework Preset**: `Other`
   - **Root Directory**: `./` (dejar por defecto)
   - **Build Command**: (dejar vacío)
   - **Output Directory**: (dejar vacío)
7. Click en **"Deploy"**
8. Espera 1-2 minutos
9. ¡Listo! Te dará una URL como: `https://kommo-widgets.vercel.app`

### Método 2: Desde Vercel CLI

```powershell
# Instalar Vercel CLI (solo la primera vez)
npm install -g vercel

# Ir a la carpeta del proyecto
cd c:\Desarrollo\kommo

# Desplegar
vercel

# Seguir las instrucciones:
# - Log in to Vercel (se abrirá el navegador)
# - Set up and deploy: Y
# - Which scope: Selecciona tu cuenta/empresa
# - Link to existing project: N
# - Project name: kommo-widgets
# - In which directory: ./ (presiona Enter)
# - Override settings: N

# Para desplegar a producción
vercel --prod
```

---

## ✅ Paso 4: Verificar Despliegue

Una vez desplegado, verifica que las URLs funcionen:

1. **Manifest de FuninaBox:**
   ```
   https://kommo-widgets.vercel.app/clientes/funinabox/manifest.json
   ```

2. **Widget de Leads Nuevos:**
   ```
   https://kommo-widgets.vercel.app/clientes/funinabox/widgets/leads_nuevos/widget.html
   ```

---

## 🔧 Paso 5: Actualizar Manifest de FuninaBox

Actualiza el `manifest.json` de FuninaBox para usar la URL de Vercel:

```json
{
  "widgets": {
    "dashboard": {
      "leads_nuevos": {
        "js": [
          "https://kommo-widgets.vercel.app/clientes/funinabox/widgets/leads_nuevos/widget.html"
        ]
      }
    }
  }
}
```

---

## 🎯 Paso 6: Registrar en Kommo

1. Ve a **Kommo** → **Configuración** → **Integraciones**
2. Desinstala "Analytics Avanzados" si existe
3. **Crear integración**
4. **Redireccionador URL:**
   ```
   https://kommo-widgets.vercel.app/clientes/funinabox/manifest.json
   ```
5. Guardar y activar

---

## 🔄 Actualizaciones Futuras

Una vez configurado, para actualizar widgets:

```powershell
# Hacer cambios en los archivos
# ...

# Commit
git add .
git commit -m "Actualizar widget de leads nuevos"

# Push (Vercel despliega automáticamente)
git push
```

Vercel detecta el push y despliega automáticamente en 30-60 segundos.

---

## 👥 Agregar Nuevo Cliente

```powershell
# Crear carpeta del cliente
mkdir clientes\nuevo-cliente\widgets

# Copiar estructura base
cp -r clientes\funinabox\* clientes\nuevo-cliente\

# Personalizar manifest.json y widgets

# Commit y push
git add .
git commit -m "Agregar cliente: nuevo-cliente"
git push
```

URL del nuevo cliente:
```
https://kommo-widgets.vercel.app/clientes/nuevo-cliente/manifest.json
```

---

## 🎉 ¡Listo!

Ahora tienes un servidor centralizado para todos tus clientes de Kommo. Cada vez que agregues un cliente nuevo o actualices un widget, solo haces push y Vercel lo despliega automáticamente.

**Ventajas:**
- ✅ Gratis (hasta 100GB de ancho de banda/mes)
- ✅ HTTPS automático
- ✅ Despliegue automático con cada push
- ✅ Fácil de mantener
- ✅ Escalable para múltiples clientes
