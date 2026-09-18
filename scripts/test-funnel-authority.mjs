import { spawnSync } from 'node:child_process';
import path from 'node:path';

const scriptPath = path.join(process.cwd(), 'scripts', 'test-funnel-authority-core.ts');
const result = spawnSync('npx', ['tsx', scriptPath], { stdio: 'inherit' });

if (result.error) {
  console.error('Failed to run test script:', result.error);
  process.exit(1);
}

process.exit(result.status ?? 0);
