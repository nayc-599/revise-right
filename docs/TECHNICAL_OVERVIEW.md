# Step Flow — Technical Overview

This document describes the database, languages, frameworks, and major packages used across the Step Flow project. It is intended for developers joining the team.

---

## Database

The application uses two persistence layers: **Firebase Firestore** on the client side for primary app data, and **SQLite** (plus **ChromaDB**) on the backend for API and RAG-related data.

**Firebase Firestore** is the main data store for user-facing content. All access is scoped by authenticated user. The structure is: `users/{userId}/tasks`, `users/{userId}/tests`, and `users/{userId}/dayReports`. Tasks and tests hold the user’s to-do items, tests, and topics; day reports store daily summary data keyed by ISO date. The frontend uses the Firebase SDK to subscribe to real-time updates and to create, update, and delete documents.

**SQLite** is used by the FastAPI backend. The primary database file is `revise_right.db` (path configurable via `DATABASE_URL`). It defines three tables. The **quiz_results** table stores quiz outcome records: id, user_id, topic, score, total, and timestamp. The **schedules** table stores generated study schedules as JSON per user, with id, user_id, schedule_json, and created_at. The **task_understanding** table stores per-task understanding ratings (task_id and a 1–5 rating). Connection handling uses a context manager that commits on success and closes the connection on exit.

The **RAG quiz pipeline** uses additional SQLite and file-based storage. The `rag_quiz_system/rag_pipeline` code can use a **notes** table (id, course, content, file_path) and a **quizzes** table (id, course, question, options as JSON, answer) in a separate `notes.db` under the pipeline directory; PDF uploads may be copied to an `uploads` directory. **ChromaDB** is used as a vector store: a persistent Chroma client is created under `backend/chroma_db` (or a path passed into the pipeline), with a collection such as `notes_rag` for document chunks and embeddings (cosine similarity). This supports RAG retrieval for quiz generation; the main FastAPI app does not host a separate “notes” SQLite database unless the pipeline is invoked with that setup.

---

## Programming Languages

The codebase uses **TypeScript** for the frontend and build configuration, **Python** for the backend and RAG/study-scheduler logic, and **JavaScript** for a small number of config files. Markup and styling use **HTML** and **CSS**.

**TypeScript** is used for all React components, hooks, stores, utilities, and the Vite config (`vite.config.ts`). Types are centralized in `src/types/index.ts`. The project is strict about TypeScript-only application code under `src`.

**Python** is used for the FastAPI server, the RAG quiz pipeline (chunking, embedding, Chroma, question generation), and the study scheduler (Q-learning, state, Q-table simulator). All backend service logic is in Python.

**JavaScript** appears in configuration only: `tailwind.config.js` and `postcss.config.js` use default export style and are consumed by the build tooling.

**HTML** is used in `index.html` as the single entry page. **CSS** is used in `src/index.css` for global variables and base styles; component-level styling is done with Tailwind and, where needed, CSS modules. **JSON** is used for `package.json`, `tsconfig.*.json`, and other static config.

---

## Frameworks

**Frontend.** The UI is built with **React** (current major version 19). Routing is handled by **React Router DOM** (v7). The application is bundled and served in development by **Vite** (v8), which also runs the TypeScript compiler and the React plugin. **Tailwind CSS** is the main styling framework; **PostCSS** is used with Autoprefixer for processing Tailwind output. No separate UI component library is used; the project uses custom components and Tailwind utility classes.

**Backend.** The API server is built with **FastAPI**. The ASGI server used to run it is **Uvicorn** (typically via `uvicorn[standard]`). Request bodies and validation use **Pydantic** (v2). The RAG pipeline is built on **LangChain** (langchain, langchain-community, langchain-core, langchain-text-splitters) for document loading, splitting, and integration patterns. **ChromaDB** is the vector database for embeddings. The study scheduler is custom Python (no separate framework), using numpy for numeric work. Optional tooling such as **Streamlit**, **pandas**, and **Altair** is listed in backend requirements for the study_scheduler Streamlit app or analysis scripts, but the main app entry point is FastAPI.

---

## Packages and Libraries

### Frontend (package.json)

**react** and **react-dom** — Core React library and DOM renderer for building the UI.

**react-router-dom** — Client-side routing (routes, navigation, location).

**zustand** — Lightweight global state store for tasks, tests, timer, quiz, day, and game state.

**firebase** — SDK for Firebase Auth and Firestore (auth, Firestore reads/writes, real-time listeners).

**jspdf** — Client-side PDF generation for day reports and reflection journal export.

**tailwindcss** — Utility-first CSS framework for layout and styling.

**autoprefixer** — PostCSS plugin to add vendor prefixes to CSS.

**postcss** — CSS transformation pipeline used with Tailwind and Autoprefixer.

**focus-trap-react** — Traps focus inside modals for accessibility.

**vite** — Build tool and dev server; handles TypeScript, React, and assets.

**@vitejs/plugin-react** — Vite plugin for React Fast Refresh and JSX/TSX.

**typescript** — Type checking and compilation for the frontend and config.

**@types/node**, **@types/react**, **@types/react-dom** — TypeScript type definitions for Node and React.

**eslint**, **@eslint/js**, **eslint-plugin-react-hooks**, **eslint-plugin-react-refresh**, **typescript-eslint**, **globals** — Linting and code quality for JavaScript/TypeScript and React.

### Backend (requirements.txt)

**fastapi** — Web framework for API routes, dependency injection, and OpenAPI docs.

**uvicorn[standard]** — ASGI server to run the FastAPI app.

**python-multipart** — Parsing of multipart request bodies (e.g. file uploads for quiz PDFs).

**pydantic** (>=2) — Data validation and serialization for request/response models.

**openai** — Client for the OpenAI API used by the RAG question generator.

**numpy** — Numerical operations used in the study scheduler and related logic.

**langchain** — Meta-package for the LangChain ecosystem.

**langchain-community** — Community integrations (e.g. document loaders such as PyPDFLoader).

**langchain-core** — Core abstractions (e.g. Document type).

**langchain-text-splitters** — Text splitters (e.g. RecursiveCharacterTextSplitter) for chunking documents.

**pypdf** — PDF parsing and loading (used via LangChain document loaders).

**sentence-transformers** — Embedding models for turning text chunks into vectors for RAG.

**chromadb** — Vector database for storing and querying embeddings in the RAG pipeline.

**pandas** — Data manipulation (used by the Streamlit study_scheduler app if present).

**streamlit** — Interactive app framework for the optional study_scheduler UI.

**altair** — Declarative visualizations (used in the Streamlit app for charts).

---

*Document generated for the Step Flow project. Update this file when adding databases, languages, frameworks, or significant dependencies.*
