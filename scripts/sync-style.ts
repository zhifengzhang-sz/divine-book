import { promises as fs } from 'fs';
import { join } from 'path';

async function readCanonical() {
  const p1 = join(process.cwd(), 'docs', 'style.block.md');
  const p2 = join(process.cwd(), 'docs', 'data', 'style.block.md');
  try {
    return (await fs.readFile(p1, 'utf8')).trim() + '\n\n';
  } catch (e) {
    return (await fs.readFile(p2, 'utf8')).trim() + '\n\n';
  }
}

async function listTargets() {
  const root = process.cwd();
  const targets: string[] = [];
  const folders = [join(root, 'data', 'raw'), join(root, 'data', 'keyword'), join(root, 'data', 'normalized'), join(root, 'docs', 'data'), join(root, 'docs'), join(root, 'docs', 'books'), join(root, 'docs', 'model'), join(root, 'docs', 'simulator'), join(root, 'docs', 'parser')];
  for (const f of folders) {
    try {
      const names = await fs.readdir(f);
      for (const n of names) {
        if (n.endsWith('.md')) targets.push(join(f, n));
      }
    } catch (e) {
      // ignore missing directories
    }
  }
  return targets;
}

async function applyStyleToFile(file: string, styleBlock: string) {
  let content = await fs.readFile(file, 'utf8');
  const styleRegex = /<style[\s\S]*?<\/style>/i;
  if (styleRegex.test(content)) {
    const updated = content.replace(styleRegex, styleBlock.trim());
    if (updated !== content) {
      await fs.writeFile(file, updated, 'utf8');
      return true;
    }
    return false;
  }

  // Insert after frontmatter if present
  const fmRegex = /(^```markdown\s*\n)?(---[\s\S]*?---\s*\n)/;
  const m = content.match(fmRegex);
  if (m && m.index !== undefined) {
    const insertAt = m.index + m[0].length;
    const updated = content.slice(0, insertAt) + '\n' + styleBlock + content.slice(insertAt);
    await fs.writeFile(file, updated, 'utf8');
    return true;
  }

  // Fallback: prepend
  await fs.writeFile(file, styleBlock + content, 'utf8');
  return true;
}

async function main() {
  const style = await readCanonical();
  const targets = await listTargets();
  const updated: string[] = [];
  for (const t of targets) {
    try {
      const ok = await applyStyleToFile(t, style);
      if (ok) updated.push(t.replace(process.cwd() + '/', ''));
    } catch (e) {
      console.error('Failed to update', t, e);
    }
  }

  if (updated.length === 0) {
    console.log('No files required updating.');
  } else {
    console.log('Updated files:');
    for (const u of updated) console.log(' -', u);
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
