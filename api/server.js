const express = require("express");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 10000;


/* =========================================================
   CORS
========================================================= */

const corsOptions = {
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
};


app.use(cors(corsOptions));


/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(express.json());


/* =========================================================
   LOGGER DEBUG
========================================================= */

function logDebug(message, data = null) {

    const timestamp = new Date().toISOString();

    const logMessage = `[${timestamp}] [DEBUG] ${message}`;

    console.log(logMessage);

    if (data) {
        console.log(JSON.stringify(data, null, 2));
    }
}


function logError(message, error = null) {

    const timestamp = new Date().toISOString();

    const logMessage = `[${timestamp}] [ERROR] ${message}`;

    console.error(logMessage);

    if (error) {
        console.error(error);
    }
}


/* =========================================================
   YOUTUBE UTILITIES
========================================================= */

/**
 * Extrai o ID do vídeo de uma URL do YouTube
 */
function extractVideoId(url) {

    try {

        const urlObj = new URL(url);

        // youtube.com/watch?v=VIDEO_ID
        if (urlObj.hostname.includes('youtube.com')) {
            return urlObj.searchParams.get('v');
        }

        // youtu.be/VIDEO_ID
        if (urlObj.hostname.includes('youtu.be')) {
            return urlObj.pathname.slice(1);
        }

        // youtube.com/embed/VIDEO_ID
        if (urlObj.pathname.includes('/embed/')) {
            return urlObj.pathname.split('/embed/')[1];
        }

    } catch (error) {
        logError("Erro ao extrair ID do vídeo", error);
    }

    return null;
}


/**
 * Extrai o ID da playlist de uma URL do YouTube
 */
function extractPlaylistId(url) {

    try {

        const urlObj = new URL(url);

        // youtube.com/playlist?list=PLAYLIST_ID
        if (urlObj.hostname.includes('youtube.com') && urlObj.searchParams.has('list')) {
            return urlObj.searchParams.get('list');
        }

        // youtube.com/watch?v=VIDEO_ID&list=PLAYLIST_ID
        if (urlObj.searchParams.has('list')) {
            return urlObj.searchParams.get('list');
        }

    } catch (error) {
        logError("Erro ao extrair ID da playlist", error);
    }

    return null;
}


/**
 * Valida se uma URL é válida do YouTube
 */
function isValidYouTubeUrl(url) {

    try {

        const urlObj = new URL(url);

        const validHosts = [
            'youtube.com',
            'www.youtube.com',
            'youtu.be',
            'www.youtu.be',
            'm.youtube.com'
        ];

        return validHosts.some(host =>
            urlObj.hostname.includes(host)
        );

    } catch (error) {
        return false;
    }
}


/* =========================================================
   ROOT
========================================================= */

app.get("/", (req, res) => {

    logDebug("GET / - Requisição raiz recebida");

    res.json({

        name:
            "ApolloMusic API - YouTube",

        version:
            "0.3.0",

        status:
            "online",

        cors:
            "enabled",

        type:
            "youtube-player"
    });
});


/* =========================================================
   HEALTH
========================================================= */

app.get("/api/health", (req, res) => {

    logDebug("GET /api/health - Health check recebido");

    res.json({

        status:
            "ok",

        service:
            "apollo-music-youtube-api",

        cors:
            "enabled",

        timestamp:
            new Date().toISOString()
    });
});


/* =========================================================
   YOUTUBE — VALIDATE URL
========================================================= */

app.post(
    "/api/youtube/validate",
    (req, res) => {

        const { url } = req.body;

        logDebug("POST /api/youtube/validate", { url });

        if (!url) {

            logError("URL não fornecida");

            return res.status(400).json({

                error:
                    "URL é obrigatória.",

                valid:
                    false
            });
        }

        const valid = isValidYouTubeUrl(url);
        const videoId = extractVideoId(url);
        const playlistId = extractPlaylistId(url);

        logDebug("Validação concluída", {
            url,
            valid,
            videoId,
            playlistId
        });

        res.json({

            url,

            valid,

            videoId:
                videoId || null,

            playlistId:
                playlistId || null,

            type:
                videoId ? "video" : (playlistId ? "playlist" : null)
        });
    }
);


/* =========================================================
   YOUTUBE — GET VIDEO INFO
========================================================= */

