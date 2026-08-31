<div align="center">
  <h1>🎵 ApolloMusic</h1>
  <p><em>Um player de música web moderno, minimalista e fluido, integrado ao YouTube para reprodução de vídeos e playlists.</em></p>

<p>
  <img src="https://img.shields.io/badge/Status-Em_Evolução-success?style=for-the-badge" alt="Status" />
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/YouTube-FF0000?style=for-the-badge&logo=youtube&logoColor=white" alt="YouTube" />
</p>

---

## 💡 Sobre o Projeto

O **ApolloMusic** é um player de música web desenvolvido com foco em simplicidade, fluidez e experiência do usuário.

A versão atual utiliza o **YouTube** como fonte de reprodução, permitindo que o usuário cole links de vídeos ou playlists diretamente no player.

O projeto utiliza um front-end em **Vanilla JavaScript** conectado a uma API própria em **Node.js/Express**, responsável pelo processamento e validação das URLs do YouTube.

> 🚧 O ApolloMusic está em desenvolvimento contínuo e funciona como um projeto experimental para aprendizado, testes e criação de novas ideias.

---

## ✨ Principais Funcionalidades

- **▶️ Reprodução via YouTube:** Reproduza vídeos diretamente através do YouTube Player.
- **🔗 Suporte a URLs do YouTube:** Aceita diferentes formatos de links de vídeos e playlists.
- **🎶 Playlists:** Carregue playlists do YouTube e reproduza suas músicas em sequência.
- **📋 Queue funcional:** As faixas de uma playlist são organizadas automaticamente em uma fila de reprodução.
- **⏭️ Avanço automático:** O player pode avançar para a próxima faixa da fila.
- **🔍 Validação de URLs:** Verifica se o link fornecido é compatível antes de processá-lo.
- **📊 Sistema de Debug:** Registra informações importantes do funcionamento da aplicação para facilitar a identificação de problemas.
- **📡 Telemetria básica:** Coleta informações técnicas limitadas sobre pesquisas e possíveis erros para auxiliar no desenvolvimento.
- **🖥️ Interface responsiva:** Layout adaptado para diferentes tamanhos de tela.
- **🌙 Interface minimalista:** Design focado em uma experiência simples e direta.

---

## 🎬 YouTube

O ApolloMusic suporta diferentes tipos de links do YouTube, incluindo:

- Vídeos:
  `youtube.com/watch?v=VIDEO_ID`
- Links curtos:
  `youtu.be/VIDEO_ID`
- Playlists:
  `youtube.com/playlist?list=PLAYLIST_ID`
- Vídeos associados a playlists:
  `youtube.com/watch?v=VIDEO_ID&list=PLAYLIST_ID`

Ao inserir um link, o backend identifica o tipo de conteúdo e processa as informações necessárias para que o player possa reproduzi-lo.

---

## 📋 Sistema de Queue

Uma das principais funcionalidades da versão atual é o suporte a **filas de reprodução para playlists**.

Quando uma playlist é carregada, suas faixas são organizadas em uma queue no front-end. O player utiliza essa fila para controlar a faixa atual e avançar para as próximas músicas.

Isso permite transformar uma playlist comum do YouTube em uma experiência de reprodução contínua dentro do ApolloMusic.

---

## ⚙️ Como Funciona

A aplicação é dividida em duas partes principais:

1. **Backend (Node.js + Express):** Responsável por receber as requisições do front-end, validar e processar URLs do YouTube, além de fornecer endpoints para informações de vídeos, playlists e diagnóstico da aplicação.

2. **Frontend (HTML + CSS + Vanilla JavaScript):** Responsável pela interface, gerenciamento da queue, controle do estado do player e integração com o YouTube Player.

### 🔍 Debug e Telemetria

O backend possui um sistema básico de logging para auxiliar durante o desenvolvimento.

Os registros incluem informações como:

- Requisições recebidas.
- Processamento de URLs.
- Pesquisas realizadas.
- Erros encontrados durante o processamento.
- Informações de diagnóstico do servidor.

A telemetria existe principalmente para ajudar a identificar problemas e entender como os recursos da aplicação estão sendo utilizados.

> **Aviso:** O ApolloMusic não hospeda arquivos de áudio ou vídeo. A reprodução é realizada através dos recursos disponibilizados pelo próprio YouTube.

---

## 🛠️ Tecnologias Utilizadas

* **HTML5 & CSS3:** Estrutura e interface responsiva.
* **JavaScript (ES6+):** Lógica do player, queue e manipulação da interface.
* **Node.js & Express:** Backend e API intermediária.
* **YouTube Player:** Reprodução dos vídeos diretamente através do YouTube.
* **REST API:** Comunicação entre o frontend e o backend.
* **Render:** Hospedagem da versão web atual.

---

## 📁 Estrutura do Projeto

    ApolloMusic/
    ├── index.html
    ├── style.css
    ├── app.js
    ╠── api
    └── server.js

---

## 🌐 Demo

A versão atual do ApolloMusic baseada no YouTube está disponível online:

**ApolloMusic YouTube:**  
https://apollomusicyt.onrender.com/

---

## 📦 Como Executar Localmente

Para executar o projeto localmente:

1. **Clone o repositório:**

    git clone https://github.com/fofoxuto/ApolloMusic.git

2. **Entre na pasta do projeto:**

    cd ApolloMusic

3. **Instale as dependências:**

    npm install

4. **Inicie o backend:**

    node server.js

5. **Abra o frontend** no navegador ou utilize um servidor local, como o *Live Server* do VS Code.

---

## 🌿 Branches

A branch **`yt`** representa a versão atual focada na integração com o YouTube, incluindo reprodução de vídeos, playlists e gerenciamento de queue.

---

## 🔮 Futuro / Roadmap

- [ ] Melhorias no sistema de queue.
- [ ] Sistema de favoritos.
- [ ] Reprodução aleatória (*Shuffle*).
- [ ] Modos de repetição.
- [ ] Melhorias na experiência mobile.
- [ ] Melhorias no sistema de telemetria e diagnóstico.

---

## 📬 Contato & Autor

Desenvolvido com 💙 por **fofoxuto**.

- **GitHub:** https://github.com/fofoxuto
- **Instagram:** https://instagram.com/fofoxuto

---

<div align="center">
  <small>Projeto experimental criado para aprendizado, testes de ideias e construção de um player autoral.<br>O ApolloMusic não hospeda ou distribui arquivos de áudio ou vídeo.</small>
</div>