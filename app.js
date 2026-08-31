/* =========================================================
   APOLLOMUSIC
   Audius Player — Vanilla JS
   Versão estável
========================================================= */


/* =========================================================
   CONFIG
========================================================= */

const API_URL =
    "https://apollomusic.onrender.com";

const MAX_RESULTS = 20;
const API_TIMEOUT = 15000;
const SPLASH_SPEED = 0.6;


/* =========================================================
   ESTADO
========================================================= */

let queue = [];
let currentTrack = 0;

let player = null;
let progressTimer = null;

let changingTrack = false;
let draggingProgress = false;

let searchRequestId = 0;
let playbackRequestId = 0;


/* =========================================================
   DOM
========================================================= */

const $ = id =>
    document.getElementById(id);

const elements = {};


/* =========================================================
   CACHE DOM
========================================================= */

function cacheElements() {

    const ids = {

        splashScreen: "splash-screen",
        splashProgress: "splash-progress",
        splashStatus: "splash-status",

        status: "status",

        cover: "cover",
        title: "title",
        artist: "artist",
        album: "album",
        counter: "counter",

        progressBar: "progressBar",
        progressFill: "progressFill",

        currentTime: "currentTime",
        duration: "duration",

        play: "play",
        next: "next",
        prev: "prev",

        audiusSearch: "audiusSearch",
        searchAudius: "searchAudius",
        audiusResults: "audiusResults"
    };


    for (const [
        key,
        id
    ] of Object.entries(ids)) {

        elements[key] = $(id);
    }
}


/* =========================================================
   STATUS
========================================================= */

function setStatus(text) {

    if (elements.status) {
        elements.status.textContent = text;
    }
}


/* =========================================================
   TEMPO
========================================================= */

function wait(ms) {

    return new Promise(resolve => {

        setTimeout(
            resolve,
            ms / SPLASH_SPEED
        );
    });
}


/* =========================================================
   FORMATAÇÃO
========================================================= */

function formatTime(seconds) {

    seconds =
        Number(seconds);


    if (
        !Number.isFinite(seconds) ||
        seconds < 0
    ) {
        return "0:00";
    }


    const minutes =
        Math.floor(seconds / 60);

    const remaining =
        Math.floor(seconds % 60);


    return (
        `${minutes}:` +
        `${String(remaining).padStart(2, "0")}`
    );
}


/* =========================================================
   SPLASH
========================================================= */

function updateSplash(
    progress,
    status
) {

    if (elements.splashProgress) {

        elements.splashProgress.style.width =
            `${progress}%`;
    }


    if (elements.splashStatus) {

        elements.splashStatus.textContent =
            status;
    }
}


async function showSplashScreen() {

    updateSplash(
        10,
        "Inicializando..."
    );

    await wait(300);


    updateSplash(
        35,
        "Conectando à API..."
    );

    await wait(400);


    updateSplash(
        60,
        "Conectando ao Audius..."
    );

    await wait(400);


    updateSplash(
        85,
        "Preparando player..."
    );

    await wait(300);


    updateSplash(
        100,
        "Pronto."
    );


    setTimeout(() => {

        elements.splashScreen?.classList.add(
            "hidden"
        );

    }, 400);
}


/* =========================================================
   API
========================================================= */

async function api(
    path,
    options = {}
) {

    const controller =
        new AbortController();


    const timeout =
        setTimeout(
            () => controller.abort(),
            API_TIMEOUT
        );


    try {

        const response =
            await fetch(
                `${API_URL}${path}`,
                {
                    ...options,

                    signal:
                        controller.signal,

                    headers: {

                        Accept:
                            "application/json",

                        ...(options.headers || {})
                    }
                }
            );


        if (!response.ok) {

            throw new Error(
                `API HTTP ${response.status}`
            );
        }


        return await response.json();

    } catch (error) {

        if (
            error.name ===
            "AbortError"
        ) {

            throw new Error(
                "A API demorou demais para responder."
            );
        }


        throw error;

    } finally {

        clearTimeout(timeout);
    }
}


/* =========================================================
   HEALTH CHECK
========================================================= */

