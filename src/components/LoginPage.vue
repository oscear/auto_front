<template>
  <div class="login-page">
    <div class="left-section">
      <div class="characters-section">
        <AnimatedCharacters
          :isTyping="isTyping"
          :showPassword="showPassword"
          :passwordLength="isRegister ? registerForm.password.length : password.length"
          :loginFailed="loginFailed"
          :loginSuccess="loginSuccess"
        />
      </div>

      <div class="footer-links">
        <a href="#" class="footer-link">用户网站</a>
        <a href="#" class="footer-link">TMC</a>
      </div>

      <div class="grid-overlay"></div>
      <div class="blur-circle blur-circle-1"></div>
      <div class="blur-circle blur-circle-2"></div>
    </div>

    <div class="right-section">
      <div class="form-wrapper">
        <div class="form-header">
          <h1 class="form-title">{{ isRegister ? 'Create Account' : 'Welcome back!' }}</h1>
          <p class="form-subtitle">
            {{ isRegister ? 'Fill in your details to get started' : 'Please enter your details' }}
          </p>
        </div>

        <form @submit.prevent="handleSubmit" class="login-form">
          <div class="form-group">
            <input
              v-if="isRegister"
              id="username"
              v-model="registerForm.username"
              type="text"
              placeholder="account"
              class="form-input"
              autocomplete="off"
              required
              @focus="isTyping = true"
              @blur="isTyping = false"
            />
          </div>

          <div v-if="isRegister" class="form-group">
            <input
              id="first_name"
              v-model="registerForm.first_name"
              type="text"
              placeholder="Full Name"
              class="form-input"
              autocomplete="off"
              required
              @focus="isTyping = true"
              @blur="isTyping = false"
            />
          </div>

          <div v-if="isRegister" class="form-group">
            <input
              id="regEmail"
              v-model="registerForm.email"
              type="text"
              placeholder="email"
              class="form-input"
              autocomplete="off"
              required
              @focus="isTyping = true"
              @blur="isTyping = false"
            />
          </div>

          <div class="form-group">
            <input
              id="loginEmail"
              v-if="!isRegister"
              v-model="email"
              type="text"
              placeholder="account"
              class="form-input"
              autocomplete="off"
              required
              @focus="isTyping = true"
              @blur="isTyping = false"
            />
          </div>

          <div class="form-group">
            <div class="password-wrapper">
              <input
                :id="isRegister ? 'regPassword' : 'loginPassword'"
                :value="isRegister ? registerForm.password : password"
                @input="isRegister ? (registerForm.password = $event.target.value) : (password = $event.target.value)"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Password"
                class="form-input"
                required
              />
              <button type="button" @click="showPassword = !showPassword" class="password-toggle">
                <svg
                  v-if="showPassword"
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <svg
                  v-else
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                  <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                  <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                  <line x1="2" x2="22" y1="2" y2="22" />
                </svg>
              </button>
            </div>
            <p v-if="errors.password" class="error-message">{{ errors.password }}</p>
          </div>

          <div v-if="errorMessage" class="error-alert">{{ errorMessage }}</div>

          <button type="submit" class="submit-button" :disabled="isLoading">
            {{
              isLoading
                ? isRegister
                  ? 'Creating account...'
                  : 'Signing in...'
                : isRegister
                  ? 'Create Account'
                  : 'Log in'
            }}
          </button>
        </form>

        <div class="toggle-link">
          {{ isRegister ? 'Already have an account?' : "Don't have an account?" }}
          <a href="#" @click.prevent="toggleMode">{{ isRegister ? 'Log in' : 'Sign Up' }}</a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { projectApi } from '@/utils/api';
import AnimatedCharacters from './AnimatedCharacters.vue';

const router = useRouter();

const isRegister = ref(false);
const email = ref('');
const password = ref('');
const showPassword = ref(false);
const isLoading = ref(false);
const isTyping = ref(false);
const loginFailed = ref(false);
const loginSuccess = ref(false);
const errorMessage = ref('');

const registerForm = reactive({
  username: '',
  email: '',
  password: '',
  first_name: '',
});

const errors = reactive({
  email: '',
  password: '',
});

const toggleMode = () => {
  isRegister.value = !isRegister.value;
  email.value = '';
  password.value = '';
  registerForm.username = '';
  registerForm.email = '';
  registerForm.password = '';
  registerForm.first_name = '';
  errorMessage.value = '';
  errors.email = '';
  errors.password = '';
};

const validateLogin = () => {
  errors.email = '';
  errors.password = '';
  let isValid = true;

  // if (!email.value) {
  //   errors.email = 'Email is required';
  //   isValid = false;
  // } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
  //   errors.email = 'Please enter a valid email address';
  //   isValid = false;
  // }

  if (!password.value) {
    errors.password = 'Password is required';
    isValid = false;
  }

  return isValid;
};

