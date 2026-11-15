/*! toonflowTool:{"name":"deepseek","version":"0.1.0","displayName":"DeepSeek","description":"把 DeepSeek 接成工具：给融合起草、给技能描述起草、给判断做旁证。不替代画布模型，只补一个会写文字的助手。","prompt":"需要成段文字、起草、改写、判断理由时用 deepseek_chat；它不生成图片或视频。","readme":"## DeepSeek\n\n接 DeepSeek 开放平台（OpenAI 兼容协议）。默认 `https://api.deepseek.com`，默认模型 `deepseek-chat`。\n\n用途：\n- 技能描述起草（触发词 / 负边界）\n- 两版技能对比时先写一版差异说明\n- 造化鼎融合前的素材摘要\n\n不用于：图像/视频生成（用画布节点），也不是对话主模型（那是执行器的事）。","components":[],"author":"造化鼎","github":"","configRules":[{"type":"input","field":"apiKey","title":"API Key","value":"","props":{"type":"password","showPassword":true,"autocomplete":"off"},"info":"DeepSeek 开放平台的 key，只存在本机"},{"type":"input","field":"baseUrl","title":"请求地址","value":"https://api.deepseek.com","props":{"placeholder":"https://api.deepseek.com"}},{"type":"input","field":"model","title":"模型","value":"deepseek-chat","props":{"placeholder":"deepseek-chat / deepseek-reasoner"}},{"type":"input","field":"maxTokens","title":"单次最大输出 tokens","value":"2048"}]} */
// @bun
import { z } from "toonflow:tool-zod";

const configSchema = z
  .object({
    apiKey: z.string().default(""),
    baseUrl: z.string().default("https://api.deepseek.com"),
    model: z.string().default("deepseek-chat"),
    maxTokens: z.string().default("2048"),
  })
  .strict();

const argsSchema = z.object({
  prompt: z.string().min(1).describe("要 DeepSeek 处理的内容：问题、素材、或改写要求"),
  system: z.string().optional().describe("系统提示词，用于设定角色和输出格式"),
  temperature: z.number().min(0).max(2).optional().describe("默认 0.3，越低越稳"),
});

export default {
  validateConfig: (cfg) => configSchema.parse(cfg),

  createTools({ config }) {
    const cfg = configSchema.parse(config ?? {});
    const endpoint = () => `${(cfg.baseUrl || "https://api.deepseek.com").replace(/\/+$/, "")}/chat/completions`;

    const tools = [
      {
        name: "deepseek_chat",
        label: "DeepSeek 写作",
        description: "用 DeepSeek 起草或改写一段文字，返回纯文本。不生成图片或视频。",
        promptSnippet: "需要成段文字（描述、负边界、差异说明、摘要）时调用 deepseek_chat。",
        parameters: z.toJSONSchema(argsSchema, { io: "input", target: "draft-07" }),
        async execute(_id, rawArgs) {
          const args = argsSchema.parse(rawArgs ?? {});
          if (!cfg.apiKey) {
            throw new Error("还没有配置 DeepSeek API Key：打开「工具」→ DeepSeek → 填写 API Key。");
          }
          const body = {
            model: cfg.model || "deepseek-chat",
            messages: [
              ...(args.system ? [{ role: "system", content: args.system }] : []),
              { role: "user", content: args.prompt },
            ],
            temperature: args.temperature ?? 0.3,
            max_tokens: Number(cfg.maxTokens) > 0 ? Number(cfg.maxTokens) : 2048,
            stream: false,
          };
          const started = Date.now();
          const res = await fetch(endpoint(), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${cfg.apiKey}`,
            },
            body: JSON.stringify(body),
          });
          const text = await res.text();
          if (!res.ok) {
            throw new Error(`DeepSeek 请求失败：HTTP ${res.status} ${text.slice(0, 300)}`);
          }
          let data;
          try {
            data = JSON.parse(text);
          } catch {
            throw new Error(`DeepSeek 返回的不是 JSON：${text.slice(0, 200)}`);
          }
          const content = data?.choices?.[0]?.message?.content;
          if (typeof content !== "string" || !content.trim()) {
            throw new Error("DeepSeek 没有返回文本内容");
          }
          const usage = data?.usage ?? {};
          return {
            content: [{ type: "text", text: content.trim() }],
            details: {
              model: body.model,
              promptTokens: usage.prompt_tokens ?? null,
              completionTokens: usage.completion_tokens ?? null,
              durationMs: Date.now() - started,
            },
          };
        },
      },
    ];

    return tools;
  },
};
