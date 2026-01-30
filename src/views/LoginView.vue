<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const email = ref('')
const password = ref('')
const isLoading = ref(false)
const error = ref('')

const handleLogin = async () => {
  isLoading.value = true
  error.value = ''

  // Simulated login delay
  await new Promise(resolve => setTimeout(resolve, 800))

  // Mock authentication (accept any non-empty credentials)
  if (email.value && password.value) {
    localStorage.setItem('pixel-forge-auth', 'true')
    localStorage.setItem('pixel-forge-user', JSON.stringify({
      email: email.value,
      name: email.value.split('@')[0]
    }))
    router.push('/dashboard')
  } else {
    error.value = 'Please enter email and password'
  }

  isLoading.value = false
}
</script>

<template>
  <div class="login-container">
    <!-- Background pattern -->
    <div class="background-pattern"></div>

    <!-- Login card -->
    <div class="login-card pixel-border">
      <!-- Logo -->
      <div class="logo-section">
        <h1 class="logo-text crt-glow">PIXEL</h1>
        <h1 class="logo-text logo-forge crt-glow-accent">FORGE</h1>
        <p class="tagline">Game Creation Platform</p>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="email" class="form-label">EMAIL</label>
          <input
            id="email"
            v-model="email"
            type="email"
            class="form-input pixel-border"
            placeholder="player@game.dev"
            :disabled="isLoading"
          />
        </div>

        <div class="form-group">
          <label for="password" class="form-label">PASSWORD</label>
          <input
            id="password"
            v-model="password"
            type="password"
            class="form-input pixel-border"
            placeholder="********"
            :disabled="isLoading"
          />
        </div>

        <!-- Error message -->
        <p v-if="error" class="error-message">{{ error }}</p>

        <!-- Submit button -->
        <button
          type="submit"
          class="login-button pixel-border pixel-hover"
          :disabled="isLoading"
          :class="{ 'loading': isLoading }"
        >
          <span v-if="!isLoading">START GAME</span>
          <span v-else class="animate-blink">LOADING...</span>
        </button>
      </form>

      <!-- Footer -->
      <div class="login-footer">
        <p class="pixel-font-sm text-muted">Press START to continue</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
  position: relative;
  overflow: hidden;
}

.background-pattern {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(135deg, var(--bg-dark) 0%, var(--bg-medium) 50%, var(--bg-dark) 100%),
    repeating-linear-gradient(
      0deg,
      transparent 0px,
      transparent 2px,
      rgba(0, 212, 255, 0.03) 2px,
      rgba(0, 212, 255, 0.03) 4px
    );
  background-size: 100% 100%, 4px 4px;
}

.background-pattern::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle at 20% 80%, rgba(201, 162, 39, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(0, 212, 255, 0.1) 0%, transparent 50%);
}

.login-card {
  position: relative;
  background: var(--bg-medium);
  padding: var(--space-xl);
  width: 100%;
  max-width: 400px;
  z-index: 1;
}

.logo-section {
  text-align: center;
  margin-bottom: var(--space-xl);
}

.logo-text {
  font-size: 32px;
  margin: 0;
  letter-spacing: 4px;
}

.logo-forge {
  color: var(--accent);
}

.tagline {
  color: var(--text-secondary);
  font-size: 10px;
  margin-top: var(--space-sm);
  letter-spacing: 2px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.form-label {
  font-size: 10px;
  color: var(--text-secondary);
  letter-spacing: 1px;
}

.form-input {
  background: var(--bg-dark);
  border-color: var(--bg-light);
  color: var(--text-primary);
  padding: var(--space-md);
  font-family: 'Press Start 2P', monospace;
  font-size: 12px;
  width: 100%;
  transition: all var(--transition-fast);
}

.form-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 10px rgba(0, 212, 255, 0.3);
}

.form-input::placeholder {
  color: var(--text-muted);
}

.error-message {
  color: var(--error);
  font-size: 10px;
  text-align: center;
  animation: pixel-shake 0.3s ease-in-out;
}

.login-button {
  background: var(--primary);
  color: var(--bg-dark);
  border-color: var(--primary-light);
  padding: var(--space-md) var(--space-lg);
  font-family: 'Press Start 2P', monospace;
  font-size: 14px;
  cursor: pointer;
  transition: all var(--transition-fast);
  margin-top: var(--space-md);
}

.login-button:hover:not(:disabled) {
  background: var(--primary-light);
  transform: translateY(-2px);
}

.login-button:active:not(:disabled) {
  transform: translateY(0);
}

.login-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.login-button.loading {
  background: var(--bg-light);
  color: var(--text-secondary);
}

.login-footer {
  text-align: center;
  margin-top: var(--space-xl);
}
</style>
