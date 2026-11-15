from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Optional

from project_paths import control_directory, resolve_path


SCHEMA_VERSION = "3.4"
SUPPORTED_SCHEMA_VERSIONS = {"3.3", "3.4"}


def project_path(value: str) -> Path:
    root = Path(value).expanduser().resolve()
    control_directory(root)
    return root


def state_path(root: Path) -> Path:
    return control_directory(root) / "artifact-state.json"


def registry_path(root: Path) -> Path:
    return control_directory(root) / "artifact-registry.md"


def normalize_artifact_path(root: Path, value: str) -> str:
    return resolve_path(root, value).relative_to(root).as_posix()


def atomic_write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with NamedTemporaryFile("w", encoding="utf-8", newline="\n", delete=False, dir=path.parent) as handle:
        handle.write(content)
        temporary = Path(handle.name)
    try:
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def load_state(root: Path) -> dict:
    path = state_path(root)
    if not path.exists():
        return {"schema_version": SCHEMA_VERSION, "artifacts": [], "current": {}}
    data = json.loads(path.read_text(encoding="utf-8-sig"))
    if data.get("schema_version") not in SUPPORTED_SCHEMA_VERSIONS:
        raise ValueError("成果状态文件不是 V3.3 或 V3.4，请先升级当前电影工程规则。")
    data.setdefault("artifacts", [])
    data.setdefault("current", {})
    return data


def save_state(root: Path, data: dict) -> None:
    snapshots = {target: target.read_bytes() if target.exists() else None
                 for target in (state_path(root), registry_path(root))}
    try:
        atomic_write_text(state_path(root), json.dumps(data, ensure_ascii=False, indent=2) + "\n")
        render_registry(root, data)
    except BaseException:
        for target, previous in snapshots.items():
            if previous is None:
                target.unlink(missing_ok=True)
            elif not target.exists() or target.read_bytes() != previous:
                atomic_write_text(target, previous.decode("utf-8"))
        raise


def artifact_key(kind: str, scope: str, model: str) -> str:
    return "::".join((kind.strip(), scope.strip(), model.strip()))


def record_for_path(data: dict, path: str) -> Optional[dict]:
    return next((item for item in data["artifacts"] if item["path"] == path), None)


def verify_content(root: Path, record: dict) -> None:
    path = resolve_path(root, record["path"])
    if not path.is_file():
        raise FileNotFoundError(f"成果文件已缺失：{record['path']}")
    expected = record.get("sha256")
    if expected and hashlib.sha256(path.read_bytes()).hexdigest() != expected:
        raise ValueError(f"成果原件被原地改动，请恢复原件并另存新版本：{record['path']}")


def render_registry(root: Path, data: dict) -> None:
    lines = [
        "# 项目成果版本登记表",
        "",
        "登记表版本：V4（机器状态协议兼容 3.3/3.4）",
        "",
        "本文件是人可读总表；`artifact-state.json` 是同一登记的机器状态。聊天只负责讨论，正式执行以这里登记的最新已确认为准。",
        "",
        "| 成果 | 范围 | 当前草稿／结论 | 最新已确认 | 状态 | 直接依据 | 影响范围 |",
        "|---|---|---|---|---|---|---|",
    ]
    if not data["current"]:
        lines.append("| 无 | 全项目 | 无 | 无 | 未开始 | 无 | 无 |")
    else:
        for key in sorted(data["current"]):
            current = data["current"][key]
            kind, scope, model = key.split("::", 2)
            label = kind if not model else f"{kind} / {model}"
            draft = current.get("draft") or current.get("report") or "无"
            confirmed = current.get("confirmed") or "无"
            selected = record_for_path(data, draft) or record_for_path(data, confirmed) or {}
            dependencies = "、".join(selected.get("depends_on", [])) or "无"
            affected = "、".join(selected.get("affected_shots", [])) or "无"
            status = current.get("status", "未开始")
            review = selected.get("review", {})
            outcome = {"passed": "通过，无需改稿处置", "revision-required": "需要修订，核对原授权", "uncertain": "证据不足，待核对"}.get(review.get("outcome"))
            if outcome:
                status += "；" + outcome
            lines.append(
                f"| {label} | {scope} | `{draft}` | `{confirmed}` | {status} | {dependencies} | {affected} |"
            )
    lines.extend(
        [
            "",
            "## 固定规则",
            "",
            "1. 剧情与制作成果状态：`草稿待确认`、`已确认-当前`、`历史已替代`、`已过期-禁止使用`、`缺文件-阻断`；06 报告另用 `已完成-结论` 或 `已作废（不合格）`，结论不是改稿授权。通过且无未解决必改病灶时关闭本轮修订，不重复询问授权，也不自动进入07。",
            "2. 同阶段继续修改时读取当前草稿与最新已确认；跨阶段只读取最新已确认。",
            "3. 新草稿确认前不影响旧确认稿。新版本确认后，依赖旧确认稿的下游自动变为“已过期-禁止使用”。",
            "4. 09 按场次登记镜头清单、生成单元、空间图、分镜图绑定、视觉连续性质检与各模型提示词；提示词须直接依赖已确认生成单元，按任务素材方式登记真实职责，不强制每镜首帧图。",
            "5. 多个 Agent 不得同时写同一项目。写入前获取 `project-edit-lock.json`，完成后释放。",
            "6. 文件不存在、依赖过期或版本对不上时停止，不能用聊天印象补齐。",
            "",
        ]
    )
    atomic_write_text(registry_path(root), "\n".join(lines))


