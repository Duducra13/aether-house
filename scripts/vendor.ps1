# ============================================================
# CCS WEB EXPERIENCE ENGINE — VENDOR
# ------------------------------------------------------------
# Gera assets/js/vendor/ com:
#   gsap.min.js / ScrollTrigger.min.js   (scripts clássicos)
#   three-all.module.js                  (Three.js + GLTFLoader
#                                         + DRACOLoader em UM ESM)
#   draco/                               (decoder p/ modelos GLB)
#
# O loader do motor (ccs.loader.js) tenta o vendor local
# primeiro e cai para o CDN (+esm) se faltar. Sem este script,
# o engine usa CDN automaticamente (jsdelivr).
#
# Uso:  npm run vendor
# ============================================================

$ErrorActionPreference = "Stop"

$root   = Resolve-Path (Join-Path $PSScriptRoot "..")
$vendor = Join-Path $root "assets\js\vendor"
$draco  = Join-Path $vendor "draco"
$tmp    = Join-Path $env:TEMP "ccs-vendor"
$entry  = Join-Path $PSScriptRoot "vendor\three-entry.js"

New-Item -ItemType Directory -Force -Path $vendor | Out-Null
New-Item -ItemType Directory -Force -Path $draco | Out-Null
New-Item -ItemType Directory -Force -Path $tmp | Out-Null

$ProgressPreference = "SilentlyContinue"

Write-Host "Instalando deps em ambiente temporário ($tmp)..." -ForegroundColor Cyan
Push-Location $tmp
try {
  if (-not (Test-Path (Join-Path $tmp "package.json"))) {
    '{"name":"ccs-vendor","private":true}' | Set-Content -Path (Join-Path $tmp "package.json") -Encoding UTF8
  }
  npm install --no-audit --no-fund --loglevel=error three@0.160.0 gsap@3.12.5
} finally {
  Pop-Location
}

# --- Three.js bundle único (resolve import 'three' via esbuild) ---
Write-Host "Gerando three-all.module.js ..."
$outFile = Join-Path $vendor "three-all.module.js"
$tmpEntry = Join-Path $tmp "three-entry.js"
Copy-Item $entry $tmpEntry -Force
Push-Location $tmp
try {
  & npx --yes esbuild "three-entry.js" "--bundle" "--format=esm" "--minify" "--platform=browser" "--target=es2020" "--outfile=$outFile"
} finally {
  Pop-Location
}
if ($LASTEXITCODE -ne 0) {
  Write-Host "FALHA ao gerar bundle Three.js" -ForegroundColor Red
  exit 1
}

# --- GSAP clássicos ---
$files = @(
  @{ Url = "https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js";          Out = "gsap.min.js" },
  @{ Url = "https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js"; Out = "ScrollTrigger.min.js" }
)
foreach ($f in $files) {
  $dest = Join-Path $vendor $f.Out
  Write-Host "Baixando $($f.Out) ..."
  try {
    Invoke-WebRequest -Uri $f.Url -OutFile $dest -UseBasicParsing -TimeoutSec 60
    Write-Host "  OK ($((Get-Item $dest).Length) bytes)"
  } catch {
    Write-Host "  FALHOU: $($_.Exception.Message)" -ForegroundColor Yellow
  }
}

# --- Draco decoder (do node_modules instalado) ---
$dracoSrc = Join-Path $tmp "node_modules\three\examples\jsm\libs\draco\gltf"
if (Test-Path $dracoSrc) {
  Copy-Item (Join-Path $dracoSrc "*.js") $draco -Force -ErrorAction SilentlyContinue
  Copy-Item (Join-Path $dracoSrc "*.wasm") $draco -Force -ErrorAction SilentlyContinue
  Write-Host "Draco decoder copiado para $draco"
} else {
  Write-Host "Draco decoder não encontrado em $dracoSrc" -ForegroundColor Yellow
}

# --- Remove arquivos antigos que não são mais usados ---
foreach ($obsolete in @("three.module.min.js", "GLTFLoader.js", "DRACOLoader.js")) {
  $old = Join-Path $vendor $obsolete
  if (Test-Path $old) { Remove-Item $old -Force }
}

Write-Host ""
Write-Host "Vendor pronto em: $vendor" -ForegroundColor Green
