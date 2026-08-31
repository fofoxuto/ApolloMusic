const express = require("express");
const cors = require("cors");
const { Innertube, UniversalCache } = require("youtubei.js");

const app = express();

const PORT = process.env.PORT || 10000;


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

app.use(express.json());


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

        console.log(
            JSON.stringify(
                data,
                null,
                2
            )
        );
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
   YOUTUBE / INNERTUBE
========================================================= */

let youtube = null;

let youtubePromise = null;


/*
 * Cria uma sessão do YouTube.js somente
 * quando realmente for necessária.
 */

async function getYouTube() {

    if (youtube) {

        return youtube;
    }


    if (youtubePromise) {

        return youtubePromise;
    }


    youtubePromise =
        Innertube.create({

            cache:
                new UniversalCache(
                    true
                )
        })
        .then(instance => {

            youtube =
                instance;

            logDebug(
                "YouTube.js conectado."
            );

            return youtube;

        })
        .catch(error => {

            youtubePromise =
                null;

            logError(
                "Não foi possível iniciar YouTube.js.",
                error
            );

            throw error;
        });


    return youtubePromise;
}


/* =========================================================
   YOUTUBE UTILITIES
========================================================= */

function cleanVideoId(id) {

    if (!id) {

        return null;
    }


    const clean =
        String(id)
            .replace(
                /[^a-zA-Z0-9_-]/g,
                ""
            )
            .slice(0, 20);


    return clean || null;
}


function cleanPlaylistId(id) {

    if (!id) {

        return null;
    }


    const clean =
        String(id)
            .replace(
                /[^a-zA-Z0-9_-]/g,
                ""
            )
            .slice(0, 100);


    return clean || null;
}


/* =========================================================
   EXTRAI VIDEO ID
========================================================= */

