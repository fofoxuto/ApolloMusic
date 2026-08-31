/* =========================================================
   PROCESSA PLAYLIST DO YOUTUBE
========================================================= */

async function processYouTubePlaylist(url, parsed) {

    setStatus("Detectando playlist...");

    let response = null;

    /*
     * =====================================================
     * 1. BACKEND
     * =====================================================
     */

    try {

        response = await api(
            "/api/youtube/process",
            {
                method: "POST",

                body: JSON.stringify({
                    url
                })
            }
        );

        console.log(
            "[ApolloMusic] Resposta do backend:",
            response
        );

    } catch (error) {

        console.warn(
            "[ApolloMusic] Backend da playlist:",
            error
        );
    }


    /*
     * =====================================================
     * 2. PROCURA OS ITENS
     *
     * Aceita vários formatos possíveis.
     * =====================================================
     */

    let playlistItems = [];

    if (Array.isArray(response)) {

        playlistItems = response;

    } else if (response) {

        playlistItems =
            response.playlistItems ||
            response.items ||
            response.tracks ||
            response.videos ||
            response.playlist?.items ||
            response.playlist?.tracks ||
            response.data?.playlistItems ||
            response.data?.items ||
            [];
    }


    console.log(
        "[ApolloMusic] Itens encontrados:",
        playlistItems
    );


    /*
     * =====================================================
     * 3. MONTA QUEUE
     * =====================================================
     */

    let playlistQueue =
        buildQueueFromPlaylist(
            playlistItems
        );


    playlistQueue =
        removeDuplicateTracks(
            playlistQueue
        );


    /*
     * =====================================================
     * 4. FALLBACK DO IFRAME
     *
     * Só tenta isso se o backend realmente
     * não encontrou nenhum vídeo.
     * =====================================================
     */

    if (
        playlistQueue.length === 0 &&
        parsed.playlistId
    ) {

        setStatus(
            "Obtendo vídeos da playlist..."
        );


        try {

            const player =
                await ensureYouTubePlayer();


            if (
                !player ||
                typeof player.cuePlaylist !== "function"
            ) {

                throw new Error(
                    "O player do YouTube não suporta playlists."
                );
            }


            /*
             * Limpa o estado anterior.
             */

            try {

                player.stopVideo();

            } catch {
                // ignora
            }


            /*
             * Carrega a playlist.
             */

            player.cuePlaylist({
                list: parsed.playlistId,
                listType: "playlist",
                index: 0
            });


            /*
             * Espera os IDs.
             */

            const ids =
                await waitForYouTubePlaylist(
                    player,
                    8000
                );


            if (
                !Array.isArray(ids) ||
                ids.length === 0
            ) {

                throw new Error(
                    "O YouTube não retornou os vídeos dessa playlist."
                );
            }


            /*
             * IDs → queue
             */

            playlistQueue =
                ids
                    .map(id => {

                        const cleanId =
                            String(id)
                                .replace(
                                    /[^a-zA-Z0-9_-]/g,
                                    ""
                                )
                                .slice(0, 20);


                        if (!cleanId) {
                            return null;
                        }


                        return {

                            id: cleanId,

                            title:
                                "Vídeo do YouTube",

                            artist:
                                "YouTube",

                            album:
                                "",

                            cover:
                                `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`,

                            url:
                                `https://www.youtube.com/watch?v=${cleanId}`
                        };

                    })
                    .filter(Boolean);


            playlistQueue =
                removeDuplicateTracks(
                    playlistQueue
                );

        } catch (error) {

            console.error(
                "[ApolloMusic] Fallback da playlist:",
                error
            );
        }
    }


    /*
     * =====================================================
     * 5. NADA ENCONTRADO
     * =====================================================
     */

    if (
        playlistQueue.length === 0
    ) {

        throw new Error(
            "A playlist foi detectada, mas não foi possível obter os vídeos."
        );
    }


    /*
     * =====================================================
     * 6. ADICIONA À QUEUE
     * =====================================================
     */

    const wasEmpty =
        queue.length === 0;


    if (wasEmpty) {

        queue =
            playlistQueue;

        currentTrack =
            0;

    } else {

        queue.push(
            ...playlistQueue
        );
    }


    activeYouTubePlaylist =
        parsed.playlistId;


    /*
     * =====================================================
     * 7. ATUALIZA INTERFACE
     * =====================================================
     */

    renderQueue();


    setStatus(
        wasEmpty
            ? `${playlistQueue.length} músicas carregadas.`
            : `${playlistQueue.length} músicas adicionadas à fila.`
    );


    /*
     * =====================================================
     * 8. COMEÇA A TOCAR
     * =====================================================
     */

    if (wasEmpty) {

        await playCurrentTrack();
    }
}


/* =========================================================
   ESPERA A PLAYLIST DO YOUTUBE
========================================================= */

function waitForYouTubePlaylist(
    player,
    timeout = 8000
) {

    return new Promise(resolve => {

        const started =
            Date.now();


        let lastLength = 0;


        const check = () => {

            try {

                if (
                    typeof player.getPlaylist ===
                    "function"
                ) {

                    const playlist =
                        player.getPlaylist();


                    if (
                        Array.isArray(playlist) &&
                        playlist.length > 0
                    ) {

                        /*
                         * Guarda a quantidade encontrada.
                         */

                        if (
                            playlist.length !==
                            lastLength
                        ) {

                            lastLength =
                                playlist.length;

                            console.log(
                                "[ApolloMusic] Vídeos encontrados:",
                                playlist.length
                            );
                        }


                        /*
                         * Já temos IDs suficientes
                         * para montar a queue.
                         */

                        resolve(
                            playlist
                        );

                        return;
                    }
                }

            } catch (error) {

                console.warn(
                    "[ApolloMusic] getPlaylist:",
                    error
                );
            }


            /*
             * Timeout REAL.
             *
             * Nunca fica esperando para sempre.
             */

            if (
                Date.now() - started >=
                timeout
            ) {

                console.warn(
                    "[ApolloMusic] Timeout ao obter playlist."
                );


                resolve([]);


                return;
            }


            setTimeout(
                check,
                200
            );
        };


        check();
    });
}