<template>
  <!-- 单行输入框，{{变量}} 高亮：底下一层着色文字，上面一层透明文字的真输入框 -->
  <div class="at-varinput" :class="{ 'is-focus': focused }">
    <div ref="layer" class="at-varinput__hl at-mono" aria-hidden="true">
      <span v-for="(seg, i) in segments" :key="i" :class="{ 'at-varinput__var': seg.isVar }">{{ seg.text }}</span>
    </div>
    <input
      ref="input"
      class="at-varinput__input at-mono"
      :value="modelValue"
      :placeholder="placeholder"
      spellcheck="false"
      autocomplete="off"
      @input="onInput"
      @scroll="sync"
      @keyup="sync"
      @mouseup="sync"
      @focus="focused = true"
      @blur="onBlur"
      @keydown.enter="$emit('enter', $event)"
    />
  </div>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue';

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
});
const emit = defineEmits(['update:modelValue', 'enter']);

const input = ref(null);
const layer = ref(null);
const focused = ref(false);

const segments = computed(() => {
  const text = props.modelValue || '';
  const out = [];
  const re = /\{\{[^{}]*\}\}/g;
  let last = 0;
  let m = re.exec(text);
  while (m) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), isVar: false });
    out.push({ text: m[0], isVar: true });
    last = m.index + m[0].length;
    m = re.exec(text);
  }
  if (last < text.length) out.push({ text: text.slice(last), isVar: false });
  return out;
});

const sync = () => {
  if (layer.value && input.value) layer.value.scrollLeft = input.value.scrollLeft;
};
const onInput = (event) => {
  emit('update:modelValue', event.target.value);
  nextTick(sync);
  requestAnimationFrame(sync);
};
const onBlur = () => {
  focused.value = false;
  requestAnimationFrame(sync);
};

defineExpose({ focus: () => input.value?.focus() });
</script>
