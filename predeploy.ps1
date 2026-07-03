# predeploy.ps1 - GlobiPet deploy helper (ASCII-safe)
# Usage:  .\predeploy.ps1 "<commit message>"
# Example: .\predeploy.ps1 "fix: header spacing on mobile"
#
# What it does:
#  1. Cleans stale compiled .js/.jsx files that shadow .ts/.tsx (Cloudflare shadow issue)
#  2. Runs vite build TWICE (workflow rule) - both must pass
#  3. If both passed: git add + commit + push

param(
    [Parameter(Mandatory=$true, HelpMessage="Commit message")]
    [string]$Message
)

$ErrorActionPreference = "Stop"
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
        Remove-Item $f.FullName -Force
        $mapFile = $f.FullName + ".map"
        if (Test-Path $mapFile) { Remove-Item $mapFile -Force }
    }
    Write-Ok "Removed and untracked from git"
}

# Also check apps/web root for config-level shadows (like vite.config.js)
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
        Remove-Item $f.FullName -Force
    }
}

# STEP 2: vite build x2
Set-Location $webDir

Write-Step "STEP 2a: vite build (1st pass)"
$build1 = & npm run build 2>&1
$build1 | Out-Host
if ($LASTEXITCODE -ne 0) {
    Write-Err "First vite build failed. Fix the errors above and re-run."
    exit 1
}
Write-Ok "First build passed"

Write-Step "STEP 2b: vite build (2nd pass)"
$build2 = & npm run build 2>&1
$build2 | Out-Host
if ($LASTEXITCODE -ne 0) {
    Write-Err "Second vite build failed. Fix the errors above and re-run."
    exit 1
}
Write-Ok "Second build passed"

# STEP 3: git commit + push
Set-Location $repoRoot

Write-Step "STEP 3: git add + commit + push"

git add .

# Check if there is anything to commit
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
