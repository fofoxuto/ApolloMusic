/* =========================================================
   APOLLOMUSIC
   YouTube Player — Vanilla JS
   Playlist → Queue
   Thumbnail do vídeo → capa 1:1
========================================================= */


/* =========================================================
   CONFIG
========================================================= */

const API_URL = "https://apollobackend-viu3.onrender.com";

const API_TIMEOUT = 15000;
const SPLASH_SPEED = 0.6;


/* =========================================================
   ESTADO
========================================================= */

let queue = [];
let currentTrack = 0;

let youtubePlayer = null;
let youtubeApiPromise = null;
let youtubeApiReady = false;

let progressTimer = null;
let changingTrack = false;


/* =========================================================
   DOM
========================================================= */

const $ = id => document.getElementById(id);

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

        youtubeSearch: "youtubeSearch",
        searchYoutube: "searchYoutube",
        youtubeResults: "youtubeResults",
        youtubeContainer: "youtubeContainer",

        play: "playButton",
        next: "nextButton",
        prev: "prevButton",

        progressBar: "progressBar",
        currentTime: "currentTime",
        duration: "duration",

        queueButton: "queueButton",
        queuePanel: "queuePanel",
        closeQueue: "closeQueue",
        queueList: "queueList"
    };

    for (const [key, id] of Object.entries(ids)) {
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


function formatTime(seconds) {

    seconds = Number(seconds);

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

function updateSplash(progress, status) {

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
        "Preparando ApolloMusic..."
    );

    await wait(400);

    updateSplash(
        65,
        "Conectando ao YouTube..."
    );

    await wait(400);

    updateSplash(
        90,
        "Finalizando..."
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
   API OPCIONAL
========================================================= */

async function api(path, options = {}) {

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

                        "Content-Type":
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

    } finally {

        clearTimeout(timeout);
    }
}


/* =========================================================
   YOUTUBE URL
========================================================= */

function parseYouTubeUrl(url) {

    try {

        const parsed =
            new URL(url);

        const hostname =
            parsed.hostname
                .toLowerCase()
                .replace(/^www\./, "");

        const isYouTube =
            hostname === "youtube.com" ||
            hostname === "music.youtube.com" ||
            hostname === "youtu.be";

        if (!isYouTube) {
            return null;
        }


        let videoId = null;
        let playlistId =
            parsed.searchParams.get("list");


        /*
         * YOUTUBE / YOUTUBE MUSIC
         */

        if (
            hostname === "youtube.com" ||
            hostname === "music.youtube.com"
        ) {

            if (
                parsed.pathname === "/watch"
            ) {

                videoId =
                    parsed.searchParams.get("v");

            } else if (
                parsed.pathname.startsWith("/shorts/")
            ) {

                videoId =
                    parsed.pathname
                        .split("/")[2];

            } else if (
                parsed.pathname.startsWith("/embed/")
            ) {

                videoId =
                    parsed.pathname
                        .split("/")[2];
            }
        }


        /*
         * YOUTU.BE
         */

        if (
            hostname === "youtu.be"
        ) {

            videoId =
                parsed.pathname
                    .split("/")
                    .filter(Boolean)[0];
        }


        /*
         * PLAYLIST PURA
         */

        const isPlaylistPage =
            parsed.pathname === "/playlist";

        if (
            isPlaylistPage &&
            playlistId
        ) {
            videoId = null;
        }


        /*
         * LIMPEZA
         */

        if (videoId) {

            videoId =
                String(videoId)
                    .replace(
                        /[^a-zA-Z0-9_-]/g,
                        ""
                    )
                    .slice(0, 20);
        }

        if (playlistId) {

            playlistId =
                String(playlistId)
                    .replace(
                        /[^a-zA-Z0-9_-]/g,
                        ""
                    )
                    .slice(0, 100);
        }


        if (
            !videoId &&
            !playlistId
        ) {
            return null;
        }


        return {

            videoId:
                videoId || null,

            playlistId:
                playlistId || null,

            isPlaylist:
                Boolean(playlistId),

            isPlaylistPage
        };

    } catch {

        return null;
    }
}


/* =========================================================
   VIDEO ID
========================================================= */

function extractVideoId(url) {

    return (
        parseYouTubeUrl(url)
            ?.videoId ||
        null
    );
}


/* =========================================================
   PLAYLIST ID
========================================================= */

function extractPlaylistId(url) {

    return (
        parseYouTubeUrl(url)
            ?.playlistId ||
        null
    );
}


/* =========================================================
   THUMBNAIL
========================================================= */

function getYouTubeThumbnail(videoId) {

    /*
     * maxresdefault é melhor quando existe.
     *
     * Caso não exista, o navegador pode
     * cair para hqdefault.
     */

    return (
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    );
}


/* =========================================================
   NORMALIZA TRACK
========================================================= */

function normalizeTrack(item) {

    if (!item) {
        return null;
    }

    const id =
        item.id ||
        item.videoId ||
        item.video_id;

    if (!id) {
        return null;
    }

    const cleanId =
        String(id)
            .replace(
                /[^a-zA-Z0-9_-]/g,
                ""
            )
            .slice(0, 20);

    if (!cleanId) {
        return null;
    }

    return {

        id:
            cleanId,

        title:
            item.title ||
            item.name ||
            "Vídeo do YouTube",

        artist:
            item.artist ||
            item.author ||
            item.channel ||
            "YouTube",

        album:
            item.album ||
            "",

        cover:
            item.cover ||
            item.thumbnail ||
            getYouTubeThumbnail(cleanId),

        url:
            item.url ||
            `https://www.youtube.com/watch?v=${cleanId}`
    };
}


/* =========================================================
   REMOVE DUPLICADOS
========================================================= */

function removeDuplicateTracks(tracks) {

    const seen = new Set();

    return tracks.filter(track => {

        if (!track?.id) {
            return false;
        }

        if (seen.has(track.id)) {
            return false;
        }

        seen.add(track.id);

        return true;
    });
}


/* =========================================================
   YOUTUBE IFRAME API
========================================================= */

function loadYouTubeAPI() {

    if (
        window.YT &&
        window.YT.Player
    ) {

        youtubeApiReady = true;

        return Promise.resolve();
    }


    if (youtubeApiPromise) {
        return youtubeApiPromise;
    }


    youtubeApiPromise =
        new Promise((resolve, reject) => {

            const previous =
                window.onYouTubeIframeAPIReady;


            window.onYouTubeIframeAPIReady =
                () => {

                    youtubeApiReady = true;

                    if (
                        typeof previous ===
                        "function"
                    ) {

                        try {
                            previous();
                        } catch {}
                    }

                    resolve();
                };


            const existing =
                document.querySelector(
                    'script[src="https://www.youtube.com/iframe_api"]'
                );


            if (existing) {
                return;
            }


            const script =
                document.createElement("script");

            script.src =
                "https://www.youtube.com/iframe_api";

            script.async = true;


            script.onerror = () => {

                youtubeApiPromise = null;

                reject(
                    new Error(
                        "Não foi possível carregar a YouTube IFrame API."
                    )
                );
            };


            document.head.appendChild(script);
        });


    return youtubeApiPromise;
}


/* =========================================================
   CRIA PLAYER
========================================================= */

async function createYouTubePlayer() {

    await loadYouTubeAPI();

    if (
        !window.YT ||
        !window.YT.Player
    ) {

        throw new Error(
            "YouTube Player indisponível."
        );
    }


    const container =
        elements.youtubeContainer;


    if (!container) {

        throw new Error(
            "Container do YouTube não encontrado."
        );
    }


    if (youtubePlayer) {

        try {
            youtubePlayer.destroy();
        } catch {}

        youtubePlayer = null;
    }


    container.innerHTML = "";


    const playerElement =
        document.createElement("div");

    playerElement.id =
        "youtube-player";

    container.appendChild(
        playerElement
    );


    return new Promise(
        (resolve, reject) => {

            let resolved = false;


            youtubePlayer =
                new YT.Player(
                    "youtube-player",
                    {

                        width: "100%",
                        height: "400",

                        playerVars: {

                            autoplay: 1,
                            controls: 1,
                            rel: 0,
                            modestbranding: 1,
                            playsinline: 1
                        },

                        events: {

                            onReady: event => {

                                youtubePlayer =
                                    event.target;

                                updateControls();
                                updateProgress();

                                if (!resolved) {

                                    resolved = true;

                                    resolve(
                                        youtubePlayer
                                    );
                                }
                            },


                            onStateChange:
                                handlePlayerStateChange,


                            onError: event => {

                                handleYouTubeError(
                                    event
                                );

                                if (!resolved) {

                                    resolved = true;

                                    reject(
                                        new Error(
                                            "Erro ao inicializar o player."
                                        )
                                    );
                                }
                            }
                        }
                    }
                );
        }
    );
}


/* =========================================================
   GARANTE PLAYER
========================================================= */

async function ensureYouTubePlayer() {

    if (
        youtubePlayer
    ) {
        return youtubePlayer;
    }

    return createYouTubePlayer();
}


/* =========================================================
   EXTRAIR PLAYLIST
========================================================= */

async function extractPlaylistVideos(
    playlistId
) {

    const player =
        await ensureYouTubePlayer();


    setStatus(
        "Lendo vídeos da playlist..."
    );


    /*
     * IMPORTANTE:
     *
     * O player é usado como extrator.
     *
     * Não vamos deixar o YouTube
     * controlar nossa queue.
     */

    try {

        player.stopVideo();

    } catch {}


    player.cuePlaylist({

        list:
            playlistId,

        listType:
            "playlist",

        index:
            0
    });


    const ids =
        await waitForYouTubePlaylist(
            player,
            12000
        );


    if (
        !ids.length
    ) {

        throw new Error(
            "O YouTube não conseguiu fornecer os vídeos dessa playlist."
        );
    }


    return ids
        .map(id => {

            const cleanId =
                String(id)
                    .replace(
                        /[^a-zA-Z0-9_-]/g,
                        ""
                    )
                    .slice(0, 20);

            if (!cleanId) {
                return null;
            }

            return {

                id:
                    cleanId,

                title:
                    "Vídeo do YouTube",

                artist:
                    "YouTube",

                album:
                    "",

                cover:
                    getYouTubeThumbnail(
                        cleanId
                    ),

                url:
                    `https://www.youtube.com/watch?v=${cleanId}`
            };
        })
        .filter(Boolean);
}


/* =========================================================
   ESPERA PLAYLIST
========================================================= */

function waitForYouTubePlaylist(
    player,
    timeout = 12000
) {

    return new Promise(resolve => {

        const started =
            Date.now();


        const check = () => {

            let playlist = [];


            try {

                playlist =
                    typeof player.getPlaylist ===
                    "function"
                        ? player.getPlaylist()
                        : [];

            } catch {}


            if (
                Array.isArray(playlist) &&
                playlist.length
            ) {

                resolve(
                    playlist
                );

                return;
            }


            if (
                Date.now() - started >=
                timeout
            ) {

                resolve([]);

                return;
            }


            setTimeout(
                check,
                250
            );
        };


        check();
    });
}


/* =========================================================
   PROCESSAR PLAYLIST
========================================================= */

async function processYouTubePlaylist(
    url,
    parsed
) {

    let tracks = [];


    /*
     * =====================================================
     * PRIMEIRO:
     * tenta backend apenas para metadata.
     *
     * NÃO É OBRIGATÓRIO.
     * =====================================================
     */

    try {

        const response =
            await api(
                "/api/youtube/process",
                {
                    method: "POST",

                    body:
                        JSON.stringify({
                            url
                        })
                }
            );


        const items =
            response?.playlistItems ||
            response?.items ||
            response?.tracks ||
            response?.videos ||
            [];


        tracks =
            items
                .map(normalizeTrack)
                .filter(Boolean);


    } catch (error) {

        console.warn(
            "[ApolloMusic] Backend opcional:",
            error
        );
    }


    /*
     * =====================================================
     * FALLBACK:
     * extrai os IDs diretamente do YouTube.
     * =====================================================
     */

    if (!tracks.length) {

        tracks =
            await extractPlaylistVideos(
                parsed.playlistId
            );
    }


    /*
     * Remove duplicados.
     */

    tracks =
        removeDuplicateTracks(
            tracks
        );


    if (!tracks.length) {

        throw new Error(
            "Nenhum vídeo encontrado nessa playlist."
        );
    }


    /*
     * =====================================================
     * ADICIONA À QUEUE
     * =====================================================
     */

    const wasEmpty =
        queue.length === 0;


    queue.push(
        ...tracks
    );


    /*
     * =====================================================
     * ATUALIZA UI
     * =====================================================
     */

    renderQueue();


    if (wasEmpty) {

        currentTrack = 0;

        setStatus(
            `${tracks.length} vídeos encontrados.`
        );

        await playCurrentTrack();

    } else {

        setStatus(
            `${tracks.length} vídeos adicionados à fila.`
        );
    }
}


/* =========================================================
   PROCESSAR VÍDEO
========================================================= */

async function processYouTubeVideo(
    url,
    parsed
) {

    const videoId =
        parsed.videoId;


    if (!videoId) {

        throw new Error(
            "Não foi possível identificar o vídeo."
        );
    }


    let metadata = {};


    /*
     * Metadata opcional.
     */

    try {

        metadata =
            await api(
                "/api/youtube/process",
                {
                    method: "POST",

                    body:
                        JSON.stringify({
                            url
                        })
                }
            );

    } catch (error) {

        console.warn(
            "[ApolloMusic] Metadata opcional:",
            error
        );
    }


    const track = {

        id:
            videoId,

        title:
            metadata.title ||
            "Vídeo do YouTube",

        artist:
            metadata.artist ||
            metadata.author ||
            "YouTube",

        album:
            metadata.album ||
            "",

        cover:
            metadata.thumbnail ||
            getYouTubeThumbnail(videoId),

        url
    };


    const wasEmpty =
        queue.length === 0;


    queue.push(
        track
    );


    renderQueue();


    if (wasEmpty) {

        currentTrack = 0;

        await playCurrentTrack();

    } else {

        setStatus(
            `Adicionado à fila. ${queue.length} vídeos.`
        );
    }
}


/* =========================================================
   PROCESSAR URL
========================================================= */

async function processYouTubeUrl(
    rawUrl
) {

    const url =
        String(
            rawUrl || ""
        ).trim();


    if (!url) {

        setStatus(
            "Cole um link do YouTube."
        );

        elements.youtubeSearch?.focus();

        return;
    }


    if (
        !/^https?:\/\//i.test(url)
    ) {

        setStatus(
            "Cole um link válido do YouTube."
        );

        return;
    }


    const parsed =
        parseYouTubeUrl(url);


    if (!parsed) {

        setStatus(
            "Esse link não parece ser do YouTube."
        );

        return;
    }


    try {

        /*
         * PLAYLIST
         */

        if (
            parsed.playlistId
        ) {

            setStatus(
                "Playlist detectada..."
            );


            await processYouTubePlaylist(
                url,
                parsed
            );


        } else {

            /*
             * VÍDEO
             */

            await processYouTubeVideo(
                url,
                parsed
            );
        }


        if (
            elements.youtubeSearch
        ) {

            elements.youtubeSearch.value =
                "";
        }

    } catch (error) {

        console.error(
            "[ApolloMusic]",
            error
        );


        setStatus(
            error.message ||
            "Não foi possível processar o link."
        );
    }
}


/* =========================================================
   PLAY CURRENT
========================================================= */

async function playCurrentTrack() {

    if (changingTrack) {
        return;
    }


    const track =
        queue[currentTrack];


    if (!track) {

        updateControls();

        return;
    }


    changingTrack = true;


    stopProgressTimer();
    resetProgress();

    updateQueueSelection();


    try {

        const player =
            await ensureYouTubePlayer();


        if (
            typeof player.loadVideoById !==
            "function"
        ) {

            throw new Error(
                "O player ainda não está pronto."
            );
        }


        /*
         * A QUEUE DO APOLLOMUSIC
         * manda na reprodução.
         */

        player.loadVideoById(
            track.id
        );


        updateNowPlaying(
            track
        );


        updateQueueSelection();
        updateControls();


    } catch (error) {

        console.error(
            "[ApolloMusic] Player:",
            error
        );


        setStatus(
            error.message ||
            "Não foi possível reproduzir."
        );

    } finally {

        changingTrack = false;
    }
}


/* =========================================================
   NOW PLAYING
========================================================= */

function updateNowPlaying(track) {

    if (!track) {
        return;
    }


    const title =
        $("nowPlayingTitle");

    const artist =
        $("nowPlayingArtist");

    const cover =
        $("nowPlayingCover");


    if (title) {
        title.textContent =
            track.title;
    }


    if (artist) {
        artist.textContent =
            track.artist;
    }


    if (cover) {

        cover.src =
            track.cover ||
            getYouTubeThumbnail(
                track.id
            );

        /*
         * Deixa a imagem quadrada
         * visualmente.
         */

        cover.style.aspectRatio =
            "1 / 1";

        cover.style.objectFit =
            "cover";
    }
}


/* =========================================================
   PLAY / PAUSE
========================================================= */

function togglePlay() {

    if (!youtubePlayer) {

        if (queue.length) {

            playCurrentTrack();

        } else {

            setStatus(
                "Adicione um vídeo primeiro."
            );
        }

        return;
    }


    const state =
        youtubePlayer.getPlayerState();


    if (
        state ===
        YT.PlayerState.PLAYING
    ) {

        youtubePlayer.pauseVideo();

    } else {

        youtubePlayer.playVideo();
    }
}


/* =========================================================
   NEXT
========================================================= */

function nextTrack() {

    if (
        !queue.length ||
        changingTrack
    ) {
        return;
    }


    currentTrack++;


    if (
        currentTrack >=
        queue.length
    ) {

        currentTrack = 0;
    }


    playCurrentTrack();
}


/* =========================================================
   PREVIOUS
========================================================= */

function previousTrack() {

    if (
        !queue.length ||
        changingTrack
    ) {
        return;
    }


    currentTrack--;


    if (
        currentTrack < 0
    ) {

        currentTrack =
            queue.length - 1;
    }


    playCurrentTrack();
}


/* =========================================================
   PLAYER STATE
========================================================= */

function handlePlayerStateChange(event) {

    if (!window.YT) {
        return;
    }


    switch (event.data) {

        case YT.PlayerState.PLAYING:

            startProgressTimer();

            updatePlayButton(true);

            setStatus(
                `Reproduzindo: ${
                    queue[currentTrack]?.title ||
                    "YouTube"
                }`
            );

            updateProgress();

            break;


        case YT.PlayerState.PAUSED:

            stopProgressTimer();

            updatePlayButton(false);

            setStatus(
                "Pausado."
            );

            break;


        case YT.PlayerState.ENDED:

            stopProgressTimer();

            nextTrack();

            break;


        case YT.PlayerState.BUFFERING:

            setStatus(
                "Carregando..."
            );

            break;
    }


    updateControls();
}


/* =========================================================
   ERROS YOUTUBE
========================================================= */

function handleYouTubeError(event) {

    const errors = {

        2:
            "URL do YouTube inválida.",

        5:
            "Erro no player do YouTube.",

        100:
            "Vídeo não encontrado.",

        101:
            "Este vídeo não permite reprodução incorporada.",

        150:
            "Este vídeo não permite reprodução incorporada.",

        153:
            "O YouTube não conseguiu identificar o cliente."
    };


    console.error(
        "[ApolloMusic] YouTube:",
        event.data
    );


    setStatus(
        errors[event.data] ||
        "Erro ao reproduzir o vídeo."
    );


    /*
     * Pula automaticamente
     * para o próximo.
     */

    if (
        queue.length > 1
    ) {

        setTimeout(
            nextTrack,
            900
        );
    }
}


/* =========================================================
   PROGRESSO
========================================================= */

function startProgressTimer() {

    stopProgressTimer();

    progressTimer =
        setInterval(
            updateProgress,
            500
        );
}


function stopProgressTimer() {

    if (progressTimer) {

        clearInterval(
            progressTimer
        );

        progressTimer = null;
    }
}


function resetProgress() {

    if (elements.progressBar) {
        elements.progressBar.value = 0;
    }

    if (elements.currentTime) {
        elements.currentTime.textContent = "0:00";
    }

    if (elements.duration) {
        elements.duration.textContent = "0:00";
    }
}


function updateProgress() {

    if (
        !youtubePlayer ||
        typeof youtubePlayer.getCurrentTime !==
        "function"
    ) {
        return;
    }


    let current = 0;
    let duration = 0;


    try {

        current =
            youtubePlayer.getCurrentTime() || 0;

        duration =
            youtubePlayer.getDuration() || 0;

    } catch {

        return;
    }


    if (elements.currentTime) {

        elements.currentTime.textContent =
            formatTime(current);
    }


    if (elements.duration) {

        elements.duration.textContent =
            formatTime(duration);
    }


    if (
        elements.progressBar &&
        duration > 0
    ) {

        elements.progressBar.value =
            (current / duration) * 100;
    }
}


/* =========================================================
   SEEK
========================================================= */

function seekVideo(value) {

    if (
        !youtubePlayer ||
        typeof youtubePlayer.getDuration !==
        "function"
    ) {
        return;
    }


    const duration =
        youtubePlayer.getDuration();


    if (
        !duration ||
        !Number.isFinite(duration)
    ) {
        return;
    }


    const percentage =
        Number(value) / 100;


    youtubePlayer.seekTo(
        duration * percentage,
        true
    );
}


/* =========================================================
   PLAY BUTTON
========================================================= */

function updatePlayButton(playing) {

    const button =
        elements.play;


    if (!button) {
        return;
    }


    button.innerHTML =
        playing
            ? "❚❚"
            : "▶";


    button.setAttribute(
        "aria-label",
        playing
            ? "Pausar"
            : "Reproduzir"
    );
}


/* =========================================================
   CONTROLES
========================================================= */

function updateControls() {

    const hasQueue =
        queue.length > 0;


    if (elements.play) {
        elements.play.disabled =
            !hasQueue;
    }

    if (elements.next) {
        elements.next.disabled =
            !hasQueue;
    }

    if (elements.prev) {
        elements.prev.disabled =
            !hasQueue;
    }

    if (elements.queueButton) {
        elements.queueButton.disabled =
            !hasQueue;
    }


    if (!hasQueue) {
        updatePlayButton(false);
    }
}


/* =========================================================
   RENDER QUEUE
========================================================= */

function renderQueue() {

    const container =
        elements.queueList;


    if (!container) {
        return;
    }


    container.innerHTML = "";


    queue.forEach(
        (track, index) => {

            const item =
                document.createElement("button");


            item.type = "button";

            item.className =
                "queue-item";


            if (
                index === currentTrack
            ) {

                item.classList.add(
                    "current"
                );
            }


            /*
             * CAPA
             */

            const image =
                document.createElement("img");


            image.alt = "";

            image.loading = "lazy";

            image.src =
                track.cover ||
                getYouTubeThumbnail(
                    track.id
                );


            /*
             * GARANTE VISUAL 1:1
             */

            image.style.aspectRatio =
                "1 / 1";

            image.style.objectFit =
                "cover";


            /*
             * INFO
             */

            const info =
                document.createElement("div");

            info.className =
                "queue-item-info";


            const title =
                document.createElement("div");

            title.className =
                "queue-item-title";

            title.textContent =
                track.title ||
                "Vídeo do YouTube";


            const subtitle =
                document.createElement("div");

            subtitle.className =
                "queue-item-subtitle";

            subtitle.textContent =
                track.artist ||
                "YouTube";


            info.appendChild(title);
            info.appendChild(subtitle);


            item.appendChild(image);
            item.appendChild(info);


            /*
             * CLICK
             */

            item.addEventListener(
                "click",
                () => {

                    if (
                        index < 0 ||
                        index >= queue.length
                    ) {
                        return;
                    }


                    currentTrack =
                        index;


                    playCurrentTrack();
                }
            );


            container.appendChild(item);
        }
    );


    updateQueueSelection();
    updateControls();
}


/* =========================================================
   SELEÇÃO DA QUEUE
========================================================= */

function updateQueueSelection() {

    if (
        !elements.queueList
    ) {
        return;
    }


    const items =
        elements.queueList.querySelectorAll(
            ".queue-item"
        );


    items.forEach(
        (item, index) => {

            item.classList.toggle(
                "current",
                index === currentTrack
            );
        }
    );
}


/* =========================================================
   QUEUE PANEL
========================================================= */

function toggleQueue() {

    if (
        !elements.queuePanel
    ) {
        return;
    }


    const visible =
        elements.queuePanel.classList.toggle(
            "visible"
        );


    elements.queuePanel.setAttribute(
        "aria-hidden",
        String(!visible)
    );
}


function closeQueue() {

    if (
        !elements.queuePanel
    ) {
        return;
    }


    elements.queuePanel.classList.remove(
        "visible"
    );


    elements.queuePanel.setAttribute(
        "aria-hidden",
        "true"
    );
}


/* =========================================================
   EVENTOS
========================================================= */

function setupEvents() {

    /*
     * ADICIONAR
     */

    elements.searchYoutube?.addEventListener(
        "click",
        () => {

            processYouTubeUrl(
                elements.youtubeSearch?.value
            );
        }
    );


    /*
     * ENTER
     */

    elements.youtubeSearch?.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter"
            ) {

                event.preventDefault();

                processYouTubeUrl(
                    elements.youtubeSearch.value
                );
            }
        }
    );


    /*
     * PLAY
     */

    elements.play?.addEventListener(
        "click",
        togglePlay
    );


    /*
     * NEXT
     */

    elements.next?.addEventListener(
        "click",
        nextTrack
    );


    /*
     * PREVIOUS
     */

    elements.prev?.addEventListener(
        "click",
        previousTrack
    );


    /*
     * QUEUE
     */

    elements.queueButton?.addEventListener(
        "click",
        toggleQueue
    );


    /*
     * CLOSE
     */

    elements.closeQueue?.addEventListener(
        "click",
        closeQueue
    );


    /*
     * PROGRESS
     */

    elements.progressBar?.addEventListener(
        "input",
        event => {

            seekVideo(
                event.target.value
            );
        }
    );
}


/* =========================================================
   INIT
========================================================= */

async function init() {

    cacheElements();

    setupEvents();

    updateControls();

    resetProgress();

    renderQueue();


    /*
     * YouTube API
     */

    loadYouTubeAPI()
        .then(() => {

            setStatus(
                "Cole um link do YouTube para começar."
            );

        })
        .catch(error => {

            console.error(
                "[ApolloMusic] YouTube:",
                error
            );

            setStatus(
                "Não foi possível carregar o YouTube."
            );
        });
}


/* =========================================================
   START
========================================================= */

if (
    document.readyState === "loading"
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