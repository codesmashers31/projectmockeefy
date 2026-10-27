import { defineConfig } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import react from "@vitejs/plugin-react";
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "html2canvas": "html2canvas-pro",
    },
  },
  server: {
    port: 5173,
    host: true,
    watch: {
      ignored: ['**/public/**'],
    },
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
    }
  },
  build: {
    sourcemap: false, // Prevent raw source code leaks via DevTools (Phase 5.3)
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-icons': ['lucide-react'],
          'vendor-pdf': ['jspdf', 'html2canvas-pro'],
        },
      },
    },
  },
});
