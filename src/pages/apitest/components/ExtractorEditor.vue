<template>
  <!-- 提取变量：四种来源，取到的值后面的步骤可以用 {{变量名}} 引用 -->
  <div class="at-rules">
    <div v-if="modelValue.length" class="at-rule at-rule--extract at-rule__head">
      <span></span>
      <span>变量名</span>
      <span>来源</span>
      <span>表达式</span>
      <span></span>
    </div>
    <div
      v-for="(row, index) in modelValue"
      :key="index"
      class="at-rule at-rule--extract"
      :class="{ 'is-off': row.enabled === false }"
    >
      <label class="at-kv__check"><input v-model="row.enabled" type="checkbox" /></label>
      <input v-model="row.name" class="at-kv__input at-mono" placeholder="变量名，如 token" spellcheck="false" />
      <select v-model="row.from" class="at-select" @change="onFromChange(row)">
        <option v-for="s in SOURCES" :key="s.value" :value="s.value">{{ s.label }}</option>
      </select>
      <input
        v-model="row.expr"
        class="at-kv__input at-mono"
        :disabled="row.from === 'status'"
        :placeholder="sourceOf(row).hint"
        spellcheck="false"
      />
      <button type="button" class="at-icon-btn at-kv__del" title="删除" @click="remove(index)">
        <el-icon><Delete /></el-icon>
      </button>
    </div>
    <div v-if="!modelValue.length" class="at-hint">
      还没有提取规则。从响应里取出一个值存成变量，场景里后面的步骤可以用 <code v-pre>{{变量名}}</code> 引用。
    </div>
    <div class="at-rules__add">
      <span class="at-rules__add-label">添加提取</span>
      <button v-for="s in SOURCES" :key="s.value" type="button" class="at-chip" @click="add(s.value)">
        <el-icon><Plus /></el-icon>{{ s.label }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { Delete, Plus } from '@element-plus/icons-vue';

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
});
const emit = defineEmits(['update:modelValue']);

const SOURCES = [
  { value: 'json', label: '响应 JSON', hint: 'JSON 路径，如 $.data.token' },
  { value: 'header', label: '响应头', hint: '头名，如 X-Trace-Id' },
  { value: 'regex', label: '正则', hint: '取第一个括号里的内容，如 token=(\\w+)' },
  { value: 'status', label: '状态码', hint: '—' },
];
const sourceOf = (row) => SOURCES.find((s) => s.value === row.from) || SOURCES[0];

const onFromChange = (row) => {
  if (row.from === 'status') row.expr = '';
};
const add = (from) => {
  emit('update:modelValue', [...props.modelValue, { name: '', from, expr: '', enabled: true }]);
};
const remove = (index) => {
  emit('update:modelValue', props.modelValue.filter((_, i) => i !== index));
};
</script>
