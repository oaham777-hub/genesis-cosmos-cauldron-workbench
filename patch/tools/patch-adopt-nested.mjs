// /adopt 支持 fuse-skill 的嵌套产物目录（fused\<name>\<name>\SKILL.md）
import { readFileSync, writeFileSync } from 'node:fs';

const F = 'D:\\造化乾坤鼎-工作台\\patch\\zhaohua-ui\\server.mjs';
let t = readFileSync(F, 'utf8');
if (t.includes('nested')) { console.log('已是目标态'); process.exit(0); }

const oldLine = "        const dir = FUSED_DIR + '\\\\' + name;\n        if (!existsSync(dir + '\\\\SKILL.md')) return reply({ error: '沙盒里没有这个产物：' + dir }, 404);";
if (!t.includes(oldLine)) { console.error('锚点未命中'); process.exit(1); }

const newLines = `        let dir = FUSED_DIR + '\\\\' + name;
        // fuse-skill 的产物会多一层同名目录（nested），这里两种都认
        if (!existsSync(dir + '\\\\SKILL.md') && existsSync(dir + '\\\\' + skill + '\\\\SKILL.md')) dir = dir + '\\\\' + skill;
        if (!existsSync(dir + '\\\\SKILL.md')) return reply({ error: '沙盒里没有这个产物：' + dir }, 404);`;

t = t.replace(oldLine, newLines);
writeFileSync(F, t, 'utf8');
console.log('/adopt 已支持嵌套目录');
