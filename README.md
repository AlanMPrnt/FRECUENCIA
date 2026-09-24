# Frecuencia — Tu ADN musical

Aplicación web pública para que cada usuario conecte Spotify y vea sus artistas, canciones y géneros principales. El frontend y la API se sirven desde el mismo proceso FastAPI; Spotipy implementa Authorization Code Flow y renueva los tokens automáticamente.

## Funcionalidad

- Login individual con Spotify.
- Afinidad musical para 4 semanas, 6 meses y aproximadamente 1 año.
- Top 50 en vivo de artistas y canciones, el máximo que entrega la API por período.
- Géneros verificados con el dato de Spotify y respaldo de MusicBrainz cuando Spotify devuelve el campo vacío.
- Importador privado del historial de Spotify para calcular un Top 1000 con reproducciones y tiempo escuchado reales.
- Búsqueda y filtros de 4 semanas, 6 meses, 1 año o todo el historial importado.
- Comparación concreta del Top 20: artistas repetidos, que entraron y que salieron, con sus nombres.
- Métricas de década dominante, duración media, contenido explícito, colaboraciones, álbumes, amplitud temporal y artistas acreditados.
- Diversidad efectiva de géneros mediante entropía de Shannon, siempre acompañada por la muestra y la metodología.
- Actualización manual y resumen compartible desde el navegador.
- Tokens OAuth guardados únicamente en el servidor.
- Protección `state` contra CSRF y expiración del intento de login.
- Caché de resultados para reducir llamadas a Spotify.
- SQLite para una sola instancia o Redis para despliegues con varias réplicas.
- Interfaz responsive y modo de ejemplo antes de iniciar sesión.

### Top 50 en vivo y Top 1000 histórico

Spotify permite consultar hasta 50 canciones y 50 artistas favoritos por cada período. Ese ranking expresa afinidad y no incluye el número personal de reproducciones. Frecuencia no inventa ese dato.

