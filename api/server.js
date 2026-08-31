const express = require("express");
const cors = require("cors");
const {
    Innertube,
    UniversalCache
} = require("youtubei.js");

const app = express();

const PORT =
    process.env.PORT || 10000;


/* =========================================================
   CORS
========================================================= */

app.use(
    cors({
        origin: true,

        methods: [
            "GET",
            "HEAD",
            "OPTIONS",
            "POST"
        ],

        allowedHeaders: [
            "Origin",
            "X-Requested-With",
            "Content-Type",
            "Accept",
            "Range"
        ],

        exposedHeaders: [
            "Content-Length",
            "Content-Range",
            "Accept-Ranges"
        ],

        credentials: false,

        optionsSuccessStatus: 204
    })
);


/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(
    express.json({
        limit: "1mb"
    })
);


/* =========================================================
   LOG
========================================================= */

function logDebug(message, data = null) {

    const timestamp =
        new Date().toISOString();

    console.log(
        `[${timestamp}] [DEBUG] ${message}`
    );

    if (data !== null) {

        try {

            console.log(
                JSON.stringify(
                    data,
                    null,
                    2
                )
            );

        } catch {

            console.log(data);
        }
    }
}


function logError(message, error = null) {

    const timestamp =
        new Date().toISOString();

    console.error(
        `[${timestamp}] [ERROR] ${message}`
    );

    if (error) {

        console.error(error);
    }
}


/* =========================================================
   YOUTUBE.JS / INNERTUBE
========================================================= */

let youtube = null;
let youtubePromise = null;


async function getYouTube() {

    if (youtube) {

        return youtube;
    }


    if (youtubePromise) {

        return youtubePromise;
    }


    logDebug(
        "Inicializando YouTube.js..."
    );


    youtubePromise =
        Innertube.create({
            cache:
                new UniversalCache(true)
        })
        .then(instance => {

            youtube =
                instance;

            logDebug(
                "YouTube.js inicializado com sucesso."
            );

            return instance;

        })
        .catch(error => {

            youtube = null;
            youtubePromise = null;

            logError(
                "Falha ao inicializar YouTube.js.",
                error
            );

            throw error;
        });


    return youtubePromise;
}


/* =========================================================
   UTILIDADES
========================================================= */

function cleanVideoId(id) {

    if (!id) {
        return null;
    }


    const value =
        String(id)
            .trim()
            .replace(
                /[^a-zA-Z0-9_-]/g,
                ""
            );


    if (!value) {
        return null;
    }


    return value.slice(0, 20);
}


function cleanPlaylistId(id) {

    if (!id) {
        return null;
    }


    const value =
        String(id)
            .trim()
            .replace(
                /[^a-zA-Z0-9_-]/g,
                ""
            );


    if (!value) {
        return null;
    }


    return value.slice(0, 100);
}


/* =========================================================
   TEXTO
========================================================= */

function getText(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";
    }


    if (
        typeof value === "string"
    ) {

        return value.trim();
    }


    if (
        typeof value.text === "string"
    ) {

        return value.text.trim();
    }


    if (
        Array.isArray(value.runs)
    ) {

        return value.runs
            .map(run => run?.text || "")
            .join("")
            .trim();
    }


    if (
        typeof value.toString === "function"
    ) {

        try {

            const text =
                value.toString();

            if (
                text &&
                text !== "[object Object]"
            ) {

                return text.trim();
            }

        } catch {
            /* ignora */
        }
    }


    return "";
}


/* =========================================================
   URL DO YOUTUBE
========================================================= */

function isValidYouTubeUrl(url) {

    try {

        const parsed =
            new URL(url);


        const hostname =
            parsed.hostname
                .toLowerCase()
                .replace(/^www\./, "");


        return [
            "youtube.com",
            "music.youtube.com",
            "m.youtube.com",
            "youtu.be"
        ].includes(hostname);

    } catch {

        return false;
    }
}


