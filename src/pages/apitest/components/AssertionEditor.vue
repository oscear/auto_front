<template>
  <!-- 断言编辑：六类断言对象，逐条行内编辑 -->
  <div class="at-rules">
    <div v-if="modelValue.length" class="at-rule at-rule--assert at-rule__head">
      <span></span>
      <span>断言对象</span>
      <span>表达式</span>
      <span>比较</span>
      <span>期望值</span>
      <span></span>
    </div>
    <div
      v-for="(row, index) in modelValue"
      :key="index"
      class="at-rule at-rule--assert"
      :class="{ 'is-off': row.enabled === false }"
    >
      <label class="at-kv__check"><input v-model="row.enabled" type="checkbox" /></label>
      <select v-model="row.type" class="at-select" @change="onTypeChange(row)">
        <option v-for="t in TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
      </select>
      <input
        v-model="row.expr"
        class="at-kv__input at-mono"
        :disabled="!typeOf(row).needExpr"
        :placeholder="typeOf(row).exprHint"
        spellcheck="false"
      />
      <select v-model="row.op" class="at-select">
        <option v-for="op in typeOf(row).ops" :key="op" :value="op">{{ ASSERT_OP_TEXT[op] }}</option>
      </select>
      <input
        v-model="row.expected"
        class="at-kv__input at-mono"
        :disabled="noExpected(row)"
        :placeholder="noExpected(row) ? '—' : '期望值，可用 {{变量}}'"
        spellcheck="false"
      />
      <button type="button" class="at-icon-btn at-kv__del" title="删除" @click="remove(index)">
        <el-icon><Delete /></el-icon>
      </button>
    </div>
    <div v-if="!modelValue.length" class="at-hint">还没有断言。不加断言时，只要请求发得出去就算通过。</div>
    <div class="at-rules__add">
      <span class="at-rules__add-label">添加断言</span>
      <button v-for="t in TYPES" :key="t.value" type="button" class="at-chip" @click="add(t)">
        <el-icon><Plus /></el-icon>{{ t.short }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { Delete, Plus } from '@element-plus/icons-vue';
import { ASSERT_OP_TEXT } from '../common';

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
});
const emit = defineEmits(['update:modelValue']);

const TYPES = [
  { value: 'status', label: '状态码', short: '状态码', needExpr: false, exprHint: '—', ops: ['eq', 'ne', 'gt', 'lt'], op: 'eq', expected: '200' },
  { value: 'jsonpath', label: 'JSON 字段', short: 'JSON 字段', needExpr: true, exprHint: '$.data.list[0].id', ops: ['eq', 'ne', 'gt', 'lt', 'contains', 'exists', 'matches'], op: 'eq', expected: '' },
  { value: 'contains', label: '响应文本', short: '包含文字', needExpr: false, exprHint: '—', ops: ['contains'], op: 'contains', expected: '' },
  { value: 'regex', label: '正则', short: '正则', needExpr: true, exprHint: '"orderNo":"(\\w+)"', ops: ['matches', 'eq', 'ne', 'contains'], op: 'matches', expected: '' },
  { value: 'header', label: '响应头', short: '响应头', needExpr: true, exprHint: '头名，如 Content-Type', ops: ['eq', 'ne', 'contains', 'exists', 'matches'], op: 'eq', expected: '' },
  { value: 'response_time', label: '响应时间(ms)', short: '响应时间', needExpr: false, exprHint: '—', ops: ['lt', 'gt'], op: 'lt', expected: '2000' },
];

const typeOf = (row) => TYPES.find((t) => t.value === row.type) || TYPES[0];
// 「存在」不需要期望值；正则的「匹配正则」表示能匹配上即可
const noExpected = (row) => row.op === 'exists' || (row.type === 'regex' && row.op === 'matches');

const onTypeChange = (row) => {
  const type = typeOf(row);
  if (!type.ops.includes(row.op)) row.op = type.op;
  if (!type.needExpr) row.expr = '';
};

const add = (type) => {
  emit('update:modelValue', [
    ...props.modelValue,
    { type: type.value, expr: '', op: type.op, expected: type.expected, enabled: true },
  ]);
};
const remove = (index) => {
  emit('update:modelValue', props.modelValue.filter((_, i) => i !== index));
};
</script>
