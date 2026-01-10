const esbuild = require('esbuild');

const production = process.argv.includes('--production');

async function main() {
  await esbuild.build({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    outfile: 'dist/extension.js',
    external: ['vscode'],
    format: 'cjs',
    platform: 'node',
    sourcemap: !production,
    minify: production,
  });
  
  console.log('Build complete');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});





