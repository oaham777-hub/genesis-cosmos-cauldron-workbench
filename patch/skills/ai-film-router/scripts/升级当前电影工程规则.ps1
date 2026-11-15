param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectPath
)

$ErrorActionPreference = "Stop"

$resolvedProjectPath = (Resolve-Path -LiteralPath $ProjectPath).Path
. (Join-Path $PSScriptRoot "project_paths.ps1")
$projectControlPath = Get-FilmControlPath -ProjectPath $resolvedProjectPath
$skillRoot = Split-Path -Parent $PSScriptRoot
$ruleRoot = Join-Path $skillRoot "references\project-rules"

if (-not (Test-Path -LiteralPath $projectControlPath)) {
    throw "这不是电影项目文件夹，缺少：$projectControlPath"
}

$templates = @{
    Agents = Join-Path $ruleRoot "AGENTS.md"
    Routing = Join-Path $ruleRoot "routing.md"
    Status = Join-Path $ruleRoot "project-status.md"
    Reference = Join-Path $ruleRoot "reference-memory.md"
    Checkpoint = Join-Path $ruleRoot "session-checkpoint.md"
    Registry = Join-Path $ruleRoot "artifact-registry.md"
    State = Join-Path $ruleRoot "artifact-state.json"
    SceneRegistry = Join-Path $ruleRoot "scene-registry-template.md"
    ReferenceApplication = Join-Path $ruleRoot "reference-application-template.md"
}

foreach ($template in $templates.Values) {
    if (-not (Test-Path -LiteralPath $template)) {
        throw "新版总控规则不完整，缺少：$template"
    }
}

