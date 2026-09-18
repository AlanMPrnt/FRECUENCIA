# Frecuencia — Tu ADN musical

Dashboard web para explorar los artistas, canciones y géneros que definen una cuenta de Spotify. Usa Spotipy en el backend y conserva los tokens OAuth del usuario del lado del servidor.

## Qué incluye este MVP

- Afinidad musical para 4 semanas, 6 meses y aproximadamente 1 año.
- Artistas y canciones principales.
- Géneros ponderados por posición en el ranking.
- Índice de variedad basado en artistas y géneros.
- Cambio de gusto comparando períodos.
- OAuth real con Spotify y fallback visual en modo demo.
- Interfaz responsive sin depender de un framework de frontend.

## Configuración

1. Creá una aplicación en [Spotify for Developers](https://developer.spotify.com/dashboard).
2. Agregá `http://127.0.0.1:8000/auth/callback` como Redirect URI.
3. Copiá `.env.example` como `.env` y completá las credenciales.
4. Creá un entorno virtual e instalá las dependencias:

   ```powershell
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   py -m pip install -r requirements.txt
   ```

5. Iniciá el proyecto:

   ```powershell
   py -m uvicorn backend.main:app --reload --port 8000
   ```

6. Abrí `http://127.0.0.1:8000`.

## Privacidad

El MVP solicita únicamente `user-top-read`. Los tokens se almacenan en SQLite en el servidor y la cookie del navegador contiene solo un identificador de sesión firmado.

Spotify limita las aplicaciones nuevas en Development Mode a usuarios autorizados desde el dashboard. El dueño de la aplicación debe tener Spotify Premium.
