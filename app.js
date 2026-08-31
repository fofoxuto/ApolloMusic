/* =========================================================
   PROCESSA PLAYLIST DO YOUTUBE
========================================================= */

async function processYouTubePlaylist(url, parsed) {

    if (!parsed?.playlistId) {

        throw new Error(
            "ID da playlist não encontrado."
        );
    }


    setStatus(
        "Carregando playlist..."
    );


    /*
     * =====================================================
     * 1. PEDE A PLAYLIST AO BACKEND
     * =====================================================
     */

    let response;

    try {

        response = await api(
            "/api/youtube/process",
            {
                method: "POST",

                body: JSON.stringify({
                    url: url
                })
            }
        );

    } catch (error) {

        console.error(
            "[ApolloMusic] Erro ao processar playlist:",
            error
        );

        throw new Error(
            "Não foi possível conectar ao backend."
        );
    }


    console.log(
        "[ApolloMusic] Playlist recebida:",
        response
    );


    /*
     * =====================================================
     * 2. EXTRAI OS VÍDEOS DA RESPOSTA
     *
     * O backend pode retornar:
     *
     * {
     *   playlistItems: [...]
     * }
     *
     * ou:
     *
     * {
     *   items: [...]
     * }
     *
     * ou:
     *
     * {
     *   videos: [...]
     * }
     *
     * etc.
     * =====================================================
     */

    let playlistItems = [];


    if (Array.isArray(response)) {

        playlistItems =
            response;

    }

    else if (
        Array.isArray(
            response?.playlistItems
        )
    ) {

        playlistItems =
            response.playlistItems;

    }

    else if (
        Array.isArray(
            response?.items
        )
    ) {

        playlistItems =
            response.items;

    }

    else if (
        Array.isArray(
            response?.tracks
        )
    ) {

        playlistItems =
            response.tracks;

    }

    else if (
        Array.isArray(
            response?.videos
        )
    ) {

        playlistItems =
            response.videos;

    }

    else if (
        Array.isArray(
            response?.playlist?.items
        )
    ) {

        playlistItems =
            response.playlist.items;

    }

    else if (
        Array.isArray(
            response?.data?.items
        )
    ) {

        playlistItems =
            response.data.items;
    }


    /*
     * =====================================================
     * 3. VERIFICA SE O BACKEND RETORNOU ALGUMA COISA
     * =====================================================
     */

    if (
        playlistItems.length === 0
    ) {

        console.error(
            "[ApolloMusic] Backend não retornou vídeos:",
            response
        );


        throw new Error(
            "A playlist foi encontrada, mas o backend não retornou os vídeos."
        );
    }


    console.log(
        "[ApolloMusic] Vídeos encontrados:",
        playlistItems.length
    );


    /*
     * =====================================================
     * 4. TRANSFORMA OS ITENS EM QUEUE
     * =====================================================
     */

    let playlistQueue =
        buildQueueFromPlaylist(
            playlistItems
        );


    /*
     * Remove duplicados.
     */

    playlistQueue =
        removeDuplicateTracks(
            playlistQueue
        );


    /*
     * =====================================================
     * 5. VALIDAÇÃO FINAL
     * =====================================================
     */

    if (
        playlistQueue.length === 0
    ) {

        throw new Error(
            "Os vídeos foram encontrados, mas nenhum possui um ID válido."
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

    }

    else {

        queue.push(
            ...playlistQueue
        );
    }


    /*
     * Guarda a playlist atual.
     */

    activeYouTubePlaylist =
        parsed.playlistId;


    /*
     * =====================================================
     * 7. ATUALIZA INTERFACE
     * =====================================================
     */

    renderQueue();

    updateControls();


    /*
     * =====================================================
     * 8. STATUS
     * =====================================================
     */

    if (wasEmpty) {

        setStatus(
            `${playlistQueue.length} músicas carregadas.`
        );

    }

    else {

        setStatus(
            `${playlistQueue.length} músicas adicionadas à fila.`
        );
    }


    /*
     * =====================================================
     * 9. COMEÇA A PRIMEIRA MÚSICA
     * =====================================================
     */

    if (wasEmpty) {

        await playCurrentTrack();
    }
}