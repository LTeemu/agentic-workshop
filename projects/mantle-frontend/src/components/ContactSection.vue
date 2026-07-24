<script setup>
import { ref, computed } from 'vue'
import AppearTransition from './AppearTransition.vue'

const form = ref({ name: '', email: '', message: '' })
const touched = ref({ name: false, email: false, message: false })
const submitted = ref(false)
const submitStatus = ref(null) // 'success' | 'error' | null

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const errors = computed(() => {
  const e = {}
  if (!form.value.name.trim()) e.name = 'Name is required'
  if (!form.value.email.trim()) {
    e.email = 'Email is required'
  } else if (!emailRegex.test(form.value.email)) {
    e.email = 'Please enter a valid email'
  }
  if (!form.value.message.trim()) e.message = 'Message is required'
  return e
})

const isValid = computed(() => Object.keys(errors.value).length === 0)

function onBlur(field) {
  touched.value[field] = true
}

function fieldState(field) {
  if (!touched.value[field]) return ''
  return errors.value[field] ? 'error' : 'valid'
}

function handleSubmit() {
  touched.value = { name: true, email: true, message: true }
  if (!isValid.value) return

  submitted.value = true
  submitStatus.value = 'success'
  form.value = { name: '', email: '', message: '' }
  // Reset touched after brief delay so user sees success state
  setTimeout(() => {
    submitted.value = false
    submitStatus.value = null
    touched.value = { name: false, email: false, message: false }
  }, 4000)
}
</script>

<template>
  <section class="section contact-section water-bg" id="contact">
    <AppearTransition>
      <span class="section-label">Let's talk</span>
    </AppearTransition>
    <AppearTransition :idx="1">
      <h2 class="section-title contact-title">Have a project in mind?</h2>
    </AppearTransition>

    <AppearTransition :idx="2">
      <div class="contact-grid">
        <div class="contact-info">
          <p class="contact-text">
            We'd love to hear about your project. Tell us what you're working on,
            and we'll get back to you within 24 hours.
          </p>
          <div class="contact-details">
            <div class="contact-detail">
              <span class="detail-label">Email</span>
              <a href="mailto:hello@mantle.studio" class="detail-value">hello@mantle.studio</a>
            </div>
            <div class="contact-detail">
              <span class="detail-label">Location</span>
              <span class="detail-value">Praterstraße 123, 1023 Nowhere</span>
            </div>
            <div class="contact-detail">
              <span class="detail-label">Hours</span>
              <span class="detail-value">Mon–Fri, 9:00–18:00 CET</span>
            </div>
          </div>
        </div>

        <form class="contact-form" @submit.prevent="handleSubmit" novalidate>
          <div class="form-row">
            <div class="form-group" :class="fieldState('name')">
              <label for="name" class="form-label">Name</label>
              <input
                id="name"
                v-model="form.name"
                type="text"
                class="form-input"
                :class="fieldState('name')"
                placeholder="Your name"
                aria-describedby="name-error"
                :aria-invalid="touched.name && !!errors.name"
                @blur="onBlur('name')"
              />
              <p v-if="touched.name && errors.name" id="name-error" class="form-error" role="alert">{{ errors.name }}</p>
            </div>
            <div class="form-group" :class="fieldState('email')">
              <label for="email" class="form-label">Email</label>
              <input
                id="email"
                v-model="form.email"
                type="email"
                class="form-input"
                :class="fieldState('email')"
                placeholder="you@example.com"
                aria-describedby="email-error"
                :aria-invalid="touched.email && !!errors.email"
                @blur="onBlur('email')"
              />
              <p v-if="touched.email && errors.email" id="email-error" class="form-error" role="alert">{{ errors.email }}</p>
            </div>
          </div>
          <div class="form-group" :class="fieldState('message')">
            <label for="message" class="form-label">Message</label>
            <textarea
              id="message"
              v-model="form.message"
              class="form-input form-textarea"
              :class="fieldState('message')"
              placeholder="Tell us about your project..."
              rows="4"
              aria-describedby="message-error"
              :aria-invalid="touched.message && !!errors.message"
              @blur="onBlur('message')"
            ></textarea>
            <p v-if="touched.message && errors.message" id="message-error" class="form-error" role="alert">{{ errors.message }}</p>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn-primary form-submit" :disabled="submitted && submitStatus === 'success'">
              <span v-if="submitStatus === 'success'" class="btn-success-text">✓ Message sent</span>
              <span v-else>Send message →</span>
            </button>
            <p v-if="submitStatus === 'error'" class="form-status-error" role="alert">Something went wrong. Please try again.</p>
          </div>
        </form>
      </div>
    </AppearTransition>

    <footer class="site-footer">
      <div class="footer-inner">
        <span class="footer-mark">M</span>
        <div class="footer-links">
          <a href="#hero" class="footer-link">Back to top</a>
          <a href="#" class="footer-link">Instagram</a>
          <a href="#" class="footer-link">LinkedIn</a>
        </div>
        <span class="footer-copy">© 2026 Mantle</span>
      </div>
    </footer>
  </section>
