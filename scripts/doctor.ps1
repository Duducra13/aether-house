# ============================================================
# CCS WEB EXPERIENCE ENGINE — DOCTOR (diagnóstico do ambiente)
# ------------------------------------------------------------
# Verifica o ambiente de desenvolvimento:
#   - Node/npm/Git presentes e versões mínimas;
#   - Vercel CLI e Higgsfield CLI (opcionais);
#   - vendor local íntegro (arquivos + versões esperadas);
#   - credenciais não expostas no repositório.
#
# Uso:  npm run doctor
# Saída: status por item. Exit code != 0 se houver falha.
# ============================================================

$ErrorActionPreference = "Stop"

$root   = Resolve-Path (Join-Path $PSScriptRoot "..")
$vendor = Join-Path $root "assets\js\vendor"
$fail   = 0

function Ok($msg)  { Write-Host "  [OK]  $msg" -ForegroundColor Green }
function Warn($msg){ Write-Host "  [--]  $msg" -ForegroundColor Yellow }
function Err($msg) { Write-Host "  [ERRO] $msg" -ForegroundColor Red; $script:fail++ }

# Executa um comando nativo capturando stdout sem quebrar com
# $ErrorActionPreference=Stop (PS5.1 + stderr = erro).
function RunNative($exe, [string[]]$argsList) {
  $ErrorActionPreference = "SilentlyContinue"
  $out = (& $exe @argsList 2>$null | Out-String).Trim()
  $code = $LASTEXITCODE
  $ErrorActionPreference = "Stop"
  return @{ Output = $out; Code = $code }
}

Write-Host ""
Write-Host "CCS ENGINE — DOCTOR" -ForegroundColor Cyan
Write-Host ("Projeto: {0}" -f $root)

# ------------------------------------------------------------
# 1. Ferramentas base
# ------------------------------------------------------------
Write-Host "`n[1/4] Ferramentas base" -ForegroundColor Cyan
if (Get-Command node -ErrorAction SilentlyContinue) {
  $nv = node --version
  Ok("Node $nv")
  if ([int]($nv.TrimStart("v") -split "\.")[0] -lt 18) { Err("Node >= 18 é obrigatório") }
} else { Err("Node não encontrado") }

if (Get-Command npm -ErrorAction SilentlyContinue) { Ok("npm $(npm --version)") }
else { Err("npm não encontrado") }

if (Get-Command git -ErrorAction SilentlyContinue) { Ok("git $(git --version)") }
else { Err("git não encontrado") }

# ------------------------------------------------------------
# 2. Ferramentas opcionais
# ------------------------------------------------------------
Write-Host "`n[2/4] Ferramentas opcionais" -ForegroundColor Cyan
if (Get-Command vercel -ErrorAction SilentlyContinue) {
  $v = RunNative "vercel" @("--version")
  Ok("Vercel CLI $($v.Output)")
} else { Warn("Vercel CLI não encontrada (deploy via dashboard/GitHub)") }

if (Get-Command higgsfield -ErrorAction SilentlyContinue) {
  $hv = RunNative "higgsfield" @("version")
  Ok("Higgsfield CLI $($hv.Output)")
  $st = RunNative "higgsfield" @("account", "status")
  if ($st.Code -eq 0) { Ok("Higgsfield autenticado — $($st.Output)") }
  else { Warn("Higgsfield não autenticado — rode: higgsfield auth login") }
} else { Warn("Higgsfield CLI não encontrada (geração de assets opcional)") }

# ------------------------------------------------------------
# 3. Vendor local
# ------------------------------------------------------------
Write-Host "`n[3/4] Vendor local (assets/js/vendor)" -ForegroundColor Cyan
$expected = @(
  "gsap.min.js",
  "ScrollTrigger.min.js",
  "three-all.module.js",
  "draco\draco_decoder.js",
  "draco\draco_decoder.wasm",
  "draco\draco_encoder.js",
  "draco\draco_wasm_wrapper.js"
)
foreach ($f in $expected) {
  $p = Join-Path $vendor $f
  if (Test-Path $p -PathType Leaf) { Ok($f) } else { Err("faltando: $f (rode npm run vendor)") }
}

# ------------------------------------------------------------
# 4. Segurança — credenciais no repositório
# ------------------------------------------------------------
Write-Host "`n[4/4] Segurança (secrets)" -ForegroundColor Cyan
$isGit = RunNative "git" @("-C", $root, "rev-parse", "--is-inside-work-tree")
if ($isGit.Code -ne 0) {
  Warn("não é repositório Git — verificação de secrets ignorada")
} else {
  $secrets = git -C $root grep -I -l -E "(api[_-]?key|secret|token|password)\s*[=:]" -- "*.js" "*.json" "*.md" "*.ps1" 2>$null
  if ($secrets) {
    $secrets | ForEach-Object { Warn("possível segredo em: $_") }
  } else { Ok("nenhum segredo óbvio em arquivos versionados") }
}
if (Test-Path (Join-Path $root ".env")) { Warn(".env presente no repositório — garantir que está no .gitignore") }
elseif (Test-Path (Join-Path $root ".env.example")) { Ok(".env.example presente (referência)") }

# ------------------------------------------------------------
# Resultado
# ------------------------------------------------------------
Write-Host ""
if ($fail -eq 0) {
  Write-Host "DOCTOR: ambiente OK" -ForegroundColor Green
} else {
  Write-Host "DOCTOR: $fail falha(s) encontrada(s)" -ForegroundColor Red
}
exit $fail
