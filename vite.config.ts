import path from 'path';
import { createReadStream, readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import type { Plugin } from 'vite';

// Serve PDF.js fonts and image decoders locally, and include them in builds.
function pdfAssets(): Plugin {
    const root = fileURLToPath(new URL('./node_modules/pdfjs-dist/', import.meta.url));
    const folders = ['cmaps', 'standard_fonts', 'wasm', 'iccs'];
    let base = '/';
    return {
        name: 'local-pdf-assets',
        configResolved(config) { base = config.base; },
        configureServer(server) {
            server.middlewares.use(`${base}pdfjs/`, (req, res, next) => {
                const parts = (req.url || '').split('?')[0].split('/').filter(Boolean);
                if (parts.length !== 2 || !folders.includes(parts[0]) || !/^[\w.-]+$/.test(parts[1])) return next();
                const filename = path.join(root, ...parts);
                try {
                    if (!statSync(filename).isFile()) return next();
                } catch { return next(); }
                const types = { '.wasm': 'application/wasm', '.js': 'text/javascript' };
                res.setHeader('Content-Type', types[path.extname(filename)] || 'application/octet-stream');
                const stream = createReadStream(filename);
                stream.on('error', () => res.destroy());
                stream.pipe(res);
            });
        },
        generateBundle() {
            this.emitFile({ type: 'asset', fileName: 'pdfjs/LICENSE', source: readFileSync(path.join(root, 'LICENSE')) });
            for (const folder of folders) {
                for (const filename of readdirSync(path.join(root, folder))) {
                    this.emitFile({ type: 'asset', fileName: `pdfjs/${folder}/${filename}`, source: readFileSync(path.join(root, folder, filename)) });
                }
            }
        },
    };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      plugins: [pdfAssets()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
