import { useEffect, useRef, useState } from 'react';
import {
  Archive,
  ArrowLeft,
  Camera,
  Check,
  Code2,
  Copy,
  Cpu,
  Image as ImageIcon,
  LayoutGrid,
  Plus,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Type as TypeIcon,
  Upload,
  Users,
  Wand2,
  X,
} from 'lucide-react';
import {
  CharacterArchetype,
  FeemiDesignSpec,
  ImagePixelAnalysis,
  InputSourceMode,
} from '../types/project';
import { analyzeImagePixels } from '../utils/imageAnalyzer';
import { createCustomCharacterBlueprint } from '../engine/feemiEngine';
import { buildApkReadyProjectZipBytes } from '../engine/apkBuilder';
import { Feemi3DViewport } from './Feemi3DViewport';

interface StageOneStudioProps {
  prompt: string;
  onLivePromptChange: (v: string) => void;
  inputSource: InputSourceMode;
  setInputSource: (m: InputSourceMode) => void;
  spec: FeemiDesignSpec;
  code: string;
  svgIcon: string;
  onGenerateStage1: (imageMetrics?: ImagePixelAnalysis | null) => void;
  onCodeChange: (nextCode: string) => void;
  onApplyCommand: (command: string) => string;
  onQuickUpdateSpec: (patch: Partial<FeemiDesignSpec>) => void;
  onCleanCode: () => string;
  onProceedToStage2: () => void;
}

const STARTER_IDEAS = [
  {
    label: 'شخصية توم ثلاثية الأبعاد',
    prompt: 'شخصية توم القط الذكي ثلاثي الأبعاد مع فيزياء وجاذبية وحركة سلسة ومغامرة جمع الجوائز',
  },
  {
    label: 'لعبة توم وفارس 3D',
    prompt: 'لعبة مغامرات ثلاثية الأبعاد تجمع شخصية توم وبطل فارس مدرع بفيزياء وجاذبية واقعية',
  },
  {
    label: 'تطبيق متجر سحابي',
    prompt: 'تطبيق متجر إلكتروني لإدارة المنتجات والطلبات بأمان عالي',
  },
  {
    label: 'تطبيق محفظة وميزانية',
    prompt: 'تطبيق محاسبة وميزانية ذكية لتتبع المصاريف والإيرادات',
  },
];

const EXTERNAL_EXPORT_TARGETS = [
  { id: 'android_studio', name: 'Android Studio', ext: 'html', desc: 'مشروع WebView جاهز للدمج' },
  { id: 'vscode', name: 'Visual Studio Code', ext: 'html', desc: 'ملف مصدري قياسي باللغة الإنجليزية' },
  { id: 'expo', name: 'Expo / React Native', ext: 'tsx', desc: 'تغليف فوري داخل حاوية تطبيق هاتف' },
  { id: 'github', name: 'GitHub / Gist', ext: 'html', desc: 'نسخة نظيفة ومفحوصة للنشر' },
];

