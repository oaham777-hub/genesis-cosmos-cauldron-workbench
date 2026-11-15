# 造化鼎 · 一键启动（桥 + 清缓存 + 开应用）
#
# 用法：
#   powershell -ExecutionPolicy Bypass -File start-app.ps1
#   powershell -ExecutionPolicy Bypass -File start-app.ps1 -NoLaunch      # 只起桥，不开窗口
#   powershell -ExecutionPolicy Bypass -File start-app.ps1 -ClearCache    # 先清 WebView2 缓存（覆盖层偶发不出现时用）
#   powershell -ExecutionPolicy Bypass -File start-app.ps1 -Status        # 只看状态
#
# 为什么需要它：桥是旁挂进程，应用不会替你拉起；覆盖层偶发不出现，
# 十有八九是 WebView2 缓存了旧页面。这两件事都可以在一处收掉。

param(
  [switch]$NoLaunch,
  [switch]$ClearCache,
  [switch]$Status
)

$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$dev = 'D:\造化乾坤鼎-工作台\_work\stable'
$port = 8791

function Test-Bridge {
  try {
    $r = Invoke-WebRequest "http://127.0.0.1:$port/health" -UseBasicParsing -TimeoutSec 3
    return ($r.StatusCode -eq 200)
  } catch { return $false }
}

function Get-WebViewCache {
  # WebView2 的缓存目录在 LOCALAPPDATA 下，按 identifier 分；清它等价于"换个干净的浏览器"
  $roots = @(
    "$env:LOCALAPPDATA\local.aiStudio.yoko",
    "$env:LOCALAPPDATA\local.aiStudio.yoko.stable"
  )
  $found = @()
  foreach ($r in $roots) {
    if (Test-Path $r) {
      $found += Get-ChildItem $r -Recurse -Directory -Filter 'Cache' -ErrorAction SilentlyContinue
      $found += Get-ChildItem $r -Recurse -Directory -Filter 'Code Cache' -ErrorAction SilentlyContinue
      $found += Get-ChildItem $r -Recurse -Directory -Filter 'GPUCache' -ErrorAction SilentlyContinue
    }
  }
  return $found
}

if ($Status) {
  $ok = Test-Bridge
  "桥      : " + $(if ($ok) { "在跑 http://127.0.0.1:$port" } else { '没在跑' })
  $p = Get-CimInstance Win32_Process -Filter "Name='bun.exe'" | Where-Object { $_.CommandLine -like '*server.mjs*' }
  "桥进程  : " + $(if ($p) { ($p | ForEach-Object { '#' + $_.ProcessId }) -join ' ' } else { '无' })
  "开发副本: " + $(if (Test-Path (Join-Path $dev 'app\bin\launcher.exe')) { '就绪' } else { '缺失' })
  $c = Get-WebViewCache
  "WebView 缓存: " + $(if ($c) { "$($c.Count) 个目录" } else { '无' })
  return
}

Write-Host "== 造化鼎启动 ==" -ForegroundColor Cyan

# 1) 桥
if (-not (Test-Bridge)) {
  Write-Host "起桥…" -ForegroundColor Gray
  & (Join-Path $here 'start-bridge.ps1')
} else {
  Write-Host "桥已在跑（幂等跳过）" -ForegroundColor DarkGray
}

# 2) 缓存（可选）
if ($ClearCache) {
  $caches = Get-WebViewCache
  if ($caches.Count -eq 0) {
    Write-Host "没有找到 WebView 缓存目录" -ForegroundColor DarkGray
  } else {
    foreach ($c in $caches) {
      try {
        Remove-Item $c.FullName -Recurse -Force -ErrorAction Stop
        Write-Host "  已清 $($c.FullName)" -ForegroundColor Green
      } catch {
        Write-Host "  清不掉（应用可能开着，先关掉它）：$($c.FullName)" -ForegroundColor Yellow
      }
    }
  }
}

# 3) 开应用
if ($NoLaunch) {
  Write-Host "`n只起桥，不开窗口（-NoLaunch）" -ForegroundColor Yellow
  return
}

$exe = Join-Path $dev 'app\bin\launcher.exe'
if (-not (Test-Path $exe)) { throw "找不到 launcher.exe：$exe" }

Start-Process $exe -WorkingDirectory $dev
Write-Host "已启动：$exe" -ForegroundColor Green
