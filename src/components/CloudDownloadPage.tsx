import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Download, ShieldCheck } from 'lucide-react';
import { BuiltProjectRecord } from '../types/project';

interface CloudDownloadPageProps {
  slug: string;
  onExitDownloadMode: () => void;
}

export function CloudDownloadPage({
  slug,
  onExitDownloadMode,
}: CloudDownloadPageProps) {
  const [project, setProject] = useState<BuiltProjectRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [downloadStarted, setDownloadStarted] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrorMsg(null);
    fetch(`/api/projects/${encodeURIComponent(slug)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.project) {
          throw new Error(data.error || 'تعذر العثور على رابط التنزيل.');
        }
        if (active) setProject(data.project);
      })
      .catch((err) => {
        if (active) {
          setErrorMsg(
            err instanceof Error ? err.message : 'تعذر تحميل بيانات التطبيق.'
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  const handleDownloadApk = () => {
    if (!project) return;
    setDownloadStarted(true);
    const a = document.createElement('a');
    a.href = `/api/projects/${encodeURIComponent(project.shareSlug)}/apk`;
    a.download = project.apkFileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col items-center justify-center p-5">
      <div className="w-full max-w-md rounded-3xl bg-[#121826] border border-slate-800 p-7 text-center space-y-6 shadow-2xl">
        {loading ? (
          <div className="py-12 space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 animate-pulse mx-auto" />
            <div className="h-5 w-40 bg-slate-800 animate-pulse mx-auto rounded" />
            <p className="text-xs text-slate-400">جاري تجهيز صفحة التحميل السحابية...</p>
          </div>
        ) : errorMsg || !project ? (
          <div className="py-8 space-y-4">
            <h1 className="text-lg font-extrabold text-white">
              رابط التحميل غير متاح
            </h1>
            <p className="text-sm text-rose-300">{errorMsg}</p>
            <button
              type="button"
              onClick={onExitDownloadMode}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white inline-flex items-center gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة إلى كود ترجم</span>
            </button>
          </div>
        ) : (
          <>
            {/* App Icon */}
            <div
              className="w-24 h-24 rounded-3xl overflow-hidden mx-auto border border-slate-700 shadow-lg [&>svg]:w-full [&>svg]:h-full [&>svg]:block"
              dangerouslySetInnerHTML={{ __html: project.svgIcon }}
            />

            {/* App Name & Verified Metadata */}
            <div className="space-y-1.5">
              <h1 className="text-2xl font-extrabold text-white">
                {project.appName}
              </h1>
              <p dir="ltr" className="text-xs font-mono text-slate-400">
                {project.packageName} · {(project.apkSizeBytes / 1024).toFixed(1)} KB
              </p>
              <p className="text-xs text-emerald-400 flex items-center justify-center gap-1.5 pt-1">
                <ShieldCheck className="w-4 h-4" />
                <span>ملف APK موثق وموقع رقمياً باسم {project.ownership.ownerName}</span>
              </p>
            </div>

            {/* Primary Download Button ("تنزيل") */}
            <button
              type="button"
              onClick={handleDownloadApk}
              className="w-full py-4 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 font-extrabold text-base flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-emerald-500/20"
            >
              <Download className="w-5 h-5" />
              <span>تنزيل</span>
            </button>

            {downloadStarted && (
              <div className="rounded-xl bg-emerald-950/50 border border-emerald-500/30 p-3.5 text-xs text-emerald-200 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>بدأ تنزيل ملف الـ APK — افتح الملف بعد التحميل للتثبيت على الهاتف فوراً.</span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>كود ترجم السحابي</span>
              <button
                type="button"
                onClick={onExitDownloadMode}
                className="text-sky-400 hover:text-sky-300 font-semibold"
              >
                فتح الاستوديو
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
