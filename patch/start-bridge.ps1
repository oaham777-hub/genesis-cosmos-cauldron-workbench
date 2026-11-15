# 造化鼎桥 · 启动器（幂等）
# 用法：  powershell -ExecutionPolicy Bypass -File start-bridge.ps1
#        powershell -ExecutionPolicy Bypass -File start-bridge.ps1 -Stop
#
# 桥的作用：让造化鼎页面上的按钮能真的跑 zhaohua 命令。
# 它跑在 127.0.0.1:8791，只回环；重启乾坤鼎不会把它带掉（用封存副本里的 bun.exe）。

param([switch]$Stop, [int]$Port = 8791)

$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$server = Join-Path $here 'zhaohua-ui\server.mjs'
$bunCandidates = @(
  'D:\洋子工作台\_pristine\stable-0.1.42\app\bin\bun.exe',
  'D:\造化乾坤鼎-工作台\_work\stable\app\bin\bun.exe'
)

function Test-Bridge {
  try {
    $r = Invoke-WebRequest "http://127.0.0.1:$Port/health" -UseBasicParsing -TimeoutSec 3
    return ($r.StatusCode -eq 200)
  } catch { return $false }
}

function Get-BridgeProcs {
  @(Get-CimInstance Win32_Process -Filter "Name='bun.exe'" | Where-Object { $_.CommandLine -like '*server.mjs*' })
}

if ($Stop) {
  $procs = Get-BridgeProcs
  if (-not $procs) { "桥没有在运行" }
  else { $procs | ForEach-Object { Stop-Process -Id $_.ProcessId -Force; "已停止桥进程 #$($_.ProcessId)" } }
  return
}

if (Test-Bridge) {
  "桥已在运行：http://127.0.0.1:$Port"
  return
}

$stale = Get-BridgeProcs
if ($stale) { $stale | ForEach-Object { Stop-Process -Id $_.ProcessId -Force } }

$bun = $bunCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $bun) { throw "找不到 bun.exe，试过：$($bunCandidates -join ' / ')" }
if (-not (Test-Path $server)) { throw "找不到 server.mjs：$server" }

$log = Join-Path $here "_reports\bridge.log"
New-Item -ItemType Directory -Force -Path (Split-Path $log) | Out-Null
Add-Content -Path $log -Value ("{0}  start  bun={1} server={2}" -f (Get-Date -Format s), $bun, $server) -Encoding UTF8
Start-Process $bun -ArgumentList $server -WindowStyle Hidden
for ($i = 0; $i -lt 10; $i++) {
  Start-Sleep -Milliseconds 500
  if (Test-Bridge) { Add-Content -Path $log -Value ("{0}  up  pid={1}" -f (Get-Date -Format s), ((Get-BridgeProcs | ForEach-Object { $_.ProcessId }) -join ",")) -Encoding UTF8; "桥已启动：http://127.0.0.1:$Port"; return }
}
throw "桥启动失败：端口 $Port 没有响应，请检查 $server"