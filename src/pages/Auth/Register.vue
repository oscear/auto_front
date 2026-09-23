<template>
  <div class="auth-container">
    <el-card class="auth-card">
      <h2 class="auth-title">注册</h2>
      <el-form :model="form" :rules="rules" ref="registerForm">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="账号" prefix-icon="el-icon-user"></el-input>
        </el-form-item>
        <el-form-item prop="first_name">
          <el-input v-model="form.first_name" placeholder="真名" prefix-icon="el-icon-user"></el-input>
        </el-form-item>
        <el-form-item prop="email">
          <el-input v-model="form.email" placeholder="邮箱" prefix-icon="el-icon-message"></el-input>
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" placeholder="密码" prefix-icon="el-icon-lock" show-password></el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleRegister" style="width: 100%">注册</el-button>
        </el-form-item>
      </el-form>
      <div class="auth-footer">
        <el-link type="primary" @click="goToLogin">已有账号？立即登录</el-link>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { projectApi } from '@/utils/api';

const router = useRouter();
const registerForm = ref(null);
const form = ref({
  username: '',
  email: '',
  password: '',
  first_name: '',
});

const rules = {
  username: [{ required: true, message: '请输入账号', trigger: 'change' }],
  first_name: [{ required: true, message: '请输入真名', trigger: 'change' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'change' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: ['blur', 'change'] },
  ],
  password: [{ required: true, message: '请输入密码', trigger: 'change' }],
};

const handleRegister = async () => {
  try {
    await registerForm.value.validate();
    await projectApi.register(form.value);
    ElMessage.success('注册成功');
    router.push('/login');
  } catch (error) {
    ElMessage.error(error.message || '注册失败');
  }
};

const goToLogin = () => {
  router.push('/login');
};
</script>

<style scoped>
.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f5f7fa;
}

.auth-card {
  width: 400px;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.auth-title {
  text-align: center;
  margin-bottom: 30px;
  color: #409eff;
}

.auth-footer {
  text-align: center;
  margin-top: 20px;
}
</style>
