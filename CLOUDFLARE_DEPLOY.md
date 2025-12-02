# Guía de Despliegue en Cloudflare Pages

¡Felicidades! Tu código ya está optimizado y en GitHub. Ahora vamos a publicarlo en internet usando Cloudflare Pages.

## Pasos para Desplegar

1.  **Inicia Sesión en Cloudflare**
    *   Ve a [dash.cloudflare.com](https://dash.cloudflare.com) e inicia sesión (o crea una cuenta gratuita si no tienes una).

2.  **Ve a Workers & Pages**
    *   En el menú lateral izquierdo, haz clic en **Workers & Pages**.
    *   Luego haz clic en el botón azul **Create application** (Crear aplicación).
    *   Selecciona la pestaña **Pages**.
    *   Haz clic en **Connect to Git** (Conectar con Git).

3.  **Conecta tu Repositorio**
    *   Si es la primera vez, te pedirá autorizar a Cloudflare para acceder a tu GitHub.
    *   Selecciona tu repositorio `cash-closures` de la lista.
    *   Haz clic en **Begin setup** (Comenzar configuración).

4.  **Configura la Compilación (Build Settings)**
    *   **Project name**: Puedes dejar el que viene por defecto (ej: `cash-closures`).
    *   **Production branch**: `main` (o la rama que estés usando).
    *   **Framework preset**: Selecciona **SvelteKit** en el menú desplegable.
        *   *Nota: Esto rellenará automáticamente el comando de build como `npm run build` y el directorio de salida como `.svelte-kit/cloudflare`.*

5.  **Variables de Entorno (¡IMPORTANTE!)**
    *   Haz clic en **Environment variables (advanced)** para desplegar la sección.
    *   Debes agregar las mismas variables que tienes en tu archivo `.env` local.
    *   Añade las siguientes variables:
        *   **Variable name**: `VITE_SUPABASE_URL`
            *   **Value**: (Copia el valor de tu archivo .env local)
        *   **Variable name**: `VITE_SUPABASE_ANON_KEY`
            *   **Value**: (Copia el valor de tu archivo .env local)

6.  **Desplegar**
    *   Haz clic en el botón **Save and Deploy** (Guardar y Desplegar).

Cloudflare comenzará a construir tu aplicación. Esto tomará un par de minutos. Podrás ver los logs en tiempo real.

## Verificación Final

Una vez que termine, verás un mensaje de "Success!" y una URL (ej: `https://cash-closures.pages.dev`).

1.  Haz clic en la URL para abrir tu aplicación.
2.  Intenta iniciar sesión.
3.  Verifica que los datos carguen correctamente desde Supabase.

## Solución de Problemas Comunes

*   **Error 500 al cargar datos**: Verifica que las variables de entorno `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` estén escritas correctamente en Cloudflare y tengan los valores correctos.
*   **Página en blanco**: Abre la consola del navegador (F12) para ver si hay errores de JavaScript.
*   **Problemas de Base de Datos**: Asegúrate de haber ejecutado el script `supabase-rls.sql` en tu panel de Supabase para permitir el acceso a los datos.
