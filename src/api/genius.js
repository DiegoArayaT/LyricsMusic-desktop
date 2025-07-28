require('dotenv').config();
const axios = require('axios');

const GENIUS_API_URL = "https://api.genius.com";
const GENIUS_ACCESS_TOKEN = process.env.GENIUS_ACCESS_TOKEN;

async function getLyrics(artist, song) {
    try {
        // 1. Buscar la canción en Genius
        const searchRes = await axios.get(`${GENIUS_API_URL}/search`, {
            params: { q: `${artist} ${song}` },
            headers: { Authorization: `Bearer ${GENIUS_ACCESS_TOKEN}` }
        });
        const hits = searchRes.data.response.hits;
        if (!hits.length) return "Letra no encontrada en Genius.";
        const songPath = hits[0].result.path; // Ejemplo: /lyrics/artist-song-lyrics

        // 2. Scrape simple de la página de la canción
        const songPageRes = await axios.get(`https://genius.com${songPath}`);
        // Extrae el div con class 'lyrics' o el nuevo formato
        const cheerio = require('cheerio');
        const $ = cheerio.load(songPageRes.data);
        let lyrics = $('.lyrics').text();
        if (!lyrics) {
            lyrics = $('[data-lyrics-container="true"]').text();
        }
        return lyrics || "Letra no encontrada en Genius.";
    } catch (err) {
        console.error("❌ Error buscando letras en Genius:", err);
        return "Error al buscar la letra en Genius.";
    }
}

module.exports = { getLyrics };
