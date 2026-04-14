import { Plugin } from 'vite';
import peggy from 'peggy';
import fs from 'fs';

export default function peggyPlugin(): Plugin {
  return {
    name: 'vite-plugin-peggy',
    load(id) {
      if (!id.endsWith('.peggy') && !id.endsWith('.g')) return;
      const source = fs.readFileSync(id, 'utf-8');
      const code = peggy.generate(source, {
        format: 'es',
        output: 'source',
      });
      return { code };
    },
  };
}
