const express = require("express");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 10000;
const AUDIUS_API = "https://api.audius.co/v1";


/* =========================================================
   CORS
========================================================= */

const corsOptions = {
    origin: true,

    methods: [
        "GET",
        "HEAD",
        "OPTIONS"
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
   AUDIUS FETCH
========================================================= */

async function audiusFetch(path, options = {}) {

    const url =
        `${AUDIUS_API}${path}`;

    const response =
        await fetch(url, {

            ...options,

            headers: {
                Accept:
                    "application/json",

                ...(process.env.AUDIUS_API_KEY
                    ? {
                        "api-key":
                            process.env.AUDIUS_API_KEY
                    }
                    : {}),

                ...(options.headers || {})
            }
        });


    if (!response.ok) {

        throw new Error(
            `Audius HTTP ${response.status}`
        );
    }


    return response;
}


/* =========================================================
   ROOT
========================================================= */

app.get("/", (req, res) => {

    res.json({

        name:
            "ApolloMusic API",

        version:
            "0.2.0",

        status:
            "online",

        cors:
            "enabled"
    });
});


/* =========================================================
   HEALTH
========================================================= */

app.get("/api/health", (req, res) => {

    res.json({

        status:
            "ok",

        service:
            "apollo-music-api",

        cors:
            "enabled"
    });
});


/* =========================================================
   AUDIUS — SEARCH
========================================================= */

app.get(
    "/api/audius/search",
    async (req, res) => {

        const query =
            String(
                req.query.q || ""
            ).trim();


        if (!query) {

            return res.status(400).json({

                error:
                    "Informe o que deseja pesquisar."
            });
        }


        try {

            const limit =
                Math.min(
                    Math.max(
                        Number(
                            req.query.limit || 20
                        ),
                        1
                    ),
                    50
                );


            const params =
                new URLSearchParams({

                    query,

                    limit:
                        String(limit),

                    sort_method:
                        "relevant"
                });


            const response =
                await audiusFetch(
                    `/tracks/search?${params}`
                );


            const data =
                await response.json();


            const tracks =
                Array.isArray(data.data)
                    ? data.data.map(track => ({

                        id:
                            track.id || "",

                        title:
                            track.title || "Sem título",

                        artist:
                            track.user?.name ||
                            "Artista desconhecido",

                        duration:
                            Number(
                                track.duration
                            ) || 0,

                        artwork:
                            track.artwork?._480x480 ||
                            track.artwork?._1000x1000 ||
                            "",

                        genre:
                            track.genre || "",

                        mood:
                            track.mood || "",

                        permalink:
                            track.permalink || "",

                        streamable:
                            track.isStreamable === true ||
                            track.isStreamable === "true",

                        downloadable:
                            track.downloadable === true

                    }))
                    : [];


            res.json({

                source:
                    "audius",

                query,

                results:
                    tracks
            });


        } catch (error) {

            console.error(
                "Audius search:",
                error
            );


            res.status(502).json({

                error:
                    "Não foi possível pesquisar no Audius."
            });
        }
    }
);


/* =========================================================
   AUDIUS — TRENDING
========================================================= */

app.get(
    "/api/audius/trending",
    async (req, res) => {

        try {

            const limit =
                Math.min(
                    Math.max(
                        Number(
                            req.query.limit || 20
                        ),
                        1
                    ),
                    50
                );


            const params =
                new URLSearchParams({

                    limit:
                        String(limit)
                });


            const response =
                await audiusFetch(
                    `/tracks/trending?${params}`
                );


            const data =
                await response.json();


            const tracks =
                Array.isArray(data.data)
                    ? data.data.map(track => ({

                        id:
                            track.id || "",

                        title:
                            track.title || "Sem título",

                        artist:
                            track.user?.name ||
                            "Artista desconhecido",

                        duration:
                            Number(
                                track.duration
                            ) || 0,

                        artwork:
                            track.artwork?._480x480 ||
                            track.artwork?._1000x1000 ||
                            "",

                        genre:
                            track.genre || "",

                        playCount:
                            Number(
                                track.playCount
                            ) || 0,

                        permalink:
                            track.permalink || ""

                    }))
                    : [];


            res.json({

                source:
                    "audius",

                results:
                    tracks
            });


        } catch (error) {

            console.error(
                "Audius trending:",
                error
            );


            res.status(502).json({

                error:
                    "Não foi possível obter as músicas em alta."
            });
        }
    }
);


/* =========================================================
   AUDIUS — TRACK
========================================================= */

app.get(
    "/api/audius/track/:id",
    async (req, res) => {

        try {

            const response =
                await audiusFetch(
                    `/tracks/${encodeURIComponent(
                        req.params.id
                    )}`
                );


            const data =
                await response.json();


            const track =
                data.data;


            if (!track) {

                return res.status(404).json({

                    error:
                        "Música não encontrada."
                });
            }


            res.json({

                source:
                    "audius",

                track: {

                    id:
                        track.id || "",

                    title:
                        track.title || "Sem título",

                    artist:
                        track.user?.name ||
                        "Artista desconhecido",

                    duration:
                        Number(
                            track.duration
                        ) || 0,

                    artwork:
                        track.artwork?._1000x1000 ||
                        track.artwork?._480x480 ||
                        "",

                    genre:
                        track.genre || "",

                    mood:
                        track.mood || "",

                    description:
                        track.description || "",

                    permalink:
                        track.permalink || "",

                    streamable:
                        track.isStreamable === true ||
                        track.isStreamable === "true",

                    downloadable:
                        track.downloadable === true
                }
            });


        } catch (error) {

            console.error(
                "Audius track:",
                error
            );


            res.status(502).json({

                error:
                    "Não foi possível obter a música."
            });
        }
    }
);


/* =========================================================
   AUDIUS — STREAM
========================================================= */

app.get(
    "/api/audius/stream/:id",
    async (req, res) => {

        try {

            const response =
                await audiusFetch(
                    `/tracks/${encodeURIComponent(
                        req.params.id
                    )}/stream`
                );


            /*
             * O Audius responde com um redirect
             * para o servidor que realmente entrega
             * o áudio.
             */

            res.redirect(
                response.url
            );


        } catch (error) {

            console.error(
                "Audius stream:",
                error
            );


            res.status(502).json({

                error:
                    "Não foi possível obter o stream."
            });
        }
    }
);


/* =========================================================
   404
========================================================= */

app.use(
    (req, res) => {

        res.status(404).json({

            error:
                "Rota não encontrada.",

            path:
                req.path
        });
    }
);


/* =========================================================
   ERROR HANDLER
========================================================= */

app.use(
    (error, req, res, next) => {

        console.error(
            "Servidor:",
            error
        );


        if (res.headersSent) {
            return next(error);
        }


        res.status(500).json({

            error:
                "Erro interno do servidor."
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

        console.log(
            `ApolloMusic API rodando na porta ${PORT}`
        );

        console.log(
            `CORS habilitado`
        );
    }
);