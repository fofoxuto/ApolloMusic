<div align="center">
  <h1>🎵 ApolloMusic</h1>
  <p><em>Um player de música web moderno, minimalista e fluido, integrado ao Audius para descoberta e reprodução.</em></p>

<p>
  <img src="https://img.shields.io/badge/Status-Em_Evolucao-success?style=for-the-badge" alt="Status" />
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
</p>

---

## 💡 Sobre o Projeto

O **ApolloMusic** é um player de áudio web desenvolvido com foco em performance, minimalismo e experiência do usuário. Utilizando uma arquitetura moderna, o front-end em **Vanilla JavaScript** comunica-se com uma API própria em **Node.js/Express**, que interage diretamente com o catálogo descentralizado do **Audius** para busca e streaming de músicas.

---

## ✨ Principais Funcionalidades

- **Streaming via Audius:** Reprodução de faixas diretamente do ecossistema Audius.
- **Pesquisa Integrada:** Busque músicas e artistas direto pelo catálogo da plataforma.
- **Metadados Completos:** Exibição dinâmica de título, artista, álbum e capas oficiais.
- **Controles Avançados:** Play, pause, navegação entre faixas e barra de progresso interativa (*seek* por clique/arraste).
- **Media Session API:** Suporte nativo aos controles de mídia do sistema operacional (teclas de mídia do teclado, central de notificações, etc.).
- **Gerenciamento de Fila:** Contador de músicas na fila e avanço automático para a próxima faixa.
- **Splash Screen:** Tela de carregamento elegante na inicialização.
- **Tema Escuro Nativo:** Interface limpa, imersiva e totalmente responsiva.

---

## ⚙️ Como Funciona

A aplicação é dividida em duas frentes para garantir segurança e fluidez:
1. **Backend (Node.js + Express):** Atua como uma camada intermediária que recebe as buscas do front-end, processa as requisições e interage com a API do Audius, retornando os fluxos de streaming e dados das músicas.
2. **Frontend (Vanilla JS):** Gerencia a interface, os estados de reprodução, a manipulação do DOM e a integração com a API de mídia do navegador.

> **Aviso:** O projeto não hospeda nenhum arquivo de áudio. Todo o conteúdo reproduzido é obtido legalmente através dos serviços e catálogos abertos do Audius.

---

## 🛠️ Tecnologias Utilizadas

* **HTML5 & CSS3:** Estruturação semântica e design responsivo.
* **JavaScript (ES6+):** Lógica do player e manipulação da interface.
* **Node.js & Express:** API intermediária para comunicação com o Audius.
* **Audius API:** Provedor oficial de catálogo e áudio.
* **Media Session API:** Integração com controles nativos do sistema.
* **Google Fonts:** Tipografia refinada.

---

## 📁 Estrutura do Projeto

```text
ApolloMusic/
├── index.html
├── style.css
├── app.js
└── server.js
```

---

## 📦 Como Executar Localmente

Para rodar o projeto completo (frontend e backend), siga os passos abaixo:

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/fofoxuto/ApolloMusic.git
   ```
2. **Entre na pasta do projeto:**
   ```bash
   cd ApolloMusic
   ```
3. **Instale as dependências do servidor:**
   ```bash
   npm install
   ```
4. **Inicie a API (Backend):**
   ```bash
   node server.js
   ```
5. **Execute o Frontend** abrindo o arquivo `index.html` diretamente no navegador ou utilizando uma extensão de servidor local (como o *Live Server* do VS Code).

---

## 🔮 Futuro / Roadmap

- [ ] Sistema de playlists personalizadas e salvamento de favoritos.
- [ ] Histórico de reprodução recente.
- [ ] Modos de repetição e reprodução aleatória (*Shuffle*).
- [ ] Melhorias na interface para dispositivos móveis.

---

## 📬 Contato & Autor

Desenvolvido com 💙 por **fofoxuto**.

- **GitHub:** [@fofoxuto](https://github.com/fofoxuto)
- **Instagram:** [@fofoxuto](https://instagram.com/fofoxuto)

---

<div align="center">
  <small>Projeto experimental criado para aprendizado, testes de ideias e construção de um player autoral.<br>O ApolloMusic não hospeda ou distribui arquivos de áudio protegidos.</small>
</div>