/* =========================================================
   EXTRAI VIDEO ID
========================================================= */

function extractVideoId(url) {

    try {

        const parsed =
            new URL(url);


        const hostname =
            parsed.hostname
                .toLowerCase()
                .replace(/^www\./, "");


        if (
            hostname === "youtube.com" ||
            hostname === "music.youtube.com" ||
            hostname === "m.youtube.com"
        ) {

            if (
                parsed.pathname === "/watch"
            ) {

                return cleanVideoId(
                    parsed.searchParams.get("v")
                );
            }


            if (
                parsed.pathname.startsWith("/shorts/")
            ) {

                return cleanVideoId(
                    parsed.pathname.split("/")[2]
                );
            }


            if (
                parsed.pathname.startsWith("/embed/")
            ) {

                return cleanVideoId(
                    parsed.pathname.split("/")[2]
                );
            }
        }


        if (
            hostname === "youtu.be"
        ) {

            return cleanVideoId(
                parsed.pathname
                    .split("/")
                    .filter(Boolean)[0]
            );
        }

    } catch (error) {

        logError(
            "Erro ao extrair videoId.",
            error
        );
    }


    return null;
}


/* =========================================================
   EXTRAI PLAYLIST ID
========================================================= */

function extractPlaylistId(url) {

    try {

        const parsed =
            new URL(url);


        return cleanPlaylistId(
            parsed.searchParams.get("list")
        );

    } catch (error) {

        logError(
            "Erro ao extrair playlistId.",
            error
        );

        return null;
    }
}


/* =========================================================
   THUMBNAIL
========================================================= */

function getThumbnail(
    item,
    videoId
) {

    try {

        const thumbnails =
            item?.thumbnails;


        if (
            Array.isArray(thumbnails) &&
            thumbnails.length > 0
        ) {

            for (
                let i = thumbnails.length - 1;
                i >= 0;
                i--
            ) {

                const url =
                    thumbnails[i]?.url;

                if (url) {

                    return url;
                }
            }
        }

    } catch {
        /* ignora */
    }


    return (
        `https://i.ytimg.com/vi/` +
        `${videoId}/hqdefault.jpg`
    );
}


/* =========================================================
   NORMALIZA ITEM DA PLAYLIST
========================================================= */

function normalizePlaylistItem(item) {

    if (!item) {
        return null;
    }


    /*
     * O youtubei.js pode usar diferentes
     * propriedades dependendo da versão.
     */

    let videoId =
        item.id ||
        item.video_id ||
        item.videoId ||
        item.video?.id ||
        item.video?.video_id;


    /*
     * Alguns objetos podem possuir
     * o ID dentro de endpoint.
     */

    if (!videoId) {

        try {

            videoId =
                item.endpoint?.payload?.videoId ||
                item.endpoint?.payload?.video_id ||
                item.navigation_endpoint?.payload?.videoId;

        } catch {
            /* ignora */
        }
    }


    videoId =
        cleanVideoId(videoId);


    if (!videoId) {

        return null;
    }


    const title =
        getText(item.title) ||
        getText(item.video?.title) ||
        "Vídeo do YouTube";


    const artist =
        getText(item.author) ||
        getText(item.short_byline_text) ||
        getText(item.channel) ||
        getText(item.video?.author) ||
        "YouTube";


    const thumbnail =
        getThumbnail(
            item,
            videoId
        );


    return {

        id:
            videoId,

        videoId:
            videoId,

        title,

        artist,

        album:
            "",

        cover:
            thumbnail,

        thumbnail,

        url:
            `https://www.youtube.com/watch?v=${videoId}`
    };
}


/* =========================================================
   REMOVE DUPLICADOS
========================================================= */

function removeDuplicateTracks(tracks) {

    const seen =
        new Set();


    return tracks.filter(track => {

        if (!track?.id) {
            return false;
        }


        if (
            seen.has(track.id)
        ) {

            return false;
        }


        seen.add(track.id);

        return true;
    });
}


