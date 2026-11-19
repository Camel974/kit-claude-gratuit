# Kit Claude Gratuit (Brennan SONNET) : installation Windows de Claude Code + OmniRoute.
#   Double-clic sur DEMARRER-WINDOWS.bat (recommande), ou dans PowerShell :
#   irm https://raw.githubusercontent.com/Camel974/kit-claude-gratuit/main/scripts/installer-windows.ps1 | iex
# Installe seulement ce qui manque : Node.js (dans ton dossier perso, sans droits admin), Git (option),
# Claude Code (installeur officiel), puis passe la main a scripts\kit.mjs.
# Fichier volontairement 100% ASCII : PowerShell 5.1 casse les accents d'un fichier UTF-8 sans BOM.

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }
try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12 } catch { }

$KitRepo = 'Camel974/kit-claude-gratuit'
$Etat = Join-Path $env:LOCALAPPDATA 'kit-claude-gratuit'
$NodeDir = Join-Path $Etat 'node'
$LocalBin = Join-Path $env:USERPROFILE '.local\bin'

function Ok($m) { Write-Host "  OK  $m" -ForegroundColor Green }
function Info($m) { Write-Host "  >>  $m" -ForegroundColor Cyan }
function Avert($m) { Write-Host "  !!  $m" -ForegroundColor Yellow }
function Stop-Kit($m) { Write-Host "  XX  $m" -ForegroundColor Red; throw "arret" }

function Add-UserPath($dir) {
  $user = [Environment]::GetEnvironmentVariable('Path', 'User')
  if (-not $user) { $user = '' }
  if (($user -split ';') -notcontains $dir) {
    [Environment]::SetEnvironmentVariable('Path', ($dir + ';' + $user).TrimEnd(';'), 'User')
  }
  if (($env:Path -split ';') -notcontains $dir) { $env:Path = $dir + ';' + $env:Path }
}

function Test-NodeOk($exe) {
  try { $v = & $exe -p 'process.versions.node' 2>$null } catch { return $false }
  if (-not $v) { return $false }
  $p = $v.Trim().Split('.')
  $maj = [int]$p[0]; $min = [int]$p[1]; $pat = [int]($p[2] -replace '[^0-9].*$', '')
  if ($maj -ge 24 -and $maj -lt 27) { return $true }
  if ($maj -eq 22 -and ($min -gt 22 -or ($min -eq 22 -and $pat -ge 2))) { return $true }
  return $false
}

function Expand-Kit($archive, $dest) {
  if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
  New-Item -ItemType Directory -Force -Path $dest | Out-Null
  $tar = Join-Path $env:SystemRoot 'System32\tar.exe'
  if (Test-Path $tar) { & $tar -xf $archive -C $dest; if ($LASTEXITCODE -eq 0) { return } }
  Expand-Archive -Path $archive -DestinationPath $dest -Force
}

Write-Host ''
Write-Host 'KIT CLAUDE GRATUIT - installation Windows' -ForegroundColor Cyan
Write-Host '  Claude Code + OmniRoute : 10 a 15 minutes. Rien n''est supprime.'
$os = [Environment]::OSVersion.Version
if ($os.Major -lt 10 -or ($os.Major -eq 10 -and $os.Build -lt 17763)) { Stop-Kit 'Windows 10 version 1809 (ou plus recent) est necessaire.' }
New-Item -ItemType Directory -Force -Path $Etat | Out-Null