app.get(
    "/api/youtube/video/:id",
    async (req, res) => {

        const { id } = req.params;

        logDebug("GET /api/youtube/video/:id", { videoId: id });

        try {

            if (!id) {

                logError("ID do vídeo não fornecido");

                return res.status(400).json({

                    error:
                        "ID do vídeo é obrigatório."
                });
            }

            res.json({

                status:
                    "success",

                videoId:
                    id,

                type:
                    "video",

                embedUrl:
                    `https://www.youtube.com/embed/${id}?autoplay=1`,

                watchUrl:
                    `https://www.youtube.com/watch?v=${id}`,

                message:
                    "Vídeo pronto para reprodução"
            });

            logDebug("Vídeo retornado com sucesso", { videoId: id });

        } catch (error) {

            logError("Erro ao obter informações do vídeo", error);

            res.status(502).json({

                error:
                    "Não foi possível obter as informações do vídeo."
            });
        }
    }
);


/* =========================================================
   YOUTUBE — GET PLAYLIST INFO
========================================================= */

app.get(
    "/api/youtube/playlist/:id",
    async (req, res) => {

        const { id } = req.params;

        logDebug("GET /api/youtube/playlist/:id", { playlistId: id });

        try {

            if (!id) {

                logError("ID da playlist não fornecido");

                return res.status(400).json({

                    error:
                        "ID da playlist é obrigatório."
                });
            }

            res.json({

                status:
                    "success",

                playlistId:
                    id,

                type:
                    "playlist",

                embedUrl:
                    `https://www.youtube.com/embed/videoseries?list=${id}&autoplay=1`,

                playlistUrl:
                    `https://www.youtube.com/playlist?list=${id}`,

                message:
                    "Playlist pronta para reprodução"
            });

            logDebug("Playlist retornada com sucesso", { playlistId: id });

        } catch (error) {

            logError("Erro ao obter informações da playlist", error);

            res.status(502).json({

                error:
                    "Não foi possível obter as informações da playlist."
            });
        }
    }
);


/* =========================================================
   YOUTUBE — PROCESS URL
========================================================= */

app.post(
    "/api/youtube/process",
    async (req, res) => {

        const { url } = req.body;

        logDebug("POST /api/youtube/process", { url });

        if (!url) {

            logError("URL não fornecida no processo");

            return res.status(400).json({

                error:
                    "URL é obrigatória.",

                processed:
                    false
            });
        }

        try {

            if (!isValidYouTubeUrl(url)) {

                logError("URL inválida", { url });

                return res.status(400).json({

                    error:
                        "URL do YouTube inválida.",

                    url,

                    processed:
                        false
                });
            }

            const videoId = extractVideoId(url);
            const playlistId = extractPlaylistId(url);

            const result = {

                url,

                processed:
                    true,

                type:
                    videoId ? "video" : (playlistId ? "playlist" : null),

                videoId:
                    videoId || null,

                playlistId:
                    playlistId || null,

                embedUrl:
                    videoId
                        ? `https://www.youtube.com/embed/${videoId}?autoplay=1`
                        : `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=1`,

                timestamp:
                    new Date().toISOString()
            };

            logDebug("URL processada com sucesso", result);

            res.json(result);

        } catch (error) {

            logError("Erro ao processar URL", error);

            res.status(500).json({

                error:
                    "Erro ao processar a URL.",

                processed:
                    false
            });
        }
    }
);


/* =========================================================
   DEBUG ENDPOINT
========================================================= */

app.get("/api/debug/info", (req, res) => {

    logDebug("GET /api/debug/info - Requisição de debug recebida");

    res.json({

        status:
            "debug-active",

        service:
            "ApolloMusic YouTube API",

        version:
            "0.3.0",

        environment:
            process.env.NODE_ENV || "development",

        port:
            PORT,

        features: {

            youtubeValidation:
                true,

            youtubeProcessing:
                true,

            cors:
                true,

            logging:
                true
        },

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
                "GET /api/debug/info"
        },

        timestamp:
            new Date().toISOString()
    });
});


/* =========================================================
   404
========================================================= */

app.use(
    (req, res) => {

        logDebug("404 - Rota não encontrada", {
            method: req.method,
            path: req.path
        });

        res.status(404).json({

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

        logError("Erro não tratado", error);

        if (res.headersSent) {
            return next(error);
        }

        res.status(500).json({

            error:
                "Erro interno do servidor.",

            message:
                error.message || ""
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

        console.log("\n");
        console.log("╔════════════════════════════════════╗");
        console.log("║   ApolloMusic API - YouTube        ║");
        console.log("║   Versão 0.3.0                     ║");
        console.log("╚════════════════════════════════════╝");
        console.log(`\n✓ Servidor rodando na porta ${PORT}`);
        console.log(`✓ CORS habilitado`);
        console.log(`✓ Debug ativo`);
        console.log(`✓ Endpoint de debug: /api/debug/info\n`);
    }
);
