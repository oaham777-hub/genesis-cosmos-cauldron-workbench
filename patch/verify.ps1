<#
  造化乾坤鼎工作台 · 基线比对  verify.ps1
  ------------------------------------------------------------
  目标目录 vs 原件基线（manifest-baseline.jsonl）逐文件比对 sha256，
  回答三个问题：哪些被改了、哪些是新增、哪些丢了。

  用法：
    pwsh -File verify.ps1 -Target "D:\造化乾坤鼎-工作台\_work\stable"
    pwsh -File verify.ps1 -Target "D:\洋子工作台\stable" -NoHash   # 只比大小/时间，秒级

  退出码：0 = 与基线一致（或只有新增）；3 = 有被改/丢失，需要人看一眼。
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$Target,
  [string]$Baseline = 'D:\洋子工作台\_pristine\manifest-baseline.jsonl',
  [switch]$NoHash
)

$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot
if (-not (Test-Path $Target))   { throw "目标不存在：$Target" }
if (-not (Test-Path $Baseline)) { throw "基线不存在：$Baseline" }
$Target = (Resolve-Path $Target).Path
$stamp  = Get-Date -Format 'yyyyMMdd-HHmmss'

Write-Host "读取基线 …" -ForegroundColor DarkGray
$base = @{}
foreach ($line in [IO.File]::ReadLines($Baseline)) {
  if (-not $line) { continue }
  $o = $line | ConvertFrom-Json
  $base[$o.p] = $o
}
Write-Host "基线 $($base.Count) 个文件" -ForegroundColor DarkGray

function Get-Sha256([string]$p) {
  $sha = [Security.Cryptography.SHA256]::Create()
  $fs = [IO.File]::OpenRead($p)
  try { return ([BitConverter]::ToString($sha.ComputeHash($fs)).Replace('-', '').ToLower()) } finally { $fs.Close(); $sha.Dispose() }
}

$changed = New-Object System.Collections.Generic.List[object]
$new     = New-Object System.Collections.Generic.List[object]
$seen    = New-Object 'System.Collections.Generic.HashSet[string]'

$files = Get-ChildItem $Target -Recurse -File -Force
$i = 0
foreach ($f in $files) {
  $rel = $f.FullName.Substring($Target.Length).TrimStart('\')
  [void]$seen.Add($rel)
  $b = $base[$rel]
  if (-not $b) { $new.Add([pscustomobject]@{ p = $rel; n = $f.Length }); continue }
  if ($b.n -ne $f.Length) { $changed.Add([pscustomobject]@{ p = $rel; why = 'size'; from = $b.n; to = $f.Length }); continue }
  if ($NoHash) { continue }
  $h = Get-Sha256 $f.FullName
  if ($h -ne $b.h) { $changed.Add([pscustomobject]@{ p = $rel; why = 'sha256'; from = $b.h; to = $h }); continue }
  $i++
}

$missing = @($base.Keys | Where-Object { -not $seen.Contains($_) })

Write-Host ""
Write-Host ("一致 {0} · 被改 {1} · 新增 {2} · 丢失 {3}" -f $i, $changed.Count, $new.Count, $missing.Count) -ForegroundColor Cyan

if ($changed.Count -gt 0) {
  Write-Host "`n被改的文件（前 20，按大小降序）：" -ForegroundColor Yellow
  $changed | Sort-Object { try { (Get-Item (Join-Path $Target $_.p)).Length } catch { 0 } } -Descending |
    Select-Object -First 20 | ForEach-Object { "  {0,-8} {1}" -f $_.why, $_.p }
}
if ($new.Count -gt 0) {
  Write-Host "`n新增（前 20）：" -ForegroundColor DarkYellow
  $new | Sort-Object n -Descending | Select-Object -First 20 | ForEach-Object { "  {0,12:N0}  {1}" -f $_.n, $_.p }
}
if ($missing.Count -gt 0) {
  Write-Host "`n丢失（前 20）：" -ForegroundColor Red
  $missing | Select-Object -First 20 | ForEach-Object { "  $_" }
}

$outDir = Join-Path $Root '_reports'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$out = Join-Path $outDir "verify-$stamp.json"
$reportObj = New-Object PSObject -Property ([ordered]@{
  stamp = $stamp; target = $Target; baseline = $Baseline; noHash = [bool]$NoHash
  identical = $i
  changedCount = $changed.Count; newCount = $new.Count; missingCount = $missing.Count
  changed = $changed.ToArray(); new = $new.ToArray(); missing = [string[]]$missing
})
$reportObj | ConvertTo-Json -Depth 6 | Set-Content $out -Encoding UTF8
Write-Host "`n报告：$out" -ForegroundColor Green

if ($changed.Count -gt 0 -or $missing.Count -gt 0) { exit 3 } else { exit 0 }