def command_next_version(args: argparse.Namespace) -> None:
    directory = Path(args.directory).expanduser().resolve()
    directory.mkdir(parents=True, exist_ok=True)
    pattern = re.compile(rf"^{re.escape(args.stem)}-v(\d+)\.{re.escape(args.extension)}$")
    versions = [int(match.group(1)) for path in directory.iterdir() if path.is_file() and (match := pattern.match(path.name))]
    print(directory / f"{args.stem}-v{max(versions, default=0) + 1:03d}.{args.extension}")


def verify_dependency_contract(data: dict, relative: str, kind: str, scope: str, model: str,
                               dependencies: list[str]) -> None:
    records = [record_for_path(data, path) for path in dependencies]
    records = [record for record in records if record is not None]
    key = artifact_key(kind, scope, model)
    if any(artifact_key(record["kind"], record["scope"], record["model"]) == key for record in records):
        raise ValueError("新版本不能把自己的旧版本登记为上游依赖；旧稿只作历史比较依据。")
    filename = Path(relative).name
    units = re.match(r"generation-units-(seedance-2[.]5|seedance-2[.]0|minimax-h3)-v\d+[.]md$", filename)
    prompt = re.match(r"(seedance-2[.]5|seedance-2[.]0|minimax-h3)-v\d+[.]md$", filename)
    prompt = prompt if any(part in {"06_prompts", "视频提示词"} for part in Path(relative).parts) else None
    if units or prompt:
        expected_model = (units or prompt).group(1)
        if model and model != expected_model:
            raise ValueError("成果文件名与登记的模型不一致。")
        prefix = "shot-plan-v" if units else f"generation-units-{expected_model}-v"
        if not any(Path(record["path"]).name.startswith(prefix) and record["scope"] == scope
                   and (not record["model"] or record["model"] == expected_model) for record in records):
            raise ValueError("生成单元必须直接依赖同场镜头清单；提示词必须直接依赖同场、同模型生成单元。")
    if filename.startswith(("director-plan-v", "shot-plan-v", "scene-timing-v")):
        if not any(str(record["kind"]).strip().startswith("05") or
                   (record.get("origin") == "外部提供-已确认" and
                    Path(record["path"]).parts[0] in {"00-原始资料", "00_inbox"}) for record in records):
            raise ValueError("导演方案、镜头清单或时长缺少直接登记的权威剧本／作者原稿依据。")


