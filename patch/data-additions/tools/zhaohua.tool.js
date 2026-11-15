/*! toonflowTool:{"name":"zhaohua","version":"0.1.0","displayName":"造化鼎","description":"调用本机造化鼎 CLI，对技能做体检、审计、验证与打包，并读取它留下的证据。","prompt":"需要判断某个技能是否合规、是否可参与评审、或要读取造化鼎留下的审计/评估证据时，使用 zhaohua。所有操作都在本机执行造化鼎 CLI，不访问网络。audit 与 inspect 只读；verify 的 evolve 会落盘，需要开启「允许写回」。","readme":"# 造化鼎\n\n把 `zhaohua` CLI（`core/bin/zhaohua.mjs`）接进工作台，让 agent 能对技能做体检与治理。\n\n| action | 用途 | 落盘 |\n| --- | --- | --- |\n| `status` | 检查造化鼎目录、CLI、产品定义是否就位 | 否 |\n| `inspect` | 只读体检：这份技能被机器读成了什么 | 否 |\n| `audit` | R01–R10 作者规则审计 | 否 |\n| `verify` | 按产品定义审计全部受管技能 | 仅 evolve 时 |\n\n`path` 传技能目录或技能父目录；`verify` 用 `product` 指定产品定义文件，留空则取 `<造化鼎目录>/zhaohua.product.json`。\n\n审计规则管的是「技能作为工程件的质量」——名字、触发器、负边界、引用闭环、行数、决策树、自足性；它不判断内容是否更懂电影，后者要靠 eval 任务集。","components":[],"author":"造化乾坤鼎","github":"","configRules":[{"type":"input","field":"zhaohuaDir","title":"造化鼎目录","value":"D:\\造化鼎","info":"包含 core/bin/zhaohua.mjs 的仓库根目录。"},{"type":"input","field":"productFile","title":"产品定义","value":"","info":"留空时使用 <造化鼎目录>/zhaohua.product.json。"},{"type":"input","field":"modelApiKey","title":"模型 Key","value":"","props":{"type":"password","showPassword":true,"autocomplete":"off"},"info":"造化鼎融合/评估用（QKD_MODEL_API_KEY），只在执行子进程时注入环境变量，不落盘。"},{"type":"switch","field":"allowWrite","title":"允许写回","value":false,"info":"允许 verify --evolve 这类会修改技能文件的操作。"},{"type":"input","field":"runtimeExe","title":"运行时","value":"","info":"留空自动使用当前运行时；也可填 node.exe 的绝对路径。"}]} */
// @bun
import { z } from "toonflow:tool-zod";

const configSchema = z
  .object({
    zhaohuaDir: z.string().trim().default("D:\\造化鼎"),
    productFile: z.string().trim().default(""),
    runtimeExe: z.string().trim().default(""),
    modelApiKey: z.string().default(""),
    allowWrite: z.boolean().default(false),
    timeoutMs: z.number().int().min(1000).max(600000).default(180000),
  })
  .strict();

const argsSchema = z
  .object({
    action: z
      .enum(["status", "inspect", "audit", "verify"])
      .describe("status 检查环境；inspect/audit 只读体检；verify 按产品定义整体验证"),
    path: z.string().trim().max(4096).optional().describe("inspect/audit 必填：技能目录或技能父目录的绝对路径"),
    product: z.string().trim().max(4096).optional().describe("verify 可选：产品定义 product.json 的绝对路径，留空用默认值"),
    evolve: z.boolean().default(false).describe("verify 专用：先做确定性修复再复审，需要开启「允许写回」"),
    maxChars: z.number().int().min(400).max(40000).default(6000).describe("返回给模型的正文上限"),
  })
  .strict();

const parameters = z.toJSONSchema(argsSchema, { io: "input", target: "draft-07" });

function joinPath(dir, name) {
  return `${String(dir || "").replace(/[\\/]+$/, "")}\\${name}`;
}

function resolveRuntime(config) {
  if (config.runtimeExe) return config.runtimeExe;
  const execPath = typeof process !== "undefined" && process && process.execPath ? process.execPath : "";
  return execPath || "node";
}

