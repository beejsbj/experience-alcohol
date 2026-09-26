import { onBeforeUnmount, onMounted, readonly, ref } from "vue";

const now = ref(Date.now());

// The same clock, for shared derived state that lives outside a component.
// Something on screen must hold a useLiveNow() subscription for it to tick.
export const liveNow = readonly(now);
let subscriberCount = 0;
let timerId = null;

const startTimer = () => {
  if (timerId !== null || typeof window === "undefined") return;

  timerId = window.setInterval(() => {
    now.value = Date.now();
  }, 1000);
};

const stopTimer = () => {
  if (timerId === null || typeof window === "undefined") return;

  window.clearInterval(timerId);
  timerId = null;
};

export const useLiveNow = () => {
  onMounted(() => {
    subscriberCount += 1;
    startTimer();
  });

  onBeforeUnmount(() => {
    subscriberCount = Math.max(0, subscriberCount - 1);
    if (subscriberCount === 0) {
      stopTimer();
    }
  });

  return readonly(now);
};
