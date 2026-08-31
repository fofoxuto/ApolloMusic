<div align="center">
  <h1>🎵 ApolloMusic - Changelog</h1>
  <p><em>Acompanhe a evolução do projeto através de suas principais versões.</em></p>

<p>
  <img src="https://img.shields.io/badge/Versao-0.3.0-blue?style=for-the-badge" alt="Versão Atual" />
  <img src="https://img.shields.io/badge/Status-Em_Evolucao-success?style=for-the-badge" alt="Status" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/YouTube-FF0000?style=for-the-badge&logo=youtube&logoColor=white" alt="YouTube" />
</p>

---

</div>

## 💡 Sobre as Versões

O **ApolloMusic** é um player de áudio web desenvolvido com foco em performance, minimalismo e experiência do usuário. Este changelog documenta a evolução do projeto através de suas principais versões.

---

## [0.3.0] - YouTube Integration - 2026-08-31

### 🎬 Grandes Alterações

Esta versão marca a transição completa de um **reprodutor Audius** para um **reprodutor YouTube** com suporte a vídeos e playlists.

### ✨ Novidades

#### Frontend (app.js)
- ✅ **Novo sistema de reprodução**: Suporte completo a links do YouTube
- ✅ **Input simplificado**: Um único campo para colar links de vídeos ou playlists
- ✅ **Renderização de iframe**: Integração nativa do YouTube Player
- ✅ **Validação de URL**: Verifica se o link é válido antes de processar
- ✅ **Suporte a múltiplos formatos de URL**:
  - `youtube.com/watch?v=VIDEO_ID`
  - `youtu.be/VIDEO_ID`
  - `youtube.com/playlist?list=PLAYLIST_ID`
  - `youtube.com/watch?v=VIDEO_ID&list=PLAYLIST_ID`

#### Interface (index.html)
- ✅ **Splash screen atualizado**: Agora exibe "YOUTUBE PLAYER"
- ✅ **Novo layout**: Container dedicado para o iframe
- ✅ **Input YouTube**: Campo para colar links
- ✅ **Botão "Reproduzir"**: Inicia a reprodução do conteúdo

#### Backend (api/server.js)

**🔍 Sistema de Debug Completo**
- ✅ **Funções de logging estruturado**:
  - `logDebug(message, data)` - Log com timestamp ISO e nível [DEBUG]
  - `logError(message, error)` - Log com timestamp ISO e nível [ERROR]

**🎯 Funções de Extração de YouTube**
- ✅ `extractVideoId(url)` - Extrai ID do vídeo de diferentes formatos de URL
- ✅ `extractPlaylistId(url)` - Extrai ID da playlist
- ✅ `isValidYouTubeUrl(url)` - Valida se uma URL pertence ao YouTube

**📡 Novos Endpoints de API**

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/youtube/validate` | POST | Valida uma URL do YouTube |
| `/api/youtube/process` | POST | Processa URL com debug completo ⭐ |
| `/api/youtube/video/:id` | GET | Retorna informações de um vídeo |
| `/api/youtube/playlist/:id` | GET | Retorna informações de uma playlist |
| `/api/debug/info` | GET | Painel completo de informações do servidor |

### 🔄 Mudanças de Arquitetura

- **Antes**: Sistema Audius com filas, busca integrada e streaming de áudio
- **Depois**: Sistema YouTube com embeds nativos, validação de URLs e logging estruturado

### 📋 Recursos Técnicos

- ✅ Validação de URLs em múltiplos formatos (`youtube.com`, `youtu.be`, `m.youtube.com`)
- ✅ Sistema de debug com timestamp ISO 8601
- ✅ CORS habilitado para POST requests
- ✅ Logging estruturado com níveis [DEBUG] e [ERROR]

---

## [0.2.0] - Audius Integration - 2026-08-xx

### ✨ Funcionalidades Principais

- ✅ **Streaming via Audius**: Reprodução de faixas diretamente do ecossistema Audius
- ✅ **Pesquisa Integrada**: Busque músicas e artistas no catálogo
- ✅ **Metadados Completos**: Título, artista, álbum e capas oficiais
- ✅ **Controles Avançados**: Play, pause, navegação entre faixas e barra de progresso
- ✅ **Media Session API**: Suporte nativo aos controles do sistema operacional
- ✅ **Gerenciamento de Fila**: Contador de músicas e avanço automático
- ✅ **Splash Screen**: Tela de carregamento elegante
- ✅ **Tema Escuro Nativo**: Interface limpa e responsiva

### 🛠️ Tecnologias

- HTML5 & CSS3 - Estruturação e design
- JavaScript (ES6+) - Lógica do player
- Node.js & Express - API intermediária
- Audius API - Catálogo e áudio
- Media Session API - Controles nativos
- Google Fonts - Tipografia

---

## [0.1.0] - Initial Release

### 🎯 Fundação

- Estrutura básica do projeto
- Setup inicial frontend/backend
- Integração com Audius API
- Interface minimalista

---

## 📊 Roadmap Futuro

- [ ] Sistema de playlists personalizadas
- [ ] Salvamento de favoritos
- [ ] Histórico de reprodução recente
- [ ] Modos de repetição e shuffle
- [ ] Melhorias para dispositivos móveis
- [ ] Adicionar suporte a YouTube Data API para mais metadados
- [ ] Implementar cache de URLs processadas
- [ ] Criar painel visual de debug

---

## 🔐 Compatibilidade

- **Node.js**: v14+
- **Express**: v4.17+
- **Browsers**: Chrome, Firefox, Safari, Edge (com Media Session API)
- **Métodos HTTP**: GET, HEAD, OPTIONS, POST

---

## 📬 Informações do Projeto

- **Desenvolvido por**: [@fofoxuto](https://github.com/fofoxuto)
- **Repositório**: [ApolloMusic](https://github.com/fofoxuto/ApolloMusic)
- **Status**: Em Evolução
- **Licença**: Verifique LICENSE.md

---

<div align="center">
  <small>O ApolloMusic é um projeto experimental criado para aprendizado e testes de ideias.<br>Nenhum arquivo de áudio é hospedado ou distribuído pelo projeto.</small>
</div>
