# Cash Closures - Sistema de Control de Caja

Sistema ERP moderno para gestión y control de cierres de caja, construido con SvelteKit y configurado como PWA (Progressive Web App).

## 🚀 Características

- ✅ **PWA (Progressive Web App)** - Instalable en dispositivos móviles y desktop
- ✅ **Autenticación segura** con Supabase
- ✅ **Protección Cloudflare** - DDoS, WAF, SSL automático
- ✅ **Offline-first** - Funciona sin conexión a internet
- ✅ **UI Premium** - Diseño moderno con gradientes y animaciones
- ✅ **Gestión de cierres de caja**
- ✅ **Control de sobres**
- ✅ **Tracking de descuadres**
- ✅ **Generación de reportes PDF**

## 📋 Requisitos Previos

- Node.js 18+
- npm o pnpm
- Cuenta de Supabase (gratis)
- Cuenta de Cloudflare (opcional, para deployment)

## 🛠️ Instalación

1. **Clonar el repositorio**

```bash
git clone <tu-repo>
cd cash-closures
```

2. **Instalar dependencias**

```bash
npm install
```

3. **Configurar variables de entorno**

Crea un archivo `.env` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

4. **Generar iconos de PWA**

Abre `icon-generator.html` en tu navegador para generar los iconos:

```bash
open icon-generator.html
```

Esto descargará `icon-192.png` y `icon-512.png`. Muévelos a la carpeta `static/`:

```bash
mv icon-*.png static/
```

## 🏃 Desarrollo

Iniciar servidor de desarrollo:

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## 🏗️ Build

Construir para producción:

```bash
npm run build
```

Preview del build:

```bash
npm run preview
```

## 🔐 Configuración de Autenticación

### Configurar Supabase

1. Ve a [Supabase](https://supabase.com) y crea un proyecto
2. En el panel de Supabase, ve a **Authentication** > **Providers**
3. Habilita **Email** authentication
4. Crea un usuario de prueba en **Authentication** > **Users**
5. Copia tu `Project URL` y `anon public` key al archivo `.env`

### Crear tablas necesarias

Ejecuta los scripts SQL en tu proyecto de Supabase:

- `supabase-schema.sql`
- `supabase-envelopes.sql`
- `supabase-envelope-status.sql`

## ☁️ Deployment en Cloudflare Pages

### Opción 1: Desde GitHub (Recomendado)

1. Push tu código a GitHub
2. Ve a [Cloudflare Pages](https://pages.cloudflare.com/)
3. Conecta tu repositorio
4. Configura el build:
   - **Build command**: `npm run build`
   - **Build output directory**: `.svelte-kit/cloudflare`
5. Agrega variables de entorno:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Deploy!

### Opción 2: CLI

```bash
# Instalar Wrangler
npm install -g wrangler

# Login
wrangler login

# Build
npm run build

# Deploy
wrangler pages deploy .svelte-kit/cloudflare --project-name=cash-closures
```

## 🛡️ Configuración de Cloudflare

Sigue la guía completa en [CLOUDFLARE_SETUP.md](./CLOUDFLARE_SETUP.md) para:

- Configurar SSL/TLS
- Habilitar protección DDoS
- Configurar WAF (Web Application Firewall)
- Optimizar performance con CDN
- Configurar rate limiting
- Y mucho más...

## 📱 Instalación como PWA

### En Desktop (Chrome/Edge)

1. Abre la aplicación en tu navegador
2. Busca el ícono de instalación en la barra de direcciones
3. Haz clic en "Instalar"

### En Mobile (iOS)

1. Abre la aplicación en Safari
2. Toca el botón de compartir
3. Selecciona "Agregar a pantalla de inicio"

### En Mobile (Android)

1. Abre la aplicación en Chrome
2. Toca el menú (tres puntos)
3. Selecciona "Instalar aplicación"

## 🎨 Estructura del Proyecto

```
cash-closures/
├── src/
│   ├── routes/
│   │   ├── login/          # Página de login
│   │   ├── closures/       # Gestión de cierres
│   │   ├── sobres/         # Gestión de sobres
│   │   ├── descuadres/     # Control de descuadres
│   │   ├── +layout.svelte  # Layout principal con nav
│   │   └── +page.svelte    # Dashboard
│   ├── lib/                # Componentes y utilidades
│   ├── app.css             # Estilos globales
│   ├── app.html            # Template HTML
│   ├── hooks.server.ts     # Auth hooks
│   └── service-worker.ts   # Service worker para PWA
├── static/
│   ├── manifest.json       # PWA manifest
│   ├── icon-192.png        # Icono PWA 192x192
│   ├── icon-512.png        # Icono PWA 512x512
│   └── _headers            # Headers de Cloudflare
├── CLOUDFLARE_SETUP.md     # Guía de Cloudflare
└── package.json
```

## 🔧 Tecnologías Utilizadas

- **SvelteKit** - Framework web
- **Tailwind CSS** - Estilos
- **Supabase** - Backend y autenticación
- **Vite PWA** - Progressive Web App
- **Cloudflare Pages** - Hosting y CDN
- **jsPDF** - Generación de PDFs
- **Chart.js** - Gráficos

## 📝 Funcionalidades Principales

### Sistema de Autenticación

- Login seguro con Supabase
- Protección de rutas
- Sesión persistente
- Logout con limpieza de sesión

### Navegación

- Logo y nombre de app en la izquierda
- Links de navegación en el centro
- Información de usuario y logout en la derecha
- Diseño responsive

### PWA

- Instalable en cualquier dispositivo
- Funciona offline
- Caché inteligente
- Actualizaciones automáticas

### Seguridad (Cloudflare)

- Protección DDoS automática
- WAF (Web Application Firewall)
- SSL/TLS automático
- Rate limiting
- Headers de seguridad

## 🐛 Troubleshooting

### Service Worker no se registra

- Asegúrate de estar usando HTTPS (o localhost)
- Limpia el caché del navegador
- Verifica la consola de DevTools

### Error de autenticación

- Verifica que las variables de entorno estén correctas
- Asegúrate de que el usuario existe en Supabase
- Revisa que las tablas estén creadas

### Build falla

- Limpia node_modules: `rm -rf node_modules && npm install`
- Limpia .svelte-kit: `rm -rf .svelte-kit`
- Verifica que todas las dependencias estén instaladas

## 📄 Licencia

Todos los derechos reservados © 2024

## 🤝 Soporte

Para reportar problemas o solicitar funcionalidades, contacta al administrador del sistema.

---

**Nota**: Esta aplicación está optimizada para producción con Cloudflare y configurada con las mejores prácticas de seguridad y performance.
