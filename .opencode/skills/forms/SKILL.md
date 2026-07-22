---
name: forms
description: 'HTML5 validation, Constraint Validation API, accessible controls, error/success UX, FormData, multi-step forms.'
risk: safe
source: community patterns
date_added: 2026-06-14
tags: [forms, validation, accessibility, ux, html5, javascript]
tools: [opencode, claude, cursor, gemini]
---

# Forms

You are a **forms specialist**. Forms are the highest-stakes interaction on a site — users abandon them at the slightest friction. Every field, label, error message, and button must be intentional.

## HTML5 Validation Attributes

Use built-in attributes before writing custom JS. They work without JavaScript and are announced by screen readers.

```html
<input
  type="email"
  required
  minlength="3"
  maxlength="100"
  pattern="[^@\s]+@[^@\s]+\.[^@\s]+"
  autocomplete="email"
/>
```

| Attribute                 | Purpose                                                 |
| ------------------------- | ------------------------------------------------------- |
| `required`                | Field must be filled                                    |
| `type`                    | Constrains format (email, url, number, tel, date, etc.) |
| `minlength` / `maxlength` | Character count limits                                  |
| `min` / `max`             | Numeric / date range limits                             |
| `pattern`                 | Custom regex validation (must match entire value)       |
| `step`                    | Increment precision for number/date inputs              |
| `autocomplete`            | Browser autofill hints — critical for conversion        |

## Constraint Validation API

For custom validation beyond HTML5 attributes. Never disable HTML5 validation entirely — layer on top.

```javascript
const form = document.querySelector('form');
const email = form.querySelector('[type="email"]');

form.addEventListener('submit', (e) => {
  if (!form.checkValidity()) {
    e.preventDefault();
    // highlight first invalid field
    const firstInvalid = form.querySelector(':invalid');
    if (firstInvalid) firstInvalid.focus();
  }
});

email.addEventListener('input', () => {
  if (email.validity.typeMismatch) {
    email.setCustomValidity('Enter a valid email address');
  } else {
    email.setCustomValidity('');
  }
});
```

### ValidityState properties

| Property                           | Meaning                          |
| ---------------------------------- | -------------------------------- |
| `valueMissing`                     | Required field is empty          |
| `typeMismatch`                     | Value doesn't match `type`       |
| `patternMismatch`                  | Value doesn't match `pattern`    |
| `tooLong` / `tooShort`             | Exceeds min/max length           |
| `rangeUnderflow` / `rangeOverflow` | Outside min/max range            |
| `stepMismatch`                     | Doesn't match step increment     |
| `badInput`                         | Browser can't parse the value    |
| `customError`                      | `setCustomValidity()` was called |

## Accessible Form Controls

### Labels

Every input needs a `<label>`. Never use `placeholder` as a substitute — it disappears on input and fails contrast in many browsers.

```html
<!-- Good -->
<label for="name">Full name</label>
<input id="name" name="name" required />

<!-- Also good — implicit label -->
<label>
  Full name
  <input name="name" required />
</label>
```

### Error messages

Associate errors with their field using `aria-describedby`. Group errors in a live region for screen reader announcements.

```html
<form novalidate>
  <label for="email">Email</label>
  <input
    id="email"
    name="email"
    type="email"
    required
    aria-describedby="email-error"
    aria-invalid="true"
  />
  <span id="email-error" role="alert"> Please enter a valid email address </span>
</form>
```

```javascript
const error = document.getElementById('email-error');
error.textContent = message;
error.parentElement.querySelector('input').setAttribute('aria-invalid', 'true');
```

### Error summary

For full-page validation, show a list of errors at the top with links to each field.

```html
<div role="alert" aria-live="polite" tabindex="-1">
  <h2>Please fix the following errors</h2>
  <ul>
    <li><a href="#email">Email is required</a></li>
    <li><a href="#password">Password must be at least 8 characters</a></li>
  </ul>
</div>
```

## Validation UX Patterns

### Real-time vs on-submit

| Strategy  | When to use                                          |
| --------- | ---------------------------------------------------- |
| On-submit | Short forms, login, signup                           |
| On-blur   | Medium forms — validate when leaving each field      |
| On-input  | Password strength, character counters, inline hints  |
| Hybrid    | On-blur for individual fields + on-submit full check |

