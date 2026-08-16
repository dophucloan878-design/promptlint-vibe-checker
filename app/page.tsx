"use client";

import { useMemo, useState } from "react";

type Dimension = {
  key: "goal" | "constraints" | "input" | "output" | "acceptance";
  label: string;
  question: string;
  weight: number;
  score: number;
  status: "通过" | "待改进" | "缺失";
  detail: string;
};

type Issue = {
  level: "严重" | "建议";
  title: string;
  detail: string;
  fix: string;
};

const samplePrompts = [
  {
    label: "模糊需求",
    value: "帮我做一个商城，用最好的方式实现，要好看一点。",
  },
  {
    label: "功能开发",
    value:
      "在 src/components/Header.tsx 的导航栏右侧，加一个用户头像下拉菜单。使用 React 18 + TypeScript 和函数组件，不引入新的 UI 库。用户点击头像后展示个人资料、设置和退出登录三个选项；点击页面其他区域时关闭菜单。请只输出需要修改的代码，用 diff 格式。验收标准：键盘可以打开和关闭菜单；菜单在手机端不超出屏幕；所有 props 有明确类型。",
  },
  {
    label: "Bug 修复",
    value:
      "修复商品列表删除后页面不更新的问题。当前点击删除按钮后接口返回 200，但列表仍显示旧数据，控制台没有报错。项目使用 React 18、TypeScript 和 TanStack Query。请定位原因，只修改与缓存更新相关的代码，不调整现有样式。输出问题原因、修改 diff 和验证步骤。验收标准：删除成功后对应商品立即消失；刷新页面后数据一致；删除失败时保留原数据并显示错误提示。",
  },
];

const vagueWords = ["随便", "最好", "高级", "好看", "优化一下", "做一个", "搞一下", "有问题", "加个功能"];
const constraintWords = ["使用", "不用", "不使用", "必须", "不要", "限制", "技术栈", "typescript", "react", "vue", "python", "单文件", "不引入", "只修改"];
const inputWords = ["输入", "接收", "参数", "字段", "数据", "用户点击", "用户在", "接口", "对象", "格式", "示例"];
const outputWords = ["输出", "返回", "生成", "完整代码", "diff", "文件", "解释", "步骤", "使用方式"];
const acceptanceWords = ["验收", "应该", "当", "验证", "测试", "成功后", "失败时", "能够", "可以", "显示", "不超过"];

function hasAny(text: string, words: string[]) {
  const normalized = text.toLowerCase();
  return words.some((word) => normalized.includes(word.toLowerCase()));
}

function sectionExists(text: string, names: string[]) {
  return names.some((name) => new RegExp(`(?:^|\\n)\\s*(?:#{1,3}\\s*)?${name}(?:\\s*[：:]|\\s*$)`, "im").test(text));
}

function lineCount(text: string, words: string[]) {
  return text
    .split(/\n|。|；/)
    .filter((line) => hasAny(line, words) || /^\s*[-*\d]/.test(line)).length;
}

