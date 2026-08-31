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

function logDebug(
    message,
    data = null
) {

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


function logError(
    message,
    error = null
) {

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
   YOUTUBE.JS
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

            youtubePromise =
                null;

            youtube =
                null;

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


    if (
        !value
    ) {

        return null;
    }


    return value.slice(
        0,
        20
    );
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


    if (
        !value
    ) {

        return null;
    }


    return value.slice(
        0,
        100
    );
}


/* =========================================================
   EXTRAI TEXTO
========================================================= */

function getText(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";
    }


    if (
        typeof value ===
        "string"
    ) {

        return value.trim();
    }


    /*
     * youtubei.js pode entregar
     * objetos Text.
     */

    if (
        typeof value.text ===
        "string"
    ) {

        return value.text.trim();
    }


    if (
        typeof value.toString ===
        "function"
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
   YOUTUBE URL
========================================================= */

function isValidYouTubeUrl(
    url
) {

    try {

        const parsed =
            new URL(url);


        const hostname =
            parsed.hostname
                .toLowerCase()
                .replace(
                    /^www\./,
                    ""
                );


        return [
            "youtube.com",
            "music.youtube.com",
            "m.youtube.com",
            "youtu.be"
        ].includes(
            hostname
        );

    } catch {

        return false;
    }
}


/* =========================================================
   VIDEO ID
========================================================= */

function extractVideoId(
    url
) {

    try {

        const parsed =
            new URL(url);


        const hostname =
            parsed.hostname
                .toLowerCase()
                .replace(
                    /^www\./,
                    ""
                );


        /*
         * youtube.com
         * youtube.com/watch?v=
         */

        if (
            hostname === "youtube.com" ||
            hostname === "music.youtube.com" ||
            hostname === "m.youtube.com"
        ) {

            if (
                parsed.pathname ===
                "/watch"
            ) {

                return cleanVideoId(
                    parsed.searchParams.get(
                        "v"
                    )
                );
            }


            /*
             * /shorts/ID
             */

            if (
                parsed.pathname.startsWith(
                    "/shorts/"
                )
            ) {

                return cleanVideoId(
                    parsed.pathname
                        .split("/")[2]
                );
            }


            /*
             * /embed/ID
             */

            if (
                parsed.pathname.startsWith(
                    "/embed/"
                )
            ) {

                return cleanVideoId(
                    parsed.pathname
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
   PLAYLIST ID
========================================================= */

function extractPlaylistId(
    url
) {

    try {

        const parsed =
            new URL(url);


        return cleanPlaylistId(
            parsed.searchParams.get(
                "list"
            )
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

            /*
             * Normalmente a última
             * possui a maior resolução.
             */

            const thumbnail =
                thumbnails[
                    thumbnails.length - 1
                ];


            if (
                thumbnail?.url
            ) {

                return thumbnail.url;
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
   NORMALIZA ITEM
========================================================= */

function normalizePlaylistItem(
    item
) {

    if (!item) {

        return null;
    }


    /*
     * youtubei.js atualmente
     * costuma fornecer `id`.
     *
     * Mantemos os outros formatos
     * como compatibilidade.
     */

    const videoId =
        cleanVideoId(
            item.id ||
            item.video_id ||
            item.videoId
        );


    if (!videoId) {

        return null;
    }


    const title =
        getText(
            item.title
        ) ||
        "Vídeo do YouTube";


    const artist =
        getText(
            item.author
        ) ||
        getText(
            item.short_byline_text
        ) ||
        getText(
            item.channel
        ) ||
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
   ESCANEIA PLAYLIST
========================================================= */

async function getPlaylistItems(
    playlistId
) {

    const yt =
        await getYouTube();


    logDebug(
        "Buscando playlist...",
        {
            playlistId
        }
    );


    /*
     * O YouTube.js aceita diretamente
     * o ID da playlist.
     */

    const playlist =
        await yt.getPlaylist(
            playlistId
        );


    if (!playlist) {

        throw new Error(
            "O YouTube não retornou a playlist."
        );
    }


    /*
     * Playlist do YouTube.js
     * expõe os itens através de `.items`.
     */

    const rawItems =
        Array.isArray(
            playlist.items
        )
            ? playlist.items
            : [];


    logDebug(
        "Itens brutos encontrados.",
        {
            playlistId,

            count:
                rawItems.length
        }
    );


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
        "Itens normalizados.",
        {
            playlistId,

            count:
                items.length
        }
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
                "0.5.0",

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

            youtube:
                "youtubei.js",

            apiKeyRequired:
                false,

            cors:
                "enabled",

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

            embedUrl:
                `https://www.youtube.com/embed/` +
                `${videoId}?autoplay=1`,

            watchUrl:
                `https://www.youtube.com/watch?v=${videoId}`,

            thumbnail:
                `https://i.ytimg.com/vi/` +
                `${videoId}/hqdefault.jpg`
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

                /*
                 * Formato principal
                 * usado pelo app.js.
                 */

                playlistItems:
                    items,

                /*
                 * Alias para facilitar
                 * compatibilidade.
                 */

                items:
                    items,

                playlistUrl:
                    `https://www.youtube.com/playlist?list=${playlistId}`
            });

        } catch (error) {

            logError(
                "Erro ao obter playlist.",
                error
            );


            return res
                .status(502)
                .json({

                    processed:
                        false,

                    error:
                        "Não foi possível obter os vídeos da playlist.",

                    details:
                        error.message || ""
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

                    processed:
                        false,

                    error:
                        "URL é obrigatória."
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

                    processed:
                        false,

                    error:
                        "URL do YouTube inválida."
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


            /* =================================================
               PLAYLIST
            ================================================= */

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
                        "Nenhum vídeo acessível foi encontrado na playlist."
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

                    title:
                        "Vídeo do YouTube",

                    artist:
                        "YouTube",

                    album:
                        "",

                    thumbnail:
                        `https://i.ytimg.com/vi/` +
                        `${videoId}/hqdefault.jpg`,

                    cover:
                        `https://i.ytimg.com/vi/` +
                        `${videoId}/hqdefault.jpg`,

                    embedUrl:
                        `https://www.youtube.com/embed/` +
                        `${videoId}?autoplay=1`,

                    watchUrl:
                        `https://www.youtube.com/watch?v=${videoId}`,

                    timestamp:
                        new Date().toISOString()
                };


                return res.json(
                    result
                );
            }


            /* =================================================
               INVÁLIDO
            ================================================= */

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
                        error.message || ""
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
                "0.5.0",

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
            "║   Versão 0.5.0                     ║"
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
            "✓ API Key do YouTube NÃO necessária"
        );

        console.log("");
    }
);