Never show errors while the user is still typing (frustrating). Wait for blur, then re-validate on input to clear the error.

### Timing rules

1. **Don't validate on focus** — user hasn't typed yet
2. **Validate on first blur** — catches mistakes early
3. **Re-validate on input after blur** — clears error as user fixes it
4. **Validate on submit** — catches remaining issues
5. **Scroll to and focus the first error** — guides the user

## FormData API

Collect form values without manually reading each input.

```javascript
const form = document.querySelector('form');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = new FormData(form);
  const plain = Object.fromEntries(data.entries());
  // { email: "a@b.com", name: "Alice" }

  // For multiple values (checkboxes)
  const all = [...data.entries()];
  // [["email","a@b.com"], ["hobbies","reading"], ["hobbies","hiking"]]
});
```

## File Upload

```html
<label for="avatar">Profile photo</label>
<input
  id="avatar"
  name="avatar"
  type="file"
  accept="image/png,image/jpeg,image/webp"
  max="5242880"
/>
```

```javascript
const fileInput = document.getElementById('avatar');
fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (!file) return;

  // Validate size client-side
  if (file.size > 5 * 1024 * 1024) {
    fileInput.setCustomValidity('File must be under 5 MB');
    fileInput.reportValidity();
    return;
  }

  // Preview
  const reader = new FileReader();
  reader.onload = (e) => {
    preview.src = e.target.result;
  };
  reader.readAsDataURL(file);
});
```

## Multi-step Forms

Split long forms into steps. Only validate the current step on "Next".

```html
<form id="multi-step">
  <fieldset id="step-1" aria-hidden="false">
    <legend>Account details</legend>
    <!-- fields -->
    <button type="button" data-next-step="step-2">Next</button>
  </fieldset>
  <fieldset id="step-2" aria-hidden="true">
    <legend>Profile details</legend>
    <!-- fields -->
    <button type="button" data-prev-step="step-1">Back</button>
    <button type="submit">Submit</button>
  </fieldset>
</form>
```

```javascript
let currentStep = 1;

function showStep(n) {
  const steps = document.querySelectorAll('fieldset');
  steps.forEach((s, i) => {
    const isCurrent = i + 1 === n;
    s.setAttribute('aria-hidden', !isCurrent);
    s.hidden = !isCurrent;
  });
  // focus the first field in the new step
  steps[n - 1].querySelector('input, button')?.focus();
}
```

## Form Security

### CSRF

If the dashboard or a Node.js project accepts POST requests, include a CSRF token. For static sites with no backend, use same-origin checks or `SameSite=Strict` cookies.

```javascript
// Fetch-based submission with Origin header check
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const res = await fetch('/api/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.fromEntries(new FormData(form))),
  });
  if (res.ok) {
    /* success */
  }
});
```

### Input sanitization

Never render user input as HTML. Use `textContent`, not `innerHTML`.

```javascript
// Good
errorEl.textContent = message;

// Bad — XSS risk
errorEl.innerHTML = message;
```

### Enctype

For file uploads, always set `enctype="multipart/form-data"`.

```html
<form method="POST" enctype="multipart/form-data">
  <!-- file inputs -->
</form>
```

## Validation anti-patterns

- ❌ Using `placeholder` as a label — fails accessibility, disappears on input
- ❌ Preventing paste on password fields — encourages weak passwords, harms UX
- ❌ Showing errors while typing — increases cognitive load
- ❌ Not setting `autocomplete` — wastes autofill opportunity
- ❌ Disabling submit until form is "perfect" — users can't find what's wrong
- ❌ Using `alert()` for validation — blocks assistive tech, poor UX
- ❌ Clearing error too aggressively — user loses context of what they fixed

## Checklist

- [ ] Every input has a visible `<label>`
- [ ] `autocomplete` set on name, email, phone, address, password fields
- [ ] Error messages linked via `aria-describedby`
- [ ] `aria-invalid` set on invalid fields
- [ ] First error is focused on submit
- [ ] File inputs show preview and size validation
- [ ] Multi-step forms save progress on each step
- [ ] FormData used for collection (not per-field reads)
- [ ] CSRF protection in place for POST endpoints
- [ ] No `innerHTML` with user data
- [ ] `role="alert"` or `aria-live` on error container
- [ ] `prefers-reduced-motion` respected for animations
