# Guía de Integración con Cloudflare

Esta guía te ayudará a configurar Cloudflare para tu aplicación Cash Closures, incluyendo protección DDoS, CDN, SSL, y optimizaciones.

## 1. Configuración Inicial de Cloudflare

### Paso 1: Crear cuenta y agregar sitio

1. Ve a [Cloudflare](https://www.cloudflare.com/) y crea una cuenta
2. Haz clic en "Add a Site"
3. Ingresa tu dominio (ej: `cashclosures.com`)
4. Selecciona el plan Free (o Pro si necesitas más funciones)

### Paso 2: Configurar DNS

1. Cloudflare te mostrará los nameservers que debes usar
2. Ve a tu registrador de dominios y actualiza los nameservers
3. Espera a que se propague (puede tomar hasta 24 horas)

## 2. Configuración de SSL/TLS

### Habilitar SSL Completo

1. Ve a **SSL/TLS** en el panel de Cloudflare
2. Selecciona **Full (strict)** como modo de encriptación
3. Habilita **Always Use HTTPS**
4. Habilita **Automatic HTTPS Rewrites**

### Configurar certificados

```bash
# Cloudflare proporciona certificados SSL gratuitos automáticamente
# No necesitas configurar nada adicional
```

## 3. Protección y Seguridad

### Configurar Firewall Rules

1. Ve a **Security** > **WAF**
2. Habilita el **Managed Rules** (disponible en plan Free)
3. Crea reglas personalizadas:

```
# Bloquear países específicos (opcional)
(ip.geoip.country ne "US" and ip.geoip.country ne "MX")

# Proteger rutas de API
(http.request.uri.path contains "/api/" and cf.threat_score > 10)
```

### Configurar Rate Limiting

1. Ve a **Security** > **Rate Limiting Rules**
2. Crea regla para proteger login:

```
Rule name: Protect Login
When incoming requests match:
  URI Path equals /login

Then:
  Block for 1 hour
  When rate exceeds 5 requests per 1 minute
```

### Habilitar DDoS Protection

1. Ve a **Security** > **DDoS**
2. El DDoS protection está habilitado automáticamente
3. Configura **Sensitivity Level** a "High"

## 4. Optimización de Rendimiento

### Configurar Caching

1. Ve a **Caching** > **Configuration**
2. Configura **Browser Cache TTL** a "4 hours"
3. Habilita **Always Online**

### Page Rules para PWA

1. Ve a **Rules** > **Page Rules**
2. Crea las siguientes reglas:

```
# Cache static assets
URL: *cashclosures.com/*.{jpg,jpeg,png,gif,ico,css,js,svg,woff,woff2}
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month
  - Browser Cache TTL: 1 month

# No cache for API
URL: *cashclosures.com/api/*
Settings:
  - Cache Level: Bypass

# Cache HTML with short TTL
URL: *cashclosures.com/*
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 2 hours
  - Browser Cache TTL: 30 minutes
```

### Habilitar Auto Minify

1. Ve a **Speed** > **Optimization**
2. Habilita **Auto Minify** para:
   - JavaScript
   - CSS
   - HTML

### Habilitar Brotli

1. Ve a **Speed** > **Optimization**
2. Habilita **Brotli** compression

## 5. Deployment con Cloudflare Pages

### Opción A: Deploy directo desde GitHub

1. Ve a **Workers & Pages** > **Create application** > **Pages**
2. Conecta tu repositorio de GitHub
3. Configura el build:

```bash
Build command: npm run build
Build output directory: build
Root directory: /
```

4. Variables de entorno:

```
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

5. Haz clic en **Save and Deploy**

### Opción B: Deploy manual

```bash
# Instalar Wrangler CLI
npm install -g wrangler

# Login a Cloudflare
wrangler login

# Build la aplicación
npm run build

# Deploy
wrangler pages deploy build --project-name=cash-closures
```

## 6. Configuración Adicional para PWA

### Headers personalizados

1. Crea un archivo `_headers` en tu carpeta `static/`:

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()

/manifest.json
  Content-Type: application/manifest+json
  Cache-Control: public, max-age=3600

/service-worker.js
  Cache-Control: public, max-age=0, must-revalidate
  Service-Worker-Allowed: /
```

### Configurar adaptador de SvelteKit para Cloudflare

```bash
# Instalar adaptador
npm install -D @sveltejs/adapter-cloudflare
```

Actualiza `svelte.config.js`:

```javascript
import adapter from '@sveltejs/adapter-cloudflare';

export default {
	kit: {
		adapter: adapter()
	}
};
```

## 7. Monitoreo y Analytics

### Habilitar Web Analytics

1. Ve a **Analytics** > **Web Analytics**
2. Habilita **Web Analytics**
3. Copia el código de tracking (ya incluido automáticamente con Cloudflare Pages)

### Configurar Alerts

1. Ve a **Notifications**
2. Configura alertas para:
   - Traffic anomalies
   - SSL certificate expiration
   - DDoS attacks

## 8. Testing

### Verificar configuración

```bash
# Test SSL
curl -I https://tu-dominio.com

# Test headers
curl -I https://tu-dominio.com/manifest.json

# Test service worker
curl -I https://tu-dominio.com/service-worker.js
```

### Verificar PWA

1. Abre Chrome DevTools
2. Ve a **Application** > **Manifest**
3. Verifica que el manifest se carga correctamente
4. Ve a **Service Workers** y verifica que está registrado

## 9. Mejores Prácticas

### Security Headers

Asegúrate de que estos headers estén configurados:

- `Content-Security-Policy`
- `X-Frame-Options`
- `X-Content-Type-Options`
- `Strict-Transport-Security`

### Performance

- Usa Cloudflare CDN para servir assets estáticos
- Habilita HTTP/3
- Usa Early Hints para mejorar tiempo de carga

### Monitoring

- Revisa regularmente el **Security Center**
- Monitorea el **Analytics Dashboard**
- Configura alertas para eventos críticos

## 10. Recursos Adicionales

- [Cloudflare Docs](https://developers.cloudflare.com/)
- [Cloudflare Pages](https://pages.cloudflare.com/)
- [SvelteKit Cloudflare Adapter](https://kit.svelte.dev/docs/adapter-cloudflare)
- [Web.dev PWA Guide](https://web.dev/progressive-web-apps/)

## Troubleshooting

### Problema: Service Worker no se registra

- Verifica que estés usando HTTPS
- Revisa la consola del navegador
- Asegúrate de que el path del service worker sea correcto

### Problema: Manifest no se carga

- Verifica el Content-Type header
- Asegúrate de que el archivo esté en `/static/manifest.json`
- Revisa que los iconos existan

### Problema: Errores de CORS

- Configura headers CORS en Cloudflare
- Verifica la configuración de tu API

---

**Nota**: Esta configuración proporciona una base sólida de seguridad y rendimiento. Ajusta según tus necesidades específicas.