/* =========================================================
   ESCANEIA PLAYLIST
========================================================= */

async function getPlaylistItems(playlistId) {

    const yt =
        await getYouTube();


    logDebug(
        "1. YouTube.js iniciado."
    );


    logDebug(
        "2. Buscando playlist.",
        {
            playlistId
        }
    );


    let playlist;


    try {

        playlist =
            await yt.getPlaylist(
                playlistId
            );

    } catch (error) {

        logError(
            "3. Erro dentro de yt.getPlaylist().",
            error
        );

        throw new Error(
            `YouTube.js não conseguiu abrir a playlist: ${error?.message || "erro desconhecido"}`
        );
    }


    if (!playlist) {

        throw new Error(
            "O YouTube.js retornou uma playlist vazia."
        );
    }


    logDebug(
        "4. Playlist recebida.",
        {
            keys:
                Object.keys(playlist || {})
        }
    );


    /*
     * Primeira página.
     */

    let rawItems =
        Array.isArray(playlist.items)
            ? [...playlist.items]
            : [];


    logDebug(
        "5. Itens encontrados na primeira página.",
        {
            count:
                rawItems.length
        }
    );


    /*
     * Tenta paginação quando disponível.
     */

    try {

        if (
            typeof playlist.has_continuation ===
            "function"
        ) {

            let pages = 0;


            while (
                playlist.has_continuation() &&
                pages < 20
            ) {

                pages++;


                logDebug(
                    "6. Carregando próxima página.",
                    {
                        page:
                            pages
                    }
                );


                const next =
                    await playlist.getContinuation();


                if (!next) {
                    break;
                }


                const nextItems =
                    Array.isArray(next.items)
                        ? next.items
                        : [];


                rawItems.push(
                    ...nextItems
                );


                /*
                 * Algumas versões retornam
                 * um novo objeto de playlist.
                 */

                playlist =
                    next;


                logDebug(
                    "Página carregada.",
                    {
                        page:
                            pages,

                        items:
                            nextItems.length,

                        total:
                            rawItems.length
                    }
                );
            }
        }

    } catch (error) {

        /*
         * Se a paginação falhar, mantém
         * os vídeos já encontrados.
         */

        logError(
            "Erro durante paginação da playlist.",
            error
        );
    }


    logDebug(
        "7. Total de itens brutos.",
        {
            count:
                rawItems.length
        }
    );


    /*
     * Normalização.
     */

    const normalized =
        rawItems
            .map(
                normalizePlaylistItem
            )
            .filter(Boolean);


    const items =
        removeDuplicateTracks(
            normalized
        );


    logDebug(
        "8. Itens normalizados.",
        {
            brutos:
                rawItems.length,

            validos:
                items.length
        }
    );


    /*
     * Mostra um exemplo no log para
     * facilitar debug no Render.
     */

    if (
        rawItems.length > 0
    ) {

        logDebug(
            "9. Exemplo do primeiro item bruto.",
            {
                keys:
                    Object.keys(
                        rawItems[0] || {}
                    )
            }
        );
    }


    if (
        items.length === 0
    ) {

        throw new Error(
            "O YouTube.js encontrou a playlist, mas não conseguiu identificar os vídeos."
        );
    }


    return items;
}


/* =========================================================
   ROOT
========================================================= */

app.get("/", (req, res) => {

    res.json({

        name:
            "ApolloMusic API - YouTube",

        version:
            "0.6.0",

        status:
            "online",

        youtube:
            "youtubei.js",

        apiKeyRequired:
            false
    });
});


/* =========================================================
   HEALTH
========================================================= */

app.get(
    "/api/health",
    (req, res) => {

        res.json({

            status:
                "ok",

            service:
                "apollo-music-youtube-api",

            youtube:
                "youtubei.js",

            apiKeyRequired:
                false,

            timestamp:
                new Date().toISOString()
        });
    }
);


