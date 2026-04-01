import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  build: {
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/');
          if (!normalizedId.includes('node_modules')) {
            return undefined;
          }

          if (normalizedId.includes('/@radix-ui/')) {
            return 'vendor-radix';
          }

          if (
            normalizedId.includes('/recharts/') ||
            normalizedId.includes('/d3-') ||
            normalizedId.includes('/victory-vendor/')
          ) {
            return 'vendor-charts';
          }

          if (
            normalizedId.includes('/@mui/') ||
            normalizedId.includes('/@emotion/')
          ) {
            return 'vendor-ui';
          }

          if (normalizedId.includes('/motion/')) {
            return 'vendor-motion';
          }

          return 'vendor-misc';
        },
      },
    },
  },
})
