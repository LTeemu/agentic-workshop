# SecureNote

> **AI-generated project** — built entirely with agentic coding tools.

End-to-end encrypted note-taking app for Android. All content is encrypted with AES-256-GCM backed by Android Keystore before it touches disk — your data stays yours.

## Tech Stack

- **Language:** Kotlin
- **UI:** Jetpack Compose + Material 3 (Dynamic Color)
- **DI:** Hilt
- **Database:** Room (SQLite)
- **Encryption:** AES-256-GCM via Android Keystore (TEE-backed)
- **PIN hashing:** PBKDF2WithHmacSHA256 (100k iterations, random 16-byte salt)
- **Auth:** PIN lock with escalating brute-force lockout
- **DataStore encryption:** AES-256-GCM via CryptoManager on preferences DataStore
- **Networking:** OkHttp with certificate pinning + exponential backoff retry
- **Serialization:** kotlinx.serialization
- **Build:** Gradle 8.13, AGP 8.13.2, Kotlin 2.0.0
- **Min SDK:** 26 | **Target / Compile SDK:** 34
- **Share server:** Node.js / Express / TypeScript (file-persisted blob store, optional HTTPS, rate-limited)

## Features

- **Notebooks** — organize notes with drag-and-drop reorder, trim + case-insensitive dedup
- **Notes** — text and checklist notes with auto-save, content trim, and checklist dedup
- **Photos** — attach photos to any note type with encrypted names, inline rename overlay, auto-naming
- **Encryption at rest** — every note body, checklist text, photo, and photo name encrypted before storage
- **Encrypted DataStore** — PIN hash, salt, and pending revocations stored encrypted in preferences DataStore
- **PIN lock** — optional app-lock with PBKDF2 hashing, escalating lockout (5→30s, 10→5min, 15→24h), "Forgot PIN" wipe
- **Dark theme** — manual toggle with dynamic color support (Android 12+)
- **Search** — filter notes by content, type ("text", "checklist"), and photo names; different empty state when filtered
- **Share relay** — share encrypted notes via a server intermediary (see share-server/); server rate-limited (30 req/min)
- **HTTPS + cert pinning** — share API uses conditional certificate pinning (release) or plain HTTP (debug/emulator)
- **Pending revocation retry** — share codes queued for retry if server is unreachable on revoke
- **Offline-first** — all data is local; the share relay only sees encrypted blobs
- **Import notes** — consume shared notes via share codes with loading state on import

## Architecture

MVVM with Repository pattern. Single-activity, Compose-first navigation. Encryption happens in the repository layer — ViewModels and screens never deal with raw encryption.

```
ui/          → Composable screens + ViewModels
data/        → Room entities, DAOs, repositories, DataStore
security/    → CryptoManager (AES-256-GCM), AppLockManager (PIN lifecycle)
di/          → Hilt modules (CryptoModule, DatabaseModule, DataStoreModule)
navigation/  → NavHost with route definitions
share-server/→ Node.js relay (Express, rate-limited, optional HTTPS)
```

## Security Details

| Layer           | Mechanism                                                      |
| --------------- | -------------------------------------------------------------- |
| Note content    | AES-256-GCM via Android Keystore                               |
| Checklist items | Per-item AES-256-GCM encryption                                |
| Photos          | Encrypted image bytes + encrypted thumbnail                    |
| Photo names     | Encrypted, auto-named "Photo N", searchable                    |
| PIN storage     | PBKDF2WithHmacSHA256, 100k iterations, 16-byte random salt     |
| PIN lockout     | Escalating: 5 failures → 30s, 10 → 5min, 15 → 24h              |
| DataStore       | All sensitive keys encrypted via CryptoManager                 |
| Network         | Certificate pinning (release), rate-limited API (30 req/min)   |
| Wipe            | Forgot PIN deletes Keystore key, Room DB, DataStore, app files |

## Build & Run

Open the project in Android Studio, sync Gradle, and run on a device or emulator (API 26+).

```bash
./gradlew assembleDebug
```

Before release, set `SHARE_SERVER_URL` in `build.gradle.kts` to your production server and update the certificate pin hash in `ShareApi.kt`.

## Share Server

Located in [`share-server/`](share-server/). A thin Node.js + Express + TypeScript relay that stores encrypted payloads in a file-persisted store (survives restarts). The server never sees plaintext content — all encryption/decryption happens on-device.

```bash
cd share-server
npm install
npm run dev       # development with hot reload (http://localhost:3001)
npm run build     # compile to dist/
npm start         # run compiled JS
```

Set `SSL_KEY` and `SSL_CERT` environment variables for HTTPS.

## Testing

Unit tests cover encryption, repositories, sharing logic, and ViewModel behavior:

```bash
./gradlew testDebugUnitTest
```

- `CryptoManagerTest` — encrypt/decrypt round-trip, IV uniqueness, corruption detection
- `NoteRepositoryTest` — CRUD with encryption, trim/dedup, photo name encryption
- `NotebookRepositoryTest` — notebook CRUD, trim, case-insensitive duplicate rejection
- `ShareManagerTest` — server-first fallback, local export, revocation
- `NoteListViewModelTest` — search query, pending revocation queue
- `NoteEditorViewModelTest` — auto-save, checklist management, trim
