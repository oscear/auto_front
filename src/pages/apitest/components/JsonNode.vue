<template>
  <!-- JSON 树的一个节点（递归）：可折叠、语法着色 -->
  <div class="at-json__node">
    <div class="at-json__line" :style="{ paddingLeft: depth * 16 + 4 + 'px' }">
      <span v-if="isContainer" class="at-json__toggle" :class="{ 'is-open': open }" @click="open = !open"></span>
      <span v-else class="at-json__toggle is-leaf"></span>
      <template v-if="name !== null">
        <span v-if="typeof name === 'string'" class="at-json__key">"{{ name }}"</span><span v-if="typeof name === 'string'" class="at-json__punc">: </span>
      </template>
      <template v-if="isContainer">
        <span class="at-json__punc">{{ brackets[0] }}</span>
        <template v-if="!open || !size">
          <span v-if="size" class="at-json__fold" @click="open = true">{{ size }} 项</span>
          <span class="at-json__punc">{{ brackets[1] }}{{ comma }}</span>
        </template>
      </template>
      <template v-else>
        <span :class="'at-json__' + kind">{{ text }}</span><span class="at-json__punc">{{ comma }}</span>
      </template>
    </div>
    <template v-if="isContainer && open && size">
      <JsonNode
        v-for="(entry, i) in shownEntries"
        :key="entry[0]"
        :name="isArray ? i : entry[0]"
        :value="entry[1]"
        :depth="depth + 1"
        :last="i === size - 1"
      />
      <div v-if="size > limit" class="at-json__line at-json__more" :style="{ paddingLeft: (depth + 1) * 16 + 20 + 'px' }" @click="limit += 200">
        还有 {{ size - limit }} 项，点击再显示 200 项
      </div>
      <div class="at-json__line" :style="{ paddingLeft: depth * 16 + 20 + 'px' }">
        <span class="at-json__punc">{{ brackets[1] }}{{ comma }}</span>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, inject, ref, watch } from 'vue';

const props = defineProps({
  name: { type: [String, Number], default: null },
  value: { default: null },
  depth: { type: Number, default: 0 },
  last: { type: Boolean, default: true },
});

const isArray = computed(() => Array.isArray(props.value));
const isContainer = computed(() => props.value !== null && typeof props.value === 'object');
const entries = computed(() => (isContainer.value ? Object.entries(props.value) : []));
const size = computed(() => entries.value.length);
const limit = ref(100);
const shownEntries = computed(() => entries.value.slice(0, limit.value));
const brackets = computed(() => (isArray.value ? '[]' : '{}'));
const comma = computed(() => (props.last ? '' : ','));

const kind = computed(() => {
  const v = props.value;
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'string') return 'str';
  if (typeof v === 'number') return 'num';
  if (typeof v === 'boolean') return 'bool';
  return 'str';
});
const text = computed(() => (kind.value === 'str' ? JSON.stringify(props.value) : String(props.value)));

// 默认展开前三层；「全部展开/折叠」由外层广播
const open = ref(props.depth < 3);
const signal = inject('atJsonSignal', null);
if (signal) {
  watch(
    () => signal.value.tick,
    () => {
      open.value = signal.value.open;
    }
  );
}
</script>
