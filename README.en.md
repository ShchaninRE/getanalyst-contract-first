<div align="center">

# GetAnalyst · Contract-first

**OpenAPI + AsyncAPI + ReDoc + Swagger UI + Prism**  
A small educational project about the **Contract-first** approach for the [GetAnalyst](https://www.youtube.com/c/GetAnalyst) podcast.

| [Русский](README.md) | **English** |
|:--:|:--:|

</div>

---

## What this project is about

This project describes a simple collaborative board API: retrieve a board, create, edit or delete a sticky note, add a comment, and resolve it.

The main idea is to show how an API contract can be prepared **before the backend is developed**. With the contract already available, you can:

- read the OpenAPI documentation in **ReDoc**;
- send requests through **Swagger UI**;
- simulate the API with **Prism**;
- describe events separately with **AsyncAPI**.

The project runs on **macOS, Windows, and Linux**. You do not need Docker, WSL, Python, or a separate message broker.

## What you need to install

You only need three things to run the project.

### 1. Git

Git is used to download the project from GitHub and, if needed, receive later updates.

Download Git: https://git-scm.com/downloads

After installation, open Terminal on macOS/Linux or PowerShell/Terminal on Windows and check:

```bash
git --version
```

If the command prints a version number, Git is installed.

### 2. Node.js

The project requires Node.js **20.19 or newer, but lower than 25**. The recommended option is the current **Node.js 22 LTS** release.

Download Node.js: https://nodejs.org/

`npm` is installed together with Node.js, so you do not need to install it separately.

Check the installation:

```bash
node --version
npm --version
```

Both commands should print version numbers.

### 3. VS Code — optional

You only need VS Code if you want to open and explore the project files. It is not required to run the project.

Download VS Code: https://code.visualstudio.com/

## How to download and run the project for the first time

### Step 1. Open a terminal

You can use:

- **macOS** — the Terminal app;
- **Windows** — PowerShell, Windows Terminal, or the VS Code terminal;
- **Linux** — any terminal.

### Step 2. Download the project from GitHub

Run:

```bash
git clone https://github.com/skalinina/getanalyst-contract-first.git
```

Git will create a `getanalyst-contract-first` folder on your computer containing all project files.

Move into that folder:

```bash
cd getanalyst-contract-first
```

Run all following commands from this folder.

### Step 3. Install dependencies

Run:

```bash
npm install
```

This command downloads the libraries required by the project. They will be stored in the `node_modules` folder.

You normally only need to run `npm install` the first time or after the project dependencies change.

### Step 4. Start the project

Run:

```bash
npm run demo
```

The project will first build the documentation and then start the local services.

After startup, open these addresses in your browser:

| Component | URL | Purpose |
|---|---|---|
| **ReDoc** | `http://localhost:8080` | OpenAPI documentation and an AsyncAPI tab |
| **Swagger UI** | `http://localhost:8081` | Browse and send API requests, plus an AsyncAPI tab |
| **Prism** | `http://localhost:4010` | Simulated API based on the OpenAPI contract |

To stop the project, return to the terminal and press `Ctrl + C`.

## How to run the project next time

You do not need to install the dependencies again. Open a terminal, move to the project folder, and run:

```bash
cd getanalyst-contract-first
npm run demo
```

If the folder is not in your current directory, first navigate to the place where you saved it.

## If you want to open the project in VS Code

Open VS Code and choose:

**File → Open Folder → getanalyst-contract-first**

If the `code` command is available in your terminal, you can also open the project with:

```bash
code .
```

You do not need to edit files inside `node_modules` or `dist`:

- `node_modules` contains installed dependencies;
- `dist` is generated automatically when the documentation is built.

The main source files are in `openapi`, `asyncapi`, `schemas`, and `examples`.

## What is included in the contract

### OpenAPI

The specification contains several simple operations:

```text
GET    /boards/{boardId}
POST   /boards/{boardId}/sticky-notes
PATCH  /boards/{boardId}/sticky-notes/{stickyNoteId}
DELETE /boards/{boardId}/sticky-notes/{stickyNoteId}
POST   /boards/{boardId}/comments
POST   /boards/{boardId}/comments/{commentId}/resolve
```

They describe:

- input and output data;
- request and response examples;
- Bearer authentication;
- `400`, `401`, `403`, `404`, and `409` responses;
- access rules in operation `description` fields.

### AsyncAPI

The asynchronous part describes a `BoardChanged` event published after a board changes.

For example:

```text
STICKY_NOTE_CREATED
STICKY_NOTE_UPDATED
STICKY_NOTE_DELETED
COMMENT_CREATED
COMMENT_RESOLVED
```

Another service, such as a notification service, can consume this event.

## Project structure

```text
openapi/                 OpenAPI contract
asyncapi/                AsyncAPI contract, channels, and messages
schemas/                 Data structures and constraints
examples/                Request, response, and event examples
scripts/                 Build and run scripts
.vscode/                 Recommended VS Code extensions
```

Schemas and examples are separated intentionally:

```text
schemas/   → what data is valid
examples/  → what concrete data looks like
```

For example, an operation references its schema and its example separately:

```yaml
schema:
  $ref: ../schemas/openapi/sticky-note.yaml
examples:
  created:
    $ref: ../examples/openapi/sticky-note-created-response.yaml
```

## How to navigate `$ref` links in VS Code

The recommended extension for `$ref` navigation is **Redocly OpenAPI**.

The project already contains `.vscode/extensions.json`, so VS Code may offer to install the extension automatically.

After installation, you can use:

- `Cmd + Click` on macOS;
- `Ctrl + Click` on Windows/Linux;
- `F12` — go to definition;
- **Peek Definition** — view the definition without leaving the current file.

## Authentication in Swagger UI

Click **Authorize** and enter any test token, for example:

```text
demo-token
```

Swagger UI will send it as a Bearer token.

Prism does not validate a real JWT or user permissions. It only simulates the responses described by the contract. It is not a real application backend.

## Important note about Prism

Prism does not preserve state between requests.

For example, if you create a sticky note with `POST`, it will not be stored and will not appear in a later `GET`. This behavior is expected in this project.

Prism is used to validate the contract and try requests before a real backend implementation exists.

## Useful commands

Start the whole project:

```bash
npm run demo
```

Validate the OpenAPI specification:

```bash
npm run lint
```

Build the documentation without starting the local services:

```bash
npm run build
```

Start Prism only:

```bash
npm run mock
```

## If something does not start

First check that you are in the project folder and that Git, Node.js, and npm are available:

```bash
git --version
node --version
npm --version
```

If `npm run demo` reports a missing dependency after you download the project, run:

```bash
npm install
```

If one of the `localhost` addresses does not open, check the terminal: the project must still be running and the terminal window must remain open.

## Supported systems

The project scripts are written in Node.js and do not require Bash or other operating-system-specific tools.

The project is intended to run on:

- Windows;
- macOS;
- Ubuntu Linux.

---

<div align="center">

Educational project for **GetAnalyst**.

[← Русская версия](README.md)

</div>
