<#
  造化乾坤鼎工作台 · 补丁重放器  apply.ps1
  ------------------------------------------------------------
  只做三类事，全部可重放、可回滚、可报告：
    -Strings   改名替换（strings.rename.json，to 为空的条目跳过）
    -Overlay   向 index.html 注入启动覆盖层（带标记位，幂等）
    -Pill      向 index.html 注入常驻「造化鼎」切换按钮（带标记位，幂等）
    -Data      把 data-additions 同步进 data\（升级不覆盖，可重复执行）
    -Redirect  ini + 卸载注册表重定向到 $Target（幂等；只在该副本里做，不动原件）
-All       以上都做

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
  [switch]$Skills,
  [switch]$Data,
  [switch]$Check,
  [switch]$Stages,
[switch]$Redirect,
  [switch]$All,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot
if ($All) { $Strings = $true; $Overlay = $true; $Pill = $true; $Skills = $true; $Data = $true; $Stages = $true }
if (-not ($Strings -or $Overlay -or $Pill -or $Skills -or $Data -or $Stages -or $Check -or $Redirect)) { throw "至少指定 -Strings / -Overlay / -Pill / -Skills / -Data / -Stages / -Check / -Redirect / -All 之一" }
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

# ---------- B. 启动覆盖层（外链 + 构建戳，规避 WebView2 缓存旧静态页） ----------
if ($Overlay) {
  $idx = Join-Path $Target 'app\Resources\app\views\mainview\index.html'
  $src = Join-Path $Root 'zhaohua-ui\overlay.js'
  $dstDir = Join-Path $Target 'app\Resources\app\views\mainview\zhaohua'
  $dst = Join-Path $dstDir 'overlay.js'
  if (-not (Test-Path $idx)) {
    Write-Warning "找不到 index.html：$idx"
    $report.actions += @{ action = 'overlay'; status = 'failed'; reason = 'index.html-missing' }
  } elseif (-not (Test-Path $src)) {
    Write-Warning "找不到覆盖层脚本：$src（先跑 node patch\tools\build-overlay.mjs）"
    $report.actions += @{ action = 'overlay'; status = 'failed'; reason = 'overlay-js-missing' }
  } else {
    $html = [IO.File]::ReadAllText($idx, [Text.Encoding]::UTF8)
    $changed = $false

    # 1) 迁移：清掉老版本注入的内联覆盖层（<div id="cauldron-launcher">…</div>，按 div 配平）
    if ($html -match 'id="cauldron-launcher"') {
      $i = $html.IndexOf('<div id="cauldron-launcher"')
      if ($i -ge 0) {
        # 连前面的注释块一起清掉（老版本注入时前面有段 <!-- 启动覆盖层 … --> 说明）
        $ci = $html.LastIndexOf('<!--', $i)
        if ($ci -ge 0 -and (($i - $ci) -lt 900) -and ($html.Substring($ci, $i - $ci) -notmatch '-->')) { $i = $ci }
        $depth = 0; $j = $i
        while ($j -lt $html.Length) {
          $open = $html.IndexOf('<div', $j)
          $close = $html.IndexOf('</div>', $j)
          if ($close -lt 0) { break }
          if ($open -ge 0 -and $open -lt $close) { $depth++; $j = $open + 4 }
          else { $depth--; $j = $close + 6; if ($depth -le 0) { break } }
        }
        $html = $html.Remove($i, $j - $i)
        $changed = $true
        Write-Host "已移除旧的内联覆盖层（外链化迁移）" -ForegroundColor DarkYellow
      }
    }

    # 1b) 兜底：只残留注释块时也清掉（老版本注入的说明注释）
    if ($html -match 'id="cauldron-launcher"') {
      $cm = [regex]::Match($html, '(?s)<!--[^>]*启动覆盖层[^>]*-->')
      if ($cm.Success) {
        $html = $html.Remove($cm.Index, $cm.Length)
        $changed = $true
        Write-Host "已清除覆盖层残留注释" -ForegroundColor DarkYellow
      }
    }
    # 2) 脚本放到应用自带静态目录 /zhaohua/overlay.js
    if (-not (Test-Path $dstDir)) { New-Item -ItemType Directory -Path $dstDir -Force | Out-Null }
    Copy-Item $src $dst -Force
    $stamp = (Get-FileHash $src -Algorithm SHA256).Hash.Substring(0, 8).ToLower()
    $tag = '<script src="/zhaohua/overlay.js?v=' + $stamp + '"></script>'

    # 3) 注入或刷新引用（放在 <body> 之后，先画覆盖层再画内容）
    if ($html -match '(?is)<script[^>]*zhaohua/overlay\.js[^>]*>\s*</script>') {
      $html = [regex]::Replace($html, '(?is)<script[^>]*zhaohua/overlay\.js[^>]*>\s*</script>', $tag)
      $changed = $true
    } elseif ($html -match '(?is)<body[^>]*>') {
      # 插在 <body> 开标签之后，覆盖层先于内容出现
      $rx = [regex]'(?is)<body[^>]*>'
      $html = $rx.Replace($html, { param($m) $m.Value + "`r`n" + $tag }, 1)
      $changed = $true
    } elseif ($html -match '</body>') {
      $html = [regex]::Replace($html, '(?is)</body>', ($tag + "`r`n</body>"), 1)
      $changed = $true
    } else {
      $html = $html + "`r`n" + $tag
      $changed = $true
    }

    if ($changed) {
      Save-Backup $idx
      Save-Text $idx $html
      Write-Host "覆盖层：外链注入 $tag（戳 $stamp）" -ForegroundColor Green
      $report.actions += @{ action = 'overlay'; status = 'external'; stamp = $stamp; dest = 'views\mainview\zhaohua\overlay.js' }
    } else {
      Write-Host "覆盖层已是最新（幂等）" -ForegroundColor DarkGray
      $report.actions += @{ action = 'overlay'; status = 'present' }
    }
  }
}

