<#
  造化乾坤鼎工作台 · 补丁重放器  apply.ps1
  ------------------------------------------------------------
  只做三类事，全部可重放、可回滚、可报告：
    -Strings   改名替换（strings.rename.json，to 为空的条目跳过）
    -Overlay   向 index.html 注入启动覆盖层（带标记位，幂等）
    -Pill      向 index.html 注入常驻「造化鼎」切换按钮（带标记位，幂等）
    -Data      把 data-additions 同步进 data\（升级不覆盖，可重复执行）
    -All       三件都做

  用法：
    pwsh -File apply.ps1 -Target "D:\造化乾坤鼎-工作台\_work\stable" -All -DryRun
    pwsh -File apply.ps1 -Target "D:\造化乾坤鼎-工作台\_work\stable" -All

  纪律：
    1. 永远不要直接手改目标目录；改本补丁包，然后重放。
    2. 每次运行先备份被改的文件到 patch\_backup\<时间戳>\，并写 report.json。
    3. 版本不一致只警告、不阻断（升级后重放是常态）。
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$Target,
  [switch]$Strings,
  [switch]$Overlay,
  [switch]$Pill,
  [switch]$Data,
  [switch]$Stages,
  [switch]$All,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot
if ($All) { $Strings = $true; $Overlay = $true; $Pill = $true; $Data = $true; $Stages = $true }
if (-not ($Strings -or $Overlay -or $Pill -or $Data -or $Stages)) { throw "至少指定 -Strings / -Overlay / -Pill / -Data / -Stages / -All 之一" }
if (-not (Test-Path $Target)) { throw "目标不存在：$Target" }
$Target = (Resolve-Path $Target).Path

