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

let youtubeApiReady = false;


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

    if (!splashScreen) {
        return;
    }

    splashScreen.classList.add("hidden");
}


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
   STATUS
========================================================= */

function setStatus(text) {

    if (statusElement) {
        statusElement.textContent = text;
    }
}


/* =========================================================
   YOUTUBE API
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


    /*
     * Se uma música foi adicionada antes
     * do player terminar de carregar.
     */

    if (queue.length > 0) {

        const track =
            queue[currentTrack];


        player.cueVideoById(
            track.id
        );

    }


    /*
     * Esconde a splash.
     */

    setTimeout(
        hideSplash,
        350
    );

}


/* =========================================================
   FALLBACK DA SPLASH
========================================================= */

setTimeout(() => {

    /*
     * Evita que uma falha no carregamento da API
     * deixe o aplicativo preso para sempre na splash.
     */

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
   URL DO YOUTUBE
========================================================= */

function extractVideoId(value) {

    if (!value) {
        return null;
    }


    const input =
        value.trim();


    /*
     * Caso seja somente o ID.
     */

    if (
        /^[a-zA-Z0-9_-]{11}$/.test(input)
    ) {

        return input;

    }


    let url;


    try {

        /*
         * Aceita links sem https://.
         */

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
     * youtu.be/VIDEO
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
         * /watch?v=VIDEO
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
         * /shorts/VIDEO
         */

        if (
            url.pathname.startsWith(
                "/shorts/"
            )
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
         * /embed/VIDEO
         */

        if (
            url.pathname.startsWith(
                "/embed/"
            )
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
         * /live/VIDEO
         */

        if (
            url.pathname.startsWith(
                "/live/"
            )
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
                `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
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
   ADD TRACK
========================================================= */

async function addTrack(value) {

    const videoId =
        extractVideoId(value);


    if (!videoId) {

        setStatus(
            "Link do YouTube inválido."
        );

        return;

    }


    /*
     * Evita adicionar o mesmo vídeo várias vezes
     * seguidas.
     */

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

        thumbnail:
            metadata.thumbnail ||
            getThumbnail(videoId),

        highQualityThumbnail:
            getHighQualityThumbnail(
                videoId
            ),

        fallbackThumbnail:
            getThumbnail(videoId)

    };


    queue.push(track);


    renderQueue();


    youtubeInput.value = "";


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
     * Atualiza a interface antes do YouTube.
     */

    nowPlayingTitle.textContent =
        track.title;


    nowPlayingArtist.textContent =
        track.artist;


    /*
     * Primeiro usa a thumbnail do oEmbed.
     */

    nowPlayingCover.classList.remove(
        "loaded"
    );


    nowPlayingCover.src =
        track.thumbnail;


    nowPlayingCover.onload =
        function () {

            this.classList.add(
                "loaded"
            );

        };


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


    progressBar.value = 0;

    currentTimeElement.textContent =
        "0:00";

    durationElement.textContent =
        "0:00";


    setStatus(
        "Carregando música..."
    );


    /*
     * O player ainda não terminou de carregar.
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
             * O navegador pode bloquear
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


    coverPlayButton.classList.toggle(
        "playing",
        playing
    );

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


        progressBar.value =
            percentage;


        currentTimeElement.textContent =
            formatTime(current);


        durationElement.textContent =
            formatTime(duration);

    } catch {

        /*
         * O player ainda pode estar
         * inicializando.
         */

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


        if (
            !duration
        ) {

            return;

        }


        const time =
            (
                Number(
                    progressBar.value
                ) / 100
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


            image.alt =
                "";


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


    /*
     * Se já passou de 3 segundos,
     * volta para o começo da música.
     */

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
            "Este vídeo não permite reprodução incorporada."

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


setStatus(
    "Aguardando link."
);


/* =========================================================
   DEBUG
========================================================= */

console.log(
    "ApolloMusic iniciado."
);