function extractVideoId(url) {

    try {

        const urlObj =
            new URL(url);


        const hostname =
            urlObj.hostname
                .toLowerCase()
                .replace(
                    /^www\./,
                    ""
                );


        /*
         * youtube.com/watch?v=
         */

        if (
            hostname === "youtube.com" ||
            hostname === "music.youtube.com"
        ) {

            if (
                urlObj.pathname ===
                "/watch"
            ) {

                return cleanVideoId(
                    urlObj.searchParams.get(
                        "v"
                    )
                );
            }


            /*
             * /shorts/ID
             */

            if (
                urlObj.pathname.startsWith(
                    "/shorts/"
                )
            ) {

                return cleanVideoId(
                    urlObj.pathname
                        .split("/")[2]
                );
            }


            /*
             * /embed/ID
             */

            if (
                urlObj.pathname.startsWith(
                    "/embed/"
                )
            ) {

                return cleanVideoId(
                    urlObj.pathname
                        .split("/")[2]
                );
            }
        }


        /*
         * youtu.be/ID
         */

        if (
            hostname === "youtu.be"
        ) {

            return cleanVideoId(
                urlObj.pathname
                    .split("/")
                    .filter(Boolean)[0]
            );
        }

    } catch (error) {

        logError(
            "Erro ao extrair ID do vídeo.",
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

        const urlObj =
            new URL(url);


        return cleanPlaylistId(
            urlObj.searchParams.get(
                "list"
            )
        );

    } catch (error) {

        logError(
            "Erro ao extrair ID da playlist.",
            error
        );

        return null;
    }
}


/* =========================================================
   VALIDA URL
========================================================= */

function isValidYouTubeUrl(url) {

    try {

        const urlObj =
            new URL(url);


        const hostname =
            urlObj.hostname
                .toLowerCase()
                .replace(
                    /^www\./,
                    ""
                );


        return [
            "youtube.com",
            "music.youtube.com",
            "youtu.be",
            "m.youtube.com"
        ].includes(
            hostname
        );

    } catch {

        return false;
    }
}


/* =========================================================
   EXTRAI TEXTO DE OBJETOS YOUTUBE.JS
========================================================= */

function getText(value) {

    if (!value) {

        return "";
    }


    if (
        typeof value ===
        "string"
    ) {

        return value;
    }


    if (
        typeof value.toString ===
        "function"
    ) {

        try {

            return value.toString();

        } catch {

            return "";
        }
    }


    return "";
}


/* =========================================================
   CONVERTE ITEM DA PLAYLIST
========================================================= */

function normalizePlaylistItem(
    item
) {

    if (!item) {

        return null;
    }


    /*
     * YouTube.js normalmente expõe
     * video_id no item da playlist.
     */

    const videoId =
        cleanVideoId(
            item.video_id ||
            item.videoId ||
            item.id
        );


    if (!videoId) {

        return null;
    }


    /*
     * Título
     */

    let title =
        getText(
            item.title
        );


    if (!title) {

        title =
            "Vídeo do YouTube";
    }


    /*
     * Autor / canal
     */

    let artist =
        getText(
            item.author
        );


    if (!artist) {

        artist =
            getText(
                item.short_byline_text
            );
    }


    if (!artist) {

        artist =
            "YouTube";
    }


    /*
     * Thumbnail
     */

    let thumbnail =
        null;


    try {

        if (
            Array.isArray(
                item.thumbnails
            ) &&
            item.thumbnails.length
        ) {

            const last =
                item.thumbnails[
                    item.thumbnails.length - 1
                ];


            thumbnail =
                last?.url ||
                null;
        }

    } catch {

        thumbnail =
            null;
    }


    if (!thumbnail) {

        thumbnail =
            `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    }


    return {

        id:
            videoId,

        videoId:
            videoId,

        title:
            title,

        artist:
            artist,

        album:
            "",

        cover:
            thumbnail,

        thumbnail:
            thumbnail,

        url:
            `https://www.youtube.com/watch?v=${videoId}`
    };
}


/* =========================================================
   REMOVE DUPLICADOS
========================================================= */

function removeDuplicateTracks(
    tracks
) {

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
                seen.has(
                    track.id
                )
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
   OBTÉM PLAYLIST
========================================================= */

async function getPlaylistItems(
    playlistId
) {

    const yt =
        await getYouTube();


    logDebug(
        "Consultando playlist no YouTube.",
        {
            playlistId
        }
    );


    const playlist =
        await yt.getPlaylist(
            playlistId
        );


    if (!playlist) {

        throw new Error(
            "Playlist não encontrada."
        );
    }


    const rawItems =
        playlist.items ||
        [];


    logDebug(
        "Itens recebidos do YouTube.",
        {
            count:
                rawItems.length
        }
    );


    let items =
        rawItems
            .map(
                normalizePlaylistItem
            )
            .filter(Boolean);


    items =
        removeDuplicateTracks(
            items
        );


    return items;
}


/* =========================================================
   ROOT
========================================================= */

app.get(
    "/",
    (req, res) => {

        res.json({

            name:
                "ApolloMusic API - YouTube",

            version:
                "0.4.0",

            status:
                "online",

            cors:
                "enabled",

            type:
                "youtube-player",

            apiKeyRequired:
                false
        });
    }
);


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

            cors:
                "enabled",

            youtube:
                "innertube",

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

                    error:
                        "URL é obrigatória.",

                    valid:
                        false
                });
        }


        const valid =
            isValidYouTubeUrl(
                url
            );


        const videoId =
            extractVideoId(
                url
            );


        const playlistId =
            extractPlaylistId(
                url
            );


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
    async (req, res) => {

        const {
            id
        } = req.params;


        const videoId =
            cleanVideoId(
                id
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

            embedUrl:
                `https://www.youtube.com/embed/${videoId}?autoplay=1`,

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


            res.json({

                status:
                    "success",

                playlistId,

                type:
                    "playlist",

                count:
                    items.length,

                items,

                playlistUrl:
                    `https://www.youtube.com/playlist?list=${playlistId}`
            });

        } catch (error) {

            logError(
                "Erro ao obter playlist.",
                error
            );


            res
                .status(502)
                .json({

                    error:
                        "Não foi possível obter os vídeos da playlist.",

                    details:
                        error.message
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
            "POST /api/youtube/process",
            {
                url
            }
        );


        if (!url) {

            return res
                .status(400)
                .json({

                    error:
                        "URL é obrigatória.",

                    processed:
                        false
                });
        }


        if (
            !isValidYouTubeUrl(
                url
            )
        ) {

            return res
                .status(400)
                .json({

                    error:
                        "URL do YouTube inválida.",

                    processed:
                        false
                });
        }


        try {

            const videoId =
                extractVideoId(
                    url
                );


            const playlistId =
                extractPlaylistId(
                    url
                );


            /*
             * =================================================
             * PLAYLIST
             * =================================================
             */

            if (
                playlistId
            ) {

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


                if (
                    playlistItems.length === 0
                ) {

                    throw new Error(
                        "A playlist não possui vídeos acessíveis."
                    );
                }


                const result = {

                    url,

                    processed:
                        true,

                    type:
                        "playlist",

                    playlistId,

                    count:
                        playlistItems.length,

                    playlistItems,

                    items:
                        playlistItems,

                    timestamp:
                        new Date().toISOString()
                };


                logDebug(
                    "Playlist processada.",
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


            /*
             * =================================================
             * VÍDEO INDIVIDUAL
             * =================================================
             */

            if (
                videoId
            ) {

                const result = {

                    url,

                    processed:
                        true,

                    type:
                        "video",

                    videoId,

                    embedUrl:
                        `https://www.youtube.com/embed/${videoId}?autoplay=1`,

                    watchUrl:
                        `https://www.youtube.com/watch?v=${videoId}`,

                    thumbnail:
                        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,

                    timestamp:
                        new Date().toISOString()
                };


                return res.json(
                    result
                );
            }


            /*
             * =================================================
             * NENHUM TIPO
             * =================================================
             */

            return res
                .status(400)
                .json({

                    error:
                        "Não foi possível identificar vídeo ou playlist.",

                    processed:
                        false
                });

        } catch (error) {

            logError(
                "Erro ao processar URL do YouTube.",
                error
            );


            return res
                .status(502)
                .json({

                    error:
                        "Não foi possível processar o conteúdo do YouTube.",

                    processed:
                        false,

                    details:
                        error.message
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
                "0.4.0",

            environment:
                process.env.NODE_ENV ||
                "development",

            port:
                PORT,

            features: {

                youtubeValidation:
                    true,

                youtubeProcessing:
                    true,

                playlistScanning:
                    true,

                cors:
                    true,

                logging:
                    true
            },

            apiKeyRequired:
                false,

            endpoints: {

                health:
                    "/api/health",

                validateUrl:
                    "POST /api/youtube/validate",

                getVideoInfo:
                    "GET /api/youtube/video/:id",

                getPlaylistInfo:
                    "GET /api/youtube/playlist/:id",

                processUrl:
                    "POST /api/youtube/process",

                debug:
                    "/api/debug/info"
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
    (error, req, res, next) => {

        logError(
            "Erro não tratado.",
            error
        );


        if (
            res.headersSent
        ) {

            return next(
                error
            );
        }


        res
            .status(500)
            .json({

                error:
                    "Erro interno do servidor.",

                message:
                    error.message ||
                    ""
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
            "║   Versão 0.4.0                     ║"
        );
        console.log(
            "╚════════════════════════════════════╝"
        );
        console.log("");
        console.log(
            `✓ Servidor rodando na porta ${PORT}`
        );
        console.log(
            "✓ CORS habilitado"
        );
        console.log(
            "✓ Playlist scanner habilitado"
        );
        console.log(
            "✓ API Key do YouTube NÃO necessária"
        );
        console.log("");
    }
);