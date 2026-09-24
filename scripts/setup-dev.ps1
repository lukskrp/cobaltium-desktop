#Requires -Version 5.1
<#
.SYNOPSIS
  Set up (or refresh) the Cobaltium Desktop development environment.

.DESCRIPTION
  Checks for the toolchain Cobaltium needs - Node.js, pnpm, Git, CMake, the Rust
  toolchain and the MSVC C++ build tools - and optionally installs anything
  missing via winget. Then it installs the JavaScript dependencies (pnpm) and
  builds the native TTS bridges (espeak-ng + the Japanese jpreprocess bridge).

  The native bridges are required for offline speech and are normally fetched /
  built here; `-SkipBridges` skips them if you only need the UI.

.PARAMETER InstallDeps
  Attempt to install missing prerequisites with winget (Windows only).

.PARAMETER SkipInstall
  Skip `pnpm install`.

.PARAMETER SkipBridges
  Skip `pnpm build:tts` (the native TTS bridges).

.PARAMETER SkipChecks
  Skip the typecheck/lint/test verification at the end.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\setup-dev.ps1 -InstallDeps

.EXAMPLE
  pwsh -File scripts/setup-dev.ps1 -SkipBridges
#>
[CmdletBinding()]
param(
  [switch]$InstallDeps,
  [switch]$SkipInstall,
  [switch]$SkipBridges,
  [switch]$SkipChecks
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$PnpmMajor = '11'

function Info([string]$Message) { Write-Host "==> $Message" -ForegroundColor Cyan }
function Warn([string]$Message) { Write-Host "!!  $Message" -ForegroundColor Yellow }
function Ok([string]$Message)   { Write-Host "ok  $Message" -ForegroundColor Green }
function Fail([string]$Message) { Write-Host "xx  $Message" -ForegroundColor Red }

function Test-Command([string]$Name) {
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Get-CargoPath {
  if (Test-Command 'cargo') { return 'cargo' }
  $candidate = Join-Path $env:USERPROFILE '.cargo\bin\cargo.exe'
  if (Test-Path $candidate) { return $candidate }
  return $null
}

function Test-Msvc {
  if (Test-Command 'cl') { return $true }
  $vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
  if (Test-Path $vswhere) {
    $path = & $vswhere -latest -products * `
      -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 `
      -property installationPath 2>$null
    if ($path) { return $true }
  }
  return $false
}

function Install-Winget([string]$Id, [string[]]$Extra) {
  if (-not (Test-Command 'winget')) {
    Warn "winget not available; install '$Id' manually, then re-run this script."
    return $false
  }
  Info "installing $Id via winget"
  $wingetArgs = @(
    'install', '--id', $Id, '--exact',
    '--accept-source-agreements', '--accept-package-agreements', '--silent'
  )
  if ($Extra) { $wingetArgs += $Extra }
  & winget @wingetArgs
  return ($LASTEXITCODE -eq 0)
}

function Refresh-Path {
  $env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
              [System.Environment]::GetEnvironmentVariable('Path', 'User')
}

# ---------------------------------------------------------------------------
Info "Checking prerequisites (repo: $Root)"

$missing = @()

if (-not (Test-Command 'node')) { $missing += 'nodejs' }
if (-not (Test-Command 'git'))  { $missing += 'git' }
if (-not (Test-Command 'cmake')) { $missing += 'cmake' }
if (-not (Get-CargoPath)) { $missing += 'rust' }
if (-not (Test-Msvc)) { $missing += 'msvc' }
if (-not (Test-Command 'pnpm')) { $missing += 'pnpm' }

if ($missing.Count -gt 0) {
  Warn ("missing: " + ($missing -join ', '))
  if ($InstallDeps) {
    if ($missing -contains 'nodejs') { Install-Winget 'OpenJS.NodeJS.LTS' | Out-Null }
    if ($missing -contains 'git')    { Install-Winget 'Git.Git' | Out-Null }
    if ($missing -contains 'cmake')  { Install-Winget 'Kitware.CMake' | Out-Null }
    if ($missing -contains 'rust')   { Install-Winget 'Rustlang.Rustup' | Out-Null }
    if ($missing -contains 'msvc') {
      Warn 'Visual Studio Build Tools with the C++ workload is large (~3-6 GB).'
      Install-Winget 'Microsoft.VisualStudio.2022.BuildTools' @(
        '--override', '"--quiet --wait --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"'
      ) | Out-Null
    }
    Refresh-Path
  } else {
    Warn 'Re-run with -InstallDeps to install them automatically, or install manually.'
  }
} else {
  Ok 'all prerequisites found'
}

# --- pnpm ------------------------------------------------------------------
if (-not (Test-Command 'pnpm')) {
  if (Test-Command 'corepack') {
    Info 'enabling pnpm via corepack'
    & corepack enable
    & corepack prepare "pnpm@$PnpmMajor" --activate
  } elseif (Test-Command 'npm') {
    Info "installing pnpm@$PnpmMajor globally via npm"
    & npm install -g "pnpm@$PnpmMajor"
  } else {
    Fail 'pnpm is unavailable and neither corepack nor npm was found.'
    exit 1
  }
  Refresh-Path
}
if (Test-Command 'pnpm') { Ok ('pnpm ' + (& pnpm --version)) }

# --- JavaScript dependencies ----------------------------------------------
if (-not $SkipInstall) {
  Info 'pnpm install'
  & pnpm install --frozen-lockfile
  if ($LASTEXITCODE -ne 0) { & pnpm install }
}

# --- native TTS bridges ----------------------------------------------------
if (-not $SkipBridges) {
  $cargo = Get-CargoPath
  if ($cargo -and $cargo -ne 'cargo') { $env:Path = (Split-Path $cargo) + ';' + $env:Path }
  Info 'building native TTS bridges (espeak-ng + Japanese)'
  & pnpm build:tts
  if ($LASTEXITCODE -ne 0) {
    Warn 'Native bridge build failed. Re-run with the prerequisites fixed, or use -SkipBridges.'
  }
}

# --- verification ----------------------------------------------------------
if (-not $SkipChecks) {
  Info 'verifying (typecheck / lint / test)'
  & pnpm typecheck
  & pnpm lint
  & pnpm test
}

Write-Host ''
Ok 'Development environment ready.'
Write-Host 'Next steps:' -ForegroundColor Cyan
Write-Host '  pnpm dev        # run the app in development'
Write-Host '  pnpm dist:win   # build the Windows installer (also runs build:tts)'