function analyzePrompt(text: string) {
  const clean = text.trim();
  if (!clean) {
    return {
      score: 0,
      level: "等待检测",
      dimensions: [
        ["goal", "目标", "要做什么？", 20],
        ["constraints", "约束", "有什么限制？", 20],
        ["input", "输入", "接收什么数据？", 18],
        ["output", "输出", "产生什么结果？", 18],
        ["acceptance", "验收标准", "怎么才算完成？", 24],
      ].map(([key, label, question, weight]) => ({
        key,
        label,
        question,
        weight,
        score: 0,
        status: "缺失",
        detail: "粘贴提示词后开始检查",
      })) as Dimension[],
      issues: [] as Issue[],
    };
  }

  const hasGoalSection = sectionExists(clean, ["目标", "任务", "需求"]);
  const hasConstraintSection = sectionExists(clean, ["约束", "限制", "技术栈"]);
  const hasInputSection = sectionExists(clean, ["输入", "上下文", "现状"]);
  const hasOutputSection = sectionExists(clean, ["输出", "交付物", "结果"]);
  const hasAcceptanceSection = sectionExists(clean, ["验收标准", "完成标准", "验证标准"]);
  const detailSignals = (clean.match(/[，。：；、\n-]/g) || []).length;

  const goalScore = Math.min(20, (clean.length > 18 ? 9 : 4) + (hasGoalSection ? 6 : 0) + (detailSignals >= 3 ? 5 : detailSignals));
  const constraintCount = lineCount(clean, constraintWords);
  const constraintScore = Math.min(20, (hasConstraintSection ? 8 : 0) + (hasAny(clean, constraintWords) ? 6 : 0) + Math.min(6, constraintCount * 2));
  const inputScore = Math.min(18, (hasInputSection ? 7 : 0) + (hasAny(clean, inputWords) ? 7 : 0) + (/\{[\s\S]*\}|例如|示例/.test(clean) ? 4 : 0));
  const outputScore = Math.min(18, (hasOutputSection ? 7 : 0) + (hasAny(clean, outputWords) ? 8 : 0) + (/完整|diff|逐步|只输出|使用方式/i.test(clean) ? 3 : 0));
  const acceptanceCount = lineCount(clean, acceptanceWords);
  const acceptanceScore = Math.min(24, (hasAcceptanceSection ? 9 : 0) + (hasAny(clean, acceptanceWords) ? 7 : 0) + Math.min(8, acceptanceCount * 2));

  const rawDimensions = [
    ["goal", "目标", "要做什么？", 20, goalScore, "任务对象和功能范围"],
    ["constraints", "约束", "有什么限制？", 20, constraintScore, "技术栈、边界和代码风格"],
    ["input", "输入", "接收什么数据？", 18, inputScore, "数据结构、上下文或触发方式"],
    ["output", "输出", "产生什么结果？", 18, outputScore, "交付物格式和使用方式"],
    ["acceptance", "验收标准", "怎么才算完成？", 24, acceptanceScore, "可观察、可复现的完成条件"],
  ] as const;

  const dimensions: Dimension[] = rawDimensions.map(([key, label, question, weight, score, detail]) => ({
    key,
    label,
    question,
    weight,
    score,
    status: score / weight >= 0.7 ? "通过" : score / weight >= 0.35 ? "待改进" : "缺失",
    detail,
  }));

  const issues: Issue[] = [];
  if (goalScore < 14) issues.push({ level: "严重", title: "目标不够具体", detail: "没有明确要修改或创建的对象、功能范围与关键组成。", fix: "把“做什么”拆成页面、组件、字段或行为。" });
  if (constraintScore < 12) issues.push({ level: "建议", title: "缺少核心约束", detail: "AI 可能自行选择技术栈或改动范围，导致结果无法集成。", fix: "补充 3–5 条技术栈、依赖、代码风格和改动边界。" });
  if (inputScore < 10) issues.push({ level: "建议", title: "输入与上下文不清", detail: "没有说明数据从哪里来、结构是什么，或用户如何触发功能。", fix: "写清输入字段、类型、示例值或当前问题现象。" });
  if (outputScore < 11) issues.push({ level: "建议", title: "交付物形态未定义", detail: "AI 不知道你需要完整代码、局部 diff、解释还是执行步骤。", fix: "明确输出格式，并说明是否需要 import、注释和运行方式。" });
  if (acceptanceScore < 16) issues.push({ level: "严重", title: "缺少可验证的验收标准", detail: "无法客观判断结果是否完成，也容易遗漏边界情况。", fix: "使用“当…时，应该…”描述至少 3 条可观察结果。" });

  const hits = vagueWords.filter((word) => clean.includes(word));
  if (hits.length) issues.push({ level: "建议", title: `发现模糊表达：${hits.slice(0, 3).join("、")}`, detail: "这些词没有统一、可测量的定义，会让 AI 自由猜测。", fix: "替换为具体技术、尺寸、行为、性能指标或视觉要求。" });
  if (clean.length < 30) issues.push({ level: "严重", title: "提示词信息量过少", detail: "一句话需求通常不足以支持稳定的工程实现。", fix: "至少补齐目标、核心约束和验收标准。" });
  if (clean.length > 1600) issues.push({ level: "建议", title: "提示词可能过载", detail: "一次包含太多目标会降低执行稳定性，也不利于验证。", fix: "按可独立验证的功能拆成多轮，每轮只完成一个主题。" });

  const score = dimensions.reduce((sum, item) => sum + item.score, 0);
  return {
    score,
    level: score >= 85 ? "优秀" : score >= 70 ? "合格" : score >= 50 ? "待改进" : "风险较高",
    dimensions,
    issues,
  };
}

