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

let splashHidden = false;

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
SAFE ELEMENT CHECK
========================================================= */

function elementExists(element) {

return element !== null;

}

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

if (
    splashHidden ||
    !splashScreen
) {

    return;

}


splashHidden = true;


updateSplash(
    100,
    "Player pronto!"
);


setTimeout(() => {

    splashScreen.classList.add(
        "hidden"
    );

}, 350);

}

/*

* Inicialização visual.
  */

updateSplash(
20,
"Carregando interface..."
);

setTimeout(() => {

updateSplash(
    50,
    "Preparando player..."
);

}, 250);

setTimeout(() => {

updateSplash(
    75,
    "Conectando ao YouTube..."
);

}, 600);

/*

* Se a API do YouTube falhar completamente,
* não deixa o Splash travado para sempre.
  */

setTimeout(() => {

if (!playerReady) {

    updateSplash(
        90,
        "Finalizando..."
    );

}

}, 3000);

setTimeout(() => {

if (!playerReady) {

    console.warn(
        "A API do YouTube ainda não ficou pronta."
    );

    hideSplash();

    setStatus(
        "YouTube demorou para carregar."
    );

}

}, 7000);

/* =========================================================
STATUS
========================================================= */

function setStatus(text) {

if (statusElement) {

    statusElement.textContent =
        text;

}

}

/* =========================================================
YOUTUBE URL
========================================================= */

function extractVideoId(url) {

if (!url) {

    return null;

}


url =
    url.trim();


/*
 * youtu.be/VIDEO
 */

const shortMatch =
    url.match(
        /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/
    );


if (shortMatch) {

    return shortMatch[1];

}


/*
 * youtube.com/watch?v=VIDEO
 */

const watchMatch =
    url.match(
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?[^#]*v=([a-zA-Z0-9_-]{11})/
    );


if (watchMatch) {

    return watchMatch[1];

}


/*
 * youtube.com/shorts/VIDEO
 */

const shortsMatch =
    url.match(
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
    );


if (shortsMatch) {

    return shortsMatch[1];

}


/*
 * youtube.com/embed/VIDEO
 */

const embedMatch =
    url.match(
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
    );


if (embedMatch) {

    return embedMatch[1];

}


/*
 * Somente ID
 */

if (
    /^[a-zA-Z0-9_-]{11}$/.test(url)
) {

    return url;

}


return null;

}

/* =========================================================
THUMBNAILS
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
            `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
        );


    if (!response.ok) {

        throw new Error(
            "Falha ao consultar oEmbed."
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
        "Metadata indisponível:",
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


addButton.disabled =
    true;


setStatus(
    "Obtendo informações..."
);


/*
 * A capa já é conhecida pelo ID.
 * Não precisamos esperar o oEmbed
 * para mostrar a imagem.
 */

const immediateThumbnail =
    getThumbnail(videoId);


const immediateTrack = {

    id:
        videoId,

    title:
        "Carregando música...",

    artist:
        "YouTube",

    thumbnail:
        immediateThumbnail,

    fallbackThumbnail:
        getFallbackThumbnail(videoId)

};


/*
 * Se for a primeira música,
 * adicionamos imediatamente.
 */

const isFirst =
    queue.length === 0;


queue.push(
    immediateTrack
);


currentTrack =
    queue.length - 1;


renderQueue();


if (isFirst) {

    updateNowPlaying(
        immediateTrack
    );

}


/*
 * Busca título/artista sem bloquear
 * a criação da música.
 */

const metadata =
    await getVideoMetadata(
        videoId
    );


const index =
    queue.findIndex(
        track =>
            track.id === videoId &&
            track === immediateTrack
    );


if (index !== -1) {

    queue[index].title =
        metadata.title;

    queue[index].artist =
        metadata.artist;

    /*
     * Sempre prioriza a thumbnail direta.
     * Isso evita depender do backend.
     */

    queue[index].thumbnail =
        getThumbnail(videoId);

}


renderQueue();


if (isFirst) {

    updateNowPlaying(
        queue[0]
    );

    loadTrack(
        0,
        true
    );

} else {

    setStatus(
        "Adicionada à fila."
    );

}


youtubeInput.value =
    "";


addButton.disabled =
    false;

}

/* =========================================================
NOW PLAYING
========================================================= */

