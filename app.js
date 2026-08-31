/* =========================================================
   APOLLOMUSIC - YOUTUBE VERSION
   YouTube Player — Vanilla JS
   Versão com suporte a YouTube
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

let youtubeUrl = null;
let iframePlayer = null;

let changingTrack = false;


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
        youtubeContainer: "youtubeContainer"
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
        "Preparando player..."
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
   VALIDAÇÃO E PROCESSAMENTO DE URL YOUTUBE
========================================================= */

async function processYouTubeUrl(url) {

    url = String(url || "").trim();

    if (!url) {

        setStatus(
            "Cole um link do YouTube para reproduzir."
        );

        elements.youtubeSearch?.focus();

        return;
    }

    setStatus("Validando link do YouTube...");

    if (elements.youtubeResults) {
        elements.youtubeResults.innerHTML = "";
    }

    try {

        // Envia a URL para o servidor fazer debug e validação
        const response =
            await api(
                "/api/youtube/process",
                {
                    method: "POST",
                    body: JSON.stringify({ url })
                }
            );

        if (!response.processed || !response.videoId && !response.playlistId) {

            setStatus(
                "Link do YouTube inválido. Tente novamente."
            );

            return;
        }

        youtubeUrl = url;

        // Renderiza o iframe
        renderYouTubeIframe(
            response.videoId,
            response.playlistId
        );

        setStatus(
            response.videoId
                ? "Vídeo carregado. Aproveite!"
                : "Playlist carregada. Aproveite!"
        );

    } catch (error) {

        console.error(
            "[ApolloMusic] Processamento:",
            error
        );

        setStatus(
            error.message ||
            "Erro ao processar o link do YouTube."
        );
    }
}


/* =========================================================
   RENDERIZAÇÃO DO IFRAME
========================================================= */

function renderYouTubeIframe(videoId, playlistId) {

    const container = elements.youtubeContainer;

    if (!container) {
        return;
    }

    container.innerHTML = "";

    let iframeSrc = "";

    if (videoId) {
        // Vídeo individual
        iframeSrc = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    } else if (playlistId) {
        // Playlist
        iframeSrc = `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=1`;
    }

    const iframe = document.createElement("iframe");

    iframe.id = "youtube-player";
    iframe.src = iframeSrc;
    iframe.width = "100%";
    iframe.height = "400";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.allowFullscreen = true;
    iframe.frameBorder = "0";

    container.appendChild(iframe);
}


/* =========================================================
   EVENTOS
========================================================= */

function setupEvents() {

    if (elements.searchYoutube) {

        elements.searchYoutube.addEventListener(
            "click",
            () => {

                processYouTubeUrl(
                    elements.youtubeSearch?.value
                );
            }
        );
    }


    if (elements.youtubeSearch) {

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
}


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

async function init() {

    cacheElements();

    setupEvents();

    checkAPI()
        .then(online => {

            if (online) {

                setStatus(
                    "Cole um link do YouTube para começar."
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
