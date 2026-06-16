---
name: file-upload
description: 'File upload and asset management — multipart form data, file type/size validation, chunked uploads, upload progress, image preview, thumbnail generation, drag-and-drop, storage backends.'
risk: safe
source: community patterns
date_added: 2026-06-14
tags: [file-upload, upload, multipart, file, image, storage, asset]
tools: [opencode, claude, cursor, gemini]
---

# File Upload

You are a **file upload specialist**. You build upload flows that validate files before they reach the server, provide clear progress feedback, and handle failures gracefully.

## Client-Side Upload

### Basic file input

```html
<label for="avatar">Profile photo</label>
<input
  id="avatar"
  name="avatar"
  type="file"
  accept="image/png,image/jpeg,image/webp"
  max="5242880"
/>
<div id="preview"></div>
<div id="progress" class="hidden"><div id="progress-bar"></div></div>
<div id="upload-error" role="alert" hidden></div>
```

### File validation

```javascript
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

function validateFile(file) {
  const errors = [];

  if (!ALLOWED_TYPES.includes(file.type)) {
    errors.push(`Invalid file type: ${file.type}. Allowed: ${ALLOWED_TYPES.join(', ')}`);
  }

  if (file.size > MAX_SIZE) {
    errors.push(
      `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: ${MAX_SIZE / 1024 / 1024}MB`,
    );
  }

  if (file.size === 0) {
    errors.push('File is empty');
  }

  return errors;
}
```

### Upload with progress

```javascript
async function uploadFile(file, url, options = {}) {
  const formData = new FormData();
  formData.append('file', file);

  const controller = new AbortController();

  const xhr = new XMLHttpRequest();

  const promise = new Promise((resolve, reject) => {
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && options.onProgress) {
        options.onProgress(e.loaded / e.total);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          resolve(xhr.responseText);
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

    xhr.open('POST', url);
    xhr.send(formData);
  });

  return { promise, cancel: () => xhr.abort(), xhr };
}

// Usage
const { promise, cancel } = uploadFile(file, '/api/upload', {
  onProgress: (pct) => {
    const bar = document.getElementById('progress-bar');
    bar.style.width = `${pct * 100}%`;
    bar.textContent = `${Math.round(pct * 100)}%`;
  },
});
```

### Image preview

```javascript
function createImagePreview(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Not an image'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.src = e.target.result;
      img.alt = file.name;
      resolve(img);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// Usage
fileInput.addEventListener('change', async () => {
  const file = fileInput.files[0];
  if (!file) return;

  const errors = validateFile(file);
  if (errors.length) {
    errorEl.textContent = errors.join(', ');
    errorEl.hidden = false;
    return;
  }

  errorEl.hidden = true;
  const img = await createImagePreview(file);
  previewEl.innerHTML = '';
  previewEl.appendChild(img);
});
```

### Drag and drop

```javascript
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const files = e.dataTransfer.files;
  if (files.length) handleFiles(files);
});

dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
  if (fileInput.files.length) handleFiles(fileInput.files);
});
```

## Server-Side Upload

### Basic multipart handler (no deps)

```javascript
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const MAX_SIZE = 5 * 1024 * 1024;

function parseMultipart(req, options = {}) {
  return new Promise((resolve, reject) => {
    const boundary = req.headers['content-type']?.split('boundary=')[1];
    if (!boundary) return reject(new Error('No boundary found'));

    const maxSize = options.maxSize || MAX_SIZE;
    const allowedTypes = options.allowedTypes || [];
    const destDir = options.destDir || UPLOAD_DIR;

    const files = [];
    let totalBytes = 0;
    const raw = [];

    req.on('data', (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > maxSize) {
        req.destroy();
        return reject(new Error('Request too large'));
      }
      raw.push(chunk);
    });

    req.on('end', () => {
      try {
        const buffer = Buffer.concat(raw);
        const parts = splitMultipart(buffer, boundary);

        for (const part of parts) {
          const [header, body] = splitPart(part);
          const disposition = parseDisposition(header);

          if (disposition.filename) {
            const ext = path.extname(disposition.filename);
            const name = crypto.randomBytes(16).toString('hex') + ext;
            const filePath = path.join(destDir, name);

            if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
            fs.writeFileSync(filePath, body);

            files.push({
              originalName: disposition.filename,
              name,
              path: filePath,
              size: body.length,
              type: header.match(/Content-Type:\s*(.+)/i)?.[1] || 'application/octet-stream',
            });
          }
        }

        resolve(files);
      } catch (err) {
        reject(err);
      }
    });

    req.on('error', reject);
  });
}
```

### Using busboy (when available)

