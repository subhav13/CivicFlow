import { spawnSync } from 'node:child_process';

const patterns = [
  'AKIA[0-9A-Z]{16}',
  'gh[pousr]_[A-Za-z0-9_]{20,}',
  'sk-[A-Za-z0-9_-]{20,}',
  '-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
];

const result = spawnSync(
  'rg',
  [
    '--hidden',
    '--glob',
    '!.git/**',
    '--glob',
    '!node_modules/**',
    '--glob',
    '!dist/**',
    '--glob',
    '!playwright-report/**',
    '--glob',
    '!test-results/**',
    '--pcre2',
    '--line-number',
    patterns.join('|'),
    '.',
  ],
  { encoding: 'utf8' },
);

if (result.status === 0) {
  process.stderr.write(
    'Potential secret material found. Remove it before continuing.\n',
  );
  process.stderr.write(result.stdout);
  process.exit(1);
}

if (result.status === 1) {
  console.log('Secret scan passed: no configured credential patterns found.');
  process.exit(0);
}

process.stderr.write(result.stderr || 'Secret scan could not run.\n');
process.exit(result.status ?? 1);
