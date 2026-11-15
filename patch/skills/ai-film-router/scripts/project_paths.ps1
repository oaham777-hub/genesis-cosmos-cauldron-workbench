function Get-FilmControlPath {
    param([string]$ProjectPath)
    $root = (Resolve-Path -LiteralPath $ProjectPath).Path
    $found = @(@("00-项目管理", "00_project") | ForEach-Object {
        $candidate = Join-Path $root $_
        if (Test-Path -LiteralPath $candidate -PathType Container) { $candidate }
    })
    if ($found.Count -ne 1) {
        throw "项目须有且只有一套管理目录（00-项目管理 或 00_project）：$root"
    }
    return $found[0]
}

function Convert-FilmProjectText {
    param([string]$ProjectPath, [string]$Text)
    $control = Get-FilmControlPath -ProjectPath $ProjectPath
    if ((Split-Path -Leaf $control) -eq "00-项目管理") { return $Text }
    $pairs = @(
        @("00-项目管理/参考应用单", "00_project/reference-applications"),
        @("00-项目管理/知识卡", "00_project/knowledge-cards"),
        @("00-项目管理", "00_project"), @("00-原始资料", "00_inbox"),
        @("01-概念锚定", "01_story"), @("02-角色圣经", "01_story"),
        @("03-世界观", "01_story"), @("04-分场大纲", "01_story"),
        @("05-正式剧本", "02_script"), @("06-剧本压力测试", "02_script"),
        @("07-图像资产", "03_assets"), @("08-表演设计", "04_performance"),
        @("09-镜头与视频提示词/镜头规划", "05_shots"),
        @("09-镜头与视频提示词/视频提示词", "06_prompts"),
        @("10-生成素材", "07_generations"), @("11-交付成片", "08_delivery"),
        @("/镜头参考图/", "/frames/"), @("/关键帧/", "/keyframes/")
    )
    foreach ($pair in $pairs) { $Text = $Text.Replace($pair[0], $pair[1]) }
    return $Text
}

function Copy-FilmRuleTemplate {
    param([string]$ProjectPath, [string]$Source, [string]$Destination)
    $text = Get-Content -LiteralPath $Source -Raw -Encoding utf8
    $text = Convert-FilmProjectText -ProjectPath $ProjectPath -Text $text
    [System.IO.File]::WriteAllText($Destination, $text, (New-Object System.Text.UTF8Encoding($false)))
}