const validateRegister = () => {
  errors.email = '';
  errors.password = '';
  let isValid = true;

  if (!registerForm.username) {
    errorMessage.value = 'Username is required';
    isValid = false;
  }

  if (!registerForm.first_name) {
    errorMessage.value = 'Full name is required';
    isValid = false;
  }

  if (!registerForm.email) {
    errorMessage.value = 'Email is required';
    isValid = false;
  }

  if (!registerForm.password) {
    errorMessage.value = 'Password is required';
    isValid = false;
  } else if (registerForm.password.length < 6) {
    errorMessage.value = 'Password must be at least 6 characters';
    isValid = false;
  }

  return isValid;
};

const handleSubmit = async () => {
  errorMessage.value = '';

  if (isRegister.value) {
    if (!validateRegister()) return;

    isLoading.value = true;
    try {
      await projectApi.register({ ...registerForm });
      ElMessage.success('Account created successfully!');
      isRegister.value = false;
      registerForm.username = '';
      registerForm.email = '';
      registerForm.password = '';
      registerForm.first_name = '';
      ElMessage.info('Please log in with your new account');
    } catch (error) {
      errorMessage.value = error.message || 'Registration failed. Please try again.';
    } finally {
      isLoading.value = false;
    }
  } else {
    if (!validateLogin()) return;

    isLoading.value = true;
    loginFailed.value = false;
    loginSuccess.value = false;

    try {
      const response = await projectApi.login({ username: email.value, password: password.value });
      localStorage.setItem('authData', JSON.stringify(response));
      loginSuccess.value = true;
      ElMessage.success('Login successful!');
      setTimeout(() => {
        router.push('/');
      }, 1000);
    } catch (error) {
      errorMessage.value = error.message || 'Login failed. Please try again.';
      loginFailed.value = true;
      setTimeout(() => {
        loginFailed.value = false;
      }, 3000);
    } finally {
      isLoading.value = false;
    }
  }
};
</script>

<style scoped>
.login-page {
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 100vh;
}

.left-section {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 3rem;
  color: white;
}

.characters-section {
  position: relative;
  z-index: 20;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  height: 500px;
  margin: auto 0;
}

.footer-links {
  position: relative;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 2rem;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
}

.footer-link {
  color: inherit;
  text-decoration: none;
}

.grid-overlay {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  background-size: 40px 40px;
  pointer-events: none;
}

.blur-circle {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
}

.blur-circle-1 {
  top: 20%;
  right: 10%;
  width: 300px;
  height: 300px;
  background: rgba(255, 255, 255, 0.1);
}

.blur-circle-2 {
  bottom: 15%;
  left: 15%;
  width: 400px;
  height: 400px;
  background: rgba(255, 255, 255, 0.08);
}

.right-section {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: #fafafa;
}

.form-wrapper {
  width: 100%;
  max-width: 400px;
  background: white;
  padding: 2.5rem;
  border-radius: 24px;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.08);
}

.form-header {
  margin-bottom: 2rem;
  text-align: center;
}

.form-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0 0 0.5rem 0;
}

.form-subtitle {
  font-size: 0.9rem;
  color: #6b7280;
  margin: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-input {
  width: 100%;
  padding: 0.875rem 1rem;
  font-size: 0.95rem;
  border: 1.5px solid #e5e7eb;
  border-radius: 12px;
  outline: none;
  transition: all 0.2s;
  background: #f9fafb;
  box-sizing: border-box;
}

.form-input:focus {
  border-color: #667eea;
  background: white;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-input::placeholder {
  color: #9ca3af;
}

.password-wrapper {
  position: relative;
  width: 100%;
}

.password-toggle {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: #9ca3af;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.password-toggle:hover {
  color: #667eea;
}

.error-message {
  font-size: 0.8rem;
  color: #ef4444;
  margin: 0.25rem 0 0 0;
}

.error-alert {
  padding: 0.75rem 1rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 10px;
  color: #dc2626;
  font-size: 0.875rem;
  text-align: center;
}

.submit-button {
  width: 100%;
  padding: 0.875rem;
  font-size: 1rem;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 0.5rem;
}

.submit-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.submit-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.toggle-link {
  margin-top: 1.5rem;
  text-align: center;
  font-size: 0.9rem;
  color: #6b7280;
}

.toggle-link a {
  color: #667eea;
  text-decoration: none;
  font-weight: 600;
  margin-left: 0.25rem;
}

.toggle-link a:hover {
  color: #764ba2;
}

@media (max-width: 768px) {
  .login-page {
    grid-template-columns: 1fr;
  }

  .left-section {
    display: none;
  }

  .form-wrapper {
    padding: 1.5rem;
    box-shadow: none;
    background: transparent;
  }

  .form-title {
    font-size: 1.5rem;
  }
}
</style>
