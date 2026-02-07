# Kommo Widgets - Proyecto Multi-Cliente

Servidor centralizado de widgets personalizados para Kommo CRM.

## 📁 Estructura del Proyecto

```
kommo-widgets/
├── clientes/
│   ├── funinabox/
│   │   ├── manifest.json
│   │   └── widgets/
│   │       └── leads_nuevos/
│   │           └── widget.html
│   ├── cliente2/
│   │   ├── manifest.json
│   │   └── widgets/
│   └── cliente3/
│       ├── manifest.json
│       └── widgets/
├── shared/
│   ├── styles/
│   │   └── widget-base.css
│   └── scripts/
│       └── kommo-api.js
├── vercel.json
├── README.md
└── package.json
```

## 🚀 URLs de Acceso

Cada cliente tendrá su propia URL:

- **FuninaBox**: `https://kommo-widgets.vercel.app/clientes/funinabox/manifest.json`
- **Cliente 2**: `https://kommo-widgets.vercel.app/clientes/cliente2/manifest.json`
- **Cliente 3**: `https://kommo-widgets.vercel.app/clientes/cliente3/manifest.json`

## 🔧 Agregar Nuevo Cliente

1. Crear carpeta en `clientes/[nombre-cliente]/`
2. Copiar estructura de widgets
3. Personalizar `manifest.json`
4. Commit y push
5. Vercel despliega automáticamente

## 📝 Notas

- Todos los widgets comparten estilos y scripts base en `/shared/`
- Cada cliente tiene su configuración independiente
- Despliegue automático con cada push a GitHub
- HTTPS y CORS configurados globalmente
