import fs from 'fs';

const files = [
  'app/(tabs)/decrees.tsx',
  'app/(tabs)/exams.tsx',
  'app/(tabs)/profile.tsx',
  'app/decree/[id].tsx',
  'app/(tabs)/_layout.tsx',
  'app/(tabs)/index.tsx',
  'components/home/DecreeCard.tsx',
  'components/decrees/DecreeBrowseCard.tsx',
];

/** Remove `...(Platform.OS === 'web' ? boxShadow : Platform.OS === 'ios'` → `...(Platform.OS === 'ios'` */
const re =
  /\.\.\.\(Platform\.OS === 'web'\s*\n\s*\? \(\{ boxShadow:[^}]+\} as const\)\s*\n\s*: Platform\.OS === 'ios'/g;

for (const p of files) {
  if (!fs.existsSync(p)) continue;
  const s0 = fs.readFileSync(p, 'utf8');
  const s1 = s0.replace(re, "...(\n    Platform.OS === 'ios'");
  if (s0 !== s1) {
    fs.writeFileSync(p, s1);
    console.log('patched shadows:', p);
  }
}
