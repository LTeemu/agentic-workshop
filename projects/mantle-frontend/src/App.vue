<script setup>
import { ref } from 'vue'
import LoadingScreen from './components/LoadingScreen.vue'
import TlDrModal from './components/TlDrModal.vue'
import HeroSection from './components/HeroSection.vue'
import ServicesGrid from './components/ServicesGrid.vue'
import WaterMarquee from './components/WaterMarquee.vue'
import ProcessSection from './components/ProcessSection.vue'
import AboutSection from './components/AboutSection.vue'
import ContactSection from './components/ContactSection.vue'

const loaded = ref(false)
</script>

<template>
  <LoadingScreen v-if="!loaded" @loaded="loaded = true" />

  <a href="#hero" class="skip-link">Skip to content</a>
  <div v-show="loaded" class="app-root bg-brown">
    <TlDrModal />
    <main>
      <HeroSection />
      <ServicesGrid />
      <WaterMarquee />
      <ProcessSection />
      <AboutSection />
      <ContactSection />
    </main>
  </div>
</template>

<style>
.app-root {
  position: relative;
  z-index: 1;
}
</style>
