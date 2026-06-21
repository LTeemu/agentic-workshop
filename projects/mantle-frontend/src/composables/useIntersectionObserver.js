import { ref, onMounted, onBeforeUnmount } from 'vue';

export function useIntersectionObserver(options = {}) {
  const el = ref(null);
  const isVisible = ref(false);
  let observer = null;

  onMounted(() => {
    if (!el.value) return;
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            isVisible.value = true;
            observer.unobserve(entry.target);
          }
        },
        { threshold: 0.1, rootMargin: '0px 0px -40px 0px', ...options },
      );
      observer.observe(el.value);
    } else {
      isVisible.value = true;
    }
  });

  onBeforeUnmount(() => {
    if (observer) observer.disconnect();
  });

  return { el, isVisible };
}