def command_register_draft(args: argparse.Namespace, status: str = "草稿待确认", review: Optional[dict] = None) -> None:
    root = project_path(args.project)
    data = load_state(root)
    relative = normalize_artifact_path(root, args.path)
    if not (root / relative).is_file():
        raise FileNotFoundError(f"必须先成功写入草稿文件，再登记：{root / relative}")
    dependencies = [normalize_artifact_path(root, value) for value in args.depends_on]
    for dependency in dependencies:
        dependency_record = record_for_path(data, dependency)
        if dependency_record is None:
            raise ValueError(f"依赖尚未登记：{dependency}")
        if dependency_record.get("status") != "已确认-当前":
            raise ValueError(f"依赖不是当前确认版本：{dependency} / {dependency_record.get('status')}")
        verify_content(root, dependency_record)
    verify_dependency_contract(data, relative, args.kind, args.scope, args.model, dependencies)
    key = artifact_key(args.kind, args.scope, args.model)
    record = record_for_path(data, relative)
    if record is not None:
        raise ValueError(f"该成果路径已登记，修改必须另存下一个版本，不能覆盖：{relative}")
    payload = {
        "kind": args.kind,
        "scope": args.scope,
        "model": args.model,
        "path": relative,
        "status": status,
        "depends_on": dependencies,
        "affected_shots": args.affected_shot,
        "created_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "sha256": hashlib.sha256((root / relative).read_bytes()).hexdigest(),
    }
    if review is not None:
        payload["review"] = review
    if record is None:
        data["artifacts"].append(payload)
    else:
        record.update(payload)
    current = data["current"].setdefault(key, {"draft": None, "confirmed": None, "status": "未开始"})
    if status == "已完成-结论":
        current.update({"draft": None, "confirmed": None, "report": relative})
    else:
        current["draft"] = relative
    current["status"] = status
    save_state(root, data)
    print(f"已登记草稿：{relative}")


def cascade_stale(data: dict, replaced_path: str) -> list[str]:
    queue = [replaced_path]
    stale_paths: list[str] = []
    while queue:
        dependency = queue.pop(0)
        for record in data["artifacts"]:
            if record["status"] in {"已过期-禁止使用", "历史已替代"}:
                continue
            if dependency in record.get("depends_on", []):
                record["status"] = "已过期-禁止使用"
                record["stale_reason"] = f"上游已替换：{dependency}"
                stale_paths.append(record["path"])
                queue.append(record["path"])
    for current in data["current"].values():
        if current.get("draft") in stale_paths or current.get("confirmed") in stale_paths:
            current["status"] = "已过期-禁止使用"
    return stale_paths


def command_register_source(args: argparse.Namespace) -> None:
    command_register_draft(args)
    root = project_path(args.project)
    data = load_state(root)
    record = record_for_path(data, normalize_artifact_path(root, args.path))
    record["origin"] = "外部提供-已确认"
    save_state(root, data)
    command_confirm(args)


def command_register_conclusion(args: argparse.Namespace) -> None:
    blocking = list(dict.fromkeys(value.strip() for value in args.blocking_issue if value.strip()))
    resolved = list(dict.fromkeys(value.strip() for value in args.resolved_issue if value.strip()))
    if args.outcome == "passed" and blocking:
        raise ValueError("通过的报告不能同时登记未解决必改病灶。")
    if args.outcome == "revision-required" and not blocking:
        raise ValueError("需要回退的报告必须列明未解决病灶。")
    if set(blocking) & set(resolved):
        raise ValueError("同一病灶不能同时标为未解决和已解决。")
    review = {"outcome": args.outcome or "unclassified", "blocking_issues": blocking,
              "resolved_issues": resolved, "authorization_ref": args.authorization_ref}
    root = project_path(args.project)
    data = load_state(root)
    relative = normalize_artifact_path(root, args.path)
    record = record_for_path(data, relative)
    dependencies = record.get("depends_on", []) if record else [normalize_artifact_path(root, value) for value in args.depends_on]
    review["reviewed_artifacts"] = [{"path": path, "sha256": record_for_path(data, path).get("sha256")}
                                  for path in dependencies if record_for_path(data, path)]
    if record is not None:
        key = artifact_key(args.kind, args.scope, args.model)
        if (record.get("status") != "已完成-结论" or data["current"].get(key, {}).get("report") != relative
                or artifact_key(record["kind"], record["scope"], record["model"]) != key):
            raise ValueError("只能补记当前已完成报告的结构化结论，不能复活过期报告。")
        verify_content(root, record)
        for path in dependencies:
            dependency = record_for_path(data, path)
            if not dependency or dependency.get("status") != "已确认-当前":
                raise ValueError(f"报告依据不是当前确认版：{path}")
            verify_content(root, dependency)
        if record.get("review") != review:
            record["review"] = review
            save_state(root, data)
        print(f"已同步当前报告结论，未改报告正文或原稿：{relative}")
        return
    command_register_draft(args, "已完成-结论", review)
    print(f"已登记诊断结论，未授权修改原稿：{args.path}")


