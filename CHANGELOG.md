# Changelog - ApolloMusic YouTube Version

## [0.3.0] - 2026-08-31

### 🎬 Grandes Alterações

Esta versão marca a transição completa de um **reprodutor Audius** para um **reprodutor YouTube** com suporte a vídeos e playlists.

---

## ✨ Novidades

### Frontend (app.js)
- ✅ **Novo sistema de reprodução**: Suporte completo a links do YouTube
- ✅ **Input simplificado**: Um único campo para colar links de vídeos ou playlists
- ✅ **Renderização de iframe**: Integração nativa do YouTube Player
- ✅ **Validação de URL**: Verifica se o link é válido antes de processar
- ✅ **Suporte a múltiplos formatos de URL**:
  - `youtube.com/watch?v=VIDEO_ID`
  - `youtu.be/VIDEO_ID`
  - `youtube.com/playlist?list=PLAYLIST_ID`
  - `youtube.com/watch?v=VIDEO_ID&list=PLAYLIST_ID`

### Interface (index.html)
- ✅ **Splash screen atualizado**: Agora exibe "YOUTUBE PLAYER"
- ✅ **Novo layout**: Container dedicado para o iframe
- ✅ **Input YouTube**: Campo para colar links
- ✅ **Botão "Reproduzir"**: Inicia a reprodução do conteúdo

### Backend (api/server.js)

#### 🔍 Sistema de Debug Completo
- ✅ **Funções de logging estruturado**:
  - `logDebug(message, data)` - Log com timestamp ISO e nível [DEBUG]
  - `logError(message, error)` - Log com timestamp ISO e nível [ERROR]
  
  **Exemplo de saída**:
  ```
  [2026-08-31T17:04:08.123Z] [DEBUG] POST /api/youtube/process
  {
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  }
  ```

#### 🎯 Funções de Extração de YouTube
- ✅ `extractVideoId(url)` - Extrai ID do vídeo de diferentes formatos de URL
- ✅ `extractPlaylistId(url)` - Extrai ID da playlist
- ✅ `isValidYouTubeUrl(url)` - Valida se uma URL pertence ao YouTube

#### 📡 Novos Endpoints de API

**POST /api/youtube/validate**
- Valida uma URL do YouTube
- Extrai IDs de vídeo e playlist
- Retorna tipo de conteúdo (vídeo ou playlist)
- **Exemplo de requisição**:
  ```javascript
  POST /api/youtube/validate
  Body: { "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }
  ```

**POST /api/youtube/process** ⭐ (Principal)
- Processa a URL do YouTube
- **Faz debug completo da URL no console do servidor**
- Valida e extrai IDs
- Retorna embed URL pronta para uso
- **Exemplo de requisição**:
  ```javascript
  POST /api/youtube/process
  Body: { "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }
  
  Response:
  {
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "processed": true,
    "type": "video",
    "videoId": "dQw4w9WgXcQ",
    "embedUrl": "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1",
    "timestamp": "2026-08-31T17:04:08.123Z"
  }
  ```

**GET /api/youtube/video/:id**
- Retorna informações de um vídeo específico
- Inclui URL de embed e watch

**GET /api/youtube/playlist/:id**
- Retorna informações de uma playlist específica
- Inclui URL de embed e acesso direto

**GET /api/debug/info** ⭐ (Debug)
- Painel completo de informações do servidor
- Lista todos os endpoints disponíveis
- Mostra features ativas
- Status da API

---

## 🔄 Mudanças de Arquitetura

### app.js
**Antes:**
```javascript
let queue = [];
let currentTrack = 0;
let player = null;
async function searchAudius(query) { ... }
```

**Depois:**
```javascript
let youtubeUrl = null;
async function processYouTubeUrl(url) { ... }
function renderYouTubeIframe(videoId, playlistId) { ... }
```

### index.html
**Antes:**
- Seção "Audius"
- Controles de áudio do player
- Lista de resultados

