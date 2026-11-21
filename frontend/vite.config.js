import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiBaseUrl =
    process.env.VITE_API_URL ||
    env.VITE_API_URL ||
    process.env.VITE_API_BASE_URL ||
    env.VITE_API_BASE_URL ||
    'http://localhost:5000/api';
  let apiTarget;

  try {
    const parsedApiUrl = new URL(apiBaseUrl);
    if (!['http:', 'https:'].includes(parsedApiUrl.protocol)) {
      throw new Error('The API URL must use HTTP or HTTPS.');
    }
    apiTarget = parsedApiUrl.origin;
  } catch (error) {
    throw new Error(
      'VITE_API_URL or VITE_API_BASE_URL must be an absolute HTTP(S) URL for the backend API.',
      { cause: error }
    );
  }

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true
        },
        '/uploads': {
          target: apiTarget,
          changeOrigin: true
        }
      }
    }
  };
});