def confirmation_metadata(content: str, note: str = "") -> tuple[str, str]:
    updated = []
    body = []
    header = True
    card = False
    fenced = False
    note_written = False
    for index, line in enumerate(content.splitlines(keepends=True)):
        text = line.rstrip("\r\n")
        ending = line[len(text):]
        if re.match(r"^\s*(```|~~~)", text):
            fenced = not fenced
            header = False
            card = False
        if not fenced and re.match(r"^【版本卡[^】]*】\s*$", text):
            card = True
            header = False
        elif re.match(r"^#{1,6}\s", text) and index > 0:
            card = False
            header = False
        if index >= 40 or re.match(r"^(?:第[一二三四五六七八九十\d]+集|\d+-\d+\s)", text):
            header = False
        field = re.match(r"^(\s*(?:[-*]\s+)?(?:\*\*)?(状态|确认边界|确认说明|超[^：:\r\n]{1,40}目标)(?:\*\*)?[：:]\s*)(.*)$", text)
        controlled = not fenced and (header or card) and field
        if controlled:
            label = field.group(2)
            if label == "状态":
                updated.append(field.group(1) + "已确认-当前" + (ending or ("\n" if note and not note_written else "")))
                if note and not note_written:
                    updated.append("确认说明：" + note + (ending or "\n"))
                    note_written = True
            elif label == "确认边界":
                updated.append(field.group(1) + "本版已由作者确认；旧稿保留历史，受影响下游按登记状态执行。" + ending)
            elif label.startswith("超"):
                value = re.sub(r"[；;]\s*(?:需作者确认.*|确认结果[：:].*)$", "", field.group(3))
                updated.append(field.group(1) + value + ("；确认结果：" + note if note else "") + ending if note else line)
            elif not note or note_written:
                if not note:
                    updated.append(line)
            continue
        body.append(line)
        updated.append(line)
    return "".join(updated), hashlib.sha256("".join(body).encode("utf-8")).hexdigest()


def save_confirmation(root: Path, data: dict, record: dict, note: str) -> None:
    path = resolve_path(root, record["path"])
    original = path.read_bytes()
    content, body_hash = confirmation_metadata(original.decode("utf-8"), note)
    snapshots = {target: target.read_bytes() if target.exists() else None
                 for target in (path, state_path(root), registry_path(root))}
    record["sha256"] = hashlib.sha256(content.encode("utf-8")).hexdigest()
    record["body_sha256"] = body_hash
    record["metadata_status_version"] = 2
    try:
        if content.encode("utf-8") != original:
            atomic_write_text(path, content)
        save_state(root, data)
    except BaseException:
        for target, previous in snapshots.items():
            if previous is None:
                target.unlink(missing_ok=True)
            elif not target.exists() or target.read_bytes() != previous:
                atomic_write_text(target, previous.decode("utf-8"))
        raise


