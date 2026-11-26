import { useState } from 'react';
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CloudCog,
  Download,
  FolderOpen,
  Play,
  QrCode,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import {
  BuiltProjectRecord,
  DEFAULT_DEVELOPER_OWNERSHIP,
  FeemiDesignSpec,
  OwnershipInfo,
} from '../types/project';
import { validateOwnershipInput } from '../engine/apkBuilder';
import { Feemi3DViewport } from './Feemi3DViewport';

interface StageTwoBuildProps {
  spec: FeemiDesignSpec;
  code: string;
  svgIcon: string;
  onBackToStage1: () => void;
  onBuildCompleted: (project: BuiltProjectRecord) => void;
  onGoToFiles: () => void;
  onGoToBarcode: () => void;
}

type BuildStep = 'preview' | 'ownership' | 'processing' | 'done';

export function StageTwoBuild({
  spec,
  code,
  svgIcon,
  onBackToStage1,
  onBuildCompleted,
  onGoToFiles,
  onGoToBarcode,
}: StageTwoBuildProps) {
  // Requirement: Step 1 (Interactive Live Preview) opens immediately upon entering Stage 2
  const [step, setStep] = useState<BuildStep>('preview');
  const [previewKey, setPreviewKey] = useState(1);
  const [previewViewMode, setPreviewViewMode] = useState<'3d' | 'bundle'>('3d');
  const [ownershipMode, setOwnershipMode] = useState<'default' | 'custom'>('default');
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [builtProject, setBuiltProject] = useState<BuiltProjectRecord | null>(null);

  const runCloudBuild = async (ownership: OwnershipInfo) => {
    setStep('processing');
    setBuildError(null);

    try {
      const response = await fetch('/api/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spec,
          code,
          ownership,
          svgIcon,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.project) {
        throw new Error(data.error || 'فشل البناء السحابي التلقائي.');
      }
      setBuiltProject(data.project);
      onBuildCompleted(data.project);
      setStep('done');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء البناء السحابي.';
      setBuildError(msg);
      setStep('ownership');
    }
  };

  const handleDefaultOwnership = () => {
    setValidationError(null);
    runCloudBuild(DEFAULT_DEVELOPER_OWNERSHIP);
  };

  const handleCustomOwnershipSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateOwnershipInput('custom', customName, customEmail);
    if (!check.valid) {
      setValidationError(check.errorAr || 'يرجى التحقق من البيانات المدخلة.');
      return;
    }
    setValidationError(null);
    runCloudBuild({
      mode: 'custom',
      ownerName: customName.trim(),
      ownerEmail: customEmail.trim(),
    });
  };

  return (
    <div className="space-y-6">
      {/* Stage 2 Stepper Header */}
      <section className="rounded-2xl bg-[#121826] border border-slate-800 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white">
            المرحلة الثانية: المعاينة، الملكية، والبناء السحابي التلقائي
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {step === 'preview' && 'الخطوة ١: المعاينة التفاعلية الحية للتأكد من عمل اللعبة أو التطبيق بالكامل قبل البناء.'}
            {step === 'ownership' && 'الخطوة ٢: تحديد ملكية التطبيق (الحساب الافتراضي أو نقل الملكية لمستخدم مخصص).'}
            {step === 'processing' && 'الخطوة ٣: المعالجة السحابية التلقائية وتوليد التوقيع الرقمي ونسختي الـ APK...'}
            {step === 'done' && 'اكتمل البناء السحابي بنجاح وتم حفظ النسختين في مجلد ملفاتي وإنشاء الباركود.'}
          </p>
        </div>

        <button
          type="button"
          onClick={onBackToStage1}
          className="px-4 py-2 rounded-xl border border-slate-700 hover:border-slate-500 text-xs font-bold text-slate-200 flex items-center gap-2 self-start whitespace-nowrap shrink-0"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة لشباك الأكواد</span>
        </button>
      </section>

      {/* STEP 1: Live Interactive Preview FIRST */}
      {step === 'preview' && (
        <section className="rounded-2xl bg-[#121826] border border-slate-800 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-800 bg-[#0F1522]">
            <div className="flex items-center gap-2.5">
              <Play className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white">
                المعاينة التفاعلية الحية — {spec.appName}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {spec.category === 'game' && (
                <div className="inline-flex rounded-lg bg-[#0B0F17] border border-slate-800 p-0.5">
                  <button
                    type="button"
                    onClick={() => setPreviewViewMode('3d')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                      previewViewMode === '3d'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    معاينة 3D التفاعلية
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewViewMode('bundle')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                      previewViewMode === 'bundle'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    تجربة اللعب الكاملة
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => setPreviewKey((k) => k + 1)}
                className="px-3 py-1.5 rounded-lg bg-[#1A2234] hover:bg-[#232D44] border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>إعادة تشغيل المعاينة</span>
              </button>
            </div>
          </div>

          {/* Isolated Interactive Runner */}
          <div className="bg-[#070A11] p-3 sm:p-5 flex justify-center">
            {spec.category === 'game' && previewViewMode === '3d' ? (
              <div className="w-full max-w-4xl">
                <Feemi3DViewport
                  key={`stage2-3d-${previewKey}`}
                  spec={spec}
                  heightClass="h-[460px]"
                />
              </div>
            ) : (
              <div className="w-full max-w-4xl h-[460px] rounded-xl overflow-hidden border border-slate-800 bg-black">
                <iframe
                  key={previewKey}
                  title={`معاينة ${spec.appName}`}
                  srcDoc={code}
                  sandbox="allow-scripts"
                  className="w-full h-full border-0"
                />
              </div>
            )}
          </div>

          <div className="px-5 py-4 border-t border-slate-800 bg-[#0F1522] flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-400">
              {spec.category === 'game'
                ? 'حرّك الشخصيات وجرّب القفز والفيزياء والتدوير بحرية مباشرة في المعاينة قبل الانتقال لخطوة البناء.'
                : 'جرّب أزرار وقوائم التطبيق القياسية مباشرة في المعاينة (بدون فيزياء) قبل الانتقال لخطوة البناء.'}
            </span>
            <button
              type="button"
              onClick={() => setStep('ownership')}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <span>متابعة إلى تحديد الملكية</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </section>
      )}

      {/* STEP 2: Ownership Selection (Default vs Custom) */}
      {step === 'ownership' && (
        <section className="max-w-3xl mx-auto rounded-2xl bg-[#121826] border border-slate-800 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-extrabold text-white">
                تحديد ملكية التطبيق والتوقيع الرقمي
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                اختر ربط المشروع بحساب المطور الأساسي تلقائياً أو أدخل بيانات المشتري لنقل الملكية بالكامل.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep('preview')}
              className="text-xs font-semibold text-sky-400 hover:text-sky-300"
            >
              مراجعة المعاينة
            </button>
          </div>

          {buildError && (
            <div className="rounded-xl bg-rose-950/60 border border-rose-500/40 px-4 py-3 text-xs text-rose-200">
              {buildError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Option 1: Default Ownership */}
            <div className="rounded-2xl bg-[#0B0F17] border border-slate-800 p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <UserCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">افتراضي</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  يربط المشروع تلقائياً ببيانات وحساب المطور الأساسي دون الحاجة لكتابة أي بيانات إضافية.
                </p>
                <div className="pt-2 text-xs text-slate-300 space-y-1 border-t border-slate-800/70">
                  <div>المطور: {DEFAULT_DEVELOPER_OWNERSHIP.ownerName}</div>
                  <div dir="ltr" className="font-mono text-slate-400 text-right">
                    {DEFAULT_DEVELOPER_OWNERSHIP.ownerEmail}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDefaultOwnership}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm transition-colors"
              >
                افتراضي — بدء البناء السحابي
              </button>
            </div>

            {/* Option 2: Custom / Transfer Ownership */}
            <div className="rounded-2xl bg-[#0B0F17] border border-slate-800 p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">
                  مخصص للبيانات / نقل الملكية
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  أدخل الاسم والبريد الإلكتروني ليصبح التطبيق مسجلاً وموقعاً باسم المشتري أو العميل بالكامل.
                </p>
                <button
                  type="button"
                  onClick={() => setOwnershipMode('custom')}
                  className={`w-full py-2.5 rounded-xl border text-xs font-bold transition-colors ${
                    ownershipMode === 'custom'
                      ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                      : 'bg-[#121826] border-slate-700 text-slate-200 hover:border-slate-500'
                  }`}
                >
                  مخصص للبيانات / نقل الملكية
                </button>
              </div>

              {ownershipMode === 'custom' && (
                <form onSubmit={handleCustomOwnershipSubmit} className="space-y-3 pt-2 border-t border-slate-800">
                  <div>
                    <label
                      htmlFor="owner-name-input"
                      className="block text-xs text-slate-300 mb-1"
                    >
                      الاسم الكامل
                    </label>
                    <input
                      id="owner-name-input"
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="أدخل اسم المالك أو المشتري"
                      className="w-full rounded-lg bg-[#121826] border border-slate-700 focus:border-sky-400 focus:outline-none px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="owner-email-input"
                      className="block text-xs text-slate-300 mb-1"
                    >
                      الإيميل (البريد الإلكتروني)
                    </label>
                    <input
                      id="owner-email-input"
                      type="email"
                      dir="ltr"
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      placeholder="buyer@example.com"
                      className="w-full rounded-lg bg-[#121826] border border-slate-700 focus:border-sky-400 focus:outline-none px-3 py-2 text-sm text-white font-mono"
                    />
                  </div>
                  {validationError && (
                    <p className="text-xs text-rose-400">{validationError}</p>
                  )}
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-sm transition-colors"
                  >
                    تأكيد الملكية وبناء الـ APK
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      )}

      {/* STEP 3: Automated Cloud & AI Processing */}
      {step === 'processing' && (
        <section className="max-w-xl mx-auto rounded-2xl bg-[#121826] border border-slate-800 p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
            <CloudCog className="w-8 h-8 animate-spin" />
          </div>
          <h2 className="text-lg font-extrabold text-white">
            جاري المعالجة والبناء السحابي التلقائي...
          </h2>
          <ul className="text-xs text-slate-300 space-y-2 text-right max-w-sm mx-auto">
            <li className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>توليد التوقيع الرقمي (RSA-2048 / SHA-256) وضبط الإعدادات بالإنجليزية</span>
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>إصلاح أي تعارضات وتأمين الحزمة ضد الثغرات</span>
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>توليد وحفظ النسختين في مجلد ملفاتي وإنشاء الباركود المباشر</span>
            </li>
          </ul>
        </section>
      )}

      {/* STEP 3 DONE: Build Complete Summary */}
      {step === 'done' && builtProject && (
        <section className="max-w-2xl mx-auto rounded-2xl bg-[#121826] border border-emerald-500/40 p-6 space-y-6">
          <div className="flex items-start gap-4">
            <div
              className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-slate-700 [&>svg]:w-full [&>svg]:h-full [&>svg]:block"
              dangerouslySetInnerHTML={{ __html: builtProject.svgIcon }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>تم البناء السحابي التلقائي وحفظ النسختين بنجاح</span>
              </div>
              <h2 className="text-xl font-extrabold text-white truncate">
                {builtProject.appName}
              </h2>
              <div dir="ltr" className="text-xs font-mono text-slate-400 text-right">
                {builtProject.packageName} · {(builtProject.apkSizeBytes / 1024).toFixed(1)} KB APK
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-[#0B0F17] border border-slate-800 p-4 space-y-2 text-xs">
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">المالك المسجل:</span>
              <span className="font-bold text-white">{builtProject.ownership.ownerName}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">البريد الإلكتروني:</span>
              <span dir="ltr" className="font-mono text-sky-300">{builtProject.ownership.ownerEmail}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">التوقيع الرقمي (SHA-256):</span>
              <span dir="ltr" className="font-mono text-emerald-400 truncate max-w-[260px]">
                {builtProject.signature.sha256Fingerprint}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <a
              href={`/api/projects/${builtProject.shareSlug}/apk`}
              download={builtProject.apkFileName}
              className="py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>تثبيت APK الآن</span>
            </a>

            <a
              href={`/api/projects/${builtProject.shareSlug}/zip`}
              download={`${builtProject.englishSlug}-apk-ready.zip`}
              className="py-3 px-4 rounded-xl bg-[#1A2234] hover:bg-[#232D44] border border-emerald-500/40 text-emerald-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Archive className="w-4 h-4" />
              <span>حزمة ZIP + package.json</span>
            </a>

            <button
              type="button"
              onClick={onGoToFiles}
              className="py-3 px-4 rounded-xl bg-[#1A2234] hover:bg-[#232D44] border border-slate-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <FolderOpen className="w-4 h-4 text-amber-400" />
              <span>فتح مجلد ملفاتي</span>
            </button>

            <button
              type="button"
              onClick={onGoToBarcode}
              className="py-3 px-4 rounded-xl bg-[#1A2234] hover:bg-[#232D44] border border-slate-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <QrCode className="w-4 h-4 text-sky-400" />
              <span>صفحة الباركود</span>
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
