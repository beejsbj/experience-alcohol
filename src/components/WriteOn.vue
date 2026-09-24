<script setup>
import { computed, ref } from "vue";
import { scatterRand } from "../utils/scatter";

const props = defineProps({
  modelValue: { type: String, default: "" },
  seed: { type: String, required: true },
  placeholder: { type: String, default: "write here…" },
  editable: { type: Boolean, default: true },
  color: { type: String, default: "var(--pen)" },
});
const emit = defineEmits(["update:modelValue", "done"]);

const inputRef = ref(null);
const focused = ref(false);

const chars = computed(() => {
  const rand = scatterRand(props.seed + props.modelValue.length);
  return [...props.modelValue].map((char, index) => {
    const randChar = scatterRand(`${props.seed}:${index}:${char}`);
    return {
      char: char === " " ? " " : char,
      style: {
        transform: `rotate(${((randChar() * 2 - 1) * 5).toFixed(1)}deg) translateY(${((randChar() * 2 - 1) * 2).toFixed(1)}px)`,
        color: props.color,
      },
    };
  });
});

const focusInput = () => {
  if (props.editable) inputRef.value?.focus();
};
</script>

<template>
  <span class="relative inline-block" @click="focusInput">
    <span class="scribble" :class="{ 'cursor-text': editable }">
      <span
        v-for="(entry, index) in chars"
        :key="index"
        class="write-on-char"
        :style="entry.style"
      >{{ entry.char }}</span>
      <span v-if="!modelValue && !focused" class="scribble" style="color: var(--faded)">{{ placeholder }}</span>
      <span
        v-if="focused"
        style="display:inline-block;width:2px;height:1em;background:var(--pen);vertical-align:-2px;animation:none"
      ></span>
    </span>
    <input
      v-if="editable"
      ref="inputRef"
      :value="modelValue"
      class="absolute inset-0 opacity-0"
      style="font-size: 16px"
      @input="emit('update:modelValue', $event.target.value)"
      @focus="focused = true"
      @blur="focused = false; emit('done')"
      @keydown.enter="inputRef.blur()"
    />
  </span>
</template>