function extractSection(text: string, heading: string) {
  const match = text.match(new RegExp(`(?:^|\\n)\\s*(?:#{1,3}\\s*)?${heading}\\s*[：:]?\\s*([\\s\\S]*?)(?=\\n\\s*(?:#{1,3}\\s*)?(?:目标|任务|需求|约束|限制|技术栈|输入|上下文|现状|输出|交付物|结果|验收标准|完成标准|验证标准)\\s*[：:]?|$)`, "i"));
  return match?.[1]?.trim() || "";
}

function improvePrompt(text: string) {
  const clean = text.trim();
  if (!clean) return "请先在左侧输入需要检测的提示词。";
  const goal = extractSection(clean, "目标|任务|需求") || clean.split(/\n|。/).find((line) => line.trim().length > 4)?.trim() || clean;
  const constraints = extractSection(clean, "约束|限制|技术栈");
  const input = extractSection(clean, "输入|上下文|现状");
  const output = extractSection(clean, "输出|交付物|结果");
  const acceptance = extractSection(clean, "验收标准|完成标准|验证标准");

  const preservedDetails = clean
    .split(/\n|。/)
    .map((line) => line.trim())
    .filter((line) => line && line !== goal)
    .slice(0, 5);

  return `## 目标\n${goal.replace(/^(帮我|请|麻烦)\s*/, "")}。${preservedDetails.length ? `\n\n功能与背景：\n${preservedDetails.map((line) => `- ${line}`).join("\n")}` : ""}\n\n## 约束\n${constraints || "- 使用团队当前项目的技术栈和目录结构\n- 只修改与本需求直接相关的代码，不改动无关功能\n- 遵循现有命名、类型和代码风格，不无故引入新依赖"}\n\n## 输入\n${input || "- 先检查现有代码、相关组件与数据结构\n- 若关键信息缺失，明确列出假设后再实现\n- 对用户输入、空状态与异常情况做必要处理"}\n\n## 输出\n${output || "- 给出可直接运行或合并的完整修改\n- 列出涉及的文件与关键改动\n- 说明运行方式和验证步骤"}\n\n## 验收标准\n${acceptance || "- 当核心流程按需求操作时，应该得到明确且正确的结果\n- 当输入为空、无效或请求失败时，应该有清晰反馈且页面不崩溃\n- 现有无关功能应该保持正常，不能引入新的报错\n- 在桌面端与移动端都应可正常使用"}`;
}

function StatusMark({ status }: { status: Dimension["status"] }) {
  return <span className={`status-mark status-${status}`}>{status === "通过" ? "✓" : status === "缺失" ? "!" : "·"}</span>;
}

