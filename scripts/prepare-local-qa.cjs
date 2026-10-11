// Local QA only: refuses any database outside this repository's excluded fixtures.
const path = require('node:path'), fs = require('node:fs'), { PrismaClient } = require('@prisma/client');
const { isContainerQa } = require('./isolated-qa-guard.cjs');
// Public fixture password only. Precomputed so the standalone runtime does not
// need a separate bcryptjs module (the application bundles its auth code).
const QA_PASSWORD_HASH = '$2b$10$ezIvHh.CDhleKWoh2BKAFu58HKI9dUW27R3Pz2NZ.KQwNv7fRdFhm';
async function main() {
  const url = process.env.DATABASE_URL || '';
  const containerQa = isContainerQa();
  if (!containerQa && !/^file:\.\.\/validation-output\/audit-qa-[\w-]+\/test\.db$/.test(url)) throw Error('Only isolated audit QA databases are allowed');
  const directory = containerQa ? '/app/validation-output/audit-qa-linux' : path.resolve(__dirname, '../', url.slice('file:../'.length), '..');
  if (containerQa) fs.mkdirSync(directory, { recursive: true });
  if (!fs.existsSync(directory)) throw Error('Create the isolated fixture directory first');
  const db = new PrismaClient();
  try {
    await db.user.upsert({ where: { email: 'audit@example.invalid' }, update: {}, create: {
      email: 'audit@example.invalid', name: 'Local audit fixture', password: QA_PASSWORD_HASH,
    } });
    const sampleRate = 48000, frames = sampleRate * 6, bytes = Buffer.alloc(44 + frames * 4);
    bytes.write('RIFF', 0); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8); bytes.writeUInt32LE(16, 16);
    bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(2, 22); bytes.writeUInt32LE(sampleRate, 24); bytes.writeUInt32LE(sampleRate * 4, 28);
    bytes.writeUInt16LE(4, 32); bytes.writeUInt16LE(16, 34); bytes.write('data', 36); bytes.writeUInt32LE(frames * 4, 40);
    for (let i = sampleRate; i < sampleRate * 5; i++) {
      const envelope = Math.min(1, (i - sampleRate) / 1000, (sampleRate * 5 - i) / 1000);
      const value = envelope * (.22 * Math.sin(2 * Math.PI * 110 * i / sampleRate) + .1 * Math.sin(2 * Math.PI * 1200 * i / sampleRate));
      bytes.writeInt16LE(Math.round(value * 32767), 44 + i * 4); bytes.writeInt16LE(Math.round(value * 32767), 46 + i * 4);
    }
    fs.writeFileSync(path.join(directory, 'fixture.wav'), bytes);
    console.log('Isolated QA account and six-second synthetic stereo WAV ready; no mail sent.');
  } finally { await db.$disconnect(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
