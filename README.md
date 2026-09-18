# Frecuencia — Tu ADN musical

Aplicación web pública para que cada usuario conecte Spotify y vea sus artistas, canciones y géneros principales. El frontend y la API se sirven desde el mismo proceso FastAPI; Spotipy implementa Authorization Code Flow y renueva los tokens automáticamente.

## Funcionalidad

- Login individual con Spotify.
- Afinidad musical para 4 semanas, 6 meses y aproximadamente 1 año.
- Artistas, canciones y géneros principales.
- Índices de variedad y cambio de gusto.
- Tokens OAuth guardados únicamente en el servidor.
- Protección `state` contra CSRF y expiración del intento de login.
- Caché de resultados para reducir llamadas a Spotify.
- SQLite para una sola instancia o Redis para despliegues con varias réplicas.
- Interfaz responsive y modo de ejemplo antes de iniciar sesión.

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
- `GET /api/health` — comprobación de salud del servicio.