async function checkAPI() {

    try {

        const data =
            await api(
                "/api/health"
            );


        return (
            data?.status === "ok"
        );

    } catch (error) {

        console.warn(
            "[ApolloMusic] API:",
            error
        );

        return false;
    }
}


/* =========================================================
   NORMALIZAÇÃO AUDIUS
========================================================= */

function normalizeTrack(track) {

    if (!track) {
        return null;
    }


    const streamable =
        track.streamable === true ||
        track.streamable === "true" ||
        track.isStreamable === true ||
        track.isStreamable === "true";


    return {

        id:
            String(track.id || ""),

        title:
            track.title ||
            "Sem título",

        artist:
            track.artist ||
            track.user?.name ||
            "Artista desconhecido",

        album:
            track.album ||
            "",

        cover:
            typeof track.artwork === "string"
                ? track.artwork
                : (
                    track.artwork?._480x480 ||
                    track.artwork?._1000x1000 ||
                    ""
                ),

        duration:
            Number(track.duration) || 0,

        genre:
            track.genre ||
            "",

        mood:
            track.mood ||
            "",

        permalink:
            track.permalink ||
            "",

        streamable,

        downloadable:
            track.downloadable === true ||
            track.downloadable === "true",

        unavailable:
            false
    };
}


/* =========================================================
   RENDERIZAÇÃO DOS RESULTADOS
========================================================= */

function renderAudiusResults() {

    const container =
        elements.audiusResults;


    if (!container) {
        return;
    }


    container.innerHTML = "";


    queue.forEach(
        (track, index) => {

            const button =
                document.createElement("button");


            button.type =
                "button";


            button.className =
                "audius-result";


            button.dataset.index =
                String(index);


            button.setAttribute(
                "aria-label",
                `Reproduzir ${track.title} por ${track.artist}`
            );


            const cover =
                document.createElement("img");


            cover.className =
                "audius-result-cover";


            cover.alt =
                "";


            if (track.cover) {

                cover.src =
                    track.cover;

            } else {

                cover.hidden =
                    true;
            }


            const info =
                document.createElement("div");


            info.className =
                "audius-result-info";


            const title =
                document.createElement("p");


            title.className =
                "audius-result-title";


            title.textContent =
                track.title;


            const artist =
                document.createElement("p");


            artist.className =
                "audius-result-artist";


            artist.textContent =
                track.artist;


            info.appendChild(title);
            info.appendChild(artist);


            button.appendChild(cover);
            button.appendChild(info);


            button.addEventListener(
                "click",
                async () => {

                    if (changingTrack) {
                        return;
                    }


                    const index =
                        Number(
                            button.dataset.index
                        );


                    if (
                        !Number.isInteger(index) ||
                        !queue[index]
                    ) {
                        return;
                    }


                    currentTrack =
                        index;


                    await playCurrentTrack();
                }
            );


            container.appendChild(
                button
            );
        }
    );
}


/* =========================================================
   BUSCA AUDIUS
========================================================= */

async function searchAudius(query) {

    query =
        String(query || "").trim();


    if (!query) {

        setStatus(
            "Digite algo para pesquisar."
        );

        elements.audiusSearch?.focus();

        return;
    }


    const requestId =
        ++searchRequestId;


    setStatus(
        `Pesquisando "${query}"...`
    );


    if (elements.audiusResults) {

        elements.audiusResults.innerHTML =
            "";
    }


    try {

        const data =
            await api(
                `/api/audius/search?q=${encodeURIComponent(
                    query
                )}&limit=${MAX_RESULTS}`
            );


        if (
            requestId !==
            searchRequestId
        ) {
            return;
        }


        const results =
            Array.isArray(
                data?.results
            )
                ? data.results
                : [];


        queue =
            results
                .map(normalizeTrack)
                .filter(
                    track =>
                        track &&
                        track.id
                );


        currentTrack = 0;


        if (!queue.length) {

            updateInterface();
            renderAudiusResults();

            setStatus(
                "Nenhuma música encontrada."
            );

            return;
        }


        updateInterface();
        renderAudiusResults();

        updateMediaSession();


        setStatus(
            `${queue.length} músicas encontradas.`
        );


    } catch (error) {

        console.error(
            "[ApolloMusic] Busca:",
            error
        );


        if (
            requestId !==
            searchRequestId
        ) {
            return;
        }


        queue = [];
        currentTrack = 0;

        updateInterface();
        renderAudiusResults();


        setStatus(
            error.message ||
            "Erro ao consultar o Audius."
        );
    }
}