```javascript
const Busboy = require('busboy');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function handleUpload(req, res) {
  const busboy = Busboy({ headers: req.headers, limits: { fileSize: 5 * 1024 * 1024 } });
  const files = [];

  busboy.on('file', (fieldname, file, { filename, mimeType }) => {
    const ext = path.extname(filename);
    const name = crypto.randomBytes(16).toString('hex') + ext;
    const filePath = path.join(UPLOAD_DIR, name);
    const writeStream = fs.createWriteStream(filePath);

    file.pipe(writeStream);

    file.on('limit', () => {
      fs.unlinkSync(filePath);
      file.resume(); // Drain the stream
    });

    writeStream.on('finish', () => {
      files.push({
        originalName: filename,
        name,
        path: filePath,
        size: writeStream.bytesWritten,
        type: mimeType,
      });
    });
  });

  busboy.on('finish', () => {
    res.json({ files });
  });

  busboy.on('error', (err) => {
    console.error('Upload error:', err);
    res.status(400).json({ error: err.message });
  });

  req.pipe(busboy);
}
```

### Chunked upload (large files)

```javascript
// Server — accepts chunks, reassembles on completion
const CHUNK_DIR = path.join(UPLOAD_DIR, 'chunks');

async function handleChunk(req, res) {
  const { uploadId, chunkIndex, totalChunks, filename } = req.body;
  const chunkDir = path.join(CHUNK_DIR, uploadId);
  if (!fs.existsSync(chunkDir)) fs.mkdirSync(chunkDir, { recursive: true });

  // Save chunk
  const chunkPath = path.join(chunkDir, `${chunkIndex}`);
  // Write file buffer to chunkPath
  fs.writeFileSync(chunkPath, req.file.buffer);

  // If last chunk, reassemble
  if (chunkIndex === totalChunks - 1) {
    const ext = path.extname(filename);
    const finalName = crypto.randomBytes(16).toString('hex') + ext;
    const finalPath = path.join(UPLOAD_DIR, finalName);
    const writeStream = fs.createWriteStream(finalPath);

    for (let i = 0; i < totalChunks; i++) {
      const chunk = fs.readFileSync(path.join(chunkDir, `${i}`));
      writeStream.write(chunk);
    }

    writeStream.end();
    fs.rmSync(chunkDir, { recursive: true, force: true });

    return res.json({ name: finalName, path: finalPath });
  }

  res.json({ received: chunkIndex });
}
```

### Thumbnail generation (image processing without deps)

For basic thumbnail generation with zero dependencies, defer to client-side or use sharp when available:

```javascript
// With sharp (recommended)
const sharp = require('sharp');

async function generateThumbnail(inputPath, outputPath, width = 200) {
  await sharp(inputPath)
    .resize(width, null, { withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toFile(outputPath);
  return outputPath;
}

// Usage after upload
const thumbPath = await generateThumbnail(filePath, filePath.replace('.', '_thumb.'));
```

## Storage Backends

### Local filesystem

```javascript
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

function storeLocal(file, destDir = UPLOAD_DIR) {
  const name = crypto.randomBytes(16).toString('hex') + path.extname(file.originalname);
  const filePath = path.join(destDir, name);
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  fs.writeFileSync(filePath, file.buffer);
  return { name, path: filePath, url: `/uploads/${name}` };
}
```

### S3-compatible (MinIO, AWS S3)

```javascript
async function storeS3(file, bucket) {
  // Using @aws-sdk/client-s3
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: `${Date.now()}-${file.originalname}`,
    Body: file.buffer,
    ContentType: file.mimetype,
  });
  await s3.send(command);
  return { url: `https://${bucket}.s3.amazonaws.com/${command.input.Key}` };
}
```

## Upload anti-patterns

- ❌ No file type validation before upload — wastes bandwidth
- ❌ Trusting `Content-Type` header alone — check magic bytes server-side
- ❌ No file size limit — denial of service vector
- ❌ Using user-supplied filename as storage name — collision, path traversal
- ❌ No cleanup on failed uploads — orphaned files
- ❌ Sync file operations on the request thread — use streams
- ❌ No progress indicator — users think the upload is stuck

## Checklist

- [ ] File type validated both client-side (`accept`) and server-side (magic bytes/ext)
- [ ] File size limit enforced at both client and server
- [ ] Upload progress shown to user (XHR progress event or fetch with ReadableStream)
- [ ] Image preview shown before upload
- [ ] Filename sanitized — stored as random UUID, never user-supplied
- [ ] Drag-and-drop zone with visual feedback
- [ ] Chunked upload for files > 100MB
- [ ] Thumbnail/optimization for image uploads
- [ ] Orphaned file cleanup on upload failure
- [ ] Storage path traversal prevented (path.resolve + startsWith check)
