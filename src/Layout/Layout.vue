<template>
  <div class="layout">
    <Header />
    <div class="main-container">
      <Sidebar />
      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import Header from './Header.vue';
import Sidebar from './Sidebar.vue';
</script>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

.main-container {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.content {
  flex: 1;
  padding: 32px;
  background: #ffffff;
  overflow: auto;
  box-shadow: inset 8px 0 16px -10px rgba(0, 0, 0, 0.02);
}
</style>