# ---------- B2. 唯一真相：patch\skills -> data\skills ----------
if ($Skills) {
  $canon = Join-Path $Root 'skills'
  if (-not (Test-Path $canon)) {
    Write-Warning "找不到 patch\skills，跳过"
    $report.actions += @{ action = 'skills'; status = 'skipped'; reason = 'canonical-missing' }
  } else {
    $dstRoot = Join-Path $Target 'data\skills'
    New-Item -ItemType Directory -Force -Path $dstRoot | Out-Null
    $n = 0
    foreach ($it in @(Get-ChildItem $canon -Directory | Sort-Object Name)) {
      $dst = Join-Path $dstRoot $it.Name
      if (-not $DryRun) {
        if (-not (Test-Path $dst)) { New-Item -ItemType Directory -Force -Path $dst | Out-Null }
        robocopy $it.FullName $dst /E /COPY:DAT /R:1 /W:1 /NFL /NDL /NJH /NJS | Out-Null
      }
      Write-Host "  同步技能 $($it.Name)" -ForegroundColor Cyan
      $report.actions += @{ action = 'skills'; item = $it.Name; type = 'dir' }
      $n++
    }
    Write-Host "技能同步：$n 个目录" -ForegroundColor Green
  }
}

# ---------- B3. 漂移检查：patch\skills 与 data\skills 是否一致 ----------
if ($Check) {
  $node = Join-Path $Target 'app\Resources\app\runtime\node\node.exe'
  $tool = Join-Path $Root 'tools\check-sync.mjs'
  if ((Test-Path $node) -and (Test-Path $tool)) {
    & $node $tool (Join-Path $Root 'skills') (Join-Path $Target 'data\skills')
    $code = $LASTEXITCODE
    $report.actions += @{ action = 'check'; exitCode = $code }
    if ($code -ne 0) { Write-Warning "检测到漂移：data\skills 与 patch\skills 不一致（用 -Skills 重新同步）" }
  } else { Write-Warning "缺 node 或 check-sync.mjs，跳过漂移检查" }
}
# ---------- C. data-additions ----------
if ($Data) {
  $add = Join-Path $Root 'data-additions'
  foreach ($kind in 'tools', 'providers', 'ext') {
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


# ---------- 路径重定向（ini + 卸载注册表）----------
# 为什么需要：应用启动时按 ini 与注册表里的 installDirectory 找数据目录。
# 不重定向的话，开发副本会去读原安装（D:\洋子工作台\stable）的数据，
# 表现是"改了没生效""开着两个实例互相抢"。
if ($Redirect -or $All) {
  Write-Host "`n== 路径重定向 ==" -ForegroundColor Cyan
  $targetFull = [IO.Path]::GetFullPath($Target).TrimEnd('\')
  $ini = Join-Path $targetFull 'toonflow.ini'
  if (Test-Path $ini) {
    $enc = [Text.Encoding]::GetEncoding(936)
    $text = [IO.File]::ReadAllText($ini, $enc)
    $new = [regex]::Replace($text, '(?m)^installDirectory=.*$', "installDirectory=$targetFull")
    if ($new -ne $text) {
      if ($DryRun) {
        Write-Host "  [dry] ini installDirectory → $targetFull" -ForegroundColor Yellow
      } else {
        Save-Backup $ini
        [IO.File]::WriteAllText($ini, $new, $enc)
        Write-Host "  ini  installDirectory → $targetFull" -ForegroundColor Green
      }
      $report.actions += @{ action = 'redirect-ini'; file = $ini; status = $(if ($DryRun) { 'dry' } else { 'applied' }) }
    } else {
      Write-Host "  ini  已是目标路径（幂等）" -ForegroundColor DarkGray
    }
  } else {
    Write-Warning "  没有 toonflow.ini：$ini"
  }

  # 卸载项：只改我们自己这一份（identifier 固定 local.aiStudio.yoko.stable）
  $regPath = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\local.aiStudio.yoko.stable'
  if (Test-Path $regPath) {
    $cur = Get-ItemProperty -Path $regPath
    $want = [ordered]@{
      DisplayName               = '造化乾坤鼎'
      InstallLocation           = $targetFull
      toonflowInstallDirectory  = $targetFull
      DisplayIcon               = (Join-Path $targetFull 'app\Resources\app.ico')
    }
    $changed = @()
    foreach ($k in $want.Keys) {
      if ($cur.$k -ne $want[$k]) { $changed += $k }
    }
    if ($changed.Count -gt 0) {
      if ($DryRun) {
        Write-Host "  [dry] 注册表待改：$($changed -join ', ')" -ForegroundColor Yellow
      } else {
        foreach ($k in $changed) { Set-ItemProperty -Path $regPath -Name $k -Value $want[$k] }
        Write-Host "  注册表 → $targetFull（改了 $($changed.Count) 项：$($changed -join ', ')）" -ForegroundColor Green
        $report.actions += @{ action = 'redirect-registry'; key = $regPath; fields = $changed; status = 'applied' }
      }
    } else {
      Write-Host "  注册表已是目标值（幂等）" -ForegroundColor DarkGray
    }
  } else {
    Write-Warning "  没有卸载注册表项：$regPath"
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