/* =========================================================
   VALIDATE
========================================================= */

app.post(
    "/api/youtube/validate",
    (req, res) => {

        const {
            url
        } = req.body;


        if (!url) {

            return res
                .status(400)
                .json({

                    valid:
                        false,

                    error:
                        "URL é obrigatória."
                });
        }


        const valid =
            isValidYouTubeUrl(url);


        const videoId =
            extractVideoId(url);


        const playlistId =
            extractPlaylistId(url);


        res.json({

            url,

            valid,

            videoId:
                videoId || null,

            playlistId:
                playlistId || null,

            type:
                videoId
                    ? "video"
                    : playlistId
                        ? "playlist"
                        : null
        });
    }
);


/* =========================================================
   VIDEO INFO
========================================================= */

app.get(
    "/api/youtube/video/:id",
    (req, res) => {

        const videoId =
            cleanVideoId(
                req.params.id
            );


        if (!videoId) {

            return res
                .status(400)
                .json({

                    error:
                        "ID do vídeo é obrigatório."
                });
        }


        res.json({

            status:
                "success",

            videoId,

            type:
                "video",

            title:
                "Vídeo do YouTube",

            artist:
                "YouTube",

            album:
                "",

            cover:
                `https://i.ytimg.com/vi/` +
                `${videoId}/hqdefault.jpg`,

            thumbnail:
                `https://i.ytimg.com/vi/` +
                `${videoId}/hqdefault.jpg`,

            embedUrl:
                `https://www.youtube.com/embed/` +
                `${videoId}?autoplay=1`,

            watchUrl:
                `https://www.youtube.com/watch?v=${videoId}`
        });
    }
);


/* =========================================================
   PLAYLIST INFO
========================================================= */

app.get(
    "/api/youtube/playlist/:id",
    async (req, res) => {

        const playlistId =
            cleanPlaylistId(
                req.params.id
            );


        if (!playlistId) {

            return res
                .status(400)
                .json({

                    error:
                        "ID da playlist é obrigatório."
                });
        }


        try {

            const items =
                await getPlaylistItems(
                    playlistId
                );


            return res.json({

                status:
                    "success",

                processed:
                    true,

                type:
                    "playlist",

                playlistId,

                count:
                    items.length,

                playlistItems:
                    items,

                items:
                    items,

                playlistUrl:
                    `https://www.youtube.com/playlist?list=${playlistId}`
            });

        } catch (error) {

            logError(
                "Erro no endpoint de playlist.",
                error
            );


            return res
                .status(502)
                .json({

                    processed:
                        false,

                    type:
                        "playlist",

                    playlistId,

                    error:
                        "Não foi possível obter os vídeos da playlist.",

                    details:
                        error?.message || ""
                });
        }
    }
);


/* =========================================================
   PROCESS URL
========================================================= */