La presencia de géneros se calcula sobre los primeros 20 artistas y muestra tanto la cantidad de artistas como sus nombres. Como Spotify marcó el campo `genres` como obsoleto y puede devolverlo vacío, Frecuencia intenta completar solamente esas ausencias con etiquetas verificadas de [MusicBrainz](https://musicbrainz.org/doc/MusicBrainz_API). La consulta se hace en lote, se almacena en caché y respeta el límite público del servicio. MusicBrainz es una fuente abierta con condiciones específicas para uso no comercial; un producto comercial debe revisar sus términos y capacidad antes de depender de ella.

Para obtener cantidades reales, el usuario puede pedir su **Historial ampliado de reproducciones** desde [Privacidad de la cuenta de Spotify](https://www.spotify.com/account/privacy/), descomprimir el ZIP e importar juntos los archivos `Streaming_History_Audio_*.json`. El análisis:

- se ejecuta íntegramente en el navegador;
- no sube ni guarda los JSON en el servidor;
- cuenta como reproducción cada registro musical con al menos 30 segundos escuchados;
- excluye podcasts y otros episodios;
- agrupa hasta 1000 canciones y 100 artistas;
- desaparece al recargar la página o pulsar **Quitar historial**.

También se admite el formato anterior `StreamingHistory*.json`, aunque normalmente contiene un período más corto. Spotify explica los campos disponibles en su guía [Understanding your data](https://support.spotify.com/article/understanding-your-data/).

### Qué más permite investigar el historial ampliado

Spotify no ofrece una API para pedir o descargar automáticamente el archivo de privacidad: el titular debe solicitarlo desde la página de su cuenta y luego elegir los JSON en Frecuencia. El historial ampliado contiene información suficiente para calcular, entre otras cosas:

- reproducciones y tiempo exacto por canción, artista, álbum, día, hora y año;
- tasas de salto, escucha completa aproximada y motivos de inicio o finalización;
- efecto del modo aleatorio, escucha sin conexión y sesiones privadas;
- distribución por plataforma y país;
- sesiones de escucha, rachas, horarios, cambios de hábito y evolución de gustos;
- descubrimiento, retención y vida útil de un artista o canción en la biblioteca personal.

El ZIP también puede incluir datos sensibles como IP, país, plataforma, agente de usuario y sesiones privadas. La versión actual procesa el historial dentro del navegador, no lo envía al servidor y no necesita mostrar ni conservar IP, nombre de usuario o agente de usuario para construir el ranking. Cualquier ampliación deberá mantener esa minimización de datos.

## 1. Crear la aplicación en Spotify

1. Entrá a [Spotify for Developers](https://developer.spotify.com/dashboard) y creá una aplicación Web API.
2. En **Redirect URIs**, agregá exactamente una de estas direcciones:
   - Local: `http://127.0.0.1:8000/auth/callback`
   - Producción: `https://tu-dominio.com/auth/callback`
3. Guardá el Client ID y Client Secret como variables de entorno. Nunca subas el secreto al repositorio.

Spotify exige HTTPS para callbacks públicos. Para desarrollo local admite una dirección loopback explícita como `127.0.0.1`; `localhost` no es válido.

## 2. Ejecutar localmente

Copiá `.env.example` como `.env` y completá, como mínimo:

```env
APP_ENV=development
SPOTIPY_CLIENT_ID=...
SPOTIPY_CLIENT_SECRET=...
SPOTIPY_REDIRECT_URI=http://127.0.0.1:8000/auth/callback
SESSION_SECRET=un-secreto-largo-de-al-menos-32-caracteres
COOKIE_SECURE=false
```

Después:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
py -m pip install -r requirements.txt
py -m uvicorn backend.main:app --reload --port 8000
```

Abrí `http://127.0.0.1:8000` y presioná **Conectar Spotify**.

## 3. Desplegar

El repositorio incluye `Dockerfile` y `Procfile`, por lo que puede ejecutarse en cualquier plataforma que soporte contenedores o procesos Python.

También incluye `app.py` y `vercel.json` para que Vercel detecte el backend FastAPI. En Vercel configurá `REDIS_URL`: el almacenamiento SQLite bajo `/tmp` es efímero y solo sirve como respaldo técnico, no como almacenamiento confiable para sesiones OAuth públicas.

Variables obligatorias en producción:

```env
APP_ENV=production
SPOTIPY_CLIENT_ID=...
SPOTIPY_CLIENT_SECRET=...
SPOTIPY_REDIRECT_URI=https://tu-dominio.com/auth/callback
SESSION_SECRET=un-secreto-aleatorio-de-al-menos-32-caracteres
COOKIE_SECURE=true
ALLOWED_HOSTS=tu-dominio.com
```

Variables opcionales:

```env
REDIS_URL=redis://usuario:password@host:6379/0
INSIGHTS_CACHE_TTL_SECONDS=600
DATABASE_PATH=/ruta-persistente/frecuencia.db
```

### Almacenamiento

- **Una sola instancia:** SQLite funciona sin configuración adicional. Usá un volumen persistente si querés conservar sesiones después de reinicios.
- **Varias instancias o despliegue autoscalable:** configurá `REDIS_URL`. Así todas las réplicas comparten tokens y caché.

## 4. Preparar acceso público en Spotify

Las aplicaciones nuevas comienzan en Development Mode. En ese modo solamente pueden iniciar sesión hasta 5 usuarios agregados previamente al allowlist del dashboard y el propietario de la app necesita Spotify Premium.

Para permitir el login de cualquier usuario necesitás solicitar **Extended Quota Mode** en Spotify. Antes de solicitarlo conviene tener dominio definitivo, política de privacidad, términos, contacto y una explicación clara de qué datos se leen y por cuánto tiempo se conservan.

## Privacidad y seguridad

- La app solicita solamente `user-top-read`.
- El navegador recibe una cookie de sesión firmada, nunca el access token ni el refresh token de Spotify.
- Los resultados personalizados se devuelven con `Cache-Control: private, no-store`.
- Cerrar sesión elimina el token y la caché asociados.
- En producción la app falla al arrancar si faltan credenciales, HTTPS o un secreto de sesión seguro.

## Endpoints

- `GET /auth/login` — inicia OAuth.
- `GET /auth/callback` — valida `state` e intercambia el código.
- `GET /auth/logout` — elimina la sesión.
- `GET /api/auth/status` — indica si el usuario está conectado.
- `GET /api/insights?range=short_term|medium_term|long_term` — devuelve estadísticas personales.
- `GET /api/insights?range=short_term&refresh=true` — renueva los datos ignorando la caché vigente.
- `GET /api/health` — comprobación de salud del servicio.
