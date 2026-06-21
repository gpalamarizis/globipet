$path = "C:\gp\apps\backend\prisma\schema.prisma"
$content = Get-Content -Path $path -Raw -Encoding UTF8
# Strip BOM character if present at the start
$content = $content -replace '^\xEF\xBB\xBF', ''
$content = $content.TrimStart([char]0xFEFF)
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($path, $content, $utf8NoBom)
Write-Host "OK: BOM removed from schema.prisma" -ForegroundColor Green
