<template>
  <!-- 键值对编辑表（请求头、查询参数、表单、变量共用） -->
  <div class="kv-table">
    <div class="kv-row kv-header">
      <div class="kv-check"></div>
      <div class="kv-key">{{ keyLabel }}</div>
      <div class="kv-value">{{ valueLabel }}</div>
      <div v-if="showDesc" class="kv-desc">说明</div>
      <div class="kv-action"></div>
    </div>
    <div v-for="(row, index) in modelValue" :key="index" class="kv-row">
      <div class="kv-check">
        <el-checkbox v-model="row.enabled" />
      </div>
      <div class="kv-key">
        <el-input v-model="row.key" :placeholder="keyPlaceholder" size="small" />
      </div>
      <div class="kv-value">
        <el-input v-model="row.value" :placeholder="valuePlaceholder" size="small" />
      </div>
      <div v-if="showDesc" class="kv-desc">
        <el-input v-model="row.description" placeholder="说明（不发送）" size="small" />
      </div>
      <div class="kv-action">
        <el-button size="small" text class="kv-del" @click="remove(index)">
          <el-icon><Delete /></el-icon>
        </el-button>
      </div>
    </div>
    <div v-if="!modelValue.length" class="kv-empty">{{ emptyText }}</div>
    <div class="kv-footer">
      <el-button text type="primary" class="kv-add" @click="add">
        <el-icon><Plus /></el-icon>
        {{ addText }}
      </el-button>
      <span v-if="hint" class="kv-hint">{{ hint }}</span>
    </div>
  </div>
</template>

<script setup>
import { Delete, Plus } from '@element-plus/icons-vue';

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  keyLabel: { type: String, default: 'KEY' },
  valueLabel: { type: String, default: 'VALUE' },
  keyPlaceholder: { type: String, default: 'Key' },
  valuePlaceholder: { type: String, default: 'Value，可用 {{变量}}' },
  addText: { type: String, default: '添加一行' },
  emptyText: { type: String, default: '还没有内容' },
  hint: { type: String, default: '' },
  showDesc: { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue']);

const add = () => {
  emit('update:modelValue', [...props.modelValue, { key: '', value: '', description: '', enabled: true }]);
};
const remove = (index) => {
  emit('update:modelValue', props.modelValue.filter((_, i) => i !== index));
};
</script>

<style scoped>
.kv-table {
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
}
.kv-row {
  display: flex;
  align-items: center;
  min-height: 40px;
  border-bottom: 1px solid #f1f5f9;
  transition: background 0.1s;
}
.kv-row:not(.kv-header):hover {
  background: #fafbfc;
}
.kv-header {
  background: #f8fafc;
  font-size: 11px;
  color: #94a3b8;
  font-weight: 600;
  letter-spacing: 0.05em;
  min-height: 34px;
}
.kv-check { width: 44px; display: flex; justify-content: center; flex-shrink: 0; }
.kv-key { width: 240px; padding: 6px 10px; flex-shrink: 0; }
.kv-value { flex: 2; padding: 6px 10px; min-width: 0; }
.kv-desc { flex: 1; padding: 6px 10px; min-width: 0; }
.kv-action { width: 48px; display: flex; justify-content: center; flex-shrink: 0; }
.kv-table :deep(.el-input__wrapper) {
  box-shadow: none !important;
  background: transparent;
  padding: 2px 6px;
  font-family: 'JetBrains Mono', 'Fira Code', Monaco, Menlo, Consolas, monospace;
  font-size: 12.5px;
}
.kv-table :deep(.el-input__wrapper:hover),
.kv-table :deep(.el-input__wrapper.is-focus) {
  background: #fff;
  box-shadow: 0 0 0 1px #6366f1 inset !important;
  border-radius: 4px;
}
.kv-del { color: #94a3b8; padding: 4px; }
.kv-del:hover { color: #ef4444; background: #fef2f2; }
.kv-empty { padding: 14px; text-align: center; color: #94a3b8; font-size: 12px; }
.kv-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #fbfcfd;
  border-top: 1px dashed #f1f5f9;
}
.kv-add { color: #6366f1; font-weight: 500; }
.kv-hint { font-size: 12px; color: #94a3b8; }
@media (max-width: 900px) {
  .kv-key { width: 140px; }
  .kv-desc { display: none; }
}
</style>
