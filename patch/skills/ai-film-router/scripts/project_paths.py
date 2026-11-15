from __future__ import annotations

import argparse
import json
from pathlib import Path


STAGES = {
    "01": ("概念锚定", "Story Concept", "01-概念锚定", "01_story"),
    "02": ("角色圣经", "Character Bible", "02-角色圣经", "01_story"),
    "03": ("世界观", "Worldbuilding", "03-世界观", "01_story"),
    "04": ("分场大纲", "Scene Outline", "04-分场大纲", "01_story"),
    "05": ("剧本深度融合", "Screenplay", "05-正式剧本", "02_script"),
    "06": ("剧本压力测试", "Script Stress Test", "06-剧本压力测试", "02_script"),
    "07": ("Lira 图像资产", "Lira Visual Assets", "07-图像资产", "03_assets"),
    "08": ("ACTING 表演设计", "ACTING Performance Design", "08-表演设计", "04_performance"),
    "09": ("CINEDANCE 镜头与视频提示词", "CINEDANCE Shot Planning & Video Prompts", "09-镜头与视频提示词", "05_shots"),
}

PATH_PAIRS = (
    ("00-项目管理/参考应用单", "00_project/reference-applications"),
    ("00-项目管理/知识卡", "00_project/knowledge-cards"),
    ("00-项目管理", "00_project"),
    ("00-原始资料", "00_inbox"),
    ("01-概念锚定", "01_story"),
    ("02-角色圣经", "01_story"),
    ("03-世界观", "01_story"),
    ("04-分场大纲", "01_story"),
    ("05-正式剧本", "02_script"),
    ("06-剧本压力测试", "02_script"),
    ("07-图像资产", "03_assets"),
    ("08-表演设计", "04_performance"),
    ("09-镜头与视频提示词/镜头规划", "05_shots"),
    ("09-镜头与视频提示词/视频提示词", "06_prompts"),
    ("10-生成素材", "07_generations"),
    ("11-交付成片", "08_delivery"),
)


def control_directory(root: Path) -> Path:
    root = root.expanduser().resolve()
    candidates = [root / name for name in ("00-项目管理", "00_project") if (root / name).is_dir()]
    if len(candidates) != 1:
        raise ValueError(f"项目须有且只有一套管理目录（00-项目管理 或 00_project）：{root}")
    return candidates[0]


def is_chinese_project(root: Path) -> bool:
    return control_directory(root).name == "00-项目管理"


def project_config_path(start: Path) -> Path | None:
    start = start.resolve()
    for candidate in (start, *start.parents):
        if any((candidate / name).is_dir() for name in ("00-项目管理", "00_project")):
            return control_directory(candidate) / "knowledge-base.json"
    return None


def resolve_path(root: Path, value: str) -> Path:
    root = root.expanduser().resolve()
    chinese = is_chinese_project(root)
    requested = Path(value.replace("\\", "/")).expanduser()
    absolute = requested.is_absolute()
    candidate = requested if absolute else root / requested
    resolved = candidate.resolve()
    try:
        relative = resolved.relative_to(root).as_posix()
    except ValueError as error:
        raise ValueError(f"路径必须在项目内：{value}") from error
    if absolute or resolved.exists():
        return resolved
    if chinese:
        if relative.startswith("01_story/"):
            filename = relative.split("/", 1)[1]
            matches = {
                "synopsis": "01", "characters": "02",
                "worldbuilding": "03", "treatment": "04",
            }
            stage = next((number for stem, number in matches.items() if filename.startswith(stem)), None)
            if stage is None:
                raise ValueError("旧 01_story 路径无法确定阶段，请使用中文阶段目录。")
            relative = STAGES[stage][2] + "/" + filename
        elif relative.startswith("02_script/stress-test"):
            relative = relative.replace("02_script", STAGES["06"][2], 1)
        else:
            for current, legacy in PATH_PAIRS:
                if legacy == "01_story":
                    continue
                if relative == legacy or relative.startswith(legacy + "/"):
                    relative = current + relative[len(legacy):]
                    break
    else:
        for current, legacy in PATH_PAIRS:
            if relative == current or relative.startswith(current + "/"):
                relative = legacy + relative[len(current):]
                break
    parts = relative.split("/")
    names = {"frames": "镜头参考图", "keyframes": "关键帧"} if chinese else {"镜头参考图": "frames", "关键帧": "keyframes"}
    relative = "/".join(names.get(part, part) for part in parts[:-1]) + "/" + parts[-1] if len(parts) > 1 else relative
    result = (root / relative).resolve()
    try:
        result.relative_to(root)
    except ValueError as error:
        raise ValueError(f"路径必须在项目内：{value}") from error
    return result


def stage_directory(root: Path, stage: str) -> Path:
    return root.resolve() / STAGES[stage][2 if is_chinese_project(root) else 3]


def main() -> None:
    parser = argparse.ArgumentParser(description="九阶段目录解析；不移动或写入项目文件")
    parser.add_argument("--project", required=True)
    selector = parser.add_mutually_exclusive_group(required=True)
    selector.add_argument("--stage", choices=STAGES)
    selector.add_argument("--resolve")
    selector.add_argument("--menu", action="store_true")
    args = parser.parse_args()
    root = Path(args.project).expanduser().resolve()
    control_directory(root)
    if args.menu:
        print(json.dumps([
            {"stage": number, "中文": fields[0], "English": fields[1],
             "directory": str(stage_directory(root, number))}
            for number, fields in STAGES.items()
        ], ensure_ascii=False, indent=2))
    else:
        print(stage_directory(root, args.stage) if args.stage else resolve_path(root, args.resolve))


if __name__ == "__main__":
    main()