function updateNowPlaying(track) {

if (!track) {

    return;

}


if (
    elementExists(nowPlayingTitle)
) {

    nowPlayingTitle.textContent =
        track.title;

}


if (
    elementExists(nowPlayingArtist)
) {

    nowPlayingArtist.textContent =
        track.artist;

}


if (
    elementExists(nowPlayingCover)
) {

    nowPlayingCover.onerror =
        function () {

            this.onerror =
                null;

            this.src =
                track.fallbackThumbnail;

        };


    /*
     * Mostra a capa imediatamente.
     */

    nowPlayingCover.src =
        track.thumbnail ||
        getThumbnail(track.id);

}

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


/*
 * Atualiza interface antes
 * de mexer no YouTube.
 */

updateNowPlaying(
    track
);


renderQueue();


setStatus(
    "Carregando música..."
);


/*
 * Se o player ainda não está pronto,
 * onPlayerReady() vai carregar depois.
 */

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

    player.loadVideoById(
        track.id
    );


    if (autoplay) {

        /*
         * Alguns navegadores bloqueiam
         * autoplay com áudio.
         */

        setTimeout(() => {

            try {

                player.playVideo();

            } catch (error) {

                console.warn(
                    "Autoplay bloqueado:",
                    error
                );

            }

        }, 150);

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
PLAY BUTTON UI
========================================================= */

function updatePlayButtons(
playing
) {

const symbol =
    playing
        ? "❚❚"
        : "▶";


if (playButton) {

    playButton.innerHTML =
        `<span aria-hidden="true">${symbol}</span>`;

    playButton.setAttribute(
        "aria-label",
        playing
            ? "Pausar"
            : "Reproduzir"
    );

}


if (coverPlayButton) {

    coverPlayButton.innerHTML =
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


let current = 0;

let duration = 0;


try {

    current =
        player.getCurrentTime();

    duration =
        player.getDuration();

} catch {

    return;

}


if (
    !duration ||
    !Number.isFinite(duration)
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

}

/* =========================================================
PROGRESS TIMER
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

    progressTimer =
        null;

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


queueList.innerHTML =
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
            track.thumbnail ||
            getThumbnail(track.id);


        image.alt =
            "";


        image.onerror =
            function () {

                this.onerror =
                    null;

                this.src =
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

    if (player) {

        try {

            player.pauseVideo();

        } catch {}

    }


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

    if (player && playerReady) {

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
YOUTUBE IFRAME API
========================================================= */

window.onYouTubeIframeAPIReady =
function () {

    console.log(
        "YouTube IFrame API pronta."
    );


    updateSplash(
        92,
        "Inicializando player..."
    );


    if (!youtubeContainer) {

        console.error(
            "youtubeContainer não encontrado."
        );

        hideSplash();

        return;

    }


    player =
        new YT.Player(
            "youtubeContainer",
            {

                /*
                 * O CSS torna o player invisível.
                 * Ele continua existindo e funcionando.
                 */

                width:
                    "1",

                height:
                    "1",

                playerVars: {

                    controls:
                        0,

                    modestbranding:
                        1,

                    playsinline:
                        1,

                    autoplay:
                        0,

                    rel:
                        0

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

console.log(
    "ApolloMusic: player pronto."
);


playerReady =
    true;


startProgressTimer();


setStatus(
    queue.length > 0
        ? "Pronto para reproduzir."
        : "Aguardando link."
);


hideSplash();


/*
 * Se uma música foi adicionada
 * antes do player ficar pronto,
 * carrega agora.
 */

if (
    queue.length > 0 &&
    queue[currentTrack]
) {

    const track =
        queue[currentTrack];


    updateNowPlaying(
        track
    );


    player.cueVideoById(
        track.id
    );

}

}

/* =========================================================
PLAYER STATE
========================================================= */

function onPlayerStateChange(event) {

if (
    !window.YT ||
    !YT.PlayerState
) {

    return;

}


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


const messages = {

    2:
        "ID do vídeo inválido.",

    5:
        "Erro no player HTML5.",

    100:
        "Vídeo não encontrado ou privado.",

    101:
        "Este vídeo não permite reprodução incorporada.",

    150:
        "Este vídeo não permite reprodução incorporada."

};


setStatus(
    messages[event.data] ||
    "Não foi possível reproduzir este vídeo."
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
            youtubeInput.value
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

if (queueButton) {

queueButton.addEventListener(
    "click",
    () => {

        if (!queuePanel) {

            return;

        }


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

}

if (closeQueue) {

closeQueue.addEventListener(
    "click",
    () => {

        if (!queuePanel) {

            return;

        }


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

console.log(
"ApolloMusic inicializado."
);