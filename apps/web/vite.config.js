"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var vite_1 = require("vite");
var plugin_react_1 = require("@vitejs/plugin-react");
var path_1 = require("path");
exports.default = (0, vite_1.defineConfig)({
    plugins: [
        (0, plugin_react_1.default)(),
    ],
    resolve: {
        alias: {
            '@': path_1.default.resolve(__dirname, './src'),
            '@shared': path_1.default.resolve(__dirname, '../../shared')
        }
    },
    server: {
        port: 3000,
        proxy: {
            '/api': { target: 'http://localhost:4000', changeOrigin: true }
        }
    },
    build: {
        outDir: 'dist',
        sourcemap: false,
        // #12: target modern browsers — smaller bundle, less polyfill weight
        target: 'es2020',
        minify: 'esbuild',
        cssCodeSplit: true,
        chunkSizeWarningLimit: 600,
        rollupOptions: {
            output: {
                // #12: granular vendor chunk split so cache stays warm across deploys
                manualChunks: {
                    'vendor-react': ['react', 'react-dom', 'react-router-dom'],
                    'vendor-motion': ['framer-motion'],
                    'vendor-icons': ['lucide-react'],
                    'vendor-query': ['@tanstack/react-query'],
                    'vendor-maps': ['react-leaflet', 'leaflet'],
                    'vendor-charts': ['recharts'],
                    'vendor-xlsx': ['xlsx'],
                    'vendor-confetti': ['canvas-confetti'],
                    'vendor-i18n': ['react-i18next', 'i18next'],
                    'vendor-toast': ['react-hot-toast'],
                },
            },
        },
    },
    optimizeDeps: {
        include: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
    },
});
