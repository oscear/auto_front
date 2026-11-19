<template>
  <!-- 变量提取编辑器：从响应里取值，给后续步骤用 {{变量名}} 引用 -->
  <div class="rule-table">
    <div class="rule-row rule-header">
      <div class="c-check"></div>
      <div class="c-name">变量名</div>
      <div class="c-from">取值来源</div>
      <div class="c-expr">表达式</div>
      <div class="c-action"></div>
    </div>
    <div v-for="(row, index) in modelValue" :key="index" class="rule-row">
      <div class="c-check">
        <el-checkbox v-model="row.enabled" />
      </div>
      <div class="c-name">
        <el-input v-model="row.name" size="small" placeholder="如 token" />
      </div>
      <div class="c-from">
        <el-select v-model="row.from" size="small" @change="onFromChange(row)">
          <el-option v-for="s in SOURCES" :key="s.value" :label="s.label" :value="s.value" />
        </el-select>
      </div>
      <div class="c-expr">
        <el-input
          v-model="row.expr"
          size="small"
          :disabled="row.from === 'status'"
          :placeholder="sourceOf(row).hint"
        />
      </div>
      <div class="c-action">
        <el-button size="small" text class="rule-del" @click="remove(index)">
          <el-icon><Delete /></el-icon>
        </el-button>
      </div>
    </div>
    <div v-if="!modelValue.length" class="rule-empty">
      还没有提取器。例如登录接口提取 token，后面的步骤里写 {{ '{' + '{token}' + '}' }} 就能用上。
    </div>
    <div class="rule-footer">
      <el-button text type="primary" @click="add">
        <el-icon><Plus /></el-icon>
        添加提取器
      </el-button>
      <span class="rule-hint">取不到值时这一步记为失败</span>
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
  { value: 'status', label: '状态码', hint: '不需要填' },
];
const sourceOf = (row) => SOURCES.find((s) => s.value === row.from) || SOURCES[0];

const onFromChange = (row) => {
  if (row.from === 'status') row.expr = '';
};
const add = () => {
  emit('update:modelValue', [...props.modelValue, { name: '', from: 'json', expr: '', enabled: true }]);
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
.c-name { width: 200px; padding: 6px 8px; flex-shrink: 0; }
.c-from { width: 150px; padding: 6px 8px; flex-shrink: 0; }
.c-expr { flex: 1; padding: 6px 8px; min-width: 0; }
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
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #fbfcfd;
  border-top: 1px dashed #f1f5f9;
}
.rule-hint { font-size: 12px; color: #94a3b8; }
</style>