try {
  # ---------- 1. Le dossier du kit
  $Src = $null
  if ($PSScriptRoot -and (Test-Path (Join-Path $PSScriptRoot 'kit.mjs'))) { $Src = Split-Path -Parent $PSScriptRoot }
  if (-not $Src) {
    Info 'Telechargement du kit depuis GitHub...'
    $zip = Join-Path $env:TEMP 'kit-claude-gratuit.zip'
    Invoke-WebRequest -UseBasicParsing -Uri "https://codeload.github.com/$KitRepo/zip/refs/heads/main" -OutFile $zip
    $tmp = Join-Path $Etat 'kit.tmp'
    Expand-Kit $zip $tmp
    $inner = Get-ChildItem $tmp -Directory | Select-Object -First 1
    $Src = Join-Path $Etat 'kit'
    if (Test-Path $Src) { Remove-Item $Src -Recurse -Force }
    Move-Item $inner.FullName $Src
    Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item $zip -Force -ErrorAction SilentlyContinue
  }
  Ok "Kit : $Src"

  # ---------- 2. Node.js (OmniRoute veut 22.22.2+ ou 24 a 26) dans ton dossier perso
  $Node = $null
  $cands = @((Join-Path $NodeDir 'node.exe'))
  $sys = Get-Command node -ErrorAction SilentlyContinue
  if ($sys) { $cands += $sys.Source }
  foreach ($c in $cands) { if ((Test-Path $c) -and (Test-NodeOk $c)) { $Node = $c; break } }
  if (-not $Node) {
    Info 'Installation de Node.js dans ton dossier perso (sans droits admin, 1 a 3 minutes)...'
    $index = Invoke-RestMethod -UseBasicParsing -Uri 'https://nodejs.org/dist/index.json'
    $rel = $index | Where-Object { $_.lts -and ($_.version -match '^v2(2|4|6)\.') } | Select-Object -First 1
    if (-not $rel) { Stop-Kit 'Version de Node.js introuvable (nodejs.org injoignable ?).' }
    $arch = 'x64'; if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { $arch = 'arm64' }
    $ver = $rel.version
    $zip = Join-Path $env:TEMP "node-$ver.zip"
    Invoke-WebRequest -UseBasicParsing -Uri "https://nodejs.org/dist/$ver/node-$ver-win-$arch.zip" -OutFile $zip
    $tmp = Join-Path $Etat 'node.tmp'
    Expand-Kit $zip $tmp
    $inner = Get-ChildItem $tmp -Directory | Select-Object -First 1
    if (Test-Path $NodeDir) { Remove-Item $NodeDir -Recurse -Force }
    Move-Item $inner.FullName $NodeDir
    Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item $zip -Force -ErrorAction SilentlyContinue
    $Node = Join-Path $NodeDir 'node.exe'
    if (-not (Test-NodeOk $Node)) { Stop-Kit "Node.js $ver ne convient pas." }
    Add-UserPath $NodeDir
    Ok "Node.js $ver installe dans $NodeDir"
  } else {
    Ok ("Node.js " + (& $Node -v) + " : $Node")
  }
  Add-UserPath (Split-Path -Parent $Node)

  # ---------- 3. Git pour Windows (optionnel : donne a Claude Code un vrai terminal bash)
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    if (Get-Command winget -ErrorAction SilentlyContinue) {
      $rep = Read-Host '  ?   Installer Git pour Windows (recommande, Windows peut demander une autorisation) ? (O/n)'
      if ($rep -eq '' -or $rep -match '^[oOyY]') {
        winget install --id Git.Git -e --silent --accept-package-agreements --accept-source-agreements | Out-Host
        $gitBin = Join-Path $env:ProgramFiles 'Git\cmd'
        if (Test-Path $gitBin) { $env:Path = $gitBin + ';' + $env:Path; Ok 'Git installe' } else { Avert 'Git pas detecte : Claude Code utilisera PowerShell (ca marche aussi).' }
      }
    } else { Avert 'Git absent : Claude Code utilisera PowerShell (ca marche). Option : https://git-scm.com/download/win' }
  } else { Ok 'Git deja installe' }

  # ---------- 4. Claude Code (installeur officiel d'Anthropic)
  $claude = Join-Path $LocalBin 'claude.exe'
  if ((Get-Command claude -ErrorAction SilentlyContinue) -or (Test-Path $claude)) {
    Ok 'Claude Code deja installe'
  } else {
    Info 'Installation de Claude Code (officiel, ~1 minute)...'
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -Command 'irm https://claude.ai/install.ps1 | iex'
    if (-not (Test-Path $claude) -and -not (Get-Command claude -ErrorAction SilentlyContinue)) {
      Stop-Kit 'Claude Code ne s''est pas installe. Relance DEMARRER-WINDOWS.bat dans 5 minutes.'
    }
    Ok 'Claude Code installe'
  }
  Add-UserPath $LocalBin

  # ---------- 5. La suite : questions, OmniRoute, cles, skills, test
  & $Node (Join-Path $Src 'scripts\kit.mjs') installer @args
  if ($LASTEXITCODE -ne 0) { Avert 'Installation incomplete : relance DEMARRER-WINDOWS.bat (sans risque) ou lance "kit-claude diagnostic".' }
}
catch {
  if ($_.Exception.Message -ne 'arret') { Write-Host ('  XX  ' + $_.Exception.Message) -ForegroundColor Red }
  Write-Host '  Copie ce message a Claude (claude.ai) avec : "Kit Claude Gratuit, installation Windows, que faire ?"'
}