/* =========================================================
   PLAYER
========================================================= */

function createPlayer() {

    if (player) {
        return;
    }


    player =
        new Audio();


    player.preload =
        "metadata";


    player.addEventListener(
        "play",
        () => {

            updatePlayButton(
                true
            );

            updateMediaSessionPlaybackState(
                "playing"
            );

            startProgressTimer();

            setStatus(
                "Reproduzindo."
            );
        }
    );


    player.addEventListener(
        "pause",
        () => {

            updatePlayButton(
                false
            );

            updateMediaSessionPlaybackState(
                "paused"
            );

            stopProgressTimer();


            if (
                !player.ended &&
                !changingTrack
            ) {

                setStatus(
                    "Pausado."
                );
            }
        }
    );


    player.addEventListener(
        "loadedmetadata",
        () => {

            updateProgress();
            updateMediaSession();
        }
    );


    player.addEventListener(
        "timeupdate",
        updateProgress
    );


    player.addEventListener(
        "ended",
        () => {

            stopProgressTimer();

            nextTrack();
        }
    );


    player.addEventListener(
        "error",
        () => {

            if (!changingTrack) {

                handlePlayerError();
            }
        }
    );
}


/* =========================================================
   ERRO DO PLAYER
========================================================= */

function handlePlayerError() {

    const track =
        queue[currentTrack];


    if (track) {

        track.unavailable =
            true;
    }


    stopProgressTimer();


    setStatus(
        "Essa faixa não pôde ser reproduzida. Pulando..."
    );


    setTimeout(
        () => nextTrack(),
        500
    );
}


/* =========================================================
   TOCAR FAIXA
========================================================= */

async function playCurrentTrack() {

    if (changingTrack) {
        return;
    }


    const track =
        queue[currentTrack];


    if (!track) {
        return;
    }


    const requestId =
        ++playbackRequestId;


    changingTrack = true;


    createPlayer();


    stopProgressTimer();

    resetProgress();

    updateInterface();

    updateMediaSession();


    setStatus(
        "Carregando áudio..."
    );


    try {

        player.pause();


        player.removeAttribute(
            "src"
        );

        player.load();


        const streamUrl =
            `${API_URL}/api/audius/stream/` +
            encodeURIComponent(
                track.id
            );


        player.src =
            streamUrl;


        player.load();


        await player.play();


        if (
            requestId !==
            playbackRequestId
        ) {
            return;
        }


    } catch (error) {

        console.error(
            "[ApolloMusic] Reprodução:",
            error
        );


        if (
            requestId ===
            playbackRequestId
        ) {

            track.unavailable =
                true;


            setStatus(
                "Não foi possível reproduzir essa música."
            );
        }

    } finally {

        if (
            requestId ===
            playbackRequestId
        ) {

            changingTrack =
                false;
        }
    }
}


/* =========================================================
   PLAY / PAUSE
========================================================= */

async function togglePlay() {

    if (!queue.length) {

        setStatus(
            "Pesquise uma música primeiro."
        );

        return;
    }


    createPlayer();


    if (
        !player.src ||
        player.src ===
        window.location.href
    ) {

        await playCurrentTrack();

        return;
    }


    try {

        if (player.paused) {

            await player.play();

        } else {

            player.pause();
        }

    } catch (error) {

        console.error(
            "[ApolloMusic] Play/Pause:",
            error
        );


        setStatus(
            "Não foi possível reproduzir."
        );
    }
}


/* =========================================================
   PRÓXIMA
========================================================= */

