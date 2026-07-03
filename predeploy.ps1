# predeploy.ps1 - GlobiPet deploy helper (ASCII-safe, warning-tolerant)
# Usage:  .\predeploy.ps1 "<commit message>"

param(
    [Parameter(Mandatory=$true, HelpMessage="Commit message")]
    [string]$Message
)

# IMPORTANT: do NOT set ErrorActionPreference=Stop globally.
# vite/esbuild write warnings to stderr, and PowerShell mistakes them for errors.
# We check $LASTEXITCODE explicitly after each native command instead.

$repoRoot = "C:\gp"
$webDir   = "C:\gp\apps\web"

function Write-Step($text) {
    Write-Host ""
    Write-Host "=== $text ===" -ForegroundColor Cyan
}
function Write-Ok($text)   { Write-Host "  [OK] $text" -ForegroundColor Green }
function Write-Warn($text) { Write-Host "  [!]  $text" -ForegroundColor Yellow }
function Write-Err($text)  { Write-Host "  [X]  $text" -ForegroundColor Red }

# Sanity checks
if (-not (Test-Path $repoRoot)) {
    Write-Err "Repo not found at $repoRoot"; exit 1
}
if (-not (Test-Path "$webDir\package.json")) {
    Write-Err "package.json not found at $webDir"; exit 1
}

Set-Location $repoRoot

# STEP 1: Clean stale compiled .js shadow files
Write-Step "STEP 1: Cleanup stale compiled .js/.jsx shadow files"

$shadowed = Get-ChildItem "$webDir\src" -Recurse -Include *.js,*.jsx -File -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch '\\node_modules\\|\\dist\\|\\build\\' } |
    Where-Object {
        (Test-Path ($_.FullName -replace '\.jsx?$','.tsx')) -or
        (Test-Path ($_.FullName -replace '\.jsx?$','.ts'))
    }

if ($shadowed.Count -eq 0) {
    Write-Ok "No shadow files found"
} else {
    Write-Warn "Found $($shadowed.Count) shadow file(s):"
    foreach ($f in $shadowed) {
        $rel = $f.FullName.Substring("$repoRoot\".Length)
        Write-Host "    $rel"
        git rm --cached -- $rel 2>$null | Out-Null
        Remove-Item $f.FullName -Force -ErrorAction SilentlyContinue
        $mapFile = $f.FullName + ".map"
        if (Test-Path $mapFile) { Remove-Item $mapFile -Force -ErrorAction SilentlyContinue }
    }
    Write-Ok "Removed and untracked from git"
}

# Config-level shadows in apps/web root
$configShadows = Get-ChildItem $webDir -File -Include *.js -ErrorAction SilentlyContinue |
    Where-Object {
        (Test-Path ($_.FullName -replace '\.js$','.ts')) -and
        ($_.Name -notin @('.eslintrc.js', 'postcss.config.js', 'tailwind.config.js'))
    }
if ($configShadows.Count -gt 0) {
    Write-Warn "Found $($configShadows.Count) config-level shadow file(s):"
    foreach ($f in $configShadows) {
        Write-Host "    $($f.Name)"
        git rm --cached -- "apps/web/$($f.Name)" 2>$null | Out-Null
        Remove-Item $f.FullName -Force -ErrorAction SilentlyContinue
    }
}

# STEP 2: vite build x2 - merge stderr into stdout so PowerShell does not throw on warnings
Set-Location $webDir

Write-Step "STEP 2a: vite build (1st pass)"
cmd /c "npm run build 2>&1"
$exit1 = $LASTEXITCODE
if ($exit1 -ne 0) {
    Write-Err "First vite build failed (exit code $exit1). Fix the errors above and re-run."
    exit 1
}
Write-Ok "First build passed"

Write-Step "STEP 2b: vite build (2nd pass)"
cmd /c "npm run build 2>&1"
$exit2 = $LASTEXITCODE
if ($exit2 -ne 0) {
    Write-Err "Second vite build failed (exit code $exit2). Fix the errors above and re-run."
    exit 1
}
Write-Ok "Second build passed"

# STEP 3: git commit + push
Set-Location $repoRoot

Write-Step "STEP 3: git add + commit + push"

git add .
if ($LASTEXITCODE -ne 0) {
    Write-Err "git add failed"; exit 1
}

$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Warn "Nothing to commit - working tree clean. Skipping push."
    exit 0
}

git commit -m $Message
if ($LASTEXITCODE -ne 0) {
    Write-Err "git commit failed"; exit 1
}
Write-Ok "Committed: $Message"

git push
if ($LASTEXITCODE -ne 0) {
    Write-Err "git push failed"; exit 1
}
Write-Ok "Pushed to remote"

Write-Host ""
Write-Host "===============================================" -ForegroundColor Green
Write-Host "  [OK] DEPLOY TRIGGERED (check Cloudflare Pages)" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