app.post(
    "/api/youtube/process",
    async (req, res) => {

        const {
            url
        } = req.body;


        logDebug(
            "POST /api/youtube/process.",
            {
                url
            }
        );


        if (!url) {

            return res
                .status(400)
                .json({

                    processed:
                        false,

                    error:
                        "URL é obrigatória."
                });
        }


        if (
            !isValidYouTubeUrl(url)
        ) {

            return res
                .status(400)
                .json({

                    processed:
                        false,

                    error:
                        "URL do YouTube inválida."
                });
        }


        try {

            const videoId =
                extractVideoId(url);


            const playlistId =
                extractPlaylistId(url);


            /* =================================================
               PLAYLIST
            ================================================= */

            if (playlistId) {

                logDebug(
                    "Playlist detectada.",
                    {
                        playlistId
                    }
                );


                const playlistItems =
                    await getPlaylistItems(
                        playlistId
                    );


                const result = {

                    url,

                    processed:
                        true,

                    type:
                        "playlist",

                    playlistId,

                    count:
                        playlistItems.length,

                    playlistItems:
                        playlistItems,

                    items:
                        playlistItems,

                    timestamp:
                        new Date().toISOString()
                };


                logDebug(
                    "Playlist processada com sucesso.",
                    {
                        playlistId,

                        count:
                            playlistItems.length
                    }
                );


                return res.json(
                    result
                );
            }


            /* =================================================
               VÍDEO
            ================================================= */

            if (videoId) {

                const thumbnail =
                    `https://i.ytimg.com/vi/` +
                    `${videoId}/hqdefault.jpg`;


                return res.json({

                    url,

                    processed:
                        true,

                    type:
                        "video",

                    videoId,

                    title:
                        "Vídeo do YouTube",

                    artist:
                        "YouTube",

                    album:
                        "",

                    cover:
                        thumbnail,

                    thumbnail,

                    embedUrl:
                        `https://www.youtube.com/embed/` +
                        `${videoId}?autoplay=1`,

                    watchUrl:
                        `https://www.youtube.com/watch?v=${videoId}`,

                    timestamp:
                        new Date().toISOString()
                });
            }


            return res
                .status(400)
                .json({

                    processed:
                        false,

                    error:
                        "Não foi possível identificar vídeo ou playlist."
                });

        } catch (error) {

            logError(
                "Erro ao processar URL.",
                error
            );


            return res
                .status(502)
                .json({

                    processed:
                        false,

                    error:
                        "Não foi possível processar o conteúdo do YouTube.",

                    details:
                        error?.message || ""
                });
        }
    }
);


/* =========================================================
   DEBUG
========================================================= */

app.get(
    "/api/debug/info",
    (req, res) => {

        res.json({

            status:
                "debug-active",

            service:
                "ApolloMusic YouTube API",

            version:
                "0.6.0",

            youtube:
                "youtubei.js",

            apiKeyRequired:
                false,

            features: {

                youtubeValidation:
                    true,

                youtubeProcessing:
                    true,

                playlistScanning:
                    true,

                pagination:
                    true,

                metadata:
                    true,

                thumbnails:
                    true,

                cors:
                    true,

                logging:
                    true
            },

            endpoints: {

                health:
                    "GET /api/health",

                validate:
                    "POST /api/youtube/validate",

                video:
                    "GET /api/youtube/video/:id",

                playlist:
                    "GET /api/youtube/playlist/:id",

                process:
                    "POST /api/youtube/process",

                debug:
                    "GET /api/debug/info"
            },

            timestamp:
                new Date().toISOString()
        });
    }
);


/* =========================================================
   404
========================================================= */

app.use(
    (req, res) => {

        res
            .status(404)
            .json({

                error:
                    "Rota não encontrada.",

                path:
                    req.path,

                method:
                    req.method
            });
    }
);


/* =========================================================
   ERROR HANDLER
========================================================= */

app.use(
    (
        error,
        req,
        res,
        next
    ) => {

        logError(
            "Erro não tratado.",
            error
        );


        if (
            res.headersSent
        ) {

            return next(error);
        }


        res
            .status(500)
            .json({

                error:
                    "Erro interno do servidor.",

                message:
                    error?.message || ""
            });
    }
);


/* =========================================================
   SERVER
========================================================= */

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log("");

        console.log(
            "╔════════════════════════════════════╗"
        );

        console.log(
            "║   ApolloMusic API - YouTube        ║"
        );

        console.log(
            "║   Versão 0.6.0                     ║"
        );

        console.log(
            "╚════════════════════════════════════╝"
        );

        console.log("");

        console.log(
            `✓ Servidor na porta ${PORT}`
        );

        console.log(
            "✓ CORS habilitado"
        );

        console.log(
            "✓ YouTube.js / Innertube habilitado"
        );

        console.log(
            "✓ Scanner de playlists habilitado"
        );

        console.log(
            "✓ Paginação habilitada"
        );

        console.log(
            "✓ API Key do YouTube NÃO necessária"
        );

        console.log("");
    }
);