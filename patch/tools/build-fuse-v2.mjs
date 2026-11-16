// 融合台 v2：整段重建 #v-fuse（小观象台 + 来源 / 动作 / 结果 三栏），并换掉 gap.js / ingest-ui.js
// 幂等：已含 FUSE_V2_MARK 则跳过；原 section 备份为 patch\_backup\fuse-v1-<stamp>.html
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ROOT = 'D:\\造化乾坤鼎-工作台';
const UI = join(ROOT, 'patch', 'zhaohua-ui');
const FILE = join(UI, 'index.html');
const MARK = '<!-- FUSE_V2 -->';

let html = readFileSync(FILE, 'utf8');
if (html.includes(MARK)) {
  console.log('已是融合台 v2，跳过');
  process.exit(0);
}

const startTag = '<section class="view" id="v-fuse">';
const i = html.indexOf(startTag);
if (i < 0) throw new Error('找不到 #v-fuse 起始');
// 找到与它配对的 </section>（内部不再嵌套 section）
const endTok = '</section>';
let j = html.indexOf(endTok, i);
if (j < 0) throw new Error('找不到 #v-fuse 结束');
const oldLen = j + endTok.length - i;

const backupDir = join(ROOT, 'patch', '_backup');
mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backup = join(backupDir, `fuse-v1-${stamp}.html`);
writeFileSync(backup, html.slice(i, i + oldLen), 'utf8');

