export const stepTypes = [
  { value: 'goto', label: '进入网站' },
  { value: 'enter_frame', label: '进入iframe' },
  { value: 'click', label: '单击' },
  { value: 'doubleClick', label: '双击' },
  { value: 'fill', label: '填写' },
  { value: 'hover', label: '悬停' },
  { value: 'select_option', label: '下拉选择' },
  { value: 'sleep', label: '等待' },
  { value: 'screenshot', label: '截图' },
  { value: 'refresh', label: '刷新' },
  { value: 'reference', label: '引用' },
  { value: 'upload_file', label: '上传附件' },
  { value: 'switch_to_tab', label: '切到指定tab' },
  { value: 'press_key', label: '键盘按键' },
  { value: 'AItest', label: 'AI执行' },
];

// 必须要填写元素定位的操作
export const elementLocatorRequired = ['click', 'doubleClick', 'fill', 'enter_frame', 'upload_file'];

// 必须要填写内容的操作
export const elementValueRequired = ['goto', 'fill', 'upload_file', 'switch_to_tab', 'press_key', 'AItest'];

// 断言类型配置
export const assertConfig = {
  types: [
    { value: 'no', label: '无需断言', name: '无需断言' },
    { value: 'to_have_title', label: '验证页面标题', name: '验证页面标题' },
    { value: 'to_have_url', label: '验证页面URL', name: '验证页面URL' },
    { value: 'to_have_text', label: '验证元素文本', name: '验证元素包含指定文本' },
    { value: 'to_have_attribute', label: '验证元素属性', name: '验证元素属性值' },
  ],
};

// 需要元素定位的断言类型
export const assertNeedsSelector = ['to_have_text', 'to_have_attribute'];

// 需要属性名称的断言类型
export const assertNeedsAttribute = ['to_have_attribute'];

// 需要期望值的断言类型
export const assertNeedsExpected = ['to_have_title', 'to_have_url', 'to_have_text', 'to_have_attribute'];
