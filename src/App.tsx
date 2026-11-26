import { useEffect, useMemo, useState } from 'react';
import { Archive, Code2, Folder, QrCode, Settings } from 'lucide-react';
import {
  BuiltProjectRecord,
  FeemiDesignSpec,
  ImagePixelAnalysis,
  InputSourceMode,
} from './types/project';
import {
  analyzePromptToSpec,
  applyFeemiCommand,
  applyUnrestrictedCommand,
  generateCleanCode,
  generateProceduralSvgIcon,
  sanitizeAndCleanCode,
} from './engine/feemiEngine';
import { StageOneStudio } from './components/StageOneStudio';
import { StageTwoBuild } from './components/StageTwoBuild';
import { MyFilesVault } from './components/MyFilesVault';
import { BarcodeHub } from './components/BarcodeHub';
import { SecretGearPanel } from './components/SecretGearPanel';
import { CloudDownloadPage } from './components/CloudDownloadPage';

type ActiveTab = 'studio' | 'build' | 'files' | 'barcode';

const INITIAL_PROMPT =
  'لعبة مغامرات فضائية حارس المجرة بسفينة سريعة تطلق الليزر وتواجه أعداء متنوعين';

export default function App() {
  const [downloadSlug, setDownloadSlug] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('download');
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('studio');
  const [prompt, setPrompt] = useState<string>(INITIAL_PROMPT);
  const [inputSource, setInputSource] = useState<InputSourceMode>('text');

  const initialSpec = useMemo(
    () => analyzePromptToSpec(INITIAL_PROMPT, 'text'),
    []
  );
  const [spec, setSpec] = useState<FeemiDesignSpec>(initialSpec);
  const [code, setCode] = useState<string>(() => generateCleanCode(initialSpec));
  const [svgIcon, setSvgIcon] = useState<string>(() =>
    generateProceduralSvgIcon(initialSpec)
  );

  const [projects, setProjects] = useState<BuiltProjectRecord[]>([]);
  const [secretPanelOpen, setSecretPanelOpen] = useState(false);

  const originUrl =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  // Fetch cloud-persisted projects on load
  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.projects)) {
          setProjects(data.projects);
        }
      })
      .catch(() => {
        // Offline or dev server restarting
      });
  }, []);

  const [lastImageMetrics, setLastImageMetrics] =
    useState<ImagePixelAnalysis | null>(null);

  const handleGenerateStage1 = (
    imageMetrics?: ImagePixelAnalysis | null,
    overridePrompt?: string,
    overrideSource?: InputSourceMode
  ) => {
    const effectivePrompt = overridePrompt ?? prompt;
    const effectiveSource = overrideSource ?? inputSource;
    const effectiveMetrics =
      imageMetrics !== undefined ? imageMetrics : lastImageMetrics;
    if (imageMetrics !== undefined) {
      setLastImageMetrics(imageMetrics);
    }
    if (!effectivePrompt.trim() && !effectiveMetrics) return;
    const nextSpec = analyzePromptToSpec(
      effectivePrompt || 'تطبيق تفاعلي ذكي',
      effectiveSource,
      effectiveMetrics
    );
    const cleaned = sanitizeAndCleanCode(generateCleanCode(nextSpec));
    const nextIcon = generateProceduralSvgIcon(nextSpec);
    setSpec(nextSpec);
    setCode(cleaned.cleanCode);
    setSvgIcon(nextIcon);
  };

  const handleLivePromptChange = (nextPrompt: string) => {
    setPrompt(nextPrompt);
    if (nextPrompt.trim().length >= 2) {
      handleGenerateStage1(undefined, nextPrompt, inputSource);
    }
  };

  const handleApplyCommand = (command: string): string => {
    const res = applyFeemiCommand(code, spec, command);
    const cleaned = sanitizeAndCleanCode(res.code);
    setSpec(res.spec);
    setCode(cleaned.cleanCode);
    setSvgIcon(generateProceduralSvgIcon(res.spec));
    return res.summaryAr;
  };

  const handleQuickUpdateSpec = (patch: Partial<FeemiDesignSpec>) => {
    const nextSpec: FeemiDesignSpec = { ...spec, ...patch };
    if (nextSpec.category === 'game') {
      const baseRoster = nextSpec.characterRoster ?? (nextSpec.characterBlueprint ? [nextSpec.characterBlueprint] : []);
      let updatedRoster = baseRoster;
      const targetId = nextSpec.activeCharacterId || updatedRoster[0]?.id;

      if (patch.primaryColor || patch.accentColor) {
        updatedRoster = updatedRoster.map((c, idx) =>
          (targetId ? c.id === targetId : idx === 0)
            ? {
                ...c,
                outfitColor: patch.primaryColor ?? c.outfitColor,
                outfitSecondaryColor: patch.accentColor ?? c.outfitSecondaryColor,
              }
            : c
        );
      }

      const activeChar =
        updatedRoster.find((c) => c.id === nextSpec.activeCharacterId) ||
        updatedRoster[0];
      nextSpec.characterRoster = updatedRoster;
      nextSpec.characterBlueprint = activeChar;
      nextSpec.activeCharacterId = activeChar?.id;
    } else {
      nextSpec.characterBlueprint = undefined;
      nextSpec.characterRoster = undefined;
      nextSpec.activeCharacterId = undefined;
      nextSpec.playerSpeed = 0;
      nextSpec.gravity = 0;
    }
    const nextCode = generateCleanCode(nextSpec);
    const nextIcon = generateProceduralSvgIcon(nextSpec);
    setSpec(nextSpec);
    setCode(nextCode);
    setSvgIcon(nextIcon);
  };

  const handleCleanCode = (): string => {
    const res = sanitizeAndCleanCode(code);
    setCode(res.cleanCode);
    return res.issuesFixed.length > 0
      ? `تم سد ${res.issuesFixed.length} ثغرة وتنظيف الكود بالكامل.`
      : 'الكود نظيف وآمن تماماً وخالٍ من الأخطاء البرمجية.';
  };

  const handleExecuteUnrestricted = (rawCommand: string): string => {
    const res = applyUnrestrictedCommand(code, spec, rawCommand);
    setSpec(res.spec);
    setCode(res.code);
    setSvgIcon(generateProceduralSvgIcon(res.spec));
    return res.logAr;
  };

  const handleResetEngine = () => {
    const resetSpec = analyzePromptToSpec(INITIAL_PROMPT, 'text');
    setPrompt(INITIAL_PROMPT);
    setSpec(resetSpec);
    setCode(generateCleanCode(resetSpec));
    setSvgIcon(generateProceduralSvgIcon(resetSpec));
  };

  const handleOpenDirectDownload = (slug: string) => {
    const nextUrl = `${window.location.pathname}?download=${encodeURIComponent(slug)}`;
    window.history.pushState({}, '', nextUrl);
    setDownloadSlug(slug);
  };

  const handleExitDownloadMode = () => {
    window.history.pushState({}, '', window.location.pathname);
    setDownloadSlug(null);
  };

  if (downloadSlug) {
    return (
      <CloudDownloadPage
        slug={downloadSlug}
        onExitDownloadMode={handleExitDownloadMode}
      />
    );
  }

  const latestShareSlug = projects[0]?.shareSlug || 'galaxy-guardian';
  const activeShareUrl = `${originUrl}/?download=${encodeURIComponent(latestShareSlug)}`;

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col">
      {/* Top Bar: Clean 3-zone contract (Brand — Stage Links — Gear Control) */}
      <header className="sticky top-0 z-30 h-14 bg-[#0B0F17]/95 border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-6">
        <button
          type="button"
          onClick={() => setActiveTab('studio')}
          className="text-lg font-extrabold tracking-tight text-white whitespace-nowrap shrink-0 flex items-center gap-2"
        >
          <span className="text-emerald-400">كود ترجم</span>
          <span dir="ltr" className="hidden sm:inline text-xs font-mono text-slate-400">
            Code Targem
          </span>
        </button>

        <nav
          aria-label="تنقل المراحل"
          className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-300"
        >
          <button
            type="button"
            onClick={() => setActiveTab('studio')}
            className={`whitespace-nowrap shrink-0 transition-colors ${
              activeTab === 'studio'
                ? 'text-emerald-400'
                : 'hover:text-white'
            }`}
          >
            المرحلة ١: الابتكار والكود
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('build')}
            className={`whitespace-nowrap shrink-0 transition-colors ${
              activeTab === 'build'
                ? 'text-emerald-400'
                : 'hover:text-white'
            }`}
          >
            المرحلة ٢: المعاينة والبناء
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('files')}
            className={`whitespace-nowrap shrink-0 transition-colors ${
              activeTab === 'files'
                ? 'text-emerald-400'
                : 'hover:text-white'
            }`}
          >
            ملفاتي ({projects.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('barcode')}
            className={`whitespace-nowrap shrink-0 transition-colors ${
              activeTab === 'barcode'
                ? 'text-emerald-400'
                : 'hover:text-white'
            }`}
          >
            الباركود
          </button>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href="/api/export-workspace-zip"
            download="code-targem-full-project.zip"
            title="تنزيل كل ملفات المشروع كاملة بصيغة ZIP مع package.json"
            className="min-h-[40px] px-3 rounded-xl bg-[#121826] hover:bg-[#1A2234] border border-slate-700 text-xs font-bold text-emerald-300 hover:text-emerald-200 flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Archive className="w-4 h-4" />
            <span className="hidden sm:inline">حزمة المشروع (ZIP)</span>
            <span className="sm:hidden">ZIP</span>
          </a>
          <button
            type="button"
            onClick={() => setSecretPanelOpen(true)}
            aria-label="فتح لوحة التحكم السرية"
            title="لوحة التحكم السرية المتقدمة"
            className="min-w-[44px] min-h-[44px] rounded-xl bg-[#121826] hover:bg-[#1A2234] border border-slate-700 text-slate-200 hover:text-amber-400 flex items-center justify-center transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content Area (padded above fixed bottom bar) */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-24">
        {activeTab === 'studio' && (
          <StageOneStudio
            prompt={prompt}
            onLivePromptChange={handleLivePromptChange}
            inputSource={inputSource}
            setInputSource={setInputSource}
            spec={spec}
            code={code}
            svgIcon={svgIcon}
            onGenerateStage1={handleGenerateStage1}
            onCodeChange={setCode}
            onApplyCommand={handleApplyCommand}
            onQuickUpdateSpec={handleQuickUpdateSpec}
            onCleanCode={handleCleanCode}
            onProceedToStage2={() => setActiveTab('build')}
          />
        )}

        {activeTab === 'build' && (
          <StageTwoBuild
            spec={spec}
            code={code}
            svgIcon={svgIcon}
            onBackToStage1={() => setActiveTab('studio')}
            onBuildCompleted={(built) => {
              setProjects((prev) => [
                built,
                ...prev.filter((p) => p.id !== built.id),
              ]);
            }}
            onGoToFiles={() => setActiveTab('files')}
            onGoToBarcode={() => setActiveTab('barcode')}
          />
        )}

        {activeTab === 'files' && (
          <MyFilesVault
            projects={projects}
            onProjectUpdated={(updated) => {
              setProjects((prev) =>
                prev.map((p) => (p.id === updated.id ? updated : p))
              );
            }}
            onProjectsDeleted={(ids) => {
              const idSet = new Set(ids);
              setProjects((prev) => prev.filter((p) => !idSet.has(p.id)));
            }}
            onCreateNewProject={() => setActiveTab('studio')}
          />
        )}

        {activeTab === 'barcode' && (
          <BarcodeHub
            projects={projects}
            originUrl={originUrl}
            onOpenDirectDownload={handleOpenDirectDownload}
            onCreateNewProject={() => setActiveTab('studio')}
          />
        )}
      </main>

      {/* Fixed Bottom Navigation Bar: Studio, "ملفاتي" (📁), and "الباركود" right next to it */}
      <nav
        aria-label="الشريط السفلي الرئيسي"
        className="fixed bottom-0 left-0 right-0 z-40 h-16 bg-[#0F1522]/95 border-t border-slate-800 px-2"
      >
        <div className="max-w-xl mx-auto h-full grid grid-cols-3 items-center">
          <button
            type="button"
            onClick={() => setActiveTab('studio')}
            className={`h-full flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'studio' || activeTab === 'build'
                ? 'text-emerald-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-5 h-5" />
            <span className="text-[11px] font-bold whitespace-nowrap">
              الاستوديو
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('files')}
            className={`h-full flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'files'
                ? 'text-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Folder className="w-5 h-5" />
            <span className="text-[11px] font-bold whitespace-nowrap">
              ملفاتي
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('barcode')}
            className={`h-full flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'barcode'
                ? 'text-sky-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode className="w-5 h-5" />
            <span className="text-[11px] font-bold whitespace-nowrap">
              الباركود
            </span>
          </button>
        </div>
      </nav>

      {/* Secret Gear Control Panel */}
      <SecretGearPanel
        isOpen={secretPanelOpen}
        onClose={() => setSecretPanelOpen(false)}
        spec={spec}
        code={code}
        activeShareUrl={activeShareUrl}
        onExecuteUnrestricted={handleExecuteUnrestricted}
        onResetEngine={handleResetEngine}
        onOpenDirectDownload={() => {
          setSecretPanelOpen(false);
          handleOpenDirectDownload(latestShareSlug);
        }}
      />
    </div>
  );
}
