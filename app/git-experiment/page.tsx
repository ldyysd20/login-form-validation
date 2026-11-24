import fs from 'fs';
import path from 'path';

/** 从 git-steps.json 读取所有步骤 */
function loadSteps() {
  const p = path.join(process.cwd(), 'git-steps.json');
  return JSON.parse(fs.readFileSync(p, 'utf8')).steps;
}

/**
 * Git 实验终端截图页面
 * 渲染 9 个步骤的终端风格卡片，用于自动截图
 */
export default function GitExperimentPage() {
  const steps = loadSteps();

  return (
    <div className="bg-slate-900 min-h-screen p-8 space-y-6 font-mono" style={{ fontFamily: '"JetBrains Mono", "Consolas", "Microsoft YaHei", monospace' }}>
      {/* 头部 */}
      <div className="text-center pb-6 border-b border-slate-700">
        <h1 className="text-3xl font-bold text-white mb-2">Git 实验：利用 Git 进行代码仓库管理</h1>
        <p className="text-slate-400">主线 main → 功能分支 feat/add-remember-me → commit → push → PR → 合并</p>
        <p className="text-slate-500 text-sm mt-2">24 网络 2 班 · 黄律然 · 2026-11-24</p>
      </div>

      {/* 每个步骤一个终端卡片 */}
      {steps.map((step, i) => (
        <TerminalCard key={i} step={step} index={i + 1} />
      ))}
    </div>
  );
}

function TerminalCard({ step, index }: { step: any; index: number }) {
  return (
    <div className="rounded-lg overflow-hidden shadow-2xl border border-slate-700">
      {/* 终端标题栏 */}
      <div className="bg-slate-800 flex items-center gap-2 px-4 py-2">
        <span className="w-3 h-3 rounded-full bg-red-500" />
        <span className="w-3 h-3 rounded-full bg-yellow-500" />
        <span className="w-3 h-3 rounded-full bg-green-500" />
        <span className="text-slate-400 text-xs ml-3">{step.title}</span>
      </div>
      {/* 终端内容 */}
      <div className="bg-black p-5 text-sm leading-relaxed">
        {/* 命令提示符 */}
        <div className="text-green-400 whitespace-pre mb-1">
          <span className="text-cyan-400">PS C:\Users\15402\Desktop\1{'> '}</span>
          <span className="text-white">{step.prompt}</span>
        </div>
        {/* 命令输出 */}
        <div className="text-slate-300 whitespace-pre-wrap">
          {step.output}
        </div>
        {/* 高亮说明 */}
        <div className="mt-3 pt-3 border-t border-slate-700 text-yellow-300 text-xs">
          💡 {step.highlight}
        </div>
      </div>
    </div>
  );
}
