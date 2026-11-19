<template>
  <!-- 紧凑键值表：行内编辑、勾选启停、末尾常留一个空行、悬停才出删除 -->
  <div class="at-kv" :class="{ 'at-kv--desc': showDesc }">
    <div class="at-kv__row at-kv__head">
      <span></span>
      <span>{{ keyLabel }}</span>
      <span>{{ valueLabel }}</span>
      <span v-if="showDesc">说明</span>
      <span></span>
    </div>
    <div
      v-for="(row, index) in modelValue"
      :key="index"
      class="at-kv__row"
      :class="{ 'is-off': row.enabled === false }"
    >
      <label class="at-kv__check" title="勾选才生效">
        <input v-model="row.enabled" type="checkbox" />
      </label>
      <input
        :ref="(el) => setRef(el, index, 'key')"
        v-model="row.key"
        class="at-kv__input at-mono"
        :placeholder="keyPlaceholder"
        spellcheck="false"
      />
      <div class="at-kv__value">
        <input
          :ref="(el) => setRef(el, index, 'value')"
          v-model="row.value"
          class="at-kv__input at-mono"
          :class="{ 'is-masked': isMasked(row, index) }"
          :placeholder="valuePlaceholder"
          spellcheck="false"
          autocomplete="off"
        />
        <button
          v-if="maskSecrets && isSecretKey(row.key)"
          type="button"
          class="at-icon-btn"
          :title="shown[index] ? '遮住' : '显示'"
          @click="shown[index] = !shown[index]"
        >
          <el-icon><component :is="shown[index] ? Hide : View" /></el-icon>
        </button>
      </div>
      <input
        v-if="showDesc"
        v-model="row.description"
        class="at-kv__input at-kv__desc"
        placeholder="说明（不发送）"
      />
      <button type="button" class="at-icon-btn at-kv__del" title="删除这一行" @click="remove(index)">
        <el-icon><Delete /></el-icon>
      </button>
    </div>
    <!-- 末尾空行：一输入就变成正式的一行 -->
    <div class="at-kv__row at-kv__ghost">
      <span></span>
      <input
        class="at-kv__input at-mono"
        :placeholder="keyPlaceholder"
        spellcheck="false"
        @input="onGhost('key', $event)"
        @compositionend="onGhost('key', $event, true)"
      />
      <div class="at-kv__value">
        <input
          class="at-kv__input at-mono"
          :placeholder="valuePlaceholder"
          spellcheck="false"
          autocomplete="off"
          @input="onGhost('value', $event)"
          @compositionend="onGhost('value', $event, true)"
        />
      </div>
      <span v-if="showDesc"></span>
      <span></span>
    </div>
  </div>
</template>

<script setup>
import { nextTick, reactive } from 'vue';
import { Delete, Hide, View } from '@element-plus/icons-vue';
import { isSecretKey } from '../common';

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  keyLabel: { type: String, default: '名称' },
  valueLabel: { type: String, default: '值' },
  keyPlaceholder: { type: String, default: '名称' },
  valuePlaceholder: { type: String, default: '值，可用 {{变量}}' },
  showDesc: { type: Boolean, default: false },
  // 键名像密码/令牌的值默认遮住，点眼睛显示
  maskSecrets: { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue']);

const shown = reactive({});
const refs = {};
const setRef = (el, index, field) => {
  if (el) refs[`${index}:${field}`] = el;
  else delete refs[`${index}:${field}`];
};

const isMasked = (row, index) => props.maskSecrets && isSecretKey(row.key) && !shown[index] && !!row.value;

const remove = (index) => {
  Object.keys(shown).forEach((k) => delete shown[k]);
  emit('update:modelValue', props.modelValue.filter((_, i) => i !== index));
};

const onGhost = (field, event, composed = false) => {
  // 拼音输入过程中不打断，等上屏后再转成正式行
  if (event.isComposing && !composed) return;
  const text = event.target.value;
  if (!text) return;
  event.target.value = '';
  const row = { key: '', value: '', description: '', enabled: true };
  row[field] = text;
  const index = props.modelValue.length;
  emit('update:modelValue', [...props.modelValue, row]);
  nextTick(() => {
    const el = refs[`${index}:${field}`];
    if (el) {
      el.focus();
      el.setSelectionRange(text.length, text.length);
    }
  });
};
</script>