$existingStatePath = Join-Path $projectControlPath "artifact-state.json"
if (Test-Path -LiteralPath $existingStatePath) {
    try {
        $existingState = Get-Content -LiteralPath $existingStatePath -Raw -Encoding utf8 | ConvertFrom-Json -ErrorAction Stop
        if ($null -eq $existingState -or $null -eq $existingState.PSObject.Properties["schema_version"]) {
            throw "缺少 schema_version"
        }
        if ([string]$existingState.schema_version -notin @("3.3", "3.4")) {
            throw "不支持的 schema_version：$($existingState.schema_version)"
        }
    } catch {
        throw "成果机器状态无法安全读取，未开始升级：$existingStatePath；原因：$_"
    }
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = Join-Path $projectControlPath ("rule-backup-" + $stamp)
New-Item -ItemType Directory -Path $backupPath -Force | Out-Null

$projectFiles = @{
    Agents = Join-Path $resolvedProjectPath "AGENTS.md"
    Routing = Join-Path $projectControlPath "routing.md"
    Status = Join-Path $projectControlPath "project-status.md"
    Reference = Join-Path $projectControlPath "reference-memory.md"
    Checkpoint = Join-Path $projectControlPath "session-checkpoint.md"
    Registry = Join-Path $projectControlPath "artifact-registry.md"
    State = Join-Path $projectControlPath "artifact-state.json"
    SceneRegistry = Join-Path $projectControlPath "scene-registry-template.md"
    ReferenceApplication = Join-Path $projectControlPath "reference-application-template.md"
}

foreach ($existing in $projectFiles.Values) {
    if (Test-Path -LiteralPath $existing) {
        Copy-Item -LiteralPath $existing -Destination $backupPath -Force
    }
}

Copy-FilmRuleTemplate -ProjectPath $resolvedProjectPath -Source $templates.Agents -Destination $projectFiles.Agents
Copy-FilmRuleTemplate -ProjectPath $resolvedProjectPath -Source $templates.Routing -Destination $projectFiles.Routing

$statusResult = "已保留现有项目状态"
if (-not (Test-Path -LiteralPath $projectFiles.Status)) {
    Copy-FilmRuleTemplate -ProjectPath $resolvedProjectPath -Source $templates.Status -Destination $projectFiles.Status
    $statusResult = "已新增项目状态文件"
}

foreach ($pair in @(
    @($templates.Reference, $projectFiles.Reference),
    @($templates.Checkpoint, $projectFiles.Checkpoint),
    @($templates.SceneRegistry, $projectFiles.SceneRegistry)
)) {
    if (-not (Test-Path -LiteralPath $pair[1])) {
        Copy-FilmRuleTemplate -ProjectPath $resolvedProjectPath -Source $pair[0] -Destination $pair[1]
    }
}
Copy-FilmRuleTemplate -ProjectPath $resolvedProjectPath -Source $templates.SceneRegistry -Destination $projectFiles.SceneRegistry
Copy-FilmRuleTemplate -ProjectPath $resolvedProjectPath -Source $templates.ReferenceApplication -Destination $projectFiles.ReferenceApplication

if ((Get-Content -LiteralPath $projectFiles.Reference -Raw -Encoding utf8) -notmatch "阶段适用图") {
    Add-Content -LiteralPath $projectFiles.Reference -Encoding utf8 -Value @"

## V4 参考应用兼容规则

- 旧条目没有“阶段适用图”时，系统按方法内容自动补齐：人物与关系检查 02/05，世界规则检查 03/05，结构、场次、动作与对白按实际检查 01/04/05。
- 02、03、05 使用参考方法时，须在当前管理目录的参考应用单子目录留存；新项目用“参考应用单”，旧项目用 reference-applications。应用单写实际落点，“已读取”不能冒充“已融合”。
- 用户本轮要求和最新已确认项目事实始终高于参考方法；冲突时标记待复核，不静默覆盖。
"@
}

$registryResult = "已保留现有成果登记"
if (-not (Test-Path -LiteralPath $projectFiles.Registry)) {
    Copy-FilmRuleTemplate -ProjectPath $resolvedProjectPath -Source $templates.Registry -Destination $projectFiles.Registry
    $registryResult = "已新增成果登记表"
} else {
    $legacyRegistry = Get-Content -LiteralPath $projectFiles.Registry -Raw -Encoding utf8
    if ($legacyRegistry -notmatch "登记表版本：V3\.(3|4)|登记表版本：V4") {
        $newRegistry = Convert-FilmProjectText -ProjectPath $resolvedProjectPath -Text (Get-Content -LiteralPath $templates.Registry -Raw -Encoding utf8)
        $migrationBlock = @"

## 旧版登记内容（待核对迁移）

升级脚本保留了下面的旧登记内容。继续创作前，Agent 必须结合实际文件列出迁移清单，让用户确认哪些版本仍是当前有效稿；不能自行猜测。

~~~text
$legacyRegistry
~~~
"@
        Set-Content -LiteralPath $projectFiles.Registry -Value ($newRegistry + $migrationBlock) -Encoding utf8
        $registryResult = "已建立新登记表并保留旧登记内容，等待确认迁移"
    }
}

$replaceState = -not (Test-Path -LiteralPath $projectFiles.State)
if ($replaceState) {
    Copy-FilmRuleTemplate -ProjectPath $resolvedProjectPath -Source $templates.State -Destination $projectFiles.State
}

$statusText = Get-Content -LiteralPath $projectFiles.Status -Raw -Encoding utf8
$legacyDurationBand = $statusText -match '时长档（长篇档A / 短视频档B）'
$fields = @(
    "01 作品定位：未选择 / A 院线经典 / B 电影节艺术 / C 流媒体类型 / D 自定义 / E 洋子快速出片",
    "成果版本登记：``00-项目管理/artifact-registry.md``",
    "成果机器状态：``00-项目管理/artifact-state.json``",
    "项目写入锁：空闲 / Agent名称与范围",
    "09 项目默认合作档位：未选择 / 快速出片 / 一起打磨 / 自由掌镜",
    "生成单元规划：未开始 / 待确认 / 已确认（文件版本：）",
    "分镜图绑定状态：未开始 / 缺图 / 已绑定 / 对应关系待确认",
    "场景空间图：未开始 / 已建立",
    "视觉连续性质检：未开始 / 通过 / 有动机换轴 / 证据不足 / 疑似无过渡跳轴"
)
$fields = @($fields | ForEach-Object { Convert-FilmProjectText -ProjectPath $resolvedProjectPath -Text $_ })
$managedLabels = @($fields | ForEach-Object { $_.Split('：')[0] }) + "时长预算来源"
$seenLabels = @{}
$headerSeen = $false
$normalizedLines = foreach ($rawLine in ($statusText -split "`r?`n")) {
    $line = $rawLine -replace '^09 合作档位：', '09 项目默认合作档位：'
    if ($line -eq "## V4 版本状态") {
        if ($headerSeen) { continue }
        $headerSeen = $true
    }
    $label = $managedLabels | Where-Object { $line.StartsWith("$_：") } | Select-Object -First 1
    if ($label) {
        if ($seenLabels.ContainsKey($label)) { continue }
        $seenLabels[$label] = $true
    }
    $line
}
$normalizedStatus = ($normalizedLines -join "`r`n").TrimEnd() + "`r`n"
$missing = $fields | Where-Object { -not $seenLabels.ContainsKey($_.Split('：')[0]) }
if ($missing.Count -gt 0) {
    $statusHeader = if ($headerSeen) { "" } else { "`r`n## V4 版本状态`r`n" }
    $normalizedStatus += $statusHeader + ($missing -join "`r`n") + "`r`n"
}
$timingLine = (Get-Content -LiteralPath $templates.Status -Encoding utf8 | Where-Object { $_ -like "时长预算来源：*" } | Select-Object -First 1)
if ($timingLine) {
    $timingLine = Convert-FilmProjectText -ProjectPath $resolvedProjectPath -Text $timingLine
    if ($normalizedStatus -match "(?m)^时长预算来源：.*$") {
        $normalizedStatus = [regex]::Replace($normalizedStatus, "(?m)^时长预算来源：.*$", $timingLine)
    } else {
        $normalizedStatus += $timingLine + "`r`n"
    }
}
if ($legacyDurationBand -and $normalizedStatus -notmatch '旧时长档：') {
    $normalizedStatus += "`r`n旧时长档：历史记录仅供时长估算，不决定 06 故事或留存审查`r`n发布目标：待核对旧项目已确认记录`r`n06 审查侧重：待核对发布目标（故事 / 留存）`r`n"
}
Set-Content -LiteralPath $projectFiles.Status -Value $normalizedStatus -Encoding utf8

New-Item -ItemType Directory -Path (Join-Path $resolvedProjectPath (Convert-FilmProjectText -ProjectPath $resolvedProjectPath -Text "09-镜头与视频提示词/镜头规划")) -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $resolvedProjectPath (Convert-FilmProjectText -ProjectPath $resolvedProjectPath -Text "09-镜头与视频提示词/视频提示词")) -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $resolvedProjectPath (Convert-FilmProjectText -ProjectPath $resolvedProjectPath -Text "00-项目管理/参考应用单")) -Force | Out-Null

$logPath = Join-Path $projectControlPath "rule-upgrade-log.md"
@"
# 规则升级记录

升级时间：$(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
升级内容：V4 项目规则、01 作品定位 E、09 三档导演合作与生成单元、MD 知识库路由兼容、04预算到05成稿再到08表演和09镜头的时长复核链、逐镜参考图绑定、空间轴线图、视觉连续性质检与成果版本守卫；保留现有 3.3/3.4 机器状态协议
已备份：$backupPath
成果登记：$registryResult
项目状态：$statusResult
未修改：故事、角色、剧本、资产、表演、镜头、提示词和历史版本
"@ | Set-Content -LiteralPath $logPath -Encoding utf8

Write-Output "旧电影工程规则升级完成：$resolvedProjectPath"
Write-Output "规则备份位置：$backupPath"
Write-Output $registryResult
Write-Output "未修改：所有创作成果与项目历史"
