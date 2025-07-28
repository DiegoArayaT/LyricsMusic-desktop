const path = require("path");
const { getAccessToken, getCurrentSong } = require(path.join(
    __dirname,
    "api/spotify.js"
));
const { getLyrics } = require(path.join(__dirname, "api/genius.js"));

const DEFAULT_WIN_HEIGHT = 420;
const DEFAULT_WIN_WIDTH = 350;
const HIDDEN_LYRICS_HEIGHT = 120;

const LYRICS_APP = (function () {
    const state = {
        isHidden: false,
        currLyrics: "",
        winHeight: DEFAULT_WIN_HEIGHT,
        winWidth: DEFAULT_WIN_WIDTH,
    };

    function init() {
        console.log("Initial execution");
        loadNewLyrics();
    }

    async function loadNewLyrics() {
        console.log('Cargando nueva canción...');

        let token = await getAccessToken();
        if (!token) {
            console.error("No se pudo obtener un Access Token válido.");
            document.querySelector(".lyrics").textContent =
                "Error de autenticación con Spotify.";
            return;
        }

        const track = await getCurrentSong(token);

        if (!track || track[0] === "" || track[1] === "") {
            console.log("No se detectó ninguna canción en reproducción.");
            document.querySelector(".lyrics").textContent =
                "No hay música reproduciéndose.";
            return;
        }

        const artist = track[0];
        const song = track[1];
        const albumArtUrl = track[2];

        // Limpia paréntesis y feats del título y artista
        const cleanSong = song.replace(/\s*\(.*?\)\s*/g, '').trim();
        const cleanArtist = artist.replace(/\s*\(.*?\)\s*/g, '').trim();

        // Arma el query final
        const query = `${cleanSong} - ${cleanArtist}`;
        console.log('[Frontend] query armado:', query);

        document.querySelector(".lyrics").textContent = "Buscando letra...";
        const lyrics = await getLyrics(query);
        document.querySelector(".lyrics").textContent = lyrics;

        document.querySelector(".albumart-img").src = albumArtUrl;
        document.querySelector(".artist").textContent = artist;
        document.querySelector(".song").textContent = song;
    }

    function hideLyrics() {
        if (!state.isHidden) {
            state.winWidth = $(window).width();
            state.winHeight = $(window).height();
            document.querySelector(".lyrics").textContent = "";
            window.resizeTo(DEFAULT_WIN_WIDTH, HIDDEN_LYRICS_HEIGHT);
            state.isHidden = true;
            document.querySelector(".showhide").textContent = "Show Lyrics";
        } else {
            if (state.currLyrics === "") {
                loadNewLyrics();
            } else {
                document.querySelector(".lyrics").textContent =
                    state.currLyrics;
            }
            window.resizeTo(state.winWidth, state.winHeight);
            state.isHidden = false;
            document.querySelector(".showhide").textContent = "Hide Lyrics";
        }
    }

    return {
        init: init,
        hideLyrics: hideLyrics,
        getLyrics: loadNewLyrics,
    };
})();

LYRICS_APP.init();

document.addEventListener("DOMContentLoaded", async () => {
    const { getAccessToken } = require(path.join(__dirname, "api/spotify.js"));
    const token = await getAccessToken();
    if (token) {
        const btn = document.querySelector(
            'button[onclick="authenticateSpotify()"]'
        );
        if (btn) btn.style.display = "none";
    }
});
