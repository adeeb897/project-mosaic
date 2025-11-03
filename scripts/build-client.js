const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const isWatch = process.argv.includes('--watch');
const isDev = isWatch || process.env.NODE_ENV !== 'production';

// Ensure output directories exist
const publicJsDir = path.join(__dirname, '../public/js');
const publicCssDir = path.join(__dirname, '../public/css');

if (!fs.existsSync(publicJsDir)) {
  fs.mkdirSync(publicJsDir, { recursive: true });
}

if (!fs.existsSync(publicCssDir)) {
  fs.mkdirSync(publicCssDir, { recursive: true });
}

const buildOptions = {
  entryPoints: [
    path.join(__dirname, '../src/client/index.tsx')
  ],
  bundle: true,
  outdir: path.join(__dirname, '../public/js'),
  format: 'iife',
  platform: 'browser',
  target: ['es2020'],
  sourcemap: isDev,
  minify: !isDev,
  splitting: false,
  metafile: true,
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'global': 'globalThis',
  },
  loader: {
    '.tsx': 'tsx',
    '.ts': 'ts',
    '.css': 'text',
    '.png': 'file',
    '.jpg': 'file',
    '.jpeg': 'file',
    '.gif': 'file',
    '.svg': 'file',
    '.woff': 'file',
    '.woff2': 'file',
    '.ttf': 'file',
    '.eot': 'file',
  },
  plugins: [
    {
      name: 'node-externals',
      setup(build) {
        // Mark all Node.js built-ins and server-side packages as external
        const nodeBuiltins = [
          'fs', 'path', 'os', 'util', 'events', 'buffer', 'stream', 'http', 'https', 'zlib',
          'crypto', 'url', 'querystring', 'assert', 'child_process', 'cluster', 'dgram',
          'dns', 'domain', 'net', 'perf_hooks', 'punycode', 'readline', 'repl', 'string_decoder',
          'timers', 'tls', 'tty', 'v8', 'vm', 'worker_threads'
        ];

        const serverPackages = [
          'winston', 'mongoose', 'redis', 'bcryptjs', 'jsonwebtoken', 'express',
          'cors', 'helmet', 'morgan', 'express-rate-limit', 'google-auth-library',
          'ws', 'dotenv', 'uuid', '@colors/colors', 'logform', 'readable-stream',
          'winston-transport', 'safe-buffer'
        ];

        const allExternals = [...nodeBuiltins, ...serverPackages];

        build.onResolve({ filter: /.*/ }, (args) => {
          // Check if this is a Node.js builtin or server package
          if (allExternals.includes(args.path)) {
            return { path: args.path, external: true };
          }

          // Check if this is a path that starts with any of our externals
          for (const external of allExternals) {
            if (args.path.startsWith(external + '/')) {
              return { path: args.path, external: true };
            }
          }

          return null; // Let esbuild handle it normally
        });
      },
    },
    {
      name: 'css-modules',
      setup(build) {
        const cssModuleFilter = /\.module\.css$/;
        const regularCssFilter = /\.css$/;
        const cssModulesMap = new Map();
        const regularCssMap = new Map();

        // Handle CSS module imports
        build.onResolve({ filter: cssModuleFilter }, (args) => {
          return {
            path: path.resolve(args.resolveDir, args.path),
            namespace: 'css-module',
          };
        });

        // Handle regular CSS imports
        build.onResolve({ filter: regularCssFilter }, (args) => {
          if (!args.path.endsWith('.module.css')) {
            return {
              path: path.resolve(args.resolveDir, args.path),
              namespace: 'css-regular',
            };
          }
        });

        // Load and transform CSS modules
        build.onLoad({ filter: /.*/, namespace: 'css-module' }, async (args) => {
          const css = await fs.promises.readFile(args.path, 'utf8');
          const hash = crypto.createHash('md5').update(args.path).digest('hex').substring(0, 5);
          const moduleName = path.basename(args.path, '.module.css');

          // Parse CSS and generate scoped class names
          const classMap = {};
          const scopedCss = css.replace(/\.([a-zA-Z][a-zA-Z0-9_-]*)/g, (match, className) => {
            const scopedName = `${moduleName}__${className}___${hash}`;
            classMap[className] = scopedName;
            // Also add camelCase version if className contains dashes
            if (className.includes('-')) {
              const camelCase = className.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
              classMap[camelCase] = scopedName;
            }
            return `.${scopedName}`;
          });

          // Store the CSS for later extraction
          cssModulesMap.set(args.path, scopedCss);

          // Return JavaScript module that exports the class mappings
          const js = `
            const styles = ${JSON.stringify(classMap)};
            export default styles;
          `;

          return {
            contents: js,
            loader: 'js',
          };
        });

        // Load regular CSS files
        build.onLoad({ filter: /.*/, namespace: 'css-regular' }, async (args) => {
          const css = await fs.promises.readFile(args.path, 'utf8');
          regularCssMap.set(args.path, css);

          // Return empty module for regular CSS
          return {
            contents: 'export default {}',
            loader: 'js',
          };
        });

        // Extract all CSS at the end
        build.onEnd(async () => {
          const allCss = [
            ...Array.from(regularCssMap.values()),
            ...Array.from(cssModulesMap.values())
          ].join('\n\n');

          if (allCss.length > 0) {
            const cssOutputPath = path.join(__dirname, '../public/css/bundle.css');
            await fs.promises.writeFile(cssOutputPath, allCss);
            console.log(`[CLIENT] Generated CSS bundle: bundle.css (${(allCss.length / 1024).toFixed(2)} KB)`);
          }
        });
      },
    },
    {
      name: 'build-logger',
      setup(build) {
        build.onStart(() => {
          console.log(`[CLIENT] Building React application...`);
        });

        build.onEnd((result) => {
          if (result.errors.length > 0) {
            console.error(`[CLIENT] Build failed with ${result.errors.length} errors`);
            result.errors.forEach(error => console.error(error));
          } else {
            console.log(`[CLIENT] Build completed successfully`);
            if (result.metafile) {
              const outputs = Object.keys(result.metafile.outputs);
              outputs.forEach(output => {
                const size = result.metafile.outputs[output].bytes;
                const sizeKB = (size / 1024).toFixed(2);
                console.log(`[CLIENT] Generated: ${path.basename(output)} (${sizeKB} KB)`);
              });
            }
          }
        });
      },
    },
  ],
  tsconfig: path.join(__dirname, '../tsconfig.json'),
};

async function build() {
  try {
    if (isWatch) {
      console.log('[CLIENT] Starting watch mode...');
      const context = await esbuild.context(buildOptions);
      await context.watch();
      console.log('[CLIENT] Watching for changes...');
    } else {
      console.log('[CLIENT] Building for production...');
      const result = await esbuild.build(buildOptions);

      if (result.metafile) {
        // Write metafile for analysis
        await fs.promises.writeFile(
          path.join(__dirname, '../public/js/meta.json'),
          JSON.stringify(result.metafile, null, 2)
        );
      }

      console.log('[CLIENT] Production build completed');
    }
  } catch (error) {
    console.error('[CLIENT] Build failed:', error);
    process.exit(1);
  }
}

build();