$cfg  = Get-Content (Join-Path $Root 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupRoot = Join-Path $Root "_backup\$stamp"
$report = [ordered]@{ stamp = $stamp; target = $Target; dryRun = [bool]$DryRun; versionCheck = $null; actions = @() }

function Get-Sha256([string]$p) {
  $sha = [Security.Cryptography.SHA256]::Create()
  $fs = [IO.File]::OpenRead($p)
  try { return ([BitConverter]::ToString($sha.ComputeHash($fs)).Replace('-', '').ToLower()) } finally { $fs.Close(); $sha.Dispose() }
}

function Save-Backup([string]$p) {
  if ($DryRun) { return }
  $rel = $p.Substring($Target.Length).TrimStart('\')
  $dst = Join-Path $backupRoot $rel
  New-Item -ItemType Directory -Force -Path (Split-Path $dst -Parent) | Out-Null
  Copy-Item $p $dst -Force
}

function Save-Text([string]$p, [string]$text) {
  if ($DryRun) { return }
  [IO.File]::WriteAllText($p, $text, (New-Object Text.UTF8Encoding($false)))
}

# ---------- 版本核对 ----------
$verFile = Join-Path $Target 'app\Resources\version.json'
if (Test-Path $verFile) {
  $ver = Get-Content $verFile -Raw -Encoding UTF8 | ConvertFrom-Json
  $report.versionCheck = @{ targetVersion = $ver.version; baselineVersion = $cfg.baseline.version; match = ($ver.version -eq $cfg.baseline.version) }
  if ($ver.version -ne $cfg.baseline.version) {
    Write-Warning "版本不一致：目标 $($ver.version) / 基线 $($cfg.baseline.version)。补丁可能已失效，请先跑 verify.ps1 比对再决定。"
  } else {
    Write-Host "版本一致：$($ver.version)" -ForegroundColor Green
  }
} else {
  Write-Warning "找不到 version.json：$verFile"
}

# ---------- A. 字符串改名 ----------
if ($Strings) {
  $strCfg = Get-Content (Join-Path $Root 'strings.rename.json') -Raw -Encoding UTF8 | ConvertFrom-Json
  $entries = @($strCfg.entries | Where-Object { $_ -and $_.to -ne '' -and $_.to -ne $null } | Sort-Object { $_.from.Length } -Descending)
  $skipped = @($strCfg.entries | Where-Object { -not $_.to }).Count
  if ($entries.Count -eq 0) {
    Write-Warning "strings.rename.json 里没有任何生效条目（$skipped 条待定名）——改名补丁跳过。先填 newName 和每条 to。"
    $report.actions += @{ action = 'strings'; status = 'skipped'; reason = 'no-active-entries'; pendingEntries = $skipped }
  } else {
    Write-Host "改名：$($entries.Count) 条生效 / $skipped 条待定" -ForegroundColor Cyan
    foreach ($glob in $strCfg.scan) {
      $pat = Join-Path $Target $glob
      Get-ChildItem $pat -File -ErrorAction SilentlyContinue | ForEach-Object {
        $file = $_.FullName
        $orig = [IO.File]::ReadAllText($file, [Text.Encoding]::UTF8)
        $text = $orig
        $hits = [ordered]@{}
        foreach ($e in $entries) {
          $c = ([regex]::Matches($text, [regex]::Escape($e.from))).Count
          if ($c -gt 0) { $hits[$e.from] = $c; $text = $text.Replace($e.from, $e.to) }
        }
        if ($text -ne $orig) {
          $before = Get-Sha256 $file
          Save-Backup $file
          Save-Text $file $text
          $after = if ($DryRun) { $before } else { Get-Sha256 $file }
          $rel = $file.Substring($Target.Length).TrimStart('\')
          Write-Host ("  改 {0}  命中 {1}" -f $rel, (($hits.GetEnumerator() | ForEach-Object { "$($_.Key)×$($_.Value)" }) -join ', '))
          $report.actions += @{ action = 'strings'; file = $rel; hits = $hits; before = $before; after = $after }
        }
      }
    }
  }
}

# ---------- B2. 常驻切换按钮 ----------
if ($Pill) {
  $idx2 = Join-Path $Target 'app\Resources\app\views\mainview\index.html'
  $pillFrag = Join-Path $Root 'overlay\switch.html'
  if (-not (Test-Path $idx2)) { Write-Warning "找不到 index.html：$idx2" }
  elseif (-not (Test-Path $pillFrag)) { Write-Warning "找不到切换片段：$pillFrag" }
  else {
    $h2 = [IO.File]::ReadAllText($idx2, [Text.Encoding]::UTF8)
    if ($h2 -match 'id="cauldron-switch"') {
      Write-Host "切换按钮已存在，跳过（幂等）" -ForegroundColor DarkGray
      $report.actions += @{ action = 'pill'; status = 'present' }
    } else {
      $pblock = [IO.File]::ReadAllText($pillFrag, [Text.Encoding]::UTF8)
      $pnew = if ($h2 -match '</body>') { $h2 -replace '(?i)</body>', ($pblock + "`r`n</body>") } else { $h2 + "`r`n" + $pblock }
      Save-Backup $idx2
      Save-Text $idx2 $pnew
      Write-Host "已注入常驻切换按钮 -> index.html" -ForegroundColor Green
      $report.actions += @{ action = 'pill'; status = 'injected'; file = 'app\Resources\app\views\mainview\index.html' }
    }
  }
}

# ---------- B. 启动覆盖层 ----------
if ($Overlay) {
  $idx = Join-Path $Target 'app\Resources\app\views\mainview\index.html'
  $frag = Join-Path $Root 'overlay\launcher.html'
  if (-not (Test-Path $idx)) { Write-Warning "找不到 index.html：$idx"; $report.actions += @{ action = 'overlay'; status = 'failed'; reason = 'index.html-missing' } }
  elseif (-not (Test-Path $frag)) { Write-Warning "找不到覆盖层片段：$frag"; $report.actions += @{ action = 'overlay'; status = 'failed'; reason = 'fragment-missing' } }
  else {
    $html = [IO.File]::ReadAllText($idx, [Text.Encoding]::UTF8)
    if ($html -match 'id="cauldron-launcher"') {
      Write-Host "覆盖层已存在，跳过（幂等）" -ForegroundColor DarkGray
      $report.actions += @{ action = 'overlay'; status = 'present' }
    } else {
      $block = [IO.File]::ReadAllText($frag, [Text.Encoding]::UTF8)
      $new = if ($html -match '<body[^>]*>') { $html -replace '(?is)(<body[^>]*>)', ("`$1`r`n$block") } else { $html + "`r`n" + $block }
      Save-Backup $idx
      Save-Text $idx $new
      Write-Host "已注入启动覆盖层 -> index.html" -ForegroundColor Green
      $report.actions += @{ action = 'overlay'; status = 'injected'; file = 'app\Resources\app\views\mainview\index.html' }
    }
  }
}

# ---------- C. data-additions ----------
if ($Data) {
  $add = Join-Path $Root 'data-additions'
  foreach ($kind in 'skills', 'tools', 'providers', 'ext') {
    $src = Join-Path $add $kind
    if (-not (Test-Path $src)) { continue }
    $items = @(Get-ChildItem $src -Force | Where-Object { $_.Name -ne '.gitkeep' })
    if ($items.Count -eq 0) { continue }
    $dst = Join-Path $Target "data\$kind"
    New-Item -ItemType Directory -Force -Path $dst | Out-Null
    foreach ($it in $items) {
      if ($it.PSIsContainer) {
        if (-not $DryRun) { robocopy $it.FullName (Join-Path $dst $it.Name) /E /COPY:DAT /R:1 /W:1 /NFL /NDL /NJH /NJS | Out-Null }
        Write-Host "  同步目录 data\$kind\$($it.Name)\" -ForegroundColor Cyan
        $report.actions += @{ action = 'data'; kind = $kind; item = $it.Name; type = 'dir' }
      } else {
        if (-not $DryRun) { Copy-Item $it.FullName (Join-Path $dst $it.Name) -Force }
        Write-Host "  同步文件 data\$kind\$($it.Name)" -ForegroundColor Cyan
        $report.actions += @{ action = 'data'; kind = $kind; item = $it.Name; type = 'file' }
      }
    }
  }
  if ($report.actions.Count -eq 0) { Write-Host "data-additions 为空，跳过" -ForegroundColor DarkGray }
}

# ---------- D. 阶段职责切分（strings.stages.json，精确命中一次） ----------
if ($Stages) {
  $stageFile = Join-Path $Root 'strings.stages.json'
  if (-not (Test-Path $stageFile)) {
    Write-Warning "找不到 strings.stages.json，跳过"
    $report.actions += @{ action = 'stages'; status = 'skipped'; reason = 'config-missing' }
  } else {
    $stageCfg = Get-Content $stageFile -Raw -Encoding UTF8 | ConvertFrom-Json
    $okCount = 0; $failCount = 0
    foreach ($e in @($stageCfg.entries)) {
      $file = Join-Path $Target "data\skills\$($e.file)"
      if (-not (Test-Path $file)) {
        Write-Warning "  缺文件：$($e.file)"
        $report.actions += @{ action = 'stages'; file = $e.file; status = 'failed'; reason = 'file-missing' }
        $failCount++; continue
      }
      $text = [IO.File]::ReadAllText($file, [Text.Encoding]::UTF8)
      $hits = ([regex]::Matches($text, [regex]::Escape($e.find))).Count
      if ($hits -eq 1) {
        if ($e.find -ne $e.replace) {
          $before = Get-Sha256 $file
          Save-Backup $file
          Save-Text $file ($text.Replace($e.find, $e.replace))
          $after = if ($DryRun) { $before } else { Get-Sha256 $file }
          Write-Host "  切分 $($e.file) · $($e.note)" -ForegroundColor Cyan
          $report.actions += @{ action = 'stages'; file = $e.file; note = $e.note; status = 'applied'; before = $before; after = $after }
        } else {
          Write-Host "  切分 $($e.file) · $($e.note)（无变化）" -ForegroundColor DarkGray
          $report.actions += @{ action = 'stages'; file = $e.file; note = $e.note; status = 'noop' }
        }
        $okCount++
      } elseif ($hits -eq 0 -and $text.Contains($e.replace)) {
        Write-Host "  切分 $($e.file) · $($e.note)（已是目标态，幂等跳过）" -ForegroundColor DarkGray
        $report.actions += @{ action = 'stages'; file = $e.file; note = $e.note; status = 'present' }
        $okCount++
      } else {
        Write-Warning "  切分 $($e.file) · $($e.note)：命中 $hits 次（要求恰好 1 次），未改动"
        $report.actions += @{ action = 'stages'; file = $e.file; note = $e.note; status = 'failed'; hits = $hits }
        $failCount++
      }
    }
    Write-Host "阶段切分：$okCount 成功 / $failCount 失败" -ForegroundColor $(if ($failCount -eq 0) { 'Green' } else { 'Yellow' })
  }
}

# ---------- 报告 ----------
if (-not $DryRun) {
  New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
  $reportPath = Join-Path $backupRoot 'report.json'
  ($report | ConvertTo-Json -Depth 8) | Set-Content $reportPath -Encoding UTF8
  Write-Host "`n报告：$reportPath" -ForegroundColor Green
} else {
  Write-Host "`n[dry-run] 未写入任何文件" -ForegroundColor Yellow
}
