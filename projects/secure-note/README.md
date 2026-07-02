# SecureNote

End-to-end encrypted note-taking app for Android. All content is encrypted with AES-256-GCM backed by Android Keystore before it touches disk — your data stays yours.

## Tech Stack

- **Language:** Kotlin
- **UI:** Jetpack Compose + Material 3 (Dynamic Color)
- **DI:** Hilt
- **Database:** Room (SQLite)
- **Encryption:** AES-256-GCM via Android Keystore (TEE-backed)
- **Auth:** Biometric (BIOMETRIC_STRONG + device credential fallback)
- **Networking:** OkHttp
- **Serialization:** kotlinx.serialization
- **Build:** Gradle 8.7, AGP 8.5.0, Kotlin 2.0.0
- **Min SDK:** 26 | **Target / Compile SDK:** 34

## Features

- **Notebooks** — organize notes into notebooks
- **Notes** — plain text, checklists, and photo notes
- **Encryption at rest** — every note body, checklist text, and photo is encrypted before storage
- **Biometric lock** — optional app-lock using fingerprint / face unlock
- **Share relay** — share encrypted notes via a server intermediary (see share-server/)
- **Offline-first** — all data is local; the share relay only sees encrypted blobs

## Architecture

MVVM with Repository pattern. Single-activity, Compose-first navigation.

```
ui/          → Composable screens + ViewModels
data/        → Room entities, DAOs, repositories
security/    → CryptoManager, BiometricAuth, AppLockManager
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

Located in [`share-server/`](share-server/). A thin Node.js + Express + TypeScript relay that stores encrypted payloads. The server never sees plaintext content — all encryption/decryption happens on-device.

```bash
cd share-server
npm install
npm run dev       # development with hot reload
npm run build     # compile to dist/
npm start         # run compiled JS
```

## Testing

Unit tests cover the core encryption logic and repository layer:

```bash
./gradlew testDebugUnitTest
```

- `CryptoManagerTest` — encrypt/decrypt round-trip, key generation
- `NoteRepositoryTest` — CRUD operations with encryption
- `NotebookRepositoryTest` — notebook CRUD
