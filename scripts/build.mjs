import { mkdir, copyFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
async function copy(source, target) {
  await mkdir(target, { recursive:true });
  for (const item of await readdir(source, { withFileTypes:true })) {
    const from = join(source, item.name), to = join(target, item.name);
    if(item.isDirectory()) await copy(from, to); else await copyFile(from, to);
  }
}
await rm('dist', { recursive:true, force:true });
await mkdir('dist', { recursive:true });
await copyFile('index.html', 'dist/index.html');
for (const directory of ['src','data','presentation']) await copy(directory, `dist/${directory}`);
console.log('静态项目已生成到 dist/');