</template>

<style scoped>
.contact-section {
  padding-bottom: 0;
  z-index: 1;
  position: relative;
}

.contact-title {
  max-width: 600px;
}

.contact-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-12);
  margin-bottom: var(--space-20);
}

@media (max-width: 768px) {
  .contact-grid {
    grid-template-columns: 1fr;
    gap: var(--space-8);
  }
}

.contact-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.contact-text {
  font-size: var(--text-base);
  color: var(--color-text-muted);
  line-height: 1.8;
}

.contact-details {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.contact-detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.detail-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-dim);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.detail-value {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-style: italic;
  color: var(--color-text);
}

.contact-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

@media (max-width: 480px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-group.error .form-label {
  color: #e85858;
}

.form-input {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: var(--space-3) var(--space-4);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  transition: border-color var(--duration-fast) var(--ease-out-expo), box-shadow var(--duration-fast) var(--ease-out-expo);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-water-surface);
  box-shadow: 0 0 12px var(--color-water-dim);
}

.form-input.error {
  border-color: #e85858;
  box-shadow: 0 0 8px rgba(232, 88, 88, 0.2);
}

.form-input.error:focus {
  border-color: #e85858;
  box-shadow: 0 0 12px rgba(232, 88, 88, 0.3);
}

.form-input.valid {
  border-color: var(--color-water-surface);
}

.form-error {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: #e85858;
  margin-top: 2px;
}

.form-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.form-status-error {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: #e85858;
}

.btn-success-text {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.form-label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  letter-spacing: 0.05em;
}

.form-input {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: var(--space-3) var(--space-4);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  transition: border-color var(--duration-fast) var(--ease-out-expo);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-water-surface);
  box-shadow: 0 0 12px var(--color-water-dim);
}

.form-input::placeholder {
  color: var(--color-text-dim);
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

.form-submit {
  align-self: flex-start;
}

.btn-primary {
  display: inline-block;
  padding: var(--space-3) var(--space-8);
  background: var(--color-cyber);
  color: var(--color-bg);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border: none;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out-expo);
}

.btn-primary:hover {
  background: var(--color-text);
  color: var(--color-bg);
}

/* Footer */
.site-footer {
  margin-left: calc(-1 * var(--space-8));
  margin-right: calc(-1 * var(--space-8));
  border-top: 1px solid var(--color-border);
  position: relative;
}

/* Water accent line above footer */
.site-footer::before {
  content: '';
  position: absolute;
  top: -1px;
  left: 0;
  width: 100%;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, var(--color-water-dim) 20%, var(--color-water-surface) 50%, var(--color-water-dim) 80%, transparent 100%);
  opacity: 0.5;
}

.footer-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: var(--space-8);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

@media (max-width: 640px) {
  .footer-inner {
    flex-direction: column;
    gap: var(--space-4);
    text-align: center;
  }
}

.footer-mark {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-style: italic;
  color: var(--color-water-surface);
  opacity: 0.4;
}

.footer-links {
  display: flex;
  gap: var(--space-6);
}

.footer-link {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-dim);
  letter-spacing: 0.05em;
  transition: color var(--duration-fast) var(--ease-out-expo);
}

.footer-link:hover {
  color: var(--color-water-surface);
}

.footer-copy {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-dim);
}
</style>
