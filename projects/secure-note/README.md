# SecureNote

> **AI-generated project** — built entirely with agentic coding tools.

End-to-end encrypted note-taking app for Android. All content is encrypted with AES-256-GCM backed by Android Keystore before it touches disk — your data stays yours.

## Tech Stack

- **Language:** Kotlin
- **UI:** Jetpack Compose + Material 3 (Dynamic Color)
- **DI:** Hilt
- **Database:** Room (SQLite)
- **Encryption:** AES-256-GCM via Android Keystore (TEE-backed)
- **Auth:** PIN lock (SHA-256 hashed, no biometric)
- **Networking:** OkHttp with exponential backoff retry
- **Serialization:** kotlinx.serialization
- **Build:** Gradle 8.13, AGP 8.13.2, Kotlin 2.0.0
- **Min SDK:** 26 | **Target / Compile SDK:** 34
- **Share server:** Node.js / Express / TypeScript (with file-persisted blob store)

## Features

- **Notebooks** — organize notes with drag-and-drop reorder
- **Notes** — text and checklist notes (photos attach to any note type)
- **Encryption at rest** — every note body, checklist text, and photo encrypted before storage
- **PIN lock** — optional app-lock with 5-second grace period for camera/gallery intents
- **Dark theme** — manual toggle with dynamic color support (Android 12+)
- **Search** — filter notes by preview text or type ("text", "checklist")
- **Share relay** — share encrypted notes via a server intermediary (see share-server/)
- **Pending revocation retry** — share codes queued for retry if server is unreachable on revoke
- **Offline-first** — all data is local; the share relay only sees encrypted blobs
- **Import notes** — consume shared notes via share codes

## Architecture

MVVM with Repository pattern. Single-activity, Compose-first navigation.

```
ui/          → Composable screens + ViewModels
data/        → Room entities, DAOs, repositories
security/    → CryptoManager, AppLockManager
di/          → Hilt modules (CryptoModule, DatabaseModule, DataStoreModule)
navigation/  → NavHost with route definitions
```

Encryption happens in the repository layer — ViewModels and screens never deal with raw encryption.

## Build & Run

Open the project in Android Studio, sync Gradle, and run on a device or emulator (API 26+).

```bash
./gradlew assembleDebug
```

## Share Server

Located in [`share-server/`](share-server/). A thin Node.js + Express + TypeScript relay that stores encrypted payloads in a file-persisted store (survives restarts). The server never sees plaintext content — all encryption/decryption happens on-device.

```bash
cd share-server
npm install
npm run dev       # development with hot reload
npm run build     # compile to dist/
npm start         # run compiled JS
```

## Testing

Unit tests cover encryption, repositories, sharing logic, and ViewModel behavior:

```bash
./gradlew testDebugUnitTest
```

- `CryptoManagerTest` — encrypt/decrypt round-trip, IV uniqueness, corruption detection
- `NoteRepositoryTest` — CRUD operations with encryption
- `NotebookRepositoryTest` — notebook CRUD
- `ShareManagerTest` — server-first fallback, local export, revocation
- `NoteListViewModelTest` — search query, pending revocation queue
- `NoteEditorViewModelTest` — auto-save, checklist management
