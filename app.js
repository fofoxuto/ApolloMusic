/* =========================================================
   APOLLOMUSIC
   YouTube Player
   Sem API Key
========================================================= */


/* =========================================================
   STATE
========================================================= */

let queue = [];
let currentTrack = 0;

let player = null;
let playerReady = false;
let youtubeApiReady = false;

let progressTimer = null;
let isDraggingProgress = false;


/* =========================================================
   ELEMENTS
========================================================= */

const youtubeInput =
    document.getElementById("youtubeSearch");

const addButton =
    document.getElementById("searchYoutube");

const youtubeContainer =
    document.getElementById("youtubeContainer");

const youtubeResults =
    document.getElementById("youtubeResults");

const nowPlayingCover =
    document.getElementById("nowPlayingCover");

const nowPlayingTitle =
    document.getElementById("nowPlayingTitle");

const nowPlayingArtist =
    document.getElementById("nowPlayingArtist");

const playButton =
    document.getElementById("playButton");

const coverPlayButton =
    document.getElementById("coverPlayButton");

const prevButton =
    document.getElementById("prevButton");

const nextButton =
    document.getElementById("nextButton");

const queueButton =
    document.getElementById("queueButton");

const closeQueue =
    document.getElementById("closeQueue");

const queuePanel =
    document.getElementById("queuePanel");

const queueList =
    document.getElementById("queueList");

const progressBar =
    document.getElementById("progressBar");

const currentTimeElement =
    document.getElementById("currentTime");

const durationElement =
    document.getElementById("duration");

const statusElement =
    document.getElementById("status");

const splashScreen =
    document.getElementById("splash-screen");

const splashProgress =
    document.getElementById("splash-progress");

const splashStatus =
    document.getElementById("splash-status");


/* =========================================================
   SAFE HELPERS
========================================================= */

function setStatus(text) {

    if (statusElement) {
        statusElement.textContent = text;
    }

}


function updateSplash(progress, text) {

    if (splashProgress) {
        splashProgress.style.width =
            `${progress}%`;
    }

    if (splashStatus) {
        splashStatus.textContent =
            text;
    }

}


function hideSplash() {

    if (!splashScreen) {
        return;
    }

    splashScreen.classList.add("hidden");

}


/* =========================================================
   SPLASH
========================================================= */

updateSplash(
    15,
    "Carregando interface..."
);


setTimeout(() => {

    updateSplash(
        40,
        "Carregando YouTube..."
    );

}, 250);


setTimeout(() => {

    if (!youtubeApiReady) {

        updateSplash(
            70,
            "Preparando player..."
        );

    }

}, 800);


/* =========================================================
   YOUTUBE IFRAME API
========================================================= */

window.onYouTubeIframeAPIReady =
    function () {

        youtubeApiReady = true;

        updateSplash(
            90,
            "Criando player..."
        );

        createYouTubePlayer();

    };


function createYouTubePlayer() {

    if (
        typeof YT === "undefined" ||
        !YT.Player
    ) {

        setStatus(
            "YouTube ainda carregando..."
        );

        return;

    }


    if (!youtubeContainer) {
        return;
    }


    player =
        new YT.Player(
            "youtubeContainer",
            {

                width: "1",
                height: "1",

                videoId: "",

                playerVars: {

                    controls: 0,

                    modestbranding: 1,

                    playsinline: 1,

                    autoplay: 0,

                    rel: 0,

                    fs: 0

                },

                events: {

                    onReady:
                        onPlayerReady,

                    onStateChange:
                        onPlayerStateChange,

                    onError:
                        onPlayerError

                }

            }
        );

}


/* =========================================================
   PLAYER READY
========================================================= */

function onPlayerReady() {

    playerReady = true;

    updateSplash(
        100,
        "Player pronto!"
    );


    setStatus(
        queue.length
            ? "Pronto para reproduzir."
            : "Aguardando link."
    );


    startProgressTimer();


    if (queue.length > 0) {

        const track =
            queue[currentTrack];

        if (track) {

            player.cueVideoById(
                track.id
            );

        }

    }


    setTimeout(
        hideSplash,
        350
    );

}


/* =========================================================
   SPLASH FALLBACK
========================================================= */