def command_confirm(args: argparse.Namespace) -> None:
    root = project_path(args.project)
    data = load_state(root)
    key = artifact_key(args.kind, args.scope, args.model)
    current = data["current"].get(key)
    if current is None:
        raise ValueError("没有找到对应草稿登记。")
    target = normalize_artifact_path(root, args.path) if args.path else current.get("draft") or current.get("confirmed")
    if not target:
        raise ValueError("当前没有待确认草稿。")
    record = record_for_path(data, target)
    already_confirmed = bool(record and record.get("status") == "已确认-当前" and current.get("confirmed") == target)
    if record is None or not already_confirmed and record.get("status") != "草稿待确认":
        raise ValueError(f"目标不是待确认草稿：{target}")
    if artifact_key(record["kind"], record["scope"], record["model"]) != key:
        raise ValueError("不能把其他成果、场次或模型的草稿确认为当前成果。")
    verify_content(root, record)
    verify_dependency_contract(data, relative=target, kind=record["kind"], scope=record["scope"],
                               model=record["model"], dependencies=record.get("depends_on", []))
    for dependency in record.get("depends_on", []):
        dependency_record = record_for_path(data, dependency)
        if dependency_record is None or dependency_record.get("status") != "已确认-当前":
            status = dependency_record.get("status") if dependency_record else "未登记"
            raise ValueError(f"确认被阻断，依赖已变化：{dependency} / {status}")
        verify_content(root, dependency_record)
    note = args.confirmation_note or record.get("confirmation_note", "")
    content = resolve_path(root, target).read_bytes().decode("utf-8")
    synchronized, body_hash = confirmation_metadata(content, note)
    if (already_confirmed and record.get("metadata_status_version") and synchronized == content
            and record.get("body_sha256") == body_hash and note == record.get("confirmation_note", "")):
        print(f"本版已确认，无需重复操作：{target}")
        return
    old_confirmed = current.get("confirmed")
    if old_confirmed and old_confirmed != target:
        old_record = record_for_path(data, old_confirmed)
        if old_record and old_record.get("status") != "已过期-禁止使用":
            old_record["status"] = "历史已替代"
    record["status"] = "已确认-当前"
    if not already_confirmed:
        record["confirmed_at"] = datetime.now().astimezone().isoformat(timespec="seconds")
    if note:
        record["confirmation_note"] = note
    current["confirmed"] = target
    current["draft"] = None
    current["status"] = "已确认-当前"
    stale = cascade_stale(data, old_confirmed) if old_confirmed and old_confirmed != target else []
    save_confirmation(root, data, record, note)
    print(f"已确认：{target}")
    if stale:
        print("已自动标记过期：")
        for path in stale:
            print(f"- {path}")


def lock_path(root: Path) -> Path:
    return control_directory(root) / "project-edit-lock.json"


def command_acquire_lock(args: argparse.Namespace) -> None:
    root = project_path(args.project)
    path = lock_path(root)
    payload = {
        "owner": args.owner,
        "scope": args.scope,
        "created_at": datetime.now().astimezone().isoformat(timespec="seconds"),
    }
    try:
        descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL)
    except FileExistsError as error:
        existing = json.loads(path.read_text(encoding="utf-8"))
        raise RuntimeError(f"项目正由 {existing.get('owner', '其他 Agent')} 编辑：{existing.get('scope', '未注明范围')}") from error
    with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    print(f"已获取项目写入锁：{args.owner} / {args.scope}")


def command_release_lock(args: argparse.Namespace) -> None:
    root = project_path(args.project)
    path = lock_path(root)
    if not path.exists():
        print("项目当前没有写入锁。")
        return
    raw = path.read_bytes()
    expected = getattr(args, "expected_sha256", None)
    if expected and hashlib.sha256(raw).hexdigest() != expected:
        raise RuntimeError("编辑锁已经变化，未释放其他任务的新锁。")
    existing = json.loads(raw.decode("utf-8"))
    if existing.get("owner") != args.owner:
        raise RuntimeError(f"写入锁属于 {existing.get('owner')}，不能由 {args.owner} 释放。")
    path.unlink()
    print("已释放项目写入锁。")


