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
   SPLASH
========================================================= */

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

    setTimeout(() => {

        splashScreen.classList.add("hidden");

    }, 500);
}


updateSplash(
    20,
    "Carregando interface..."
);


setTimeout(() => {

    updateSplash(
        55,
        "Preparando player..."
    );

}, 350);


setTimeout(() => {

    updateSplash(
        85,
        "Quase pronto..."
    );

}, 700);


/* =========================================================
   STATUS
========================================================= */

function setStatus(text) {

    if (statusElement) {
        statusElement.textContent = text;
    }
}


/* =========================================================
   YOUTUBE URL
========================================================= */

function extractVideoId(url) {

    if (!url) {
        return null;
    }


    url = url.trim();


    /*
     * youtu.be/VIDEO
     */

    const shortMatch =
        url.match(
            /youtu\.be\/([a-zA-Z0-9_-]{11})/
        );

    if (shortMatch) {
        return shortMatch[1];
    }


    /*
     * youtube.com/watch?v=VIDEO
     */

    const watchMatch =
        url.match(
            /youtube\.com\/watch\?[^#]*v=([a-zA-Z0-9_-]{11})/
        );

    if (watchMatch) {
        return watchMatch[1];
    }


    /*
     * youtube.com/shorts/VIDEO
     */

    const shortsMatch =
        url.match(
            /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
        );

    if (shortsMatch) {
        return shortsMatch[1];
    }


    /*
     * youtube.com/embed/VIDEO
     */

    const embedMatch =
        url.match(
            /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
        );

    if (embedMatch) {
        return embedMatch[1];
    }


    /*
     * Caso o usuário cole somente o ID
     */

    if (
        /^[a-zA-Z0-9_-]{11}$/.test(url)
    ) {

        return url;

    }


    return null;
}


/* =========================================================
   THUMBNAIL
========================================================= */

function getThumbnail(videoId) {

    return (
        `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
    );
}


function getFallbackThumbnail(videoId) {

    return (
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    );
}


/* =========================================================
   TITLE / METADATA
========================================================= */

async function getVideoMetadata(videoId) {

    const fallback = {

        title: "Vídeo do YouTube",

        artist: "YouTube",

        thumbnail:
            getThumbnail(videoId)

    };


    try {

        const response =
            await fetch(
                `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
            );


        if (!response.ok) {
            throw new Error(
                "Falha ao consultar oEmbed"
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
            "Não foi possível obter metadata:",
            error
        );


        return fallback;
    }
}


/* =========================================================
   ADD TRACK
========================================================= */

async function addTrack(url) {

    const videoId =
        extractVideoId(url);


    if (!videoId) {

        setStatus(
            "Link do YouTube inválido."
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

        id: videoId,

        title:
            metadata.title,

        artist:
            metadata.artist,

        thumbnail:
            metadata.thumbnail,

        fallbackThumbnail:
            getFallbackThumbnail(videoId)

    };


    queue.push(track);


    renderQueue();


    youtubeInput.value = "";


    /*
     * Se é a primeira música,
     * inicia automaticamente.
     */

    if (queue.length === 1) {

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
   LOAD TRACK
========================================================= */

async function loadTrack(
    index,
    autoplay = false
) {

    if (
        index < 0 ||
        index >= queue.length
    ) {

        return;

    }


    currentTrack = index;


    const track =
        queue[index];


    /*
     * Atualiza interface IMEDIATAMENTE.
     * A capa não depende do player.
     */

    nowPlayingTitle.textContent =
        track.title;

    nowPlayingArtist.textContent =
        track.artist;


    nowPlayingCover.src =
        track.thumbnail;


    nowPlayingCover.onerror =
        function () {

            if (
                this.src !==
                track.fallbackThumbnail
            ) {

                this.src =
                    track.fallbackThumbnail;

            }

        };


    renderQueue();


    setStatus(
        "Carregando música..."
    );


    if (!playerReady) {

        setStatus(
            "Player carregando..."
        );

        return;

    }


    try {

        player.loadVideoById(
            track.id
        );


        if (autoplay) {

            /*
             * O navegador pode bloquear autoplay
             * com áudio.
             */

            player.playVideo();

        }

    } catch (error) {

        console.error(error);

        setStatus(
            "Erro ao carregar música."
        );

    }
}


/* =========================================================
   PLAY / PAUSE
========================================================= */

function togglePlay() {

    if (!player || !playerReady) {

        setStatus(
            "Player ainda carregando..."
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
   PLAYER STATE
========================================================= */

function updatePlayButtons(
    playing
) {

    const symbol =
        playing
            ? "❚❚"
            : "▶";


    playButton.textContent =
        symbol;

    coverPlayButton.textContent =
        symbol;


    playButton.setAttribute(
        "aria-label",
        playing
            ? "Pausar"
            : "Reproduzir"
    );


    coverPlayButton.setAttribute(
        "aria-label",
        playing
            ? "Pausar"
            : "Reproduzir"
    );


    if (playing) {

        coverPlayButton.classList.add(
            "playing"
        );

    } else {

        coverPlayButton.classList.remove(
            "playing"
        );

    }
}


/* =========================================================
   PROGRESS
========================================================= */

function formatTime(seconds) {

    if (
        !seconds ||
        !Number.isFinite(seconds)
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


function updateProgress() {

    if (
        !player ||
        !playerReady ||
        isDraggingProgress
    ) {

        return;

    }


    const current =
        player.getCurrentTime();


    const duration =
        player.getDuration();


    if (
        !duration ||
        !Number.isFinite(duration)
    ) {

        return;

    }


    const percentage =
        (current / duration) * 100;


    progressBar.value =
        percentage;


    currentTimeElement.textContent =
        formatTime(current);


    durationElement.textContent =
        formatTime(duration);
}


function startProgressTimer() {

    clearInterval(
        progressTimer
    );


    progressTimer =
        setInterval(
            updateProgress,
            500
        );
}


function stopProgressTimer() {

    clearInterval(
        progressTimer
    );

    progressTimer = null;
}


/* =========================================================
   SEEK
========================================================= */

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
                Number(progressBar.value)
                / 100
            ) * duration;


        currentTimeElement.textContent =
            formatTime(time);

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


            const time =
                (
                    Number(progressBar.value)
                    / 100
                ) * duration;


            player.seekTo(
                time,
                true
            );

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


/* =========================================================
   QUEUE
========================================================= */

function renderQueue() {

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


            const image =
                document.createElement(
                    "img"
                );


            image.src =
                track.thumbnail;


            image.alt = "";


            image.onerror =
                () => {

                    image.src =
                        track.fallbackThumbnail;

                };


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
                image
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

        /*
         * Chegou ao final.
         */

        player.pauseVideo();

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


    const previous =
        currentTrack - 1;


    if (
        previous < 0
    ) {

        if (player) {

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
   YOUTUBE PLAYER API
========================================================= */

window.onYouTubeIframeAPIReady =
    function () {

        updateSplash(
            100,
            "Player pronto!"
        );


        player =
            new YT.Player(
                "youtubeContainer",
                {

                    width: "1",

                    height: "1",

                    playerVars: {

                        /*
                         * Não mostra controles.
                         */

                        controls: 0,

                        /*
                         * Não mostra branding
                         * exagerado.
                         */

                        modestbranding: 1,

                        /*
                         * Permite reprodução inline.
                         */

                        playsinline: 1,

                        /*
                         * Não inicia sozinho.
                         */

                        autoplay: 0,

                        /*
                         * Sem playlist automática.
                         */

                        rel: 0

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

    };


/* =========================================================
   PLAYER READY
========================================================= */

function onPlayerReady() {

    playerReady =
        true;


    startProgressTimer();


    setStatus(
        queue.length
            ? "Pronto para reproduzir."
            : "Aguardando link."
    );


    hideSplash();


    /*
     * Se alguma música foi adicionada
     * antes do player terminar de carregar,
     * carrega agora.
     */

    if (queue.length > 0) {

        const track =
            queue[currentTrack];


        player.cueVideoById(
            track.id
        );

    }
}


/* =========================================================
   PLAYER STATE CHANGE
========================================================= */

function onPlayerStateChange(event) {

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

function onPlayerError(event) {

    console.error(
        "YouTube Player Error:",
        event.data
    );


    setStatus(
        "Não foi possível reproduzir este vídeo."
    );

}


/* =========================================================
   EVENTS
========================================================= */

addButton.addEventListener(
    "click",
    () => {

        addTrack(
            youtubeInput.value
        );

    }
);


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


playButton.addEventListener(
    "click",
    togglePlay
);


coverPlayButton.addEventListener(
    "click",
    togglePlay
);


nextButton.addEventListener(
    "click",
    nextTrack
);


prevButton.addEventListener(
    "click",
    previousTrack
);


queueButton.addEventListener(
    "click",
    () => {

        queuePanel.classList.toggle(
            "visible"
        );


        queuePanel.setAttribute(
            "aria-hidden",
            !queuePanel.classList.contains(
                "visible"
            )
        );

    }
);


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


/* =========================================================
   INITIAL
========================================================= */

updatePlayButtons(
    false
);


renderQueue();


/*
 * Fallback caso a API do YouTube
 * demore muito para carregar.
 */

setTimeout(
    () => {

        if (!playerReady) {

            setStatus(
                "Carregando player..."
            );

        }

    },
    2000
);