async function nextTrack() {

    if (
        !queue.length ||
        changingTrack
    ) {
        return;
    }


    const start =
        currentTrack;


    do {

        currentTrack++;


        if (
            currentTrack >=
            queue.length
        ) {

            currentTrack = 0;
        }


        if (
            currentTrack ===
            start
        ) {

            const available =
                queue.some(
                    track =>
                        !track.unavailable
                );


            if (!available) {

                setStatus(
                    "Nenhuma faixa disponível para reprodução."
                );

                return;
            }
        }


    } while (
        queue[currentTrack]?.unavailable
    );


    await playCurrentTrack();
}


/* =========================================================
   ANTERIOR
========================================================= */

async function previousTrack() {

    if (
        !queue.length ||
        changingTrack
    ) {
        return;
    }


    if (
        player &&
        Number.isFinite(
            player.currentTime
        ) &&
        player.currentTime > 3
    ) {

        player.currentTime =
            0;

        updateProgress();

        return;
    }


    currentTrack--;


    if (
        currentTrack < 0
    ) {

        currentTrack =
            queue.length - 1;
    }


    await playCurrentTrack();
}


/* =========================================================
   PROGRESSO
========================================================= */

function resetProgress() {

    if (elements.progressFill) {

        elements.progressFill.style.width =
            "0%";
    }


    if (elements.currentTime) {

        elements.currentTime.textContent =
            "0:00";
    }


    if (elements.duration) {

        elements.duration.textContent =
            "--:--";
    }
}


function updateProgress() {

    if (!player) {
        return;
    }


    const duration =
        Number(player.duration);

    const current =
        Number(player.currentTime);


    if (
        !Number.isFinite(duration) ||
        duration <= 0
    ) {
        return;
    }


    const percentage =
        Math.max(
            0,
            Math.min(
                100,
                (current / duration) * 100
            )
        );


    if (elements.progressFill) {

        elements.progressFill.style.width =
            `${percentage}%`;
    }


    if (elements.currentTime) {

        elements.currentTime.textContent =
            formatTime(current);
    }


    if (elements.duration) {

        elements.duration.textContent =
            formatTime(duration);
    }
}


function startProgressTimer() {

    stopProgressTimer();


    progressTimer =
        setInterval(
            updateProgress,
            250
        );
}


function stopProgressTimer() {

    if (!progressTimer) {
        return;
    }


    clearInterval(
        progressTimer
    );


    progressTimer =
        null;
}


/* =========================================================
   SEEK
========================================================= */

function seekFromPointer(event) {

    if (
        !player ||
        !Number.isFinite(
            player.duration
        ) ||
        player.duration <= 0
    ) {
        return;
    }


    const rect =
        elements.progressBar?.getBoundingClientRect();


    if (
        !rect ||
        !rect.width
    ) {
        return;
    }


    const position =
        (
            event.clientX -
            rect.left
        ) /
        rect.width;


    const percentage =
        Math.max(
            0,
            Math.min(
                1,
                position
            )
        );


    player.currentTime =
        player.duration *
        percentage;


    updateProgress();
}


function setupProgressBar() {

    if (!elements.progressBar) {
        return;
    }


    elements.progressBar.addEventListener(
        "pointerdown",
        event => {

            draggingProgress =
                true;


            try {

                elements.progressBar.setPointerCapture(
                    event.pointerId
                );

            } catch {}


            seekFromPointer(
                event
            );
        }
    );


    elements.progressBar.addEventListener(
        "pointermove",
        event => {

            if (draggingProgress) {

                seekFromPointer(
                    event
                );
            }
        }
    );


    const stopDragging =
        () => {

            draggingProgress =
                false;
        };


    elements.progressBar.addEventListener(
        "pointerup",
        stopDragging
    );


    elements.progressBar.addEventListener(
        "pointercancel",
        stopDragging
    );


    elements.progressBar.addEventListener(
        "lostpointercapture",
        stopDragging
    );
}


/* =========================================================
   INTERFACE
========================================================= */

