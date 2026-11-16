# 造化乾坤鼎 · 让桥跟着走（不需要管理员）
# 1) 登录自启：写 HKCU Run（幂等）
# 2) 看门狗：每 5 分钟跑一次 start-bridge.ps1（活着就立刻退出）
# 3) 开始菜单快捷方式：指向 start-app.ps1（先起桥，再起应用）
#
# 用法：powershell -ExecutionPolicy Bypass -File .\install-autostart.ps1
#       powershell -ExecutionPolicy Bypass -File .\install-autostart.ps1 -Remove

param(
  [switch]$Remove,
  [string]$Root = 'D:\造化乾坤鼎-工作台\patch'
)

$ErrorActionPreference = 'Stop'
$bridge = Join-Path $Root 'start-bridge.ps1'
$app    = Join-Path $Root 'start-app.ps1'
$taskName = 'ZhaohuaBridgeWatchdog'
$runKey   = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
$lnkPath  = Join-Path ([Environment]::GetFolderPath('Programs')) '造化乾坤鼎.lnk'

if ($Remove) {
  schtasks /Delete /TN $taskName /F 2>$null | Out-Null
  Remove-ItemProperty -Path $runKey -Name 'ZhaohuaBridge' -ErrorAction SilentlyContinue
  if (Test-Path $lnkPath) { Remove-Item $lnkPath -Force }
  Write-Host "已撤销：看门狗 / 登录自启 / 开始菜单快捷方式" -ForegroundColor Yellow
  return
}

if (-not (Test-Path $bridge)) { throw "找不到 $bridge" }
if (-not (Test-Path $app))    { throw "找不到 $app" }

# ---------- 1) 登录自启 ----------
$cmd = 'powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + $bridge + '"'
New-Item -Path $runKey -Force | Out-Null
Set-ItemProperty -Path $runKey -Name 'ZhaohuaBridge' -Value $cmd
Write-Host "登录自启：HKCU Run / ZhaohuaBridge 已写入" -ForegroundColor Green

# ---------- 2) 看门狗（每 5 分钟） ----------
schtasks /Create /TN $taskName /SC MINUTE /MO 5 /TR $cmd /F /RL LIMITED 2>&1 | Out-Null
schtasks /Query /TN $taskName 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
  Write-Host "看门狗：每 5 分钟跑一次 start-bridge.ps1" -ForegroundColor Green
} else {
  Write-Warning "看门狗创建失败（可能被策略拦），登录自启仍然有效"
}

# ---------- 3) 开始菜单快捷方式 ----------
$shell = New-Object -ComObject WScript.Shell
$sc = $shell.CreateShortcut($lnkPath)
$sc.TargetPath       = 'powershell.exe'
$sc.Arguments        = '-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + $app + '"'
$sc.WorkingDirectory = $Root
$ico = 'D:\造化乾坤鼎-工作台\_work\stable\app\Resources\app.ico'
if (Test-Path $ico) { $sc.IconLocation = $ico } else { $sc.IconLocation = 'powershell.exe,0' }
$sc.Description = '造化乾坤鼎（含本地桥）'
$sc.Save()
Write-Host "开始菜单：$lnkPath" -ForegroundColor Green

Write-Host ""
Write-Host "完成。以后从「造化乾坤鼎」快捷方式进 = 先起桥再起应用。" -ForegroundColor Cyan
Write-Host "若直接双击应用自己的图标，桥由看门狗在 5 分钟内补上。" -ForegroundColor DarkGray
