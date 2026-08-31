/* =========================================================
   APOLLOMUSIC
   YouTube Player — Vanilla JS

   YouTube fica invisível na interface.
   A UI do ApolloMusic controla:
   - Play / Pause
   - Próxima / Anterior
   - Progresso
   - Fila
   - Now Playing

   Não utiliza API Key.
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

let progressTimer = null;
let changingTrack = false;

let isPlaying = false;


/* =========================================================
   DOM
========================================================= */

const elements = {};


const $ = id =>
    document.getElementById(id);


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
        queueList: "queueList",

        nowPlayingTitle: "nowPlayingTitle",
        nowPlayingArtist: "nowPlayingArtist",
        nowPlayingCover: "nowPlayingCover"
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
   UTILIDADES
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


function cleanYouTubeId(id) {

    if (!id) {

        return null;
    }


    const clean =
        String(id)
            .replace(/[^a-zA-Z0-9_-]/g, "")
            .slice(0, 20);


    return clean || null;
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
   API
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

    } catch (error) {

        if (
            error.name === "AbortError"
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


        return data?.status === "ok";

    } catch (error) {

        console.warn(
            "[ApolloMusic] API offline:",
            error
        );

        return false;
    }
}


/* =========================================================
   PARSER YOUTUBE
========================================================= */