setTimeout(() => {

    if (!playerReady) {

        updateSplash(
            100,
            "Interface pronta."
        );


        setTimeout(
            hideSplash,
            300
        );


        setStatus(
            "YouTube ainda não está disponível."
        );

    }

}, 8000);


/* =========================================================
   YOUTUBE URL
========================================================= */

function extractVideoId(value) {

    if (!value) {
        return null;
    }


    const input =
        value.trim();


    /*
     * ID direto
     */

    if (
        /^[a-zA-Z0-9_-]{11}$/.test(input)
    ) {

        return input;

    }


    let url;


    try {

        url =
            new URL(
                input.startsWith("http")
                    ? input
                    : `https://${input}`
            );

    } catch {

        return null;

    }


    const hostname =
        url.hostname
            .toLowerCase()
            .replace(/^www\./, "");


    /*
     * youtu.be
     */

    if (
        hostname === "youtu.be"
    ) {

        const id =
            url.pathname
                .split("/")
                .filter(Boolean)[0];


        if (
            id &&
            /^[a-zA-Z0-9_-]{11}$/.test(id)
        ) {

            return id;

        }

    }


    /*
     * youtube.com
     */

    if (
        hostname === "youtube.com" ||
        hostname === "m.youtube.com"
    ) {

        /*
         * watch?v=
         */

        if (
            url.pathname === "/watch"
        ) {

            const id =
                url.searchParams.get("v");


            if (
                id &&
                /^[a-zA-Z0-9_-]{11}$/.test(id)
            ) {

                return id;

            }

        }


        /*
         * shorts
         */

        if (
            url.pathname.startsWith("/shorts/")
        ) {

            const id =
                url.pathname
                    .split("/")[2];


            if (
                id &&
                /^[a-zA-Z0-9_-]{11}$/.test(id)
            ) {

                return id;

            }

        }


        /*
         * embed
         */

        if (
            url.pathname.startsWith("/embed/")
        ) {

            const id =
                url.pathname
                    .split("/")[2];


            if (
                id &&
                /^[a-zA-Z0-9_-]{11}$/.test(id)
            ) {

                return id;

            }

        }


        /*
         * live
         */

        if (
            url.pathname.startsWith("/live/")
        ) {

            const id =
                url.pathname
                    .split("/")[2];


            if (
                id &&
                /^[a-zA-Z0-9_-]{11}$/.test(id)
            ) {

                return id;

            }

        }

    }


    return null;

}


/* =========================================================
   PLAYLIST DETECTION
========================================================= */

function extractPlaylistId(value) {

    if (!value) {
        return null;
    }


    let url;


    try {

        url =
            new URL(
                value.startsWith("http")
                    ? value
                    : `https://${value}`
            );

    } catch {

        return null;

    }


    const hostname =
        url.hostname
            .toLowerCase()
            .replace(/^www\./, "");


    if (
        hostname !== "youtube.com" &&
        hostname !== "m.youtube.com"
    ) {

        return null;

    }


    const playlistId =
        url.searchParams.get("list");


    if (!playlistId) {
        return null;
    }


    return playlistId;

}


/* =========================================================
   THUMBNAILS
========================================================= */

function getThumbnail(videoId) {

    return (
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    );

}


