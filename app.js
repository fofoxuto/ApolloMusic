/* =========================================================
   APOLLOMUSIC - YOUTUBE VERSION
   YouTube Player — Vanilla JS
   Material 3 Expressive Controls

   ARQUITETURA:

   YouTube URL
        ↓
   parseYouTubeUrl()
        ↓
   playlistItems / videoId
        ↓
   queue[]
        ↓
   currentTrack
        ↓
   YouTube IFrame API
        ↓
   música 🎵
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
         * YouTube normal
         * + YouTube Music
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
                parsed.pathname.startsWith(
                    "/shorts/"
                )
            ) {

                videoId =
                    parsed.pathname
                        .split("/")[2] ||
                    null;
            }


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
         * youtu.be
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
         * Playlist pura:
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
         * Limpa IDs.
         */

        if (videoId) {

            videoId =
                videoId
                    .replace(
                        /[^a-zA-Z0-9_-]/g,
                        ""
                    )
                    .slice(0, 20);
        }


        if (playlistId) {

            playlistId =
                playlistId
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
   NORMALIZA ITEM DA PLAYLIST
========================================================= */

/*
 * O backend pode retornar diferentes nomes.
 *
 * Aceitamos:
 *
 * item.id
 * item.videoId
 * item.video_id
 *
 * item.title
 * item.name
 *
 * item.artist
 * item.author
 * item.channel
 *
 * item.album
 *
 * item.cover
 * item.thumbnail
 */

function normalizePlaylistItem(
    item
) {

    if (!item) {

        return null;
    }


    const id =
        item.id ||
        item.videoId ||
        item.video_id ||
        null;


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
            `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`
    };
}


/* =========================================================
   MONTA QUEUE DA PLAYLIST
========================================================= */

function buildQueueFromPlaylist(
    playlistItems
) {

    if (
        !Array.isArray(
            playlistItems
        )
    ) {

        return [];
    }


    return playlistItems
        .map(
            normalizePlaylistItem
        )
        .filter(Boolean);
}


/* =========================================================
   REMOVE DUPLICADOS DA PLAYLIST
========================================================= */

