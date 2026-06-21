import { ref, onMounted, onBeforeUnmount } from 'vue';

export function useScrollProgress() {
  const progress = ref(0);

  function onScroll() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    progress.value = docHeight > 0 ? scrollTop / docHeight : 0;
  }

  onMounted(() => {
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  });

  onBeforeUnmount(() => {
    window.removeEventListener('scroll', onScroll);
  });

  return { progress };
}
