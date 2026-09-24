import { app } from 'electron'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseScenario, type Scenario } from '@shared/domain/scenarios'

let cache: Scenario[] | null = null

function scenariosRoot(): string {
  const packaged = join(process.resourcesPath, 'scenarios')
  if (app.isPackaged && existsSync(packaged)) return packaged
  return join(app.getAppPath(), 'resources', 'scenarios')
}

function loadAll(): Scenario[] {
  const root = scenariosRoot()
  const scenarios: Scenario[] = []
  if (!existsSync(root)) return scenarios
  for (const dir of readdirSync(root)) {
    const pairDir = join(root, dir)
    let files: string[]
    try {
      files = readdirSync(pairDir)
    } catch {
      continue
    }
    for (const file of files) {
      if (!file.endsWith('.json')) continue
      try {
        const parsed = parseScenario(JSON.parse(readFileSync(join(pairDir, file), 'utf8')))
        if (parsed) scenarios.push(parsed)
      } catch {
        // skip malformed scenario
      }
    }
  }
  return scenarios.sort(
    (a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title)
  )
}

export function listScenarios(): Scenario[] {
  if (!cache) cache = loadAll()
  return cache
}

export function scenariosForPair(pair: string | null): Scenario[] {
  const all = listScenarios()
  return pair ? all.filter((scenario) => scenario.languagePair === pair) : all
}
