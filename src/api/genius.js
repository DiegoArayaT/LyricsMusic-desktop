require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');

const GENIUS_API_URL = "https://api.genius.com";
const GENIUS_ACCESS_TOKEN = process.env.GENIUS_ACCESS_TOKEN;

function extractTextWithBreaks(node, $) {
    let text = '';
    node.contents().each((i, elem) => {
        if (elem.type === 'text') {
            text += $(elem).text();
        } else if (elem.tagName === 'br') {
            text += '\n';
        } else if (elem.type === 'tag') {
            text += extractTextWithBreaks($(elem), $);
        }
    });
    return text;
}

const normalize = s => s.toLowerCase().replace(/[^a-z0-9]/gi, '');

async function getLyrics(query) {
    try {
        console.log(`[Genius] Buscando con query: "${query}"`);
        let searchRes = await axios.get(`${GENIUS_API_URL}/search`, {
            params: { q: query },
            headers: { Authorization: `Bearer ${GENIUS_ACCESS_TOKEN}` }
        });
        let hits = searchRes.data.response.hits;
        console.log(`[Genius] Nº de resultados: ${hits.length}`);

        // Normaliza título y artista para buscar coincidencia estricta
        const [songRaw, artistRaw] = query.split(' - ');
        const normTitle = normalize((songRaw || '').split('(')[0]);
        const normArtist = normalize((artistRaw || '').split(',')[0]);

        console.log(`[Genius] Buscando letra para: "${normTitle}" por "${normArtist}"`);

        let hit;
        if (normArtist) {
            hit = hits.find(h =>
                normalize(h.result.title).includes(normTitle) &&
                normalize(h.result.primary_artist.name).includes(normArtist)
            );
        }
        if (!hit) hit = hits.find(h => normalize(h.result.title).includes(normTitle));
        if (!hit && hits.length) hit = hits[0];

        if (!hit) {
            console.log(`[Genius] ¡No se encontró ningún hit relevante para "${query}"!`);
            return "Letra no encontrada en Genius.";
        }

        const songPath = hit.result.path;
        console.log(`[Genius] Encontrada canción: "${hit.result.title}" por "${hit.result.primary_artist.name}" en Genius`);

        // Scrapea la letra
        const songPageRes = await axios.get(`https://genius.com${songPath}`);
        const $ = cheerio.load(songPageRes.data);

        let lyrics = '';
        $('[data-lyrics-container="true"]').each((i, el) => {
            lyrics += extractTextWithBreaks($(el), $) + '\n';
        });

        lyrics = lyrics.replace(/\n{2,}/g, '\n\n').trim();
        let lines = lyrics.split('\n');
        // Busca la PRIMERA ocurrencia de "["
        let firstBracketLineIdx = lines.findIndex(line => line.includes('['));
        if (firstBracketLineIdx >= 0) {
            // Limpia la línea para empezar justo en el primer "["
            let bracketPos = lines[firstBracketLineIdx].indexOf('[');
            if (bracketPos > 0) {
                lines[firstBracketLineIdx] = lines[firstBracketLineIdx].slice(bracketPos);
            }
            // Quita todo lo que esté antes del primer verso
            lines = lines.slice(firstBracketLineIdx);
        }

        // Rejunta y limpia doble salto de línea
        lyrics = lines.join('\n').replace(/\n{2,}/g, '\n\n').trim();

        if (lyrics) {
            console.log(`[Genius] Letra encontrada, longitud: ${lyrics.length} caracteres`);
        } else {
            console.log(`[Genius] No se pudo extraer la letra del HTML`);
        }

        return lyrics || "Letra no encontrada en Genius.";
    } catch (err) {
        console.error("[Genius] Error buscando letras en Genius:", err);
        return "Error al buscar la letra en Genius.";
    }
}

module.exports = { getLyrics };