export default function Home() {
  const [prompt, setPrompt] = useState(samplePrompts[0].value);
  const [hasRun, setHasRun] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeView, setActiveView] = useState<"issues" | "rewrite">("issues");
  const result = useMemo(() => analyzePrompt(hasRun ? prompt : ""), [prompt, hasRun]);
  const rewritten = useMemo(() => improvePrompt(prompt), [prompt]);
  const chars = prompt.trim().length;

  function chooseSample(value: string) {
    setPrompt(value);
    setHasRun(true);
    setCopied(false);
  }

  async function copyRewrite() {
    await navigator.clipboard.writeText(rewritten);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="PromptLint 首页">
          <span className="brand-mark">P/</span>
          <span>PROMPTLINT</span>
        </a>
        <div className="topbar-meta">
          <span className="live-dot" aria-hidden="true" />
          团队规范 v1.0
          <a href="https://www.runoob.com/vibe-coding/vibe-coding-prompt.html" target="_blank" rel="noreferrer">规则来源 ↗</a>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="eyebrow">VIBE CODING · PROMPT QUALITY GATE</div>
        <h1>别让模糊的提示词，<br /><span>拖慢整个开发节奏。</span></h1>
        <p>按照五要素规范，定位缺失信息与模糊表达，自动整理成可执行、可验收的开发提示词。</p>
      </section>

      <section className="workspace" aria-label="提示词检测工作台">
        <div className="editor-panel">
          <div className="panel-head">
            <div>
              <span className="step-index">01</span>
              <h2>粘贴开发提示词</h2>
            </div>
            <span className="char-count">{chars.toLocaleString()} / 2,000</span>
          </div>
          <div className="sample-row" aria-label="示例提示词">
            <span>快速示例</span>
            {samplePrompts.map((item) => (
              <button key={item.label} className="sample-button" onClick={() => chooseSample(item.value)}>{item.label}</button>
            ))}
          </div>
          <textarea
            aria-label="需要检测的提示词"
            maxLength={2000}
            value={prompt}
            onChange={(event) => { setPrompt(event.target.value); setHasRun(false); setCopied(false); }}
            placeholder="例如：帮我做一个用户注册表单……"
            spellCheck={false}
          />
          <div className="editor-actions">
            <button className="clear-button" onClick={() => { setPrompt(""); setHasRun(false); }}>清空</button>
            <button className="analyze-button" onClick={() => setHasRun(true)} disabled={!prompt.trim()}>
              检测提示词 <span>→</span>
            </button>
          </div>
        </div>

        <aside className="score-panel" aria-live="polite">
          <div className="panel-head score-head">
            <div>
              <span className="step-index">02</span>
              <h2>规范评分</h2>
            </div>
            <span className={`grade grade-${result.level}`}>{result.level}</span>
          </div>
          <div className="score-display">
            <strong>{result.score}</strong><span>/100</span>
          </div>
          <div className="score-scale" aria-hidden="true"><i style={{ width: `${result.score}%` }} /></div>
          <p className="score-summary">
            {result.score >= 85 ? "结构完整，可以直接交给 AI 执行。" : result.score >= 70 ? "基本合格，补齐薄弱项会更稳定。" : result.score >= 50 ? "存在明显缺口，建议先优化再开发。" : "关键信息不足，AI 很可能需要猜测。"}
          </p>
          <div className="dimension-list">
            {result.dimensions.map((item) => (
              <div className="dimension-row" key={item.key}>
                <StatusMark status={item.status} />
                <div>
                  <div className="dimension-title"><b>{item.label}</b><span>{item.score}/{item.weight}</span></div>
                  <small>{item.question}</small>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="results-section">
        <div className="results-title">
          <div>
            <span className="step-index">03</span>
            <h2>检测报告</h2>
          </div>
          <div className="view-switch" role="tablist" aria-label="检测结果视图">
            <button role="tab" aria-selected={activeView === "issues"} className={activeView === "issues" ? "active" : ""} onClick={() => setActiveView("issues")}>问题定位 <span>{result.issues.length}</span></button>
            <button role="tab" aria-selected={activeView === "rewrite"} className={activeView === "rewrite" ? "active" : ""} onClick={() => setActiveView("rewrite")}>优化版本</button>
          </div>
        </div>

        {activeView === "issues" ? (
          <div className="issue-grid">
            {result.issues.length ? result.issues.map((issue, index) => (
              <article className="issue-card" key={`${issue.title}-${index}`}>
                <div className="issue-number">{String(index + 1).padStart(2, "0")}</div>
                <div className="issue-body">
                  <div className="issue-title-row"><span className={`level level-${issue.level}`}>{issue.level}</span><h3>{issue.title}</h3></div>
                  <p>{issue.detail}</p>
                  <div className="fix"><span>建议</span>{issue.fix}</div>
                </div>
              </article>
            )) : (
              <div className="all-clear"><b>✓</b><h3>没有发现明显问题</h3><p>这条提示词已覆盖核心信息，可以进入开发与验证环节。</p></div>
            )}
          </div>
        ) : (
          <div className="rewrite-panel">
            <div className="rewrite-toolbar">
              <p><b>结构化优化版</b><span>保留原意，并按五要素补齐缺失信息</span></p>
              <button onClick={copyRewrite}>{copied ? "已复制 ✓" : "复制提示词"}</button>
            </div>
            <pre>{rewritten}</pre>
            <div className="rewrite-note">带有通用假设的内容建议在提交给 AI 前根据项目实际情况调整。</div>
          </div>
        )}
      </section>

      <section className="rules-section">
        <div className="rules-intro">
          <span className="eyebrow">THE FIVE-ELEMENT RULE</span>
          <h2>好的提示词，不靠灵感。<br />靠完整的信息结构。</h2>
          <p>检测规则参考菜鸟教程的 Prompt 五要素模型，并针对团队开发场景增加模糊词与可执行性检查。</p>
        </div>
        <div className="rule-list">
          {result.dimensions.map((item, index) => (
            <div className="rule-row" key={item.key}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <b>{item.label}</b>
              <p>{item.detail}</p>
              <em>+{item.weight} 分</em>
            </div>
          ))}
        </div>
      </section>

      <footer>
        <div className="brand"><span className="brand-mark">P/</span><span>PROMPTLINT</span></div>
        <p>让每一条开发指令，都值得被执行。</p>
        <a href="#top">回到顶部 ↑</a>
      </footer>
    </main>
  );
}