**Depois:**
- Seção "YouTube"
- Container para iframe do YouTube
- Input para links diretos

### api/server.js
**Antes:**
- Endpoints Audius (search, trending, track, stream)
- Integração com API Audius
- Streaming de áudio

**Depois:**
- Endpoints YouTube (validate, process, video, playlist)
- Extração e validação de URLs
- Debug estruturado
- Sistema de logging com timestamp

---

## 🛠️ Recursos Técnicos

### Validação de URLs
A API agora valida automaticamente os seguintes formatos:
- ✅ `youtube.com`
- ✅ `www.youtube.com`
- ✅ `youtu.be`
- ✅ `www.youtu.be`
- ✅ `m.youtube.com`

### Sistema de Debug
Todos os endpoints agora registram:
- Timestamp em ISO 8601
- Nível de log ([DEBUG], [ERROR])
- Dados da requisição
- Status da operação

**Exemplo no console**:
```
[2026-08-31T17:04:08.123Z] [DEBUG] POST /api/youtube/process
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}

[2026-08-31T17:04:08.456Z] [DEBUG] URL processada com sucesso
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "processed": true,
  "type": "video",
  "videoId": "dQw4w9WgXcQ",
  "embedUrl": "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1",
  "timestamp": "2026-08-31T17:04:08.456Z"
}
```

---

## 📋 Endpoints Disponíveis

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/` | Root endpoint |
| GET | `/api/health` | Health check |
| POST | `/api/youtube/validate` | Valida URL do YouTube |
| POST | `/api/youtube/process` | Processa URL (com debug) ⭐ |
| GET | `/api/youtube/video/:id` | Info do vídeo |
| GET | `/api/youtube/playlist/:id` | Info da playlist |
| GET | `/api/debug/info` | Painel de debug |

---

## 🔐 CORS

Adicionado suporte a método POST no CORS:
```javascript
methods: ["GET", "HEAD", "OPTIONS", "POST"]
```

---

## 📦 Versão

- **Versão Anterior**: 0.2.0 (Audius)
- **Nova Versão**: 0.3.0 (YouTube)
- **Tipo**: Major Release

---

## 🚀 Como Usar

### 1. Colar um link do YouTube
```
https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

### 2. Clicar em "Reproduzir"
O frontend envia para: `POST /api/youtube/process`

### 3. Server faz debug
Console mostra:
```
[ISO_TIMESTAMP] [DEBUG] POST /api/youtube/process
{ "url": "..." }

[ISO_TIMESTAMP] [DEBUG] URL processada com sucesso
{ "url": "...", "videoId": "...", ... }
```

### 4. Iframe renderizado
A URL é carregada no iframe e começa a reprodução

---

## 🐛 Debug

Para ver logs completos de debug:
1. Acesse `/api/debug/info` para informações da API
2. Verifique o console do servidor para logs estruturados
3. Cada requisição POST registra timestamp, URL e resultado

---

## ⚠️ Notas Importantes

- ✅ A branch `yt` é completamente independente
- ✅ A branch `main` permanece intacta com versão Audius
- ✅ Nenhuma alteração foi feita na `main`
- ✅ Debug está **ativo por padrão**
- ✅ Todos os logs incluem timestamp ISO

---

## 📝 Compatibilidade

- **Node.js**: v14+
- **Express**: v4.17+
- **CORS**: Habilitado para todas as origens
- **Métodos HTTP**: GET, HEAD, OPTIONS, POST

---

## 🎯 Próximos Passos (Sugestões)

- [ ] Adicionar suporte a YouTube Data API para mais metadados
- [ ] Implementar cache de URLs processadas
- [ ] Adicionar histórico de reproduções
- [ ] Criar painel visual de debug
- [ ] Adicionar validação de permissões do iframe

---

**Desenvolvido por**: @fofoxuto  
**Data**: 2026-08-31  
**Branch**: `yt`