function getHighQualityThumbnail(videoId) {

    return (
        `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
    );

}


/* =========================================================
   METADATA
========================================================= */

async function getVideoMetadata(videoId) {

    const fallback = {

        title:
            "Vídeo do YouTube",

        artist:
            "YouTube",

        thumbnail:
            getThumbnail(videoId)

    };


    try {

        const response =
            await fetch(
                `https://www.youtube.com/oembed?url=${encodeURIComponent(
                    `https://www.youtube.com/watch?v=${videoId}`
                )}&format=json`
            );


        if (!response.ok) {
            throw new Error(
                "oEmbed indisponível"
            );
        }


        const data =
            await response.json();


        return {

            title:
                data.title ||
                fallback.title,

            artist:
                data.author_name ||
                fallback.artist,

            thumbnail:
                data.thumbnail_url ||
                fallback.thumbnail

        };

    } catch (error) {

        console.warn(
            "Metadata não disponível:",
            error
        );


        return fallback;

    }

}


/* =========================================================
   ADD VIDEO
========================================================= */

async function addVideo(videoId) {

    if (
        queue.some(
            track =>
                track.id === videoId
        )
    ) {

        setStatus(
            "Essa música já está na fila."
        );

        return;

    }


    setStatus(
        "Obtendo informações..."
    );


    const metadata =
        await getVideoMetadata(
            videoId
        );


    const track = {

        id:
            videoId,

        title:
            metadata.title,

        artist:
            metadata.artist,

        /*
         * A thumbnail existe somente
         * para a música atual.
         */

        thumbnail:
            metadata.thumbnail ||
            getThumbnail(videoId)

    };


    queue.push(track);


    renderQueue();


    if (youtubeInput) {
        youtubeInput.value = "";
    }


    if (
        queue.length === 1
    ) {

        currentTrack = 0;

        loadTrack(
            0,
            true
        );

    } else {

        setStatus(
            "Adicionada à fila."
        );

    }

}


/* =========================================================
   ADD TRACK
========================================================= */

async function addTrack(value) {

    if (!value || !value.trim()) {

        setStatus(
            "Cole um link do YouTube."
        );

        return;

    }


    const videoId =
        extractVideoId(value);


    /*
     * Primeiro tenta vídeo.
     */

    if (videoId) {

        await addVideo(
            videoId
        );

        return;

    }


    /*
     * Depois verifica playlist.
     */

    const playlistId =
        extractPlaylistId(value);


    if (playlistId) {

        setStatus(
            "Playlist detectada."
        );


        /*
         * O iframe API não fornece os IDs
         * da playlist para o JavaScript da página.
         *
         * Portanto, sem API Key/backend,
         * não conseguimos transformar a playlist
         * inteira em uma queue automaticamente.
         */

        showPlaylistMessage(
            playlistId
        );

        return;

    }


    setStatus(
        "Link do YouTube inválido."
    );

}


/* =========================================================
   PLAYLIST MESSAGE
========================================================= */

function showPlaylistMessage(
    playlistId
) {

    console.log(
        "Playlist detectada:",
        playlistId
    );


    setStatus(
        "Playlist detectada, mas é necessário extrair os vídeos."
    );

}


/* =========================================================
   LOAD TRACK
========================================================= */

function loadTrack(
    index,
    autoplay = false
) {

    if (
        index < 0 ||
        index >= queue.length
    ) {

        return;

    }


    currentTrack =
        index;


    const track =
        queue[index];


    if (!track) {
        return;
    }


    /*
     * Atualiza informações.
     */

    if (nowPlayingTitle) {

        nowPlayingTitle.textContent =
            track.title;

    }


    if (nowPlayingArtist) {

        nowPlayingArtist.textContent =
            track.artist;

    }


    /*
     * Thumbnail SOMENTE da música atual.
     */

    if (nowPlayingCover) {

        nowPlayingCover.classList.remove(
            "loaded"
        );


        nowPlayingCover.onload =
            function () {

                this.classList.add(
                    "loaded"
                );

            };


        nowPlayingCover.onerror =
            function () {

                const fallback =
                    getThumbnail(track.id);


                if (
                    this.src !== fallback
                ) {

                    this.src =
                        fallback;

                }

            };


        nowPlayingCover.src =
            track.thumbnail ||
            getThumbnail(track.id);

    }


    renderQueue();


    if (progressBar) {
        progressBar.value = 0;
    }


    if (currentTimeElement) {

        currentTimeElement.textContent =
            "0:00";

    }


    if (durationElement) {

        durationElement.textContent =
            "0:00";

    }


    setStatus(
        "Carregando música..."
    );


    if (
        !player ||
        !playerReady
    ) {

        setStatus(
            "Player carregando..."
        );

        return;

    }


    try {

        if (autoplay) {

            player.loadVideoById(
                track.id
            );

        } else {

            player.cueVideoById(
                track.id
            );

        }

    } catch (error) {

        console.error(
            "Erro ao carregar vídeo:",
            error
        );


        setStatus(
            "Erro ao carregar música."
        );

    }

}


/* =========================================================
   PLAY / PAUSE
========================================================= */

function togglePlay() {

    if (
        !player ||
        !playerReady
    ) {

        setStatus(
            "Player ainda carregando..."
        );

        return;

    }


    if (
        queue.length === 0
    ) {

        setStatus(
            "Adicione uma música primeiro."
        );

        return;

    }


    const state =
        player.getPlayerState();


    if (
        state ===
        YT.PlayerState.PLAYING
    ) {

        player.pauseVideo();

    } else {

        player.playVideo();

    }

}


/* =========================================================
   PLAY BUTTONS
========================================================= */

function updatePlayButtons(
    playing
) {

    const symbol =
        playing
            ? "❚❚"
            : "▶";


    if (playButton) {

        playButton.textContent =
            symbol;

        playButton.setAttribute(
            "aria-label",
            playing
                ? "Pausar"
                : "Reproduzir"
        );

    }


    if (coverPlayButton) {

        coverPlayButton.textContent =
            symbol;

        coverPlayButton.setAttribute(
            "aria-label",
            playing
                ? "Pausar"
                : "Reproduzir"
        );

        coverPlayButton.classList.toggle(
            "playing",
            playing
        );

    }

}


/* =========================================================
   TIME
========================================================= */

function formatTime(seconds) {

    if (
        !Number.isFinite(seconds) ||
        seconds < 0
    ) {

        return "0:00";

    }


    seconds =
        Math.floor(seconds);


    const minutes =
        Math.floor(
            seconds / 60
        );


    const remaining =
        seconds % 60;


    return (
        `${minutes}:${String(remaining).padStart(2, "0")}`
    );

}


/* =========================================================
   PROGRESS
========================================================= */

function updateProgress() {

    if (
        !player ||
        !playerReady ||
        isDraggingProgress
    ) {

        return;

    }


    try {

        const current =
            player.getCurrentTime();


        const duration =
            player.getDuration();


        if (
            !Number.isFinite(duration) ||
            duration <= 0
        ) {

            return;

        }


        const percentage =
            Math.min(
                100,
                Math.max(
                    0,
                    (current / duration) * 100
                )
            );


        if (progressBar) {

            progressBar.value =
                percentage;

        }


        if (currentTimeElement) {

            currentTimeElement.textContent =
                formatTime(current);

        }


        if (durationElement) {

            durationElement.textContent =
                formatTime(duration);

        }

    } catch {

        /* Player ainda inicializando. */

    }

}


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


/* =========================================================
   SEEK
========================================================= */

if (progressBar) {

    progressBar.addEventListener(
        "input",
        () => {

            isDraggingProgress =
                true;


            if (
                !player ||
                !playerReady
            ) {

                return;

            }


            const duration =
                player.getDuration();


            if (!duration) {
                return;
            }


            const time =
                (
                    Number(
                        progressBar.value
                    ) / 100
                ) * duration;


            if (currentTimeElement) {

                currentTimeElement.textContent =
                    formatTime(time);

            }

        }
    );


    progressBar.addEventListener(
        "change",
        () => {

            if (
                player &&
                playerReady
            ) {

                const duration =
                    player.getDuration();


                if (duration) {

                    const time =
                        (
                            Number(
                                progressBar.value
                            ) / 100
                        ) * duration;


                    player.seekTo(
                        time,
                        true
                    );

                }

            }


            isDraggingProgress =
                false;

        }
    );


    progressBar.addEventListener(
        "blur",
        () => {

            isDraggingProgress =
                false;

        }
    );

}


/* =========================================================
   QUEUE
========================================================= */

function renderQueue() {

    if (!queueList) {
        return;
    }


    queueList.innerHTML = "";


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
                index === currentTrack
            ) {

                item.classList.add(
                    "current"
                );

            }


            /*
             * NÃO existe imagem aqui.
             *
             * A queue mostra apenas:
             * título + artista.
             */

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
                track.title;


            const artist =
                document.createElement(
                    "div"
                );


            artist.className =
                "queue-item-subtitle";


            artist.textContent =
                track.artist;


            info.appendChild(
                title
            );


            info.appendChild(
                artist
            );


            item.appendChild(
                info
            );


            item.addEventListener(
                "click",
                () => {

                    loadTrack(
                        index,
                        true
                    );

                }
            );


            queueList.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   NEXT
========================================================= */

function nextTrack() {

    if (
        queue.length === 0
    ) {

        return;

    }


    const next =
        currentTrack + 1;


    if (
        next >= queue.length
    ) {

        if (player) {

            player.pauseVideo();

        }


        updatePlayButtons(
            false
        );


        setStatus(
            "Fila finalizada."
        );


        return;

    }


    loadTrack(
        next,
        true
    );

}


/* =========================================================
   PREVIOUS
========================================================= */

function previousTrack() {

    if (
        queue.length === 0
    ) {

        return;

    }


    if (
        player &&
        playerReady &&
        player.getCurrentTime() > 3
    ) {

        player.seekTo(
            0,
            true
        );

        return;

    }


    const previous =
        currentTrack - 1;


    if (
        previous < 0
    ) {

        if (
            player &&
            playerReady
        ) {

            player.seekTo(
                0,
                true
            );

        }

        return;

    }


    loadTrack(
        previous,
        true
    );

}


/* =========================================================
   PLAYER STATE
========================================================= */

function onPlayerStateChange(
    event
) {

    if (
        event.data ===
        YT.PlayerState.PLAYING
    ) {

        updatePlayButtons(
            true
        );


        setStatus(
            "Reproduzindo."
        );


        startProgressTimer();

    }


    else if (
        event.data ===
        YT.PlayerState.PAUSED
    ) {

        updatePlayButtons(
            false
        );


        setStatus(
            "Pausado."
        );

    }


    else if (
        event.data ===
        YT.PlayerState.ENDED
    ) {

        updatePlayButtons(
            false
        );


        nextTrack();

    }


    else if (
        event.data ===
        YT.PlayerState.BUFFERING
    ) {

        setStatus(
            "Carregando..."
        );

    }


    updateProgress();

}


/* =========================================================
   PLAYER ERROR
========================================================= */

function onPlayerError(
    event
) {

    console.error(
        "YouTube Player Error:",
        event.data
    );


    const messages = {

        2:
            "ID do vídeo inválido.",

        5:
            "Erro no player do YouTube.",

        100:
            "Vídeo não encontrado.",

        101:
            "Este vídeo não permite reprodução incorporada.",

        150:
            "Este vídeo não permite reprodução incorporada.",

        153:
            "O YouTube bloqueou a reprodução incorporada."

    };


    setStatus(
        messages[event.data] ||
        "Não foi possível reproduzir este vídeo."
    );


    updatePlayButtons(
        false
    );

}


/* =========================================================
   EVENTS
========================================================= */

if (addButton) {

    addButton.addEventListener(
        "click",
        () => {

            addTrack(
                youtubeInput
                    ? youtubeInput.value
                    : ""
            );

        }
    );

}


if (youtubeInput) {

    youtubeInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter"
            ) {

                event.preventDefault();


                addTrack(
                    youtubeInput.value
                );

            }

        }
    );

}


if (playButton) {

    playButton.addEventListener(
        "click",
        togglePlay
    );

}


if (coverPlayButton) {

    coverPlayButton.addEventListener(
        "click",
        togglePlay
    );

}


if (nextButton) {

    nextButton.addEventListener(
        "click",
        nextTrack
    );

}


if (prevButton) {

    prevButton.addEventListener(
        "click",
        previousTrack
    );

}


if (queueButton && queuePanel) {

    queueButton.addEventListener(
        "click",
        () => {

            const visible =
                queuePanel.classList.toggle(
                    "visible"
                );


            queuePanel.setAttribute(
                "aria-hidden",
                String(!visible)
            );

        }
    );

}


if (closeQueue && queuePanel) {

    closeQueue.addEventListener(
        "click",
        () => {

            queuePanel.classList.remove(
                "visible"
            );


            queuePanel.setAttribute(
                "aria-hidden",
                "true"
            );

        }
    );

}


/* =========================================================
   INITIAL
========================================================= */

updatePlayButtons(
    false
);


renderQueue();


setStatus(
    "Aguardando link."
);


/* =========================================================
   DEBUG
========================================================= */

console.log(
    "ApolloMusic iniciado."
);