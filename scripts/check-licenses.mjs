// Fails on strong-copyleft licenses in node_modules; warns on unknown ones.
// Run: node scripts/check-licenses.mjs (after `pnpm install`).
// Native/vendor copyleft (espeak-ng GPLv3, jpreprocess BSD-3-Clause, whisper.cpp
// MIT) is intentionally outside npm and is documented in THIRD_PARTY_NOTICES.md
// + NOTICE.md instead.
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = resolve(join(fileURLToPath(import.meta.url), '..', '..'))
const modulesDir = join(here, 'node_modules')

const ALLOWED = new Set([
  'MIT',
  'Apache-2.0',
  'ISC',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'MPL-2.0',
  'CC0-1.0',
  'Unlicense',
  '0BSD',
  'BlueOak-1.0.0',
  'Python-2.0'
])

// Strong copyleft / network-copyleft / proprietary-source-available: always fail.
const FORBIDDEN_RE = /\b(GPL|AGPL|LGPL|EPL|CDDL|EUPL|SSPL|BUSL|OSL|CPL|CUA-OPL|CC-BY-NC|CC-BY-SA|Commons-Clause|Elastic-2\.0)\b/i

function licenseOf(pkgDir) {
  try {
    const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'))
    if (typeof pkg.license === 'string') return pkg.license
    if (pkg.license?.type) return pkg.license.type
    if (Array.isArray(pkg.licenses)) return pkg.licenses.map((l) => l.type ?? l).join(' OR ')
    return null
  } catch {
    return null
  }
}

function tokensOf(license) {
  return license
    .replace(/[()]/g, ' ')
    .split(/\s+(?:OR|AND|WITH)\s+|\s*\/\s*|\s*,\s*/i)
    .map((t) => t.trim().replace(/\s+Classpath-exception.*$/i, '').replace(/\.0$/, '.0'))
    .filter(Boolean)
}

function packageDirs() {
  const out = []
  for (const entry of readdirSync(modulesDir)) {
    if (entry.startsWith('.')) continue
    const full = join(modulesDir, entry)
    if (entry.startsWith('@')) {
      for (const sub of readdirSync(full)) out.push(join(full, sub))
    } else {
      out.push(full)
    }
  }
  return out.filter((d) => existsSync(join(d, 'package.json')))
}

const failures = []
const warnings = []
for (const dir of packageDirs()) {
  const license = licenseOf(dir)
  const name = dir.slice(modulesDir.length + 1)
  if (!license) {
    warnings.push(`${name}: no license field`)
    continue
  }
  if (FORBIDDEN_RE.test(license)) {
    failures.push(`${name}: ${license}`)
    continue
  }
  for (const token of tokensOf(license)) {
    if (token === 'SEE LICENSE IN LICENSE' || token.startsWith('SEE LICENSE')) {
      warnings.push(`${name}: ${license} (manual check)`)
      break
    }
    if (!ALLOWED.has(token)) {
      warnings.push(`${name}: unexpected license token ${token} (declared: ${license})`)
      break
    }
  }
}

for (const w of warnings) console.warn(`license-check warning: ${w}`)
if (failures.length > 0) {
  for (const f of failures) console.error(`license-check FORBIDDEN: ${f}`)
  process.exit(1)
}
console.log(`license-check OK (${packageDirs().length} packages scanned)`)