function removeDuplicateTracks(
    tracks
) {

    if (
        !Array.isArray(tracks)
    ) {

        return [];
    }


    const seen =
        new Set();


    return tracks.filter(
        track => {

            if (
                !track?.id
            ) {

                return false;
            }


            if (
                seen.has(track.id)
            ) {

                return false;
            }


            seen.add(
                track.id
            );


            return true;
        }
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

async function createYouTubePlayer() {

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
     * Destrói player antigo.
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


            youtubePlayer =
                new YT.Player(
                    "youtube-player",
                    options
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


    return await createYouTubePlayer();
}


/* =========================================================
   CARREGA VÍDEO DA QUEUE
========================================================= */

async function loadQueueTrack() {

    const track =
        queue[currentTrack];


    if (!track) {

        return;
    }


    const player =
        await ensureYouTubePlayer();


    if (
        typeof player.loadVideoById !==
        "function"
    ) {

        throw new Error(
            "YouTube Player ainda não está pronto."
        );
    }


    updateQueueSelection();


    setStatus(
        `Carregando: ${track.title}`
    );


    player.loadVideoById(
        track.id
    );


    updateNowPlaying(
        track
    );
}


/* =========================================================
   NOW PLAYING
========================================================= */

function updateNowPlaying(
    track
) {

    if (!track) {

        return;
    }


    const title =
        document.getElementById(
            "nowPlayingTitle"
        );


    const artist =
        document.getElementById(
            "nowPlayingArtist"
        );


    const cover =
        document.getElementById(
            "nowPlayingCover"
        );


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
            track.cover;
    }
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
                `Reproduzindo: ${
                    queue[currentTrack]?.title ||
                    "YouTube"
                }`
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
     * Se o vídeo atual estiver com erro,
     * tenta avançar para o próximo item
     * da queue do ApolloMusic.
     */

    if (
        queue.length > 1
    ) {

        setTimeout(
            () => {

                nextTrack();

            },
            900
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
        "Reconhecendo playlist..."
    );


    let response =
        null;


    /*
     * =====================================================
     * 1. TENTA O BACKEND
     * =====================================================
     */

    try {

        response =
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


        console.log(
            "[ApolloMusic] Resposta da playlist:",
            response
        );

    } catch (error) {

        console.warn(
            "[ApolloMusic] Playlist metadata:",
            error
        );
    }


    /*
     * =====================================================
     * 2. EXTRAI ITENS DO BACKEND
     * =====================================================
     */

    const playlistItems =
        response?.playlistItems ||
        response?.items ||
        response?.tracks ||
        response?.videos ||
        [];


    let playlistQueue =
        buildQueueFromPlaylist(
            playlistItems
        );


    /*
     * Remove IDs duplicados.
     */

    playlistQueue =
        removeDuplicateTracks(
            playlistQueue
        );


    /*
     * =====================================================
     * 3. FALLBACK PARA YOUTUBE IFRAME API
     * =====================================================
     *
     * Caso o backend não tenha retornado
     * os vídeos, pegamos os IDs diretamente
     * da playlist através do player.
     */

    if (
        playlistQueue.length === 0
    ) {

        setStatus(
            "Obtendo músicas da playlist..."
        );


        const player =
            await ensureYouTubePlayer();


        if (
            !player ||
            typeof player.cuePlaylist !==
            "function"
        ) {

            throw new Error(
                "O player do YouTube não consegue carregar playlists."
            );
        }


        /*
         * Para evitar que uma playlist anterior
         * interfira na obtenção dos IDs.
         */

        try {

            player.stopVideo();

        } catch {
            /* ignora */
        }


        /*
         * Carrega a playlist no player.
         *
         * IMPORTANTE:
         * Não usamos a playlist interna do YouTube
         * para tocar as músicas.
         *
         * Usamos somente para obter os IDs.
         */

        player.cuePlaylist({

            list:
                parsed.playlistId,

            listType:
                "playlist",

            index:
                0
        });


        /*
         * Espera o YouTube preencher
         * getPlaylist().
         */

        const ids =
            await waitForYouTubePlaylist(
                player,
                10000
            );


        if (
            !Array.isArray(ids) ||
            ids.length === 0
        ) {

            throw new Error(
                "O YouTube não retornou os vídeos dessa playlist."
            );
        }


        /*
         * Transforma os IDs em itens
         * da queue do ApolloMusic.
         */

        playlistQueue =
            ids
                .filter(Boolean)
                .map(
                    id => {

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
                                `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`
                        };
                    }
                )
                .filter(Boolean);


        playlistQueue =
            removeDuplicateTracks(
                playlistQueue
            );
    }


    /*
     * =====================================================
     * 4. VALIDAÇÃO
     * =====================================================
     */

    if (
        playlistQueue.length === 0
    ) {

        throw new Error(
            "Não foi possível encontrar músicas nessa playlist."
        );
    }


    /*
     * =====================================================
     * 5. ADICIONA À QUEUE
     * =====================================================
     */

    const wasEmpty =
        queue.length === 0;


    if (wasEmpty) {

        queue =
            playlistQueue;

        currentTrack =
            0;

    } else {

        queue.push(
            ...playlistQueue
        );
    }


    /*
     * Guarda a playlist ativa.
     */

    activeYouTubePlaylist =
        parsed.playlistId;


    /*
     * Atualiza interface.
     */

    renderQueue();


    /*
     * Mensagem de status.
     */

    setStatus(
        wasEmpty
            ? `${queue.length} músicas carregadas.`
            : `${playlistQueue.length} músicas adicionadas à fila.`
    );


    /*
     * =====================================================
     * 6. COMEÇA A PRIMEIRA MÚSICA
     * =====================================================
     */

    if (wasEmpty) {

        await playCurrentTrack();
    }
}


/* =========================================================
   ESPERA PLAYLIST DO YOUTUBE
========================================================= */

function waitForYouTubePlaylist(
    player,
    timeout = 10000
) {

    return new Promise(resolve => {

        const started =
            Date.now();


        const check = () => {

            try {

                const playlist =
                    typeof player.getPlaylist ===
                    "function"
                        ? player.getPlaylist()
                        : [];


                if (
                    Array.isArray(playlist) &&
                    playlist.length > 0
                ) {

                    console.log(
                        "[ApolloMusic] Playlist do YouTube:",
                        playlist.length,
                        "vídeo(s)"
                    );


                    resolve(
                        playlist
                    );


                    return;
                }

            } catch (error) {

                console.warn(
                    "[ApolloMusic] getPlaylist:",
                    error
                );
            }


            /*
             * Timeout.
             */

            if (
                Date.now() - started >=
                timeout
            ) {

                console.warn(
                    "[ApolloMusic] Timeout ao obter playlist."
                );


                resolve(
                    []
                );


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


    const parsed =
        parseYouTubeUrl(url);


    if (!parsed) {

        setStatus(
            "Esse não parece ser um link válido do YouTube."
        );

        return;
    }


    /*
     * =====================================================
     * PLAYLIST
     * =====================================================
     */

    if (
        parsed.playlistId
    ) {

        try {

            await processYouTubePlaylist(
                url,
                parsed
            );

        } catch (error) {

            console.error(
                "[ApolloMusic] Playlist:",
                error
            );


            setStatus(
                error.message ||
                "Não foi possível carregar a playlist."
            );


            return;
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
     * =====================================================
     * VÍDEO INDIVIDUAL
     * =====================================================
     */

    const videoId =
        parsed.videoId;


    if (!videoId) {

        setStatus(
            "Não foi possível identificar o vídeo."
        );

        return;
    }


    setStatus(
        "Obtendo informações do vídeo..."
    );


    let metadata =
        {};


    /*
     * Metadados são opcionais.
     *
     * O player continua funcionando
     * mesmo se a API estiver offline.
     */

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


    /*
     * =====================================================
     * VÍDEO → QUEUE
     * =====================================================
     */

    const item = {

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
            `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,

        url
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
            `Adicionado à fila. ${queue.length} músicas.`
        );
    }


    if (
        elements.youtubeSearch
    ) {

        elements.youtubeSearch.value =
            "";
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


    try {

        /*
         * Garante que existe
         * um player.
         */

        await ensureYouTubePlayer();


        if (
            !youtubePlayer ||
            typeof youtubePlayer.loadVideoById !==
            "function"
        ) {

            throw new Error(
                "YouTube Player ainda não está pronto."
            );
        }


        /*
         * =================================================
         * IMPORTANTE:
         *
         * A queue do ApolloMusic é a fonte
         * principal da reprodução.
         *
         * Não usamos:
         *
         * player.nextVideo()
         * player.previousVideo()
         *
         * nem deixamos o YouTube controlar
         * a ordem.
         *
         * Apenas mandamos o ID atual.
         * =================================================
         */

        youtubePlayer.loadVideoById(
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
            "Não foi possível carregar a música."
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
                "Adicione uma música primeiro."
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
   PRÓXIMA
========================================================= */

function nextTrack() {

    if (
        !queue.length
    ) {

        return;
    }


    /*
     * Para evitar chamadas duplicadas
     * enquanto uma troca ainda está ocorrendo.
     */

    if (
        changingTrack
    ) {

        return;
    }


    currentTrack++;


    if (
        currentTrack >=
        queue.length
    ) {

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


    if (
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
   FIM DA FAIXA
========================================================= */

function handleTrackEnded() {

    /*
     * O YouTube terminou a música.
     *
     * Agora quem decide a próxima
     * música é exclusivamente a queue
     * do ApolloMusic.
     */

    if (
        !queue.length
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


            /*
             * =================================================
             * CAPA
             * =================================================
             */

            const image =
                document.createElement(
                    "img"
                );


            image.alt =
                "";


            image.loading =
                "lazy";


            image.src =
                track.cover ||
                `https://i.ytimg.com/vi/${track.id}/hqdefault.jpg`;


            /*
             * =================================================
             * INFORMAÇÕES
             * =================================================
             */

            const info =
                document.createElement(
                    "div"
                );


            info.className =
                "queue-item-info";


            /*
             * TÍTULO
             */

            const title =
                document.createElement(
                    "div"
                );


            title.className =
                "queue-item-title";


            title.textContent =
                track.title ||
                "Vídeo do YouTube";


            /*
             * SUBTÍTULO
             */

            const subtitle =
                document.createElement(
                    "div"
                );


            subtitle.className =
                "queue-item-subtitle";


            subtitle.textContent =
                track.artist ||
                "YouTube";


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


            /*
             * =================================================
             * CLICAR NA MÚSICA
             * =================================================
             */

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


            container.appendChild(
                item
            );
        }
    );


    updateQueueSelection();

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
     * Backend
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
     * YouTube IFrame API
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