function updateInterface() {

    const track =
        queue[currentTrack];


    if (!track) {

        if (elements.title)
            elements.title.textContent = "---";

        if (elements.artist)
            elements.artist.textContent = "---";

        if (elements.album)
            elements.album.textContent = "";

        if (elements.counter)
            elements.counter.textContent = "0 / 0";


        if (elements.cover) {

            elements.cover.removeAttribute(
                "src"
            );

            elements.cover.hidden =
                true;
        }


        updatePlayButton(false);

        resetProgress();

        return;
    }


    if (elements.title)
        elements.title.textContent =
            track.title;


    if (elements.artist)
        elements.artist.textContent =
            track.artist;


    if (elements.album)
        elements.album.textContent =
            track.album;


    if (elements.counter)
        elements.counter.textContent =
            `${currentTrack + 1} / ${queue.length}`;


    if (elements.cover) {

        if (track.cover) {

            elements.cover.src =
                track.cover;

            elements.cover.hidden =
                false;

        } else {

            elements.cover.removeAttribute(
                "src"
            );

            elements.cover.hidden =
                true;
        }
    }
}


/* =========================================================
   BOTÃO PLAY
========================================================= */

function updatePlayButton(
    playing
) {

    if (!elements.play) {
        return;
    }


    elements.play.textContent =
        playing
            ? "⏸"
            : "▶";


    elements.play.setAttribute(
        "aria-label",
        playing
            ? "Pausar"
            : "Reproduzir"
    );
}


/* =========================================================
   MEDIA SESSION
========================================================= */

function updateMediaSession() {

    if (
        !("mediaSession" in navigator)
    ) {
        return;
    }


    const track =
        queue[currentTrack];


    if (!track) {
        return;
    }


    try {

        const artwork =
            track.cover
                ? [
                    {
                        src:
                            track.cover,

                        sizes:
                            "480x480",

                        type:
                            "image/jpeg"
                    }
                ]
                : [];


        navigator.mediaSession.metadata =
            new MediaMetadata({

                title:
                    track.title ||
                    "ApolloMusic",

                artist:
                    track.artist ||
                    "Audius",

                album:
                    track.album ||
                    "ApolloMusic",

                artwork
            });

    } catch (error) {

        console.warn(
            "[ApolloMusic] Media Session:",
            error
        );
    }
}


function updateMediaSessionPlaybackState(
    state
) {

    if (
        !("mediaSession" in navigator)
    ) {
        return;
    }


    try {

        navigator.mediaSession.playbackState =
            state;

    } catch {}
}


function setupMediaSession() {

    if (
        !("mediaSession" in navigator)
    ) {
        return;
    }


    const setHandler =
        (
            action,
            callback
        ) => {

            try {

                navigator.mediaSession.setActionHandler(
                    action,
                    callback
                );

            } catch {}
        };


    setHandler(
        "play",
        togglePlay
    );


    setHandler(
        "pause",
        () => {

            player?.pause();
        }
    );


    setHandler(
        "nexttrack",
        nextTrack
    );


    setHandler(
        "previoustrack",
        previousTrack
    );
}


/* =========================================================
   EVENTOS
========================================================= */

function setupEvents() {

    if (elements.searchAudius) {

        elements.searchAudius.addEventListener(
            "click",
            () => {

                searchAudius(
                    elements.audiusSearch?.value
                );
            }
        );
    }


    if (elements.audiusSearch) {

        elements.audiusSearch.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter"
                ) {

                    event.preventDefault();

                    searchAudius(
                        elements.audiusSearch.value
                    );
                }
            }
        );
    }


    elements.play?.addEventListener(
        "click",
        togglePlay
    );


    elements.next?.addEventListener(
        "click",
        nextTrack
    );


    elements.prev?.addEventListener(
        "click",
        previousTrack
    );


    setupProgressBar();
}


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

async function init() {

    cacheElements();

    setupEvents();

    setupMediaSession();

    createPlayer();

    updateInterface();


    checkAPI()
        .then(online => {

            if (online) {

                setStatus(
                    "Pronto para pesquisar no Audius."
                );

            } else {

                setStatus(
                    "API offline."
                );
            }

        })
        .catch(error => {

            console.warn(
                "[ApolloMusic] Health:",
                error
            );

            setStatus(
                "API offline."
            );
        });
}


/* =========================================================
   START
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        () => {

            init();
            showSplashScreen();

        },
        {
            once: true
        }
    );

} else {

    init();
    showSplashScreen();
}