def command_validate(args: argparse.Namespace) -> None:
    root = project_path(args.project)
    data = load_state(root)
    errors: list[str] = []
    stale: list[str] = []
    for record in data["artifacts"]:
        artifact = root / record["path"]
        if not artifact.is_file():
            errors.append(f"成果文件不存在：{record['path']}")
        else:
            try:
                verify_content(root, record)
                if record.get("status") == "已确认-当前" and record.get("metadata_status_version"):
                    content = artifact.read_bytes().decode("utf-8")
                    synchronized, body_hash = confirmation_metadata(content, record.get("confirmation_note", ""))
                    if synchronized != content or record.get("body_sha256") != body_hash:
                        errors.append(f"确认元数据与登记不一致：{record['path']}")
            except (OSError, ValueError) as error:
                errors.append(str(error))
        for dependency in record.get("depends_on", []):
            if not (root / dependency).is_file():
                errors.append(f"依赖文件不存在：{record['path']} -> {dependency}")
    for key, current in data["current"].items():
        confirmed = current.get("confirmed")
        if confirmed:
            record = record_for_path(data, confirmed)
            if record is None:
                errors.append(f"最新确认未登记：{key} -> {confirmed}")
            elif record.get("status") == "已过期-禁止使用":
                (stale if getattr(args, "allow_stale", False) else errors).append(f"最新确认已经过期：{key} -> {confirmed}")
    if errors:
        print("版本校验失败：")
        for error in errors:
            print(f"- {error}")
        raise SystemExit(2)
    print(f"版本校验通过：{len(data['artifacts'])} 份成果记录。")
    if stale:
        print("下游待复核，旧稿保留（不能作为当前制作依据）：")
        for item in stale:
            print(f"- {item}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="AI STUDIO 洋子 V4 成果版本守卫（兼容 3.3/3.4 机器状态）")
    subparsers = parser.add_subparsers(dest="command", required=True)

    next_version = subparsers.add_parser("next-version")
    next_version.add_argument("--directory", required=True)
    next_version.add_argument("--stem", required=True)
    next_version.add_argument("--extension", default="md")
    next_version.set_defaults(func=command_next_version)

    register = subparsers.add_parser("register-draft")
    register.add_argument("--project", required=True)
    register.add_argument("--kind", required=True)
    register.add_argument("--scope", default="全项目")
    register.add_argument("--model", default="")
    register.add_argument("--path", required=True)
    register.add_argument("--depends-on", action="append", default=[])
    register.add_argument("--affected-shot", action="append", default=[])
    register.set_defaults(func=command_register_draft)

    for name, handler, label in (
        ("register-source", command_register_source, "05 作者锁定原稿"),
        ("register-conclusion", command_register_conclusion, "06 剧本压力测试"),
    ):
        command = subparsers.add_parser(name)
        command.add_argument("--project", required=True)
        command.add_argument("--kind", default=label)
        command.add_argument("--scope", default="全项目")
        command.add_argument("--model", default="")
        command.add_argument("--path", required=True)
        command.add_argument("--depends-on", action="append", default=[])
        command.set_defaults(func=handler, affected_shot=[])
        if name == "register-conclusion":
            command.add_argument("--outcome", choices=("passed", "revision-required", "uncertain"))
            command.add_argument("--blocking-issue", action="append", default=[])
            command.add_argument("--resolved-issue", action="append", default=[])
            command.add_argument("--authorization-ref", default="")

    confirm = subparsers.add_parser("confirm")
    confirm.add_argument("--project", required=True)
    confirm.add_argument("--kind", required=True)
    confirm.add_argument("--scope", default="全项目")
    confirm.add_argument("--model", default="")
    confirm.add_argument("--path")
    confirm.add_argument("--confirmation-note", default="")
    confirm.set_defaults(func=command_confirm)

    acquire = subparsers.add_parser("acquire-lock")
    acquire.add_argument("--project", required=True)
    acquire.add_argument("--owner", required=True)
    acquire.add_argument("--scope", required=True)
    acquire.set_defaults(func=command_acquire_lock)

    release = subparsers.add_parser("release-lock")
    release.add_argument("--project", required=True)
    release.add_argument("--owner", required=True)
    release.add_argument("--expected-sha256")
    release.set_defaults(func=command_release_lock)

    validate = subparsers.add_parser("validate")
    validate.add_argument("--project", required=True)
    validate.add_argument("--allow-stale", action="store_true", help="用于修订过程：允许登记中的旧下游待复核；仍检查所有文件、哈希和确认元数据。")
    validate.set_defaults(func=command_validate)
    return parser


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    args = build_parser().parse_args()
    try:
        args.func(args)
    except (OSError, ValueError, RuntimeError, json.JSONDecodeError) as error:
        print(f"错误：{error}", file=sys.stderr)
        raise SystemExit(1) from error


if __name__ == "__main__":
    main()
