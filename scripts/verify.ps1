# ============================================================
# CCS WEB EXPERIENCE ENGINE — VERIFY (integridade do projeto)
# ------------------------------------------------------------
# Verifica a integridade do motor e das páginas:
#   - sintaxe JS (node --check) do motor e scripts do projeto;
#   - arquivos do motor presentes;
#   - referências (css/js/img) usadas nos HTML existem;
#   - consistência de versões Three.js/GSAP (vendor.ps1,
#     loader, bundle).
#
# Uso:  npm run verify
# Saída: status por item. Exit code != 0 se houver falha.
# ============================================================

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$fail = 0

function Ok($msg)  { Write-Host "  [OK]  $msg" -ForegroundColor Green }
function Warn($msg){ Write-Host "  [--]  $msg" -ForegroundColor Yellow }
function Err($msg) { Write-Host "  [ERRO] $msg" -ForegroundColor Red; $script:fail++ }

Write-Host ""
Write-Host "CCS ENGINE — VERIFY" -ForegroundColor Cyan

# ------------------------------------------------------------
# 1. Sintaxe JS (engine + scripts do projeto)
# ------------------------------------------------------------
Write-Host "`n[1/4] Sintaxe JS" -ForegroundColor Cyan
$jsFiles = @(
  "assets\js\engine\ccs.core.js",
  "assets\js\engine\ccs.loader.js",
  "assets\js\engine\ccs.experience.js",
  "assets\js\engine\ccs.motion-enhance.js",
  "assets\js\engine\ccs.motion.js",
  "assets\js\engine\ccs.gallery.js",
  "assets\js\engine\ccs.forms.js",
  "assets\js\engine\ccs.transitions.js",
  "assets\js\motion.js"
)
foreach ($f in $jsFiles) {
  $p = Join-Path $root $f
  if (-not (Test-Path $p -PathType Leaf)) { Err("faltando: $f"); continue }
  node --check $p 2>$null
  if ($LASTEXITCODE -eq 0) { Ok("$f") } else { Err("sintaxe inválida: $f") }
}

# ------------------------------------------------------------
# 2. Referências dos HTML
# ------------------------------------------------------------
Write-Host "`n[2/4] Referências dos HTML" -ForegroundColor Cyan
$htmls = Get-ChildItem (Join-Path $root "*.html") -ErrorAction SilentlyContinue
if (-not $htmls) { Err("nenhum HTML na raiz") } else {
  foreach ($h in $htmls) {
    $content = Get-Content $h.FullName -Raw
    $refs = [regex]::Matches($content, '(?:src|href)="([^"]+\.(?:js|css|png|jpg|jpeg|webp|gif|svg|mp4|glb))"') |
      ForEach-Object { $_.Groups[1].Value }
    foreach ($ref in $refs | Select-Object -Unique) {
      if ($ref -match "^(https?:|//|data:|#)") { continue }
      $local = $ref -replace "^\./", ""
      $p = Join-Path $root $local
      if (Test-Path $p -PathType Leaf) { Ok("$($h.Name): $local") }
      else { Err("$($h.Name): referência quebrada -> $local") }
    }
  }
}

# ------------------------------------------------------------
# 3. Consistência de versões (Three.js / GSAP)
# ------------------------------------------------------------
Write-Host "`n[3/3] Versões Three.js / GSAP" -ForegroundColor Cyan
$vendorText = Get-Content (Join-Path $root "scripts\vendor.ps1") -Raw
$loaderText = Get-Content (Join-Path $root "assets\js\engine\ccs.loader.js") -Raw
$bundleText = Get-Content (Join-Path $root "assets\js\vendor\three-all.module.js") -Raw

$threeVendor = [regex]::Match($vendorText, "three@([0-9.]+)").Groups[1].Value
$threeLoader = [regex]::Match($loaderText, 'three:\s*"([0-9.]+)"').Groups[1].Value
$gsapVendor  = [regex]::Match($vendorText, "gsap@([0-9.]+)").Groups[1].Value
$gsapLoader  = [regex]::Match($loaderText, 'gsap:\s*"([0-9.]+)"').Groups[1].Value

if ($threeVendor -and $threeLoader) {
  if ($threeVendor -eq $threeLoader) { Ok("Three.js $threeVendor (vendor.ps1 = loader)") }
  else { Err("Three.js divergente: vendor.ps1=$threeVendor vs loader=$threeLoader") }
} else { Err("não foi possível ler versões do Three.js") }

$bundleRev = [regex]::Match($bundleText, 'revision:"(\d+)"').Groups[1].Value
$loaderRev = ($threeLoader -split "\.")[1]
if ($bundleRev -and $loaderRev) {
  if ($bundleRev -eq $loaderRev) { Ok("bundle three-all.module.js = r$bundleRev") }
  else { Warn("bundle r$bundleRev != loader $threeLoader — rode npm run vendor") }
} else { Err("não foi possível ler a revisão do Three.js no bundle") }

if ($gsapVendor -and $gsapLoader) {
  if ($gsapVendor -eq $gsapLoader) { Ok("GSAP $gsapVendor (vendor.ps1 = loader)") }
  else { Err("GSAP divergente: vendor.ps1=$gsapVendor vs loader=$gsapLoader") }
} else { Err("não foi possível ler versões do GSAP") }

# ------------------------------------------------------------
# Resultado
# ------------------------------------------------------------
Write-Host ""
if ($fail -eq 0) { Write-Host "VERIFY: tudo OK" -ForegroundColor Green }
else { Write-Host "VERIFY: $fail falha(s) encontrada(s)" -ForegroundColor Red }
exit $fail