function parseYouTubeUrl(url) {

    try {

        const parsed =
            new URL(url);


        const hostname =
            parsed.hostname
                .toLowerCase()
                .replace(/^www\./, "");


        const validHost =
            hostname === "youtube.com" ||
            hostname === "music.youtube.com" ||
            hostname === "youtu.be";


        if (!validHost) {

            return null;
        }


        let videoId = null;

        let playlistId =
            parsed.searchParams.get("list");


        /*
         * youtube.com
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
            }


            else if (
                parsed.pathname.startsWith("/shorts/")
            ) {

                videoId =
                    parsed.pathname
                        .split("/")[2];
            }


            else if (
                parsed.pathname.startsWith("/embed/")
            ) {

                videoId =
                    parsed.pathname
                        .split("/")[2];
            }
        }


        /*
         * youtu.be
         */

        else {

            videoId =
                parsed.pathname
                    .split("/")
                    .filter(Boolean)[0];
        }


        /*
         * Playlist pura
         */

        const isPlaylistPage =
            parsed.pathname === "/playlist";


        if (isPlaylistPage) {

            videoId = null;
        }


        videoId =
            cleanYouTubeId(videoId);


        if (playlistId) {

            playlistId =
                String(playlistId)
                    .replace(
                        /[^a-zA-Z0-9_-]/g,
                        ""
                    )
                    .slice(0, 100);
        }


        if (!videoId && !playlistId) {

            return null;
        }


        return {

            videoId,

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
   THUMBNAIL
========================================================= */

function getYouTubeThumbnail(id) {

    return (
        `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
    );
}


/* =========================================================
   NORMALIZA ITEM
========================================================= */

function normalizeTrack(item) {

    if (!item) {

        return null;
    }


    const id =
        cleanYouTubeId(
            item.id ||
            item.videoId ||
            item.video_id
        );


    if (!id) {

        return null;
    }


    return {

        id,

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
            getYouTubeThumbnail(id)
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

        return Promise.resolve();
    }


    if (youtubeApiPromise) {

        return youtubeApiPromise;
    }


    youtubeApiPromise =
        new Promise((resolve, reject) => {

            const oldCallback =
                window.onYouTubeIframeAPIReady;


            window.onYouTubeIframeAPIReady =
                () => {

                    if (
                        typeof oldCallback ===
                        "function"
                    ) {

                        try {

                            oldCallback();

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
   PLAYER INVISÍVEL
========================================================= */

async function createYouTubePlayer() {

    await loadYouTubeAPI();


    if (
        !window.YT ||
        !window.YT.Player
    ) {

        throw new Error(
            "YouTube IFrame API indisponível."
        );
    }


    const container =
        elements.youtubeContainer;


    if (!container) {

        throw new Error(
            "youtubeContainer não encontrado."
        );
    }


    /*
     * Limpa player anterior.
     */

    if (youtubePlayer) {

        try {

            youtubePlayer.destroy();

        } catch {}

        youtubePlayer = null;
    }


    container.innerHTML = "";


    /*
     * Cria o elemento do player.
     */

    const playerElement =
        document.createElement("div");


    playerElement.id =
        "apollo-youtube-player";


    /*
     * O player existe normalmente,
     * mas não ocupa espaço visual.
     *
     * A interface do ApolloMusic
     * fica responsável pela aparência.
     */

    playerElement.style.position =
        "absolute";

    playerElement.style.width =
        "1px";

    playerElement.style.height =
        "1px";

    playerElement.style.opacity =
        "0";

    playerElement.style.pointerEvents =
        "none";

    playerElement.style.overflow =
        "hidden";


    container.appendChild(
        playerElement
    );


    return new Promise((resolve, reject) => {

        let finished = false;


        youtubePlayer =
            new YT.Player(
                "apollo-youtube-player",
                {

                    width: "1",

                    height: "1",

                    playerVars: {

                        autoplay: 0,

                        controls: 0,

                        rel: 0,

                        modestbranding: 1,

                        playsinline: 1,

                        enablejsapi: 1
                    },


                    events: {

                        onReady: event => {

                            youtubePlayer =
                                event.target;


                            updateControls();


                            if (!finished) {

                                finished = true;

                                resolve(
                                    youtubePlayer
                                );
                            }
                        },


                        onStateChange:
                            handlePlayerStateChange,


                        onError:
                            handleYouTubeError
                    }
                }
            );


        setTimeout(() => {

            if (!finished) {

                finished = true;

                reject(
                    new Error(
                        "O player do YouTube demorou para inicializar."
                    )
                );
            }

        }, 15000);
    });
}


/* =========================================================
   GARANTE PLAYER
========================================================= */

async function ensureYouTubePlayer() {

    if (
        youtubePlayer &&
        typeof youtubePlayer.loadVideoById ===
        "function"
    ) {

        return youtubePlayer;
    }


    return await createYouTubePlayer();
}


/* =========================================================
   NOW PLAYING
========================================================= */

function updateNowPlaying(track) {

    if (!track) {

        return;
    }


    if (elements.nowPlayingTitle) {

        elements.nowPlayingTitle.textContent =
            track.title;
    }


    if (elements.nowPlayingArtist) {

        elements.nowPlayingArtist.textContent =
            track.artist;
    }


    if (elements.nowPlayingCover) {

        /*
         * A capa do YouTube é usada imediatamente.
         */

        elements.nowPlayingCover.src =
            track.cover ||
            getYouTubeThumbnail(track.id);

        elements.nowPlayingCover.alt =
            track.title;
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

    updateNowPlaying(track);


    /*
     * A capa muda imediatamente,
     * sem esperar o YouTube.
     */

    setStatus(
        `Carregando: ${track.title}`
    );


    try {

        const player =
            await ensureYouTubePlayer();


        player.loadVideoById(
            track.id
        );


    } catch (error) {

        console.error(
            "[ApolloMusic] Reprodução:",
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
   PLAYER STATE
========================================================= */

function handlePlayerStateChange(event) {

    if (!window.YT) {

        return;
    }


    switch (event.data) {

        case YT.PlayerState.PLAYING:

            isPlaying = true;

            updatePlayButton(true);

            startProgressTimer();

            setStatus(
                `Reproduzindo: ${
                    queue[currentTrack]?.title ||
                    "YouTube"
                }`
            );

            updateProgress();

            break;


        case YT.PlayerState.PAUSED:

            isPlaying = false;

            updatePlayButton(false);

            stopProgressTimer();

            setStatus("Pausado.");

            break;


        case YT.PlayerState.BUFFERING:

            setStatus("Carregando...");

            break;


        case YT.PlayerState.ENDED:

            isPlaying = false;

            stopProgressTimer();

            nextTrack();

            break;


        case YT.PlayerState.CUED:

            updateProgress();

            break;
    }


    updateControls();
}


/* =========================================================
   ERRO YOUTUBE
========================================================= */

function handleYouTubeError(event) {

    console.error(
        "[ApolloMusic] YouTube error:",
        event.data
    );


    const messages = {

        2:
            "ID do vídeo inválido.",

        5:
            "Erro no player do YouTube.",

        100:
            "Vídeo não encontrado ou privado.",

        101:
            "Este vídeo não permite reprodução incorporada.",

        150:
            "Este vídeo não permite reprodução incorporada.",

        153:
            "O YouTube não conseguiu identificar o cliente."
    };


    setStatus(
        messages[event.data] ||
        "Não foi possível reproduzir este vídeo."
    );


    /*
     * Se houver outra música,
     * tenta continuar a fila.
     */

    if (queue.length > 1) {

        setTimeout(
            nextTrack,
            1000
        );
    }
}


/* =========================================================
   PROCESSA VÍDEO
========================================================= */

async function processYouTubeVideo(
    url,
    parsed
) {

    const videoId =
        parsed.videoId;


    if (!videoId) {

        return;
    }


    /*
     * Capa básica já disponível.
     */

    const item = {

        id: videoId,

        title: "Vídeo do YouTube",

        artist: "YouTube",

        album: "",

        cover:
            getYouTubeThumbnail(videoId),

        url
    };


    /*
     * Backend é opcional.
     */

    try {

        const metadata =
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


        item.title =
            metadata.title ||
            item.title;


        item.artist =
            metadata.artist ||
            metadata.author ||
            item.artist;


        item.album =
            metadata.album ||
            item.album;


        item.cover =
            metadata.thumbnail ||
            item.cover;

    } catch (error) {

        console.warn(
            "[ApolloMusic] Metadata indisponível:",
            error
        );
    }


    /*
     * Evita duplicatas.
     */

    const alreadyExists =
        queue.some(
            track =>
                track.id === item.id
        );


    if (alreadyExists) {

        setStatus(
            "Essa música já está na fila."
        );

        return;
    }


    const wasEmpty =
        queue.length === 0;


    queue.push(item);


    renderQueue();


    if (wasEmpty) {

        currentTrack = 0;

        await playCurrentTrack();

    } else {

        setStatus(
            `Adicionado à fila. ${queue.length} músicas.`
        );
    }
}


/* =========================================================
   PROCESSA PLAYLIST
========================================================= */

async function processYouTubePlaylist(
    url,
    parsed
) {

    setStatus(
        "Carregando playlist..."
    );


    let tracks = [];


    /*
     * =====================================================
     * BACKEND
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


        if (Array.isArray(items)) {

            tracks =
                items
                    .map(normalizeTrack)
                    .filter(Boolean);
        }

    } catch (error) {

        console.warn(
            "[ApolloMusic] Backend playlist:",
            error
        );
    }


    /*
     * =====================================================
     * FALLBACK
     * =====================================================
     *
     * Se o backend não retornar os vídeos,
     * tenta obter a playlist pelo player.
     */

    if (!tracks.length) {

        const player =
            await ensureYouTubePlayer();


        if (
            typeof player.cuePlaylist !==
            "function"
        ) {

            throw new Error(
                "Não foi possível carregar a playlist."
            );
        }


        try {

            player.stopVideo();

        } catch {}


        player.cuePlaylist({

            list:
                parsed.playlistId,

            listType:
                "playlist",

            index: 0
        });


        const ids =
            await waitForPlaylist(
                player
            );


        tracks =
            ids
                .map(id => {

                    const cleanId =
                        cleanYouTubeId(id);


                    if (!cleanId) {

                        return null;
                    }


                    return {

                        id: cleanId,

                        title:
                            "Vídeo do YouTube",

                        artist:
                            "YouTube",

                        album: "",

                        cover:
                            getYouTubeThumbnail(
                                cleanId
                            )
                    };
                })
                .filter(Boolean);
    }


    tracks =
        removeDuplicateTracks(
            tracks
        );


    if (!tracks.length) {

        throw new Error(
            "Não foi possível encontrar vídeos nessa playlist."
        );
    }


    /*
     * Evita adicionar músicas que já estão na fila.
     */

    const existing =
        new Set(
            queue.map(
                track => track.id
            )
        );


    const newTracks =
        tracks.filter(
            track =>
                !existing.has(track.id)
        );


    if (!newTracks.length) {

        setStatus(
            "Todas as músicas dessa playlist já estão na fila."
        );

        return;
    }


    const wasEmpty =
        queue.length === 0;


    queue.push(
        ...newTracks
    );


    renderQueue();


    setStatus(
        wasEmpty
            ? `${newTracks.length} músicas carregadas.`
            : `${newTracks.length} músicas adicionadas à fila.`
    );


    if (wasEmpty) {

        currentTrack = 0;

        await playCurrentTrack();
    }
}


/* =========================================================
   ESPERA PLAYLIST
========================================================= */

function waitForPlaylist(
    player,
    timeout = 10000
) {

    return new Promise(resolve => {

        const start =
            Date.now();


        function check() {

            try {

                const playlist =
                    player.getPlaylist?.();


                if (
                    Array.isArray(playlist) &&
                    playlist.length
                ) {

                    resolve(playlist);

                    return;
                }

            } catch {}


            if (
                Date.now() - start >=
                timeout
            ) {

                resolve([]);

                return;
            }


            setTimeout(
                check,
                250
            );
        }


        check();
    });
}


/* =========================================================
   PROCESSA URL
========================================================= */

async function processYouTubeUrl(url) {

    url =
        String(
            url || ""
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
            "Esse não parece ser um link válido do YouTube."
        );

        return;
    }


    try {

        if (parsed.playlistId) {

            await processYouTubePlaylist(
                url,
                parsed
            );

        } else {

            await processYouTubeVideo(
                url,
                parsed
            );
        }


        if (elements.youtubeSearch) {

            elements.youtubeSearch.value = "";
        }

    } catch (error) {

        console.error(
            "[ApolloMusic] URL:",
            error
        );


        setStatus(
            error.message ||
            "Não foi possível carregar o link."
        );
    }
}


/* =========================================================
   PLAY / PAUSE
========================================================= */

function togglePlay() {

    if (!queue.length) {

        setStatus(
            "Adicione uma música primeiro."
        );

        return;
    }


    if (!youtubePlayer) {

        playCurrentTrack();

        return;
    }


    try {

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

    } catch (error) {

        console.warn(
            "[ApolloMusic] Toggle:",
            error
        );
    }
}


/* =========================================================
   PRÓXIMA
========================================================= */

function nextTrack() {

    if (!queue.length) {

        return;
    }


    if (changingTrack) {

        return;
    }


    currentTrack =
        (currentTrack + 1) %
        queue.length;


    playCurrentTrack();
}


/* =========================================================
   ANTERIOR
========================================================= */

function previousTrack() {

    if (!queue.length) {

        return;
    }


    if (changingTrack) {

        return;
    }


    currentTrack--;


    if (currentTrack < 0) {

        currentTrack =
            queue.length - 1;
    }


    playCurrentTrack();
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

        elements.currentTime.textContent =
            "0:00";
    }


    if (elements.duration) {

        elements.duration.textContent =
            "0:00";
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


    try {

        const current =
            youtubePlayer.getCurrentTime() || 0;


        const duration =
            youtubePlayer.getDuration() || 0;


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
                (
                    current /
                    duration
                ) * 100;
        }

    } catch {}
}


/* =========================================================
   SEEK
========================================================= */

function seekVideo(value) {

    if (!youtubePlayer) {

        return;
    }


    try {

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

    } catch {}
}


/* =========================================================
   PLAY BUTTON
========================================================= */

function updatePlayButton(playing) {

    if (!elements.play) {

        return;
    }


    elements.play.innerHTML =
        playing
            ? "❚❚"
            : "▶";


    elements.play.setAttribute(
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
   FILA
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

            const button =
                document.createElement("button");


            button.type =
                "button";


            button.className =
                "queue-item";


            button.dataset.index =
                String(index);


            if (
                index === currentTrack
            ) {

                button.classList.add(
                    "current"
                );
            }


            /*
             * CAPA
             */

            const image =
                document.createElement("img");


            image.src =
                track.cover ||
                getYouTubeThumbnail(
                    track.id
                );


            image.alt = "";

            image.loading = "lazy";


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


            const artist =
                document.createElement("div");


            artist.className =
                "queue-item-subtitle";


            artist.textContent =
                track.artist ||
                "YouTube";


            info.appendChild(title);

            info.appendChild(artist);


            button.appendChild(image);

            button.appendChild(info);


            /*
             * CLICK
             */

            button.addEventListener(
                "click",
                () => {

                    currentTrack =
                        index;


                    playCurrentTrack();
                }
            );


            container.appendChild(
                button
            );
        }
    );


    updateQueueSelection();

    updateControls();
}


/* =========================================================
   SELEÇÃO DA FILA
========================================================= */

function updateQueueSelection() {

    if (!elements.queueList) {

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

    if (!elements.queuePanel) {

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

    if (!elements.queuePanel) {

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
     * Adicionar URL
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

            if (event.key === "Enter") {

                event.preventDefault();

                processYouTubeUrl(
                    elements.youtubeSearch.value
                );
            }
        }
    );


    /*
     * Play
     */

    elements.play?.addEventListener(
        "click",
        togglePlay
    );


    /*
     * Next
     */

    elements.next?.addEventListener(
        "click",
        nextTrack
    );


    /*
     * Previous
     */

    elements.prev?.addEventListener(
        "click",
        previousTrack
    );


    /*
     * Queue
     */

    elements.queueButton?.addEventListener(
        "click",
        toggleQueue
    );


    /*
     * Fechar Queue
     */

    elements.closeQueue?.addEventListener(
        "click",
        closeQueue
    );


    /*
     * Progresso
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
   INICIALIZAÇÃO
========================================================= */

async function init() {

    cacheElements();

    setupEvents();

    updateControls();

    resetProgress();

    renderQueue();


    /*
     * Carrega a API do YouTube.
     */

    loadYouTubeAPI()
        .catch(error => {

            console.error(
                "[ApolloMusic] YouTube API:",
                error
            );


            setStatus(
                "Não foi possível carregar o YouTube."
            );
        });


    /*
     * Backend não é obrigatório.
     */

    checkAPI()
        .then(online => {

            if (online) {

                setStatus(
                    "Cole um link do YouTube para começar."
                );

            } else {

                setStatus(
                    "Pronto. Cole um link do YouTube."
                );
            }
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