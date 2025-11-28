# Find Duplicate Routes in main.ts
# البحث عن routes مكررة

Write-Host ""
Write-Host "🔍 البحث عن routes مكررة..." -ForegroundColor Yellow
Write-Host ""

$file = "matrix-scaffold/backend/src/main.ts"

if (Test-Path $file) {
    $content = Get-Content $file -Raw

    # Extract all route definitions
    $routes = [regex]::Matches($content, "server\.(get|post|put|delete|patch)\(['""]([^'""]+)['""]")

    $routeMap = @{}

    foreach ($match in $routes) {
        $method = $match.Groups[1].Value
        $path = $match.Groups[2].Value
        $key = "$method $path"

        if ($routeMap.ContainsKey($key)) {
            $routeMap[$key]++
        } else {
            $routeMap[$key] = 1
        }
    }

    $duplicates = $routeMap.GetEnumerator() | Where-Object { $_.Value -gt 1 }

    if ($duplicates.Count -gt 0) {
        Write-Host "❌ تم العثور على routes مكررة:" -ForegroundColor Red
        Write-Host ""
        foreach ($dup in $duplicates) {
            Write-Host "  - $($dup.Key) (مكرر $($dup.Value) مرات)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "✅ لا توجد routes مكررة" -ForegroundColor Green
    }
} else {
    Write-Host "❌ الملف غير موجود: $file" -ForegroundColor Red
}

Write-Host ""
