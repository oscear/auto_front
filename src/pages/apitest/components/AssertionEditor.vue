<template>
  <!-- 断言编辑器：逐条增删改 -->
  <div class="rule-table">
    <div class="rule-row rule-header">
      <div class="c-check"></div>
      <div class="c-type">断言对象</div>
      <div class="c-expr">表达式</div>
      <div class="c-op">比较方式</div>
      <div class="c-expected">期望值</div>
      <div class="c-action"></div>
    </div>
    <div v-for="(row, index) in modelValue" :key="index" class="rule-row">
      <div class="c-check">
        <el-checkbox v-model="row.enabled" />
      </div>
      <div class="c-type">
        <el-select v-model="row.type" size="small" @change="onTypeChange(row)">
          <el-option v-for="t in TYPES" :key="t.value" :label="t.label" :value="t.value" />
        </el-select>
      </div>
      <div class="c-expr">
        <el-input
          v-model="row.expr"
          size="small"
          :disabled="!typeOf(row).needExpr"
          :placeholder="typeOf(row).exprHint"
        />
      </div>
      <div class="c-op">
        <el-select v-model="row.op" size="small">
          <el-option v-for="op in opsOf(row)" :key="op.value" :label="op.label" :value="op.value" />
        </el-select>
      </div>
      <div class="c-expected">
        <el-input
          v-model="row.expected"
          size="small"
          :disabled="noExpected(row)"
          :placeholder="noExpected(row) ? '不需要填' : '期望值，可用 {{变量}}'"
        />
      </div>
      <div class="c-action">
        <el-button size="small" text class="rule-del" @click="remove(index)">
          <el-icon><Delete /></el-icon>
        </el-button>
      </div>
    </div>
    <div v-if="!modelValue.length" class="rule-empty">还没有断言。不加断言时，只要请求发得出去就算通过。</div>
    <div class="rule-footer">
      <el-button text type="primary" @click="add('status')"><el-icon><Plus /></el-icon>状态码</el-button>
      <el-button text type="primary" @click="add('jsonpath')"><el-icon><Plus /></el-icon>JSON 字段</el-button>
      <el-button text type="primary" @click="add('contains')"><el-icon><Plus /></el-icon>包含文字</el-button>
      <el-button text type="primary" @click="add('regex')"><el-icon><Plus /></el-icon>正则</el-button>
      <el-button text type="primary" @click="add('header')"><el-icon><Plus /></el-icon>响应头</el-button>
      <el-button text type="primary" @click="add('response_time')"><el-icon><Plus /></el-icon>响应时间</el-button>
    </div>
  </div>
</template>

<script setup>
import { Delete, Plus } from '@element-plus/icons-vue';

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
});
const emit = defineEmits(['update:modelValue']);

const OPS = {
  eq: { value: 'eq', label: '等于' },
  ne: { value: 'ne', label: '不等于' },
  gt: { value: 'gt', label: '大于' },
  lt: { value: 'lt', label: '小于' },
  contains: { value: 'contains', label: '包含' },
  exists: { value: 'exists', label: '存在' },
  matches: { value: 'matches', label: '匹配正则' },
};
const pick = (...names) => names.map((n) => OPS[n]);

const TYPES = [
  { value: 'status', label: '状态码', needExpr: false, exprHint: '不需要填', ops: pick('eq', 'ne', 'gt', 'lt'), op: 'eq', expected: '200' },
  { value: 'jsonpath', label: 'JSON 字段', needExpr: true, exprHint: '如 $.data.list[0].id', ops: pick('eq', 'ne', 'gt', 'lt', 'contains', 'exists', 'matches'), op: 'eq', expected: '' },
  { value: 'contains', label: '响应文本', needExpr: false, exprHint: '不需要填', ops: pick('contains'), op: 'contains', expected: '' },
  { value: 'regex', label: '正则', needExpr: true, exprHint: '如 "orderNo":"(\\w+)"', ops: pick('matches', 'eq', 'ne', 'contains'), op: 'matches', expected: '' },
  { value: 'header', label: '响应头', needExpr: true, exprHint: '头名，如 Content-Type', ops: pick('eq', 'ne', 'contains', 'exists', 'matches'), op: 'eq', expected: '' },
  { value: 'response_time', label: '响应时间(ms)', needExpr: false, exprHint: '不需要填', ops: pick('lt', 'gt'), op: 'lt', expected: '2000' },
];

const typeOf = (row) => TYPES.find((t) => t.value === row.type) || TYPES[0];
const opsOf = (row) => typeOf(row).ops;
// 「存在」不需要期望值；正则的「匹配正则」表示能匹配上即可
const noExpected = (row) => row.op === 'exists' || (row.type === 'regex' && row.op === 'matches');

const onTypeChange = (row) => {
  const type = typeOf(row);
  if (!type.ops.some((op) => op.value === row.op)) row.op = type.op;
  if (!type.needExpr) row.expr = '';
};

const add = (typeName) => {
  const type = TYPES.find((t) => t.value === typeName);
  emit('update:modelValue', [
    ...props.modelValue,
    { type: type.value, expr: '', op: type.op, expected: type.expected, enabled: true },
  ]);
};
const remove = (index) => {
  emit('update:modelValue', props.modelValue.filter((_, i) => i !== index));
};
</script>

<style scoped>
.rule-table {
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
}
.rule-row {
  display: flex;
  align-items: center;
  min-height: 42px;
  border-bottom: 1px solid #f1f5f9;
}
.rule-row:not(.rule-header):hover { background: #fafbfc; }
.rule-header {
  background: #f8fafc;
  font-size: 12px;
  color: #94a3b8;
  font-weight: 600;
  min-height: 34px;
}
.c-check { width: 44px; display: flex; justify-content: center; flex-shrink: 0; }
.c-type { width: 150px; padding: 6px 8px; flex-shrink: 0; }
.c-expr { flex: 1.4; padding: 6px 8px; min-width: 0; }
.c-op { width: 130px; padding: 6px 8px; flex-shrink: 0; }
.c-expected { flex: 1; padding: 6px 8px; min-width: 0; }
.c-action { width: 48px; display: flex; justify-content: center; flex-shrink: 0; }
.rule-table :deep(.el-input__inner) {
  font-family: 'JetBrains Mono', 'Fira Code', Monaco, Menlo, Consolas, monospace;
  font-size: 12.5px;
}
.rule-del { color: #94a3b8; padding: 4px; }
.rule-del:hover { color: #ef4444; background: #fef2f2; }
.rule-empty { padding: 16px; text-align: center; color: #94a3b8; font-size: 12px; }
.rule-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px 12px;
  background: #fbfcfd;
  border-top: 1px dashed #f1f5f9;
}
.rule-footer :deep(.el-button) { margin-left: 0; }
</style>