export function StageOneStudio({
  prompt,
  onLivePromptChange,
  inputSource,
  setInputSource,
  spec,
  code,
  svgIcon,
  onGenerateStage1,
  onCodeChange,
  onApplyCommand,
  onQuickUpdateSpec,
  onCleanCode,
  onProceedToStage2,
}: StageOneStudioProps) {
  const [commandInput, setCommandInput] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [newCharName, setNewCharName] = useState('');
  const [newCharType, setNewCharType] = useState<CharacterArchetype>('knight_hero');
  const [appPreviewTab, setAppPreviewTab] = useState<'home' | 'menu' | 'settings'>('home');

  // Camera & gallery image states
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  const [imageAnalysis, setImageAnalysis] = useState<ImagePixelAnalysis | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => {
      setFeedbackMsg((curr) => (curr === msg ? null : curr));
    }, 3200);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('المتصفح لا يدعم الوصول المباشر للكاميرا؛ يمكنك رفع صورة من المعرض.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setCameraActive(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      });
    } catch {
      setCameraError('تعذر تشغيل الكاميرا أو تم رفض الإذن. يمكنك رفع صورة من المعرض بدلاً من ذلك.');
    }
  };

  const captureFromCamera = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = c.toDataURL('image/jpeg', 0.85);
    setCapturedImageUrl(dataUrl);
    stopCamera();
    try {
      const metrics = await analyzeImagePixels(dataUrl);
      setImageAnalysis(metrics);
      onGenerateStage1(metrics);
      showToast('تم التقاط الصورة وتحليل ألوانها وتوليد الرسومات والكود عبر المعدل الفيمي الذكي.');
    } catch {
      showToast('تم التقاط الصورة، يمكنك الآن توليد الكود.');
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || '');
      setCapturedImageUrl(dataUrl);
      try {
        const metrics = await analyzeImagePixels(dataUrl);
        setImageAnalysis(metrics);
        onGenerateStage1(metrics);
        showToast('تم تحليل صورة المعرض وتوليد الرسومات والأكواد تلقائياً بدون ذكاء اصطناعي.');
      } catch {
        showToast('تم تحميل الصورة، اضغط توليد الكود لإنشاء المشروع.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      showToast('تم نسخ الكود البرمجي كاملاً إلى الحافظة.');
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      showToast('يرجى تحديد الكود ونسخه يدوياً.');
    }
  };

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) return;
    const summary = onApplyCommand(commandInput);
    setCommandInput('');
    showToast(summary);
  };

  const handleExportToApp = (targetName: string, ext: string) => {
    const fileContent =
      ext === 'tsx'
        ? `// Exported from Code Targem for ${targetName}\nexport const AppHtmlBundle = ${JSON.stringify(
            code
          )};\n`
        : code;

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${spec.englishSlug}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setExportModalOpen(false);
    showToast(`تم تصدير ونقل الكود بصيغة متوافقة مع ${targetName}.`);
  };

  const handleDownloadCurrentProjectZip = () => {
    const zipBytes = buildApkReadyProjectZipBytes({ spec, code, svgIcon });
    const blob = new Blob([new Uint8Array(zipBytes)], {
      type: 'application/zip',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${spec.englishSlug}-apk-ready.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setExportModalOpen(false);
    showToast('تم تجميع المشروع كاملاً في حزمة ZIP مع package.json وجاهزة للتحويل إلى APK.');
  };

  const lineCount = code.split('\n').length;
  const roster =
    spec.category === 'game'
      ? spec.characterRoster && spec.characterRoster.length > 0
        ? spec.characterRoster
        : spec.characterBlueprint
        ? [spec.characterBlueprint]
        : []
      : [];
  const activeChar =
    roster.find((c) => c.id === spec.activeCharacterId) || roster[0];

  const handleAddCharacter = (e: React.FormEvent) => {
    e.preventDefault();
    if (spec.category !== 'game') return;
    if (roster.length >= 4) {
      showToast('الحد الأقصى في المعاينة ٤ شخصيات معاً في نفس اللعبة.');
      return;
    }
    const labelMap: Record<CharacterArchetype, string> = {
      cat_tom: 'توم (القط الذكي)',
      knight_hero: 'فارس مدرع',
      space_ranger: 'بطل الفضاء',
      ninja_runner: 'نينجا سريع',
      cyber_bot: 'روبوت ذكي',
      adventurer_hero: 'بطل مغامر',
    };
    const nextChar = createCustomCharacterBlueprint(
      newCharName.trim() || labelMap[newCharType],
      spec.primaryColor,
      spec.accentColor,
      newCharType,
      roster.length,
      'companion'
    );
    const updatedRoster = [...roster, nextChar];
    onQuickUpdateSpec({
      characterRoster: updatedRoster,
      activeCharacterId: nextChar.id,
    });
    setNewCharName('');
    showToast(`تمت إضافة "${nextChar.displayNameAr}" إلى اللعبة.`);
  };

  const handleRemoveCharacter = (id: string) => {
    if (roster.length <= 1) return;
    const updated = roster.filter((c) => c.id !== id);
    onQuickUpdateSpec({
      characterRoster: updated,
      activeCharacterId: updated[0]?.id,
    });
  };

  const handleUpdateActiveCharacter = (
    patch: Partial<NonNullable<FeemiDesignSpec['characterBlueprint']>>
  ) => {
    if (!activeChar) return;
    const updated = roster.map((c) =>
      c.id === activeChar.id ? { ...c, ...patch } : c
    );
    onQuickUpdateSpec({
      characterRoster: updated,
      activeCharacterId: activeChar.id,
    });
  };

  return (
    <div className="space-y-6">
      {/* Notification Banner */}
      {feedbackMsg && (
        <div
          role="status"
          className="rounded-xl bg-emerald-950/60 border border-emerald-500/40 px-4 py-3 text-sm text-emerald-200 flex items-center justify-between gap-3"
        >
          <span>{feedbackMsg}</span>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            aria-label="إخفاء التنبيه"
            className="text-emerald-300 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Unified Integrated Workspace: Feemi Smart Engine + Live Code Window in One Interactive Screen */}
      <section className="rounded-2xl bg-[#121826] border border-slate-800 overflow-hidden">
        {/* Top Unified Header + Input Mode Switcher */}
        <div className="p-4 border-b border-slate-800 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2.5">
                <Cpu className="w-6 h-6 text-emerald-400 shrink-0" />
                <span>المعدل الفيمي الذكي وشباك الأكواد التفاعلي</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                {spec.category === 'game'
                  ? 'بمجرد وصف فكرتك أو الشخصيات (مثل توم وأبطال الألعاب)، يبتكر المحرك مجسمات 3D متحركة بفيزياء حقيقية ويجهز الكود حياً.'
                  : 'بمجرد كتابة فكرة التطبيق، يبني المحرك واجهة تطبيق قياسية احترافية بالأزرار والقوائم مع توليد الكود حياً بدون محرك فيزياء.'}
              </p>
            </div>

            {/* Input mode segmented control */}
            <div
              className="grid grid-cols-3 sm:inline-flex w-full sm:w-auto items-center gap-1 p-1 rounded-xl bg-[#0B0F17] border border-slate-800 self-start"
              role="tablist"
              aria-label="طرق إدخال الفكرة"
            >
              <button
                type="button"
                role="tab"
                aria-selected={inputSource === 'text'}
                onClick={() => {
                  stopCamera();
                  setInputSource('text');
                }}
                className={`px-2 sm:px-3 py-2 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  inputSource === 'text'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <TypeIcon className="w-3.5 h-3.5" />
                <span>كتابة نصية</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={inputSource === 'camera'}
                onClick={() => setInputSource('camera')}
                className={`px-2 sm:px-3 py-2 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  inputSource === 'camera'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>كاميرا مباشرة</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={inputSource === 'gallery'}
                onClick={() => {
                  stopCamera();
                  setInputSource('gallery');
                }}
                className={`px-2 sm:px-3 py-2 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  inputSource === 'gallery'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>رفع من المعرض</span>
              </button>
            </div>
          </div>

          {/* Live Reactive Input Area (updates Code Window immediately as you type or pick) */}
          {inputSource === 'text' && (
            <div className="space-y-2.5">
              <label htmlFor="idea-prompt-input" className="sr-only">
                اكتب وصف اللعبة أو التطبيق بالعربية أو الإنجليزية
              </label>
              <textarea
                id="idea-prompt-input"
                value={prompt}
                onChange={(e) => onLivePromptChange(e.target.value)}
                rows={1}
                placeholder="اكتب فكرة اللعبة أو التطبيق هنا وسيتحدث الكود والرسومات حياً في نفس اللحظة..."
                className="w-full rounded-xl bg-[#0B0F17] border border-slate-700 focus:border-emerald-500 focus:outline-none px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {STARTER_IDEAS.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        onLivePromptChange(item.prompt);
                        showToast(`تم توليد وتنظيف كود "${item.label}" حياً في شباك الأكواد.`);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#1A2234] hover:bg-[#232D44] border border-slate-700/70 text-xs text-slate-300 transition-colors"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-emerald-400 font-semibold">
                  مزامنة حية تلقائية مع شباك الأكواد
                </span>
              </div>
            </div>
          )}

        {inputSource === 'camera' && (
          <div className="rounded-xl bg-[#0B0F17] border border-slate-800 p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-300">
                صوّر أي رسمة، مخطط، أو واجهة بالكاميرا لتحويل ألوانها وهيكلها إلى لعبة أو تطبيق فوراً.
              </p>
              <div className="flex items-center gap-2">
                {!cameraActive ? (
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    <span>تشغيل الكاميرا</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={captureFromCamera}
                      className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold"
                    >
                      التقاط وتحويل لكود
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-3 py-2 rounded-lg border border-slate-700 text-slate-300 text-xs"
                    >
                      إيقاف
                    </button>
                  </>
                )}
              </div>
            </div>
            {cameraError && (
              <p className="text-xs text-amber-300 bg-amber-950/40 border border-amber-800/40 rounded-lg px-3 py-2">
                {cameraError}
              </p>
            )}
            {cameraActive && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full max-h-64 rounded-xl bg-black object-cover border border-slate-700"
              />
            )}
            {capturedImageUrl && (
              <div className="flex items-center gap-4 pt-2">
                <img
                  src={capturedImageUrl}
                  alt="لقطة الكاميرا الملتقطة"
                  className="w-24 h-24 rounded-xl object-cover border border-slate-700"
                />
                <div className="text-xs text-slate-300 space-y-1">
                  <div>تم استخلاص الألوان والأبعاد من الصورة بنجاح.</div>
                  {imageAnalysis && (
                    <div className="flex items-center gap-2 font-mono" dir="ltr">
                      <span
                        className="inline-block w-3 h-3 rounded-sm"
                        style={{ backgroundColor: imageAnalysis.dominantColor }}
                      />
                      <span>{imageAnalysis.dominantColor}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {inputSource === 'gallery' && (
          <div className="rounded-xl bg-[#0B0F17] border border-dashed border-slate-700 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-right">
              <div className="text-sm font-bold text-slate-200">
                اختر صورة أو تصميماً من معرض الجهاز
              </div>
              <p className="text-xs text-slate-400">
                يقوم المعدل الفيمي الذكي بقراءة البكسلات والألوان لبناء الرسومات والكود تلقائياً.
              </p>
            </div>
            <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold flex items-center gap-2 whitespace-nowrap shrink-0">
              <Upload className="w-4 h-4" />
              <span>رفع صورة من المعرض</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleGalleryUpload}
                className="sr-only"
              />
            </label>
          </div>
        )}
        </div>

        {/* Integrated Studio Body: Live LTR Code Window + Open Quick Control Panel & Live Graphics */}
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-slate-800">
          {/* Live Preview (3D Characters ONLY for Games; Standard UI Preview for Apps) + Quick Control Panel */}
          <aside className="lg:col-span-4 p-4 space-y-4 bg-[#101624]">
            {spec.category === 'game' ? (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-sky-400" />
                    <span>الشخصيات ثلاثية الأبعاد والفيزياء</span>
                  </h2>
                  <span className="text-xs text-slate-400">
                    {roster.length} {roster.length > 1 ? 'شخصيات' : 'شخصية'}
                  </span>
                </div>

                <Feemi3DViewport
                  spec={spec}
                  heightClass="h-[240px]"
                  compactControls
                  onSelectCharacter={(id) => onQuickUpdateSpec({ activeCharacterId: id })}
                />

                {/* Multi-Character Roster & Customization Panel (Games Only) */}
                <div
                  data-testid="game-character-roster"
                  className="rounded-xl bg-[#0B0F17] border border-slate-800 p-3 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-400" />
                      <span>شخصيات اللعبة ({roster.length})</span>
                    </span>
                    {activeChar && roster.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCharacter(activeChar.id || '')}
                        aria-label="حذف الشخصية المحددة"
                        className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>حذف</span>
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {roster.map((c) => {
                      const isActive = c.id === activeChar?.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => onQuickUpdateSpec({ activeCharacterId: c.id })}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                            isActive
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                              : 'bg-[#121826] border-slate-700 text-slate-300 hover:border-slate-500'
                          }`}
                        >
                          {c.displayNameAr.replace(' (القط الذكي ثلاثي الأبعاد)', '').slice(0, 18)}
                        </button>
                      );
                    })}
                  </div>

                  {activeChar && (
                    <div className="grid grid-cols-12 gap-2 pt-1">
                      <input
                        type="text"
                        aria-label="اسم الشخصية المحددة"
                        value={activeChar.displayNameAr}
                        onChange={(e) =>
                          handleUpdateActiveCharacter({ displayNameAr: e.target.value })
                        }
                        className="col-span-9 rounded-lg bg-[#121826] border border-slate-700 px-2.5 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                      />
                      <input
                        type="color"
                        aria-label="لون زي الشخصية"
                        value={activeChar.outfitColor}
                        onChange={(e) =>
                          handleUpdateActiveCharacter({ outfitColor: e.target.value })
                        }
                        className="col-span-3 w-full h-8 rounded-lg bg-[#121826] border border-slate-700 cursor-pointer p-0.5"
                      />
                    </div>
                  )}

                  <form onSubmit={handleAddCharacter} className="grid grid-cols-12 gap-1.5 pt-1 border-t border-slate-800/80">
                    <input
                      type="text"
                      value={newCharName}
                      onChange={(e) => setNewCharName(e.target.value)}
                      placeholder="اسم شخصية إضافية (مثل جيري)..."
                      aria-label="اسم شخصية جديدة"
                      className="col-span-5 rounded-lg bg-[#121826] border border-slate-700 px-2 py-1.5 text-[11px] text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
                    />
                    <select
                      aria-label="نوع الشخصية الجديدة"
                      value={newCharType}
                      onChange={(e) => setNewCharType(e.target.value as CharacterArchetype)}
                      className="col-span-4 rounded-lg bg-[#121826] border border-slate-700 px-1.5 py-1.5 text-[11px] text-white focus:outline-none"
                    >
                      <option value="cat_tom">قط (مثل توم)</option>
                      <option value="knight_hero">فارس مدرع</option>
                      <option value="space_ranger">بطل فضاء</option>
                      <option value="ninja_runner">نينجا</option>
                      <option value="cyber_bot">روبوت ذكي</option>
                      <option value="adventurer_hero">مغامر</option>
                    </select>
                    <button
                      type="submit"
                      className="col-span-3 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-[11px] font-extrabold flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>إضافة</span>
                    </button>
                  </form>
                </div>
              </section>
            ) : (
              <section data-testid="standard-app-preview" className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-emerald-400" />
                    <span>معاينة واجهة التطبيق القياسية</span>
                  </h2>
                  <span className="text-xs text-slate-400">بدون فيزياء</span>
                </div>

                {/* Standard App UI Shell Preview (Buttons, Tabs, Cards - Zero Physics) */}
                <div className="rounded-xl border border-slate-800 bg-[#0B0F17] overflow-hidden">
                  <div className="px-3.5 py-2.5 bg-[#121826] border-b border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-700 [&>svg]:w-full [&>svg]:h-full [&>svg]:block"
                        dangerouslySetInnerHTML={{ __html: svgIcon }}
                      />
                      <span className="text-xs font-extrabold text-white truncate">
                        {spec.appName}
                      </span>
                    </div>
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold text-slate-950 shrink-0"
                      style={{ backgroundColor: spec.primaryColor }}
                    >
                      تطبيق قياسي
                    </span>
                  </div>

                  {/* Interactive Navigation Tabs */}
                  <div className="grid grid-cols-3 gap-1 p-2 bg-[#0F1522] border-b border-slate-800">
                    {[
                      { id: 'home' as const, label: 'الرئيسية' },
                      { id: 'menu' as const, label: 'القوائم' },
                      { id: 'settings' as const, label: 'الإعدادات' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setAppPreviewTab(tab.id)}
                        className={`py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          appPreviewTab === tab.id
                            ? 'text-slate-950'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                        style={
                          appPreviewTab === tab.id
                            ? { backgroundColor: spec.primaryColor }
                            : undefined
                        }
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Interactive App Body */}
                  <div className="p-3 space-y-2">
                    {appPreviewTab === 'home' && (
                      <>
                        <div className="rounded-lg bg-[#121826] border border-slate-800 p-2.5 flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-white">
                              {spec.subGenre === 'storefront'
                                ? 'المنتجات والعروض النشطة'
                                : spec.subGenre === 'finance_ledger'
                                ? 'ملخص الميزانية والرصيد'
                                : 'قائمة المهام اليومية'}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              أزرار وقوائم تفاعلية سريعة
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAppPreviewTab('menu')}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-950"
                            style={{ backgroundColor: spec.accentColor }}
                          >
                            عرض الكل
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-lg bg-[#121826] border border-slate-800 p-2.5">
                            <div className="text-[11px] text-slate-400">العناصر الجاهزة</div>
                            <div className="text-sm font-extrabold text-white mt-0.5">12 عنصر</div>
                          </div>
                          <div className="rounded-lg bg-[#121826] border border-slate-800 p-2.5">
                            <div className="text-[11px] text-slate-400">الحماية</div>
                            <div className="text-sm font-extrabold text-emerald-400 mt-0.5">نشطة</div>
                          </div>
                        </div>
                      </>
                    )}

                    {appPreviewTab === 'menu' && (
                      <div className="space-y-1.5">
                        {['إدارة الطلبات والسجلات', 'التقارير والإحصائيات', 'المفضلة والاختصارات'].map(
                          (item) => (
                            <div
                              key={item}
                              className="rounded-lg bg-[#121826] border border-slate-800 px-3 py-2 flex items-center justify-between text-xs text-slate-200"
                            >
                              <span>{item}</span>
                              <span className="text-emerald-400 font-bold">فتح</span>
                            </div>
                          )
                        )}
                      </div>
                    )}

                    {appPreviewTab === 'settings' && (
                      <div className="rounded-lg bg-[#121826] border border-slate-800 p-3 text-xs text-slate-300 space-y-1">
                        <div className="font-bold text-white">إعدادات التطبيق القياسي</div>
                        <div className="text-slate-400">
                          مبني بواجهات وأزرار قياسية خالية من أي محرك ألعاب أو فيزياء.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Open Quick Tweaks Panel */}
            <section
              aria-label="لوحة التعديلات السريعة المفتوحة"
              className="pt-3 border-t border-slate-800 space-y-3"
            >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                <span>لوحة التعديلات السريعة</span>
              </h2>
              <span className="text-xs text-slate-400">مفتوحة ومباشرة</span>
            </div>

            <div className="space-y-3">
              <div>
                <label
                  htmlFor="quick-app-name"
                  className="block text-xs text-slate-400 mb-1"
                >
                  {spec.category === 'game' ? 'اسم اللعبة' : 'اسم التطبيق'}
                </label>
                <input
                  id="quick-app-name"
                  type="text"
                  value={spec.appName}
                  onChange={(e) => onQuickUpdateSpec({ appName: e.target.value })}
                  className="w-full rounded-lg bg-[#0B0F17] border border-slate-700 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="quick-primary-color"
                    className="block text-xs text-slate-400 mb-1"
                  >
                    اللون الأساسي
                  </label>
                  <div className="flex items-center gap-2 rounded-lg bg-[#0B0F17] border border-slate-700 px-2.5 py-1.5">
                    <input
                      id="quick-primary-color"
                      type="color"
                      value={spec.primaryColor}
                      onChange={(e) =>
                        onQuickUpdateSpec({ primaryColor: e.target.value })
                      }
                      className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
                    />
                    <span dir="ltr" className="text-xs font-mono text-slate-300">
                      {spec.primaryColor}
                    </span>
                  </div>
                </div>

                {spec.category === 'game' ? (
                  <div>
                    <label
                      htmlFor="quick-difficulty"
                      className="block text-xs text-slate-400 mb-1"
                    >
                      مستوى الصعوبة
                    </label>
                    <select
                      id="quick-difficulty"
                      value={spec.difficulty}
                      onChange={(e) =>
                        onQuickUpdateSpec({
                          difficulty: e.target.value as FeemiDesignSpec['difficulty'],
                        })
                      }
                      className="w-full rounded-lg bg-[#0B0F17] border border-slate-700 px-2.5 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="easy">سهل</option>
                      <option value="medium">متوسط</option>
                      <option value="hard">صعب</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label
                      htmlFor="quick-accent-color"
                      className="block text-xs text-slate-400 mb-1"
                    >
                      اللون الثانوي
                    </label>
                    <div className="flex items-center gap-2 rounded-lg bg-[#0B0F17] border border-slate-700 px-2.5 py-1.5">
                      <input
                        id="quick-accent-color"
                        type="color"
                        value={spec.accentColor}
                        onChange={(e) =>
                          onQuickUpdateSpec({ accentColor: e.target.value })
                        }
                        className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
                      />
                      <span dir="ltr" className="text-xs font-mono text-slate-300">
                        {spec.accentColor}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Physics & Gravity sliders strictly exclusive to Games */}
              {spec.category === 'game' && (
                <>
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <label htmlFor="quick-speed">السرعة الفيزيائية</label>
                      <span className="font-mono tabular-nums text-emerald-400">
                        {spec.playerSpeed}
                      </span>
                    </div>
                    <input
                      id="quick-speed"
                      type="range"
                      min={140}
                      max={620}
                      step={10}
                      value={spec.playerSpeed}
                      onChange={(e) =>
                        onQuickUpdateSpec({ playerSpeed: Number(e.target.value) })
                      }
                      className="w-full accent-emerald-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <label htmlFor="quick-gravity">معامل الجاذبية</label>
                      <span className="font-mono tabular-nums text-sky-400">
                        {spec.gravity}
                      </span>
                    </div>
                    <input
                      id="quick-gravity"
                      type="range"
                      min={500}
                      max={1900}
                      step={20}
                      value={spec.gravity}
                      onChange={(e) =>
                        onQuickUpdateSpec({ gravity: Number(e.target.value) })
                      }
                      className="w-full accent-sky-500"
                    />
                  </div>
                </>
              )}

              <div className="pt-1 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const msg = onCleanCode();
                    showToast(msg);
                  }}
                  className="flex-1 px-3 py-2 rounded-lg bg-[#1A2234] hover:bg-[#232D44] border border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>فحص وتنظيف الكود</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onQuickUpdateSpec({ securityShieldLevel: 'strict' });
                    showToast('تم تفعيل أعلى درجات الحماية وسد الثغرات.');
                  }}
                  className="px-3 py-2 rounded-lg bg-[#1A2234] hover:bg-[#232D44] border border-slate-700 text-xs font-semibold text-slate-200"
                >
                  تشديد الأمان
                </button>
              </div>
            </div>
          </section>
          </aside>

          {/* Integrated Live Code Window (شباك الأكواد LTR) + Unlimited Commands + 3 Required Arabic Action Buttons */}
          <div className="lg:col-span-8 flex flex-col">
            {/* Code Window Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-slate-800 bg-[#0F1522]">
              <div className="flex items-center gap-2.5">
                <Code2 className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-white">شباك الأكواد البرمجية الحي</h2>
                <span className="text-slate-500">·</span>
                <span dir="ltr" className="text-xs font-mono text-slate-300">
                  {spec.englishSlug}.html
                </span>
              </div>
              <div dir="ltr" className="text-xs font-mono text-slate-400 tabular-nums">
                LTR · Clean English · {lineCount} lines
              </div>
            </div>

          {/* Unlimited Command Modification Bar */}
          <form
            onSubmit={handleCommandSubmit}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 border-b border-slate-800 bg-[#0D121D]"
          >
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder="أضف أمراً أو تعديلاً على الكود بلا حدود (مثال: زيادة السرعة، تغيير اللون للأزرق، صعب)..."
              aria-label="إضافة أمر أو تعديل على الكود"
              className="flex-1 rounded-lg bg-[#090D16] border border-slate-700 focus:border-emerald-500 focus:outline-none px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-500"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#1E293B] hover:bg-[#283548] border border-slate-700 text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>تطبيق التعديل</span>
            </button>
          </form>

          {/* LTR Code Editor */}
          <div dir="ltr" className="relative bg-[#080B12]">
            <textarea
              aria-label="Code Window Editor"
              spellCheck={false}
              value={code}
              onChange={(e) => onCodeChange(e.target.value)}
              className="code-editor w-full h-[270px] lg:h-[295px] bg-transparent p-3.5 text-xs sm:text-[13px] leading-relaxed font-mono text-slate-200 focus:outline-none resize-y"
            />
          </div>

          {/* Required 3 Arabic Functional Buttons directly below Code Window */}
          <div className="px-4 py-3 border-t border-slate-800 bg-[#0F1522] flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-4 py-2.5 rounded-xl bg-[#1A2234] hover:bg-[#232D44] border border-slate-700 text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>تم النسخ</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-300" />
                    <span>نسخ الكود</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setExportModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-[#1A2234] hover:bg-[#232D44] border border-slate-700 text-xs sm:text-sm font-bold text-sky-300 flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <Send className="w-4 h-4" />
                <span>تصدير/نقل الكود</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onProceedToStage2}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <span>الانتقال لصفحة البناء - المرحلة الثانية</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
          </div>
        </div>
      </section>

      {/* Export / Transfer to External App Modal */}
      {exportModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="تصدير ونقل الكود لتطبيق خارجي"
        >
          <div className="w-full max-w-md rounded-2xl bg-[#121826] border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                تصدير أو نقل الكود إلى تطبيق خارجي
              </h3>
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                aria-label="إغلاق نافذة التصدير"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              اختر البيئة أو التطبيق الخارجي لإرسال الكود المصدري النظيف إليه مباشرة:
            </p>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleDownloadCurrentProjectZip}
                className="w-full text-right rounded-xl bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-500/40 p-3.5 flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="text-sm font-extrabold text-emerald-300 flex items-center gap-2">
                    <Archive className="w-4 h-4" />
                    <span>حزمة المشروع الحالي الكاملة (ZIP + package.json)</span>
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">
                    تشمل package.json و capacitor.config.json و AndroidManifest.xml جاهزة للـ APK فوراً
                  </div>
                </div>
                <span dir="ltr" className="text-xs font-mono text-emerald-400">
                  .zip
                </span>
              </button>

              <a
                href="/api/export-workspace-zip"
                download="code-targem-full-project.zip"
                onClick={() => setExportModalOpen(false)}
                className="w-full text-right rounded-xl bg-sky-950/40 hover:bg-sky-900/50 border border-sky-500/40 p-3.5 flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="text-sm font-extrabold text-sky-300 flex items-center gap-2">
                    <Archive className="w-4 h-4" />
                    <span>تنزيل كل ملفات مشروع كود ترجم كاملة (ZIP)</span>
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">
                    كل ملفات المنصة المصدرية كاملة مع ملف الإعدادات package.json
                  </div>
                </div>
                <span dir="ltr" className="text-xs font-mono text-sky-400">
                  .zip
                </span>
              </a>

              {EXTERNAL_EXPORT_TARGETS.map((target) => (
                <button
                  key={target.id}
                  type="button"
                  onClick={() => handleExportToApp(target.name, target.ext)}
                  className="w-full text-right rounded-xl bg-[#0B0F17] hover:bg-[#172033] border border-slate-800 p-3.5 flex items-center justify-between transition-colors"
                >
                  <div>
                    <div dir="ltr" className="text-sm font-bold text-white text-right">
                      {target.name}
                    </div>
                    <div className="text-xs text-slate-400">{target.desc}</div>
                  </div>
                  <span dir="ltr" className="text-xs font-mono text-emerald-400">
                    .{target.ext}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
