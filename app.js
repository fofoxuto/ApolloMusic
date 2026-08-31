/* =========================================================
   APOLLOMUSIC - YOUTUBE VERSION
   YouTube Player — Vanilla JS
   Material 3 Expressive Controls
========================================================= */


/* =========================================================
   CONFIG
========================================================= */

const API_URL =
    "https://apollobackend-viu3.onrender.com";

const YOUTUBE_API_TIMEOUT = 15000;
const SPLASH_SPEED = 0.6;


/* =========================================================
   ESTADO
========================================================= */

let queue = [];
let currentTrack = 0;

let youtubePlayer = null;
let youtubeApiReady = false;
let youtubeApiPromise = null;

let progressTimer = null;
let changingTrack = false;

let activeYouTubePlaylist = null;


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


    for (
        const [key, id]
        of Object.entries(ids)
    ) {

        elements[key] = $(id);
    }
}


/* =========================================================
   STATUS
========================================================= */

function setStatus(text) {

    if (elements.status) {

        elements.status.textContent =
            text;
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

    seconds =
        Number(seconds);


    if (
        !Number.isFinite(seconds) ||
        seconds < 0
    ) {

        return "0:00";
    }


    const minutes =
        Math.floor(
            seconds / 60
        );


    const remaining =
        Math.floor(
            seconds % 60
        );


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
        "Preparando YouTube..."
    );

    await wait(400);


    updateSplash(
        85,
        "Finalizando configuração..."
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
   API BACKEND
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
            YOUTUBE_API_TIMEOUT
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
   YOUTUBE URL
========================================================= */

/*
 * Reconhece:
 *
 * https://www.youtube.com/watch?v=VIDEO
 * https://youtu.be/VIDEO
 * https://music.youtube.com/watch?v=VIDEO
 *
 * https://www.youtube.com/playlist?list=PLAYLIST
 * https://music.youtube.com/playlist?list=PLAYLIST
 *
 * E também:
 *
 * https://www.youtube.com/watch?v=VIDEO&list=PLAYLIST
 */

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
            hostname === "youtu.be" ||
            hostname === "music.youtube.com";


        if (!isYouTube) {

            return null;
        }


        let videoId =
            null;

        let playlistId =
            parsed.searchParams.get("list") ||
            null;


        /*
         * YouTube normal / YouTube Music
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


            /*
             * /shorts/VIDEO
             */

            else if (
                parsed.pathname.startsWith(
                    "/shorts/"
                )
            ) {

                videoId =
                    parsed.pathname
                        .split("/")[2] ||
                    null;

            }


            /*
             * /embed/VIDEO
             */

            else if (
                parsed.pathname.startsWith(
                    "/embed/"
                )
            ) {

                videoId =
                    parsed.pathname
                        .split("/")[2] ||
                    null;
            }
        }


        /*
         * youtu.be/VIDEO
         */

        else if (
            hostname === "youtu.be"
        ) {

            videoId =
                parsed.pathname
                    .split("/")
                    .filter(Boolean)[0] ||
                null;
        }


        /*
         * Se for playlist pura:
         *
         * /playlist?list=PL...
         */

        const isPlaylistPage =
            parsed.pathname ===
            "/playlist";


        if (
            isPlaylistPage &&
            playlistId
        ) {

            videoId =
                null;
        }


        /*
         * Validação simples dos IDs.
         */

        if (
            videoId
        ) {

            videoId =
                videoId
                    .replace(/[^a-zA-Z0-9_-]/g, "")
                    .slice(0, 20);
        }


        if (
            playlistId
        ) {

            playlistId =
                playlistId
                    .replace(/[^a-zA-Z0-9_-]/g, "")
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
   EXTRAI PLAYLIST ID
========================================================= */

function extractPlaylistId(url) {

    return (
        parseYouTubeUrl(url)
            ?.playlistId ||
        null
    );
}


/* =========================================================
   EXTRAI VIDEO ID
========================================================= */

function extractVideoId(url) {

    return (
        parseYouTubeUrl(url)
            ?.videoId ||
        null
    );
}


/* =========================================================
   YOUTUBE IFRAME API
========================================================= */

function loadYouTubeAPI() {

    if (
        window.YT &&
        window.YT.Player
    ) {

        youtubeApiReady =
            true;

        return Promise.resolve();
    }


    if (
        youtubeApiPromise
    ) {

        return youtubeApiPromise;
    }


    youtubeApiPromise =
        new Promise(
            (resolve, reject) => {

                const previousCallback =
                    window.onYouTubeIframeAPIReady;


                window.onYouTubeIframeAPIReady =
                    () => {

                        youtubeApiReady =
                            true;


                        if (
                            typeof previousCallback ===
                            "function"
                        ) {

                            try {

                                previousCallback();

                            } catch (error) {

                                console.warn(
                                    "[ApolloMusic] Callback anterior:",
                                    error
                                );
                            }
                        }


                        resolve();
                    };


                const existingScript =
                    document.querySelector(
                        'script[src="https://www.youtube.com/iframe_api"]'
                    );


                if (
                    existingScript
                ) {

                    return;
                }


                const script =
                    document.createElement(
                        "script"
                    );


                script.src =
                    "https://www.youtube.com/iframe_api";


                script.async =
                    true;


                script.onerror =
                    () => {

                        youtubeApiPromise =
                            null;


                        reject(
                            new Error(
                                "Não foi possível carregar a YouTube IFrame API."
                            )
                        );
                    };


                document.head.appendChild(
                    script
                );
            }
        );


    return youtubeApiPromise;
}


/* =========================================================
   CRIA PLAYER
========================================================= */

async function createYouTubePlayer(
    videoId = null,
    playlistId = null
) {

    await loadYouTubeAPI();


    if (
        !youtubeApiReady ||
        !window.YT ||
        !window.YT.Player
    ) {

        throw new Error(
            "YouTube IFrame API não está disponível."
        );
    }


    const container =
        elements.youtubeContainer;


    if (!container) {

        throw new Error(
            "Container do YouTube não encontrado."
        );
    }


    /*
     * Destrói o player anterior.
     */

    if (
        youtubePlayer
    ) {

        try {

            youtubePlayer.destroy();

        } catch (error) {

            console.warn(
                "[ApolloMusic] Destroy player:",
                error
            );
        }


        youtubePlayer =
            null;
    }


    container.innerHTML =
        "";


    const playerElement =
        document.createElement(
            "div"
        );


    playerElement.id =
        "youtube-player";


    container.appendChild(
        playerElement
    );


    activeYouTubePlaylist =
        playlistId || null;


    return new Promise(
        (resolve, reject) => {

            let resolved =
                false;


            const options = {

                width:
                    "100%",

                height:
                    "400",

                playerVars: {

                    autoplay:
                        1,

                    controls:
                        1,

                    rel:
                        0,

                    modestbranding:
                        1,

                    playsinline:
                        1,

                    enablejsapi:
                        1
                },


                events: {

                    onReady:
                        event => {

                            youtubePlayer =
                                event.target;


                            /*
                             * Playlist.
                             *
                             * O ID é passado
                             * diretamente para
                             * a IFrame API.
                             */

                            if (
                                playlistId
                            ) {

                                youtubePlayer.loadPlaylist({

                                    list:
                                        playlistId,

                                    listType:
                                        "playlist",

                                    index:
                                        0
                                });


                                setStatus(
                                    "Playlist carregada."
                                );
                            }


                            else if (
                                videoId
                            ) {

                                setStatus(
                                    "Vídeo carregado."
                                );
                            }


                            updateControls();

                            updateProgress();


                            if (!resolved) {

                                resolved =
                                    true;

                                resolve(
                                    youtubePlayer
                                );
                            }
                        },


                    onStateChange:
                        handlePlayerStateChange,


                    onError:
                        event => {

                            handleYouTubeError(
                                event
                            );


                            if (!resolved) {

                                resolved =
                                    true;

                                reject(
                                    new Error(
                                        "Erro ao inicializar o player do YouTube."
                                    )
                                );
                            }
                        }
                }
            };


            /*
             * Vídeo individual.
             */

            if (
                videoId &&
                !playlistId
            ) {

                options.videoId =
                    videoId;
            }


            youtubePlayer =
                new YT.Player(
                    "youtube-player",
                    options
                );
        }
    );
}


/* =========================================================
   ESTADO DO PLAYER
========================================================= */

function handlePlayerStateChange(
    event
) {

    if (!window.YT) {
        return;
    }


    switch (event.data) {

        case YT.PlayerState.PLAYING:

            startProgressTimer();

            updatePlayButton(
                true
            );

            setStatus(
                activeYouTubePlaylist
                    ? "Reproduzindo playlist."
                    : "Reproduzindo."
            );

            updateProgress();

            break;


        case YT.PlayerState.PAUSED:

            stopProgressTimer();

            updatePlayButton(
                false
            );

            setStatus(
                "Pausado."
            );

            break;


        case YT.PlayerState.ENDED:

            stopProgressTimer();

            handleTrackEnded();

            break;


        case YT.PlayerState.BUFFERING:

            setStatus(
                "Carregando..."
            );

            break;


        case YT.PlayerState.CUED:

            updateProgress();

            break;
    }


    updateControls();
}


/* =========================================================
   ERROS YOUTUBE
========================================================= */

function handleYouTubeError(
    event
) {

    console.error(
        "[ApolloMusic] YouTube error:",
        event.data
    );


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


    setStatus(
        errors[event.data] ||
        "Erro ao reproduzir o vídeo."
    );


    /*
     * Se estiver dentro de uma playlist,
     * não mexemos na queue principal.
     */

    if (
        activeYouTubePlaylist
    ) {

        return;
    }


    /*
     * Vídeo individual:
     * tenta próximo item da queue.
     */

    if (
        queue.length > 1
    ) {

        setTimeout(
            () => nextTrack(),
            900
        );
    }
}


/* =========================================================
   PROCESSAMENTO DA URL
========================================================= */

async function processYouTubeUrl(
    url
) {

    url =
        String(
            url || ""
        ).trim();


    if (!url) {

        setStatus(
            "Cole um link do YouTube para adicionar."
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


    /*
     * Primeiro tentamos reconhecer
     * a URL diretamente no client-side.
     */

    const parsed =
        parseYouTubeUrl(url);


    if (!parsed) {

        setStatus(
            "Esse não parece ser um link válido do YouTube."
        );

        return;
    }


    /*
     * Playlist:
     *
     * NÃO precisamos da API backend
     * para descobrir o playlistId.
     *
     * A IFrame API consegue receber
     * diretamente o ID.
     */

    if (
        parsed.playlistId
    ) {

        const item = {

            type:
                "playlist",

            url,

            videoId:
                parsed.videoId,

            playlistId:
                parsed.playlistId,

            title:
                "Playlist do YouTube",

            thumbnail:
                parsed.videoId
                    ? `https://i.ytimg.com/vi/${parsed.videoId}/hqdefault.jpg`
                    : ""
        };


        const wasEmpty =
            queue.length === 0;


        queue.push(
            item
        );


        renderQueue();


        if (
            wasEmpty
        ) {

            currentTrack =
                0;

            await playCurrentTrack();

        } else {

            setStatus(
                `Playlist adicionada à fila. ${queue.length} itens.`
            );
        }


        if (
            elements.youtubeSearch
        ) {

            elements.youtubeSearch.value =
                "";
        }


        return;
    }


    /*
     * Vídeo individual.
     *
     * Aqui ainda podemos consultar
     * o backend para obter metadados,
     * mas o player não depende disso.
     */

    setStatus(
        "Obtendo informações do vídeo..."
    );


    try {

        let metadata = {};


        try {

            metadata =
                await api(
                    "/api/youtube/process",
                    {
                        method:
                            "POST",

                        body:
                            JSON.stringify({
                                url
                            })
                    }
                );

        } catch (error) {

            console.warn(
                "[ApolloMusic] Metadados:",
                error
            );
        }


        const videoId =
            parsed.videoId ||
            metadata.videoId;


        if (!videoId) {

            setStatus(
                "Não foi possível identificar o vídeo."
            );

            return;
        }


        const item = {

            type:
                "video",

            url,

            videoId,

            playlistId:
                null,

            title:
                metadata.title ||
                "Vídeo do YouTube",

            thumbnail:
                metadata.thumbnail ||
                `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
        };


        const wasEmpty =
            queue.length === 0;


        queue.push(
            item
        );


        renderQueue();


        if (
            wasEmpty
        ) {

            currentTrack =
                0;

            await playCurrentTrack();

        } else {

            setStatus(
                `Adicionado à fila. ${queue.length} itens.`
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
            "[ApolloMusic] Processamento:",
            error
        );


        setStatus(
            error.message ||
            "Erro ao processar o vídeo."
        );
    }
}


/* =========================================================
   REPRODUZ FAIXA ATUAL
========================================================= */

async function playCurrentTrack() {

    if (
        changingTrack
    ) {

        return;
    }


    const track =
        queue[currentTrack];


    if (!track) {

        updateControls();

        return;
    }


    changingTrack =
        true;


    stopProgressTimer();

    resetProgress();

    updateQueueSelection();


    setStatus(
        track.playlistId
            ? "Carregando playlist..."
            : "Carregando vídeo..."
    );


    try {

        if (
            track.playlistId
        ) {

            await createYouTubePlayer(
                null,
                track.playlistId
            );

        } else {

            await createYouTubePlayer(
                track.videoId,
                null
            );
        }


        updateQueueSelection();

        updateControls();

    } catch (error) {

        console.error(
            "[ApolloMusic] Player:",
            error
        );


        setStatus(
            error.message ||
            "Não foi possível carregar o player."
        );

    } finally {

        changingTrack =
            false;
    }
}


/* =========================================================
   PLAY / PAUSE
========================================================= */

function togglePlay() {

    if (!youtubePlayer) {

        if (
            queue.length
        ) {

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
   PRÓXIMO
========================================================= */

function nextTrack() {

    if (
        !queue.length
    ) {

        return;
    }


    const current =
        queue[currentTrack];


    /*
     * Playlist do YouTube:
     *
     * O botão próximo controla
     * o próximo vídeo DA PLAYLIST.
     */

    if (
        current?.playlistId &&
        youtubePlayer &&
        typeof youtubePlayer.nextVideo ===
        "function"
    ) {

        youtubePlayer.nextVideo();

        return;
    }


    /*
     * Queue principal.
     */

    if (
        currentTrack <
        queue.length - 1
    ) {

        currentTrack++;

    } else {

        currentTrack =
            0;
    }


    playCurrentTrack();
}


/* =========================================================
   ANTERIOR
========================================================= */

function previousTrack() {

    if (
        !queue.length
    ) {

        return;
    }


    const current =
        queue[currentTrack];


    /*
     * Playlist do YouTube.
     */

    if (
        current?.playlistId &&
        youtubePlayer &&
        typeof youtubePlayer.previousVideo ===
        "function"
    ) {

        youtubePlayer.previousVideo();

        return;
    }


    /*
     * Queue principal.
     */

    if (
        currentTrack >
        0
    ) {

        currentTrack--;

    } else {

        currentTrack =
            queue.length - 1;
    }


    playCurrentTrack();
}


/* =========================================================
   FIM DA FAIXA
========================================================= */

function handleTrackEnded() {

    /*
     * Playlist:
     *
     * O próprio YouTube controla
     * a sequência interna.
     */

    if (
        activeYouTubePlaylist
    ) {

        return;
    }


    nextTrack();
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

    if (
        progressTimer
    ) {

        clearInterval(
            progressTimer
        );

        progressTimer =
            null;
    }
}


function resetProgress() {

    if (
        elements.progressBar
    ) {

        elements.progressBar.value =
            0;
    }


    if (
        elements.currentTime
    ) {

        elements.currentTime.textContent =
            "0:00";
    }


    if (
        elements.duration
    ) {

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


    let current =
        0;

    let duration =
        0;


    try {

        current =
            youtubePlayer.getCurrentTime() ||
            0;

        duration =
            youtubePlayer.getDuration() ||
            0;

    } catch {

        return;
    }


    if (
        elements.currentTime
    ) {

        elements.currentTime.textContent =
            formatTime(
                current
            );
    }


    if (
        elements.duration
    ) {

        elements.duration.textContent =
            formatTime(
                duration
            );
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
}


/* =========================================================
   SEEK
========================================================= */

function seekVideo(
    value
) {

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

function updatePlayButton(
    playing
) {

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


    if (
        elements.play
    ) {

        elements.play.disabled =
            !hasQueue;
    }


    if (
        elements.next
    ) {

        elements.next.disabled =
            !hasQueue;
    }


    if (
        elements.prev
    ) {

        elements.prev.disabled =
            !hasQueue;
    }


    if (
        elements.queueButton
    ) {

        elements.queueButton.disabled =
            !hasQueue;
    }


    if (!hasQueue) {

        updatePlayButton(
            false
        );
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


    container.innerHTML =
        "";


    queue.forEach(
        (track, index) => {

            const item =
                document.createElement(
                    "button"
                );


            item.type =
                "button";


            item.className =
                "queue-item";


            if (
                index ===
                currentTrack
            ) {

                item.classList.add(
                    "current"
                );
            }


            item.dataset.index =
                String(index);


            const image =
                document.createElement(
                    "img"
                );


            image.alt =
                "";


            image.src =
                track.thumbnail ||
                (
                    track.videoId
                        ? `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`
                        : ""
                );


            const info =
                document.createElement(
                    "div"
                );


            info.className =
                "queue-item-info";


            const title =
                document.createElement(
                    "div"
                );


            title.className =
                "queue-item-title";


            title.textContent =
                track.title ||
                (
                    track.playlistId
                        ? "Playlist do YouTube"
                        : "Vídeo do YouTube"
                );


            const subtitle =
                document.createElement(
                    "div"
                );


            subtitle.className =
                "queue-item-subtitle";


            subtitle.textContent =
                track.playlistId
                    ? "Playlist do YouTube"
                    : "YouTube";


            info.appendChild(
                title
            );

            info.appendChild(
                subtitle
            );


            item.appendChild(
                image
            );

            item.appendChild(
                info
            );


            item.addEventListener(
                "click",
                () => {

                    const index =
                        Number(
                            item.dataset.index
                        );


                    if (
                        !Number.isInteger(
                            index
                        )
                    ) {

                        return;
                    }


                    currentTrack =
                        index;


                    playCurrentTrack();
                }
            );


            container.appendChild(
                item
            );
        }
    );


    updateControls();
}


/* =========================================================
   ATUALIZA SELEÇÃO
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

    if (
        elements.searchYoutube
    ) {

        elements.searchYoutube.addEventListener(
            "click",
            () => {

                processYouTubeUrl(
                    elements.youtubeSearch?.value
                );
            }
        );
    }


    /*
     * ENTER
     */

    if (
        elements.youtubeSearch
    ) {

        elements.youtubeSearch.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter"
                ) {

                    event.preventDefault();

                    processYouTubeUrl(
                        elements.youtubeSearch.value
                    );
                }
            }
        );
    }


    /*
     * PLAY
     */

    if (
        elements.play
    ) {

        elements.play.addEventListener(
            "click",
            togglePlay
        );
    }


    /*
     * NEXT
     */

    if (
        elements.next
    ) {

        elements.next.addEventListener(
            "click",
            nextTrack
        );
    }


    /*
     * PREVIOUS
     */

    if (
        elements.prev
    ) {

        elements.prev.addEventListener(
            "click",
            previousTrack
        );
    }


    /*
     * QUEUE
     */

    if (
        elements.queueButton
    ) {

        elements.queueButton.addEventListener(
            "click",
            toggleQueue
        );
    }


    /*
     * FECHAR QUEUE
     */

    if (
        elements.closeQueue
    ) {

        elements.closeQueue.addEventListener(
            "click",
            closeQueue
        );
    }


    /*
     * PROGRESSO
     */

    if (
        elements.progressBar
    ) {

        elements.progressBar.addEventListener(
            "input",
            event => {

                seekVideo(
                    event.target.value
                );
            }
        );
    }
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
     * Backend.
     */

    checkAPI()
        .then(
            online => {

                if (online) {

                    setStatus(
                        "Cole um link do YouTube para começar."
                    );

                } else {

                    setStatus(
                        "API offline."
                    );
                }
            }
        )
        .catch(
            error => {

                console.warn(
                    "[ApolloMusic] Health:",
                    error
                );

                setStatus(
                    "API offline."
                );
            }
        );


    /*
     * YouTube IFrame API.
     */

    loadYouTubeAPI()
        .catch(
            error => {

                console.error(
                    "[ApolloMusic] YouTube API:",
                    error
                );

                setStatus(
                    "Não foi possível carregar o YouTube."
                );
            }
        );
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
            once:
                true
        }
    );

} else {

    init();

    showSplashScreen();
}