const v2 = `${MARK}
<section class="view" id="v-fuse">

      <!-- 小观象台：一条会呼吸的横条 -->
      <div class="fz-strip">
        <canvas id="fz-canvas"></canvas>
        <div class="fz-hud">
          <div class="fz-hud-l">
            <span class="fz-dot" id="fz-dot"></span>
            <span id="fz-live">连桥中…</span>
            <span class="fz-sep">·</span>
            <span id="fz-seq">seq 0</span>
          </div>
          <div class="fz-hud-r" id="fz-hud-r">
            <span class="fz-mini">16 技能</span>
            <span class="fz-mini" id="fz-mini-in">已接入 0</span>
            <span class="fz-mini" id="fz-mini-src">来料 0</span>
            <button class="fz-open" id="fz-open">打开观象台 →</button>
          </div>
        </div>
      </div>

      <!-- 技能带：点一下就是"目标技能" -->
      <div class="fz-chips" id="fz-chips"><span class="fz-hint">正在读技能…</span></div>

      <div class="fz-grid">
        <!-- 左：来源 -->
        <aside class="fz-col">
          <div class="fz-col-h"><h4>来源</h4><span class="fz-count" id="fz-src-count">—</span></div>
          <input class="fz-q" id="fz-q" placeholder="按层或文件名过滤，例如 06-prompt / h3" />
          <div class="fz-list" id="fz-sources"><div class="fz-empty">正在读来料…</div></div>
          <details class="fz-add">
            <summary>从本机添加</summary>
            <div class="fz-add-body">
              <input id="fz-path" placeholder="D:\\某目录 或 单个文件 / .zip 路径" />
              <div class="fz-row">
                <input id="fz-pkg" placeholder="包名（留空取文件夹名）" />
                <button class="btn" id="fz-scan">扫描并判层</button>
              </div>
              <div class="fz-up">
                <label class="fz-fake">上传文件夹<input type="file" id="fz-up-dir" webkitdirectory multiple hidden /></label>
                <label class="fz-fake">上传文件<input type="file" id="fz-up-files" multiple hidden /></label>
                <label class="fz-fake">上传 zip<input type="file" id="fz-up-zip" accept=".zip" hidden /></label>
              </div>
              <div class="fz-scanout" id="fz-scanout"></div>
            </div>
          </details>
        </aside>

        <!-- 中：动作 -->
        <main class="fz-col fz-mid">
          <div class="fz-tabs" id="fz-tabs">
            <button data-tab="merge" class="on">合并两个技能</button>
            <button data-tab="gap">只补缺</button>
            <button data-tab="adopt">收编沙盒</button>
          </div>

          <div class="fz-pane on" id="fz-pane-merge">
            <div class="fz-note">把两份技能的正文合并成一份新技能；<b>create</b> 是确定性合并（秒级、可复现），<b>fuse-skill</b> 交给模型重写（约 1 分钟、计费、可能丢禁令）。产物落在沙盒，不动现有技能。</div>
            <div class="fz-form">
              <label>基准技能<select id="fz-a"></select></label>
              <label>并入技能<select id="fz-b"></select></label>
              <label>方式<select id="fz-mode"><option value="merge">merge（并成一份）</option><option value="absorb">absorb（吸收）</option><option value="compose">compose（组合）</option></select></label>
              <label>新技能名<input id="fz-name" placeholder="kebab-case，留空自动取" /></label>
            </div>
            <div class="fz-actions">
              <button class="btn gold" id="fz-create">合并 create（不调模型）</button>
              <button class="btn" id="fz-fuse">语义融合 fuse-skill（调模型）</button>
            </div>
            <div class="fz-outbox" id="fz-merge-out"></div>
          </div>

          <div class="fz-pane" id="fz-pane-gap">
            <div class="fz-note">只把目标技能里<b>还没有</b>的节补进去，不揉在一起。左边勾来料（可多份），点对比，再按节投放；投放后自动接线。</div>
            <div class="fz-form">
              <label>目标技能<select id="fz-target"></select></label>
              <label>落到文件名<input id="fz-as" placeholder="留空 = references/原文件名" /></label>
            </div>
            <div class="fz-actions">
              <button class="btn" id="fz-compare">对比所选来料</button>
              <button class="btn gold" id="fz-land" disabled>投放勾选的节</button>
              <span class="fz-pick" id="fz-pick-info">未选来料</span>
            </div>
            <div class="fz-gapbar" id="fz-gapbar"></div>
            <div class="fz-gaptable" id="fz-gaptable"></div>
          </div>

          <div class="fz-pane" id="fz-pane-adopt">
            <div class="fz-note">把沙盒里的融合产物<b>收编</b>进某个技能：写进 patch\\skills（唯一真相），自动接线、记账本；先过禁令核对，丢得多会被拦。</div>
            <div class="fz-form">
              <label>沙盒产物<select id="fz-sandbox"></select></label>
              <label>收编到<select id="fz-adopt-to"></select></label>
            </div>
            <div class="fz-actions">
              <button class="btn gold" id="fz-adopt">收编进鼎</button>
              <button class="btn" id="fz-sandbox-refresh">刷新沙盒列表</button>
            </div>
            <div class="fz-outbox" id="fz-adopt-out"></div>
          </div>
        </main>

        <!-- 右：结果 -->
        <aside class="fz-col">
          <div class="fz-col-h"><h4>本次结果</h4><span class="fz-count" id="fz-out-count">—</span></div>
          <div class="fz-outbox tall" id="fz-out"><div class="fz-empty">还没有动作。左挑来源、中选动作，结果会落在这一栏。</div></div>
          <div class="fz-col-h"><h4>证据</h4></div>
          <div class="fz-outbox" id="fz-ev"><div class="fz-empty">跑一次 create / fuse / 补缺，这里会写：产物路径、epoch、禁令保留率、接线条数。</div></div>
        </aside>
      </div>
    </section>`;

html = html.slice(0, i) + v2 + html.slice(i + oldLen);

// 换脚本：不再加载 gap.js / ingest-ui.js，改加载 fuse-ui.js
html = html.replace(/<script src="gap\.js[^"]*"><\/script>\s*/g, '');
html = html.replace(/<script src="ingest-ui\.js[^"]*"><\/script>\s*/g, '');
if (!html.includes('fuse-ui.js')) {
  html = html.replace('</body>', '  <script src="fuse-ui.js?v=2"></script>\n</body>');
}

writeFileSync(FILE, html, 'utf8');
console.log(`融合台 v2 已写入（旧版备份 ${backup}）`);
