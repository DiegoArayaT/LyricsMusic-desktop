require('dotenv').config();
const Genius = require('genius-lyrics');
const geniusClient = new Genius.Client(process.env.GENIUS_ACCESS_TOKEN);

async function getLyrics(artist, song) {
    try {
        const searches = await geniusClient.songs.search(`${artist} ${song}`);
        if (!searches.length) return "Letra no encontrada en Genius.";
        const songInfo = searches[0];
        const lyrics = await songInfo.lyrics();
        return lyrics;
    } catch (err) {
        console.error("❌ Error buscando letras en Genius:", err);
        return "Error al buscar la letra en Genius.";
    }
}

module.exports = { getLyrics };
