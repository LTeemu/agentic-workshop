# API reference

An API reference is a contract: for each endpoint, a developer must be able to call it without reading the server code. Accuracy is everything — one wrong parameter name breaks every reader.

## Ground truth first

Read the route definitions, input validation, and response construction:

- Every route method + path, including nested or parameterized paths.
- Where parameters come from: path, query, headers, or body.
- Validation rules: required fields, types, ranges, defaults.
- Success and error status codes and their exact response shapes.
- Authentication requirements (headers, tokens) if any.

## Per-endpoint template

### `METHOD /path`

One heading per endpoint, `GET /api/weather/:city` style — not "Weather endpoint".

**Purpose** — one sentence: what this call does.

**Auth** — what credentials/headers are required, or "None".

**Path parameters** — table: name, type, required, description.

**Query parameters** — table: name, type, required, default, description. Defaults must match the code.

**Request body** — field-by-field table (name, type, required, description), then a complete JSON example.

**Response** — `200 OK` example JSON exactly as the code returns it (field names, nesting, types). For each error the endpoint can return, a short entry: status, condition, and body shape.

## Rules of thumb

- Document every public endpoint, even the boring ones — that is the point of a reference.
- Response examples come from the code path, not from imagination. Trace `res.json(...)` / return statements.
- State error conditions precisely ("400 if `days` is not an integer between 1 and 7"), so callers know what to validate.
- If the app has shared error formats (e.g. always `{ error: string }`), note it once at the top instead of repeating per endpoint.
- Group endpoints by resource (`/api/alerts` section with its GET/POST/DELETE) when there are many.
