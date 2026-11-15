from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
from pathlib import Path


def build_match_query(query: str, mode: str) -> str:
    terms = [term.strip() for term in query.split() if term.strip()]
    if len(terms) <= 1:
        return query
    operator = " AND " if mode == "all" else " OR "
    return operator.join(f'"{term.replace(chr(34), chr(34) * 2)}"' for term in terms)


from project_paths import project_config_path


def load_config(explicit: str | None) -> tuple[Path, dict[str, object]]:
    candidates = []
    if explicit:
        if not Path(explicit).is_file():
            raise FileNotFoundError(f"指定的知识库配置不存在，未回退到其他库：{explicit}")
        candidates.append(Path(explicit))
    skill_root = Path(__file__).resolve().parent.parent
    bridge_root = skill_root.parent / "film-knowledge-bridge"
    project_config = project_config_path(Path.cwd())
    if project_config is not None:
        candidates.append(project_config)
    environment = os.environ.get("AI_FILM_KNOWLEDGE_CONFIG")
    if environment:
        candidates.append(Path(environment))
    candidates.extend(
        [
            bridge_root / "knowledge-base.json",
            bridge_root / "references" / "knowledge-base.json",
        ]
    )
    for candidate in candidates:
        if candidate.exists():
            return candidate, json.loads(candidate.read_text(encoding="utf-8-sig"))
    raise FileNotFoundError("没有找到 knowledge-base.json，请在项目或环境变量中配置知识库。")


def search(database: Path, query: str, limit: int, path_contains: str | None, mode: str) -> list[dict[str, object]]:
    connection = sqlite3.connect(database)
    sql = (
        "SELECT chunks.name, documents.path, chunks.page, chunks.chunk_no, "
        "snippet(chunks, 5, '[', ']', '…', 28), bm25(chunks) "
        "FROM chunks JOIN documents ON documents.id = chunks.document_id "
        "WHERE chunks MATCH ?"
    )
    parameters: list[object] = [build_match_query(query, mode)]
    if path_contains:
        sql += " AND documents.path LIKE ?"
        parameters.append(f"%{path_contains}%")
    sql += " ORDER BY bm25(chunks) LIMIT ?"
    parameters.append(limit)
    rows = connection.execute(sql, parameters).fetchall()
    connection.close()
    return [
        {
            "name": row[0],
            "path": row[1],
            "page": row[2],
            "chunk": row[3],
            "snippet": row[4],
            "score": row[5],
        }
        for row in rows
    ]


def write_card(path: Path, stage: str, query: str, results: list[dict[str, object]]) -> None:
    lines = [
        f"# 本地知识卡｜{stage}",
        "",
        f"检索词：{query}",
        "状态：仅供当前阶段使用",
        "",
        "## 命中来源",
        "",
    ]
    if not results:
        lines.append("资料不足：本次检索没有命中。")
    for index, result in enumerate(results, start=1):
        lines.extend(
            [
                f"### {index}. {result['name']}",
                f"- 页码／定位：{result['page'] if result['page'] is not None else ('MD 章节／分节 ' + str(result['chapter']) if result.get('chapter') is not None else '无原页码，按正文片段定位')}",
                f"- 路径：`{result['path']}`",
                f"- 检索片段：{result['snippet']}",
                "- 可迁移结论：待当前专业 Skill 提炼；禁止复制具体人物、剧情链和长段对白。",
                "",
            ]
        )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--query", required=True)
    parser.add_argument("--stage", required=True)
    parser.add_argument("--limit", type=int, default=6)
    parser.add_argument("--path-contains")
    parser.add_argument("--mode", choices=("any", "all"), default="any")
    parser.add_argument("--config")
    parser.add_argument("--output")
    args = parser.parse_args()

    config_path, config = load_config(args.config)
    if config.get("mode") == "markdown":
        bridge_scripts = Path(__file__).resolve().parents[2] / "film-knowledge-bridge" / "scripts"
        sys.path.insert(0, str(bridge_scripts))
        from md_search import retrieve_markdown

        profile = {
            "queries": [{"lane": "reference", "text": args.query, "mode": args.mode,
                         "path_contains": args.path_contains}],
            "lane_limits": {"reference": args.limit},
        }
        items = retrieve_markdown(config, profile).get("reference", [])
        results = [
            {"name": item["name"], "path": item["path"], "page": item["page"], "chapter": item.get("chapter"),
             "chunk": item["chunk"], "snippet": item["snippet"], "score": item["score"]}
            for item in items
        ]
        database_label = "MD 正文（新索引可用时预筛）"
    else:
        database = Path(str(config["database"]))
        if not database.exists():
            raise FileNotFoundError(f"SQLite索引不存在：{database}")
        results = search(database, args.query, args.limit, args.path_contains, args.mode)
        database_label = str(database)
    if args.output:
        write_card(Path(args.output), args.stage, args.query, results)
    payload = {
        "stage": args.stage,
        "query": args.query,
        "config": str(config_path),
        "database": database_label,
        "results": results,
    }
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps(payload, ensure_ascii=False))


if __name__ == "__main__":
    main()
