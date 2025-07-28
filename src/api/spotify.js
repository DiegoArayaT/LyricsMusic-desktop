const express = require('express');
require('dotenv').config();
const SpotifyWebApi = require('spotify-web-api-node');
const fs = require('fs');

const app = express();
const port = 3001; // Puerto en el que escucharemos la respuesta de Spotify

// Configurar la API de Spotify con OAuth
const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI || `http://localhost:${port}/callback`
});

// Al iniciar, intenta cargar el refresh token previamente guardado
try {
    const tokens = JSON.parse(fs.readFileSync('spotify_tokens.json', 'utf-8'));
    if (tokens.refreshToken) {
        spotifyApi.setRefreshToken(tokens.refreshToken);
    }
} catch (err) {
    // No hay archivo todavía, no pasa nada
}

// URL de autenticación
const scopes = ['user-read-currently-playing', 'user-read-playback-state'];
const authUrl = spotifyApi.createAuthorizeURL(scopes);

console.log("Abre este enlace en tu navegador para autenticarte:", authUrl);

app.get('/auth', (req, res) => {
    res.redirect(authUrl); // Redirige al usuario a Spotify para autenticarse
});

// Servidor Express para recibir el código de autorización
app.get('/callback', async (req, res) => {
    const authCode = req.query.code;
    if (!authCode) {
        res.send("Error: No se recibió un código de autorización.");
        return;
    }

    try {
        const data = await spotifyApi.authorizationCodeGrant(authCode);
        const accessToken = data.body['access_token'];
        const refreshToken = data.body['refresh_token'];

        console.log("Nuevo Access Token:", accessToken);
        console.log("Refresh Token:", refreshToken);

        // Asignar el token a la API
        spotifyApi.setAccessToken(accessToken);
        spotifyApi.setRefreshToken(refreshToken);

        // Guardar refresh token en disco
        fs.writeFileSync('spotify_tokens.json', JSON.stringify({ refreshToken }), 'utf-8');

        res.send("Autenticación exitosa. Puedes cerrar esta ventana.");

    } catch (err) {
        console.error("Error obteniendo el Access Token:", err);
        res.send("Error al obtener el Access Token.");
    }
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});

async function refreshAccessToken() {
    try {
        const data = await spotifyApi.refreshAccessToken();
        const newAccessToken = data.body['access_token'];

        console.log("Nuevo Access Token obtenido automáticamente:", newAccessToken);

        spotifyApi.setAccessToken(newAccessToken);
        return newAccessToken;
    } catch (err) {
        console.error("Error refrescando el token:", err);
        return null;
    }
}

async function getAccessToken() {
    try {
        if (!spotifyApi.getAccessToken()) {
            console.log("No hay un token activo, intentando refrescar...");
            const newToken = await refreshAccessToken();
            return newToken;
        }
        return spotifyApi.getAccessToken();
    } catch (err) {
        console.error("Error obteniendo el Access Token:", err);
        return null;
    }
}

async function getCurrentSong(accessToken) {
    spotifyApi.setAccessToken(accessToken);
    try {
        const data = await spotifyApi.getMyCurrentPlayingTrack();
        if (data.body && data.body.item) {
            const song = data.body.item.name;
            const artist = data.body.item.artists.map(artist => artist.name).join(', ');
            const albumArtUrl = data.body.item.album.images.length > 0 ? data.body.item.album.images[0].url : "resources/placeholder_album_art.jpeg";

            console.log(`Spotify está reproduciendo: ${artist} - ${song}`);
            return [artist, song, albumArtUrl];
        } else {
            console.log("No hay canción en reproducción.");
            return ["", "", ""];
        }
    } catch (err) {
        // Imprime el error de todas formas posibles
        try {
            console.error("Error obteniendo la canción (JSON):", JSON.stringify(err, null, 2));
        } catch (jsonErr) {
            console.error("Error obteniendo la canción (raw):", err);
        }
        return ["", "", ""];
    }
}

module.exports = { getAccessToken, refreshAccessToken, getCurrentSong };