function buildArgv(config, args) {
  const cli = joinPath(config.zhaohuaDir, "core\\bin\\zhaohua.mjs");
  const product =
    args.product || (config.productFile ? config.productFile : joinPath(config.zhaohuaDir, "zhaohua.product.json"));
  const argv = [resolveRuntime(config), cli];

  if (args.action === "status") {
    argv.push("--help");
    return { argv, cli };
  }
  if (!args.path) throw new Error(`${args.action} 需要 path（技能目录或技能父目录的绝对路径）`);
  if (args.action === "verify") {
    argv.push("verify", product);
    if (args.evolve) argv.push("--evolve");
  } else {
    argv.push(args.action, args.path);
  }
  return { argv, cli, product };
}

async function runCli(argv, cwd, timeoutMs, modelApiKey) {
  if (typeof Bun === "undefined" || typeof Bun.spawn !== "function") {
    throw new Error(`当前运行时没有 Bun.spawn，无法执行造化鼎 CLI。可在项目目录手动运行：\n${argv.join(" ")}`);
  }
  const started = Date.now();
  const key = String(modelApiKey || "").trim();
  const env = {
    ...(typeof process !== "undefined" && process.env ? process.env : {}),
    NO_COLOR: "1",
    FORCE_COLOR: "0",
  };
  if (key) env.QKD_MODEL_API_KEY = key;
  const proc = Bun.spawn(argv, {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    env,
  });

  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      try {
        proc.kill();
      } catch {}
      reject(new Error(`造化鼎命令超时（${timeoutMs} ms）：${argv.join(" ")}`));
    }, timeoutMs);
  });

  const collected = (async () => {
    const [out, err, code] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    return { out, err, code };
  })();

  try {
    const { out, err, code } = await Promise.race([collected, timeout]);
    return { out, err, code, durationMs: Date.now() - started };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function clip(text, maxChars) {
  if (text.length <= maxChars) return { text, truncated: false };
  return {
    text: `${text.slice(0, maxChars)}\n\n……（已截断，原文 ${text.length} 字，可调大 maxChars 或缩小范围）`,
    truncated: true,
  };
}

function makeTool(config) {
  const cli = joinPath(config.zhaohuaDir, "core\\bin\\zhaohua.mjs");

  return {
    name: "zhaohua",
    label: "造化鼎",
    description:
      "调用本机造化鼎 CLI 对技能做体检与治理：status 检查环境，inspect 看这份技能被机器读成了什么，audit 跑 R01–R10 作者规则，verify 按产品定义整体验证。只读优先，写回需显式开启。",
    promptSnippet: "体检技能是否合规、能否参与评审、引用是否闭环时，用 zhaohua。",
    promptGuidelines: [
      "先跑 status 确认造化鼎目录与 CLI 就位，再对具体技能跑 inspect 或 audit。",
      "audit 的 R06/R10 报「引用文件不存在 / 越出技能目录」时，先确认该引用是不是跨技能共享资料，不要直接改文件。",
      "verify 的 evolve 会写回确定性修复，只有用户明确要求修复时才用。",
    ],
    parameters,

    async execute(id, rawArgs, signal) {
      const args = argsSchema.parse(rawArgs);

      if (args.action !== "status" && args.evolve && !config.allowWrite) {
        return {
          content: [{ type: "text", text: "已拒绝：verify --evolve 会修改技能文件，需要先在工具配置里开启「允许写回」。" }],
          details: { action: args.action, blocked: "allowWrite" },
        };
      }

      const { argv, product } = buildArgv(config, args);
      const cwd = config.zhaohuaDir || process.cwd();
      const target = args.action === "verify" ? product : args.path;
      const { out, err, code, durationMs } = await runCli(argv, cwd, config.timeoutMs, config.modelApiKey);
      const body = [out.trim(), err.trim()].filter(Boolean).join("\n");
      const clipped = clip(body || "（命令没有输出）", args.maxChars);
      const header =
        args.action === "status"
          ? `造化鼎 CLI：${cli}\n运行时：${resolveRuntime(config)}\n工作目录：${cwd}\n退出码 ${code}`
          : `$ zhaohua ${args.action} ${target}\n退出码 ${code} · ${durationMs} ms`;

      return {
        content: [{ type: "text", text: `${header}\n\n${clipped.text}` }],
        details: {
          action: args.action,
          argv,
          exitCode: code,
          durationMs,
          truncated: clipped.truncated,
          ok: code === 0,
        },
      };
    },
  };
}

const plugin = {
  validateConfig: (raw) => configSchema.parse(raw ?? {}),
  createTools({ config }) {
    return [makeTool(configSchema.parse(config ?? {}))];
  },
};

export default plugin;
