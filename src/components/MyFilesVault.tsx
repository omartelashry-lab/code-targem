import { useState } from 'react';
import {
  Archive,
  CheckSquare,
  Cloud,
  Download,
  FileSearch,
  FolderOpen,
  ShieldCheck,
  Smartphone,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { BuiltProjectRecord } from '../types/project';
import { auditProjectCompleteness, buildSignedApkBytes } from '../engine/apkBuilder';

interface MyFilesVaultProps {
  projects: BuiltProjectRecord[];
  onProjectUpdated: (updated: BuiltProjectRecord) => void;
  onProjectsDeleted: (ids: string[]) => void;
  onCreateNewProject: () => void;
}

export function MyFilesVault({
  projects,
  onProjectUpdated,
  onProjectsDeleted,
  onCreateNewProject,
}: MyFilesVaultProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [inspecting, setInspecting] = useState<BuiltProjectRecord | null>(null);

  // Cloud inspector editable fields
  const [editAppName, setEditAppName] = useState('');
  const [editPackageName, setEditPackageName] = useState('');
  const [editOwnerName, setEditOwnerName] = useState('');
  const [editOwnerEmail, setEditOwnerEmail] = useState('');
  const [editCode, setEditCode] = useState('');
  const [inspectError, setInspectError] = useState<string | null>(null);
  const [savingCloud, setSavingCloud] = useState(false);
  const [vaultToast, setVaultToast] = useState<string | null>(null);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === projects.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(projects.map((p) => p.id));
    }
  };

  const openCloudInspector = (project: BuiltProjectRecord) => {
    setInspecting(project);
    setEditAppName(project.appName);
    setEditPackageName(project.packageName);
    setEditOwnerName(project.ownership.ownerName);
    setEditOwnerEmail(project.ownership.ownerEmail);
    setEditCode(project.code);
    setInspectError(null);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    try {
      await fetch('/api/projects/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      onProjectsDeleted(selectedIds);
      setSelectedIds([]);
      setVaultToast('تم حذف الملفات المحددة من السحابة بنجاح.');
    } catch {
      setVaultToast('تعذر حذف الملفات المحددة.');
    }
  };

  const handleBatchDownload = () => {
    const chosen = projects.filter((p) => selectedIds.includes(p.id));
    chosen.forEach((proj, idx) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = `/api/projects/${proj.shareSlug}/apk`;
        a.download = proj.apkFileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }, idx * 250);
    });
    setVaultToast(`جاري تنزيل ${chosen.length} ملف APK للتثبيت على الهاتف.`);
  };

  const handleSaveAndReExportApk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspecting) return;
    setSavingCloud(true);
    setInspectError(null);

    try {
      const response = await fetch(`/api/projects/${inspecting.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName: editAppName,
          packageName: editPackageName,
          code: editCode,
          ownership: {
            mode: 'custom',
            ownerName: editOwnerName,
            ownerEmail: editOwnerEmail,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.project) {
        throw new Error(data.error || 'تعذر تحديث النسخة السحابية.');
      }

      const updated: BuiltProjectRecord = data.project;
      onProjectUpdated(updated);
      setInspecting(updated);

      // Re-export verified & clean APK immediately
      const apkBytes = buildSignedApkBytes(updated);
      const blob = new Blob([new Uint8Array(apkBytes)], {
        type: 'application/vnd.android.package-archive',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = updated.apkFileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setVaultToast('تم التحقق من التوقيع والملكية وإعادة تصدير ملف APK سليم ومؤكد.');
      setInspecting(null);
    } catch (err) {
      setInspectError(err instanceof Error ? err.message : 'خطأ في الحفظ السحابي.');
    } finally {
      setSavingCloud(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-[#121826] border border-slate-800 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2.5">
            <FolderOpen className="w-6 h-6 text-amber-400" />
            <span>ملفاتي — مخزن النسختين والفحص اليدوي</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            يُحفظ كل مشروع مبني تلقائياً في نسختين: نسخة APK محلية للتثبيت الفوري، ونسخة سحابية للفحص اليدوي وتصحيح أي أخطاء.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/api/export-workspace-zip"
            download="code-targem-full-project.zip"
            className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-xs font-bold text-emerald-300 flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Archive className="w-4 h-4" />
            <span>تنزيل كل ملفات المشروع (ZIP + package.json)</span>
          </a>
          {projects.length > 0 && (
            <button
              type="button"
              onClick={toggleSelectAll}
              className="px-3.5 py-2 rounded-xl bg-[#1A2234] hover:bg-[#232D44] border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5"
            >
              {selectedIds.length === projects.length ? (
                <CheckSquare className="w-4 h-4 text-emerald-400" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>
                {selectedIds.length === projects.length
                  ? 'إلغاء تحديد الكل'
                  : 'تعليم عدة ملفات'}
              </span>
            </button>
          )}
        </div>
      </section>

      {vaultToast && (
        <div
          role="status"
          className="rounded-xl bg-emerald-950/60 border border-emerald-500/40 px-4 py-3 text-sm text-emerald-200 flex items-center justify-between"
        >
          <span>{vaultToast}</span>
          <button
            type="button"
            onClick={() => setVaultToast(null)}
            aria-label="إغلاق الرسالة"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Multi-select batch action bar */}
      {selectedIds.length > 0 && (
        <div className="rounded-xl bg-[#172033] border border-sky-500/40 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-bold text-white tabular-nums">
            تم تحديد {selectedIds.length} مشاريع
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleBatchDownload}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير/تثبيت المحدد (APK)</span>
            </button>
            <button
              type="button"
              onClick={handleDeleteSelected}
              className="px-4 py-2 rounded-lg bg-rose-950/70 hover:bg-rose-900 border border-rose-700/60 text-rose-200 text-xs font-bold flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>حذف المحدد</span>
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {projects.length === 0 ? (
        <div className="rounded-2xl bg-[#121826] border border-slate-800 p-10 text-center space-y-4">
          <FolderOpen className="w-12 h-12 text-slate-600 mx-auto" />
          <h2 className="text-lg font-bold text-white">مجلد ملفاتي فارغ حالياً</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            ابدأ بإنشاء لعبة أو تطبيق في الاستوديو وأكمل المرحلة الثانية ليتم حفظ نسختي الـ APK المحلية والسحابية هنا تلقائياً.
          </p>
          <button
            type="button"
            onClick={onCreateNewProject}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-extrabold"
          >
            بناء أول مشروع الآن
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((project) => {
            const isSelected = selectedIds.includes(project.id);
            const completeness = auditProjectCompleteness(project);

            return (
              <article
                key={project.id}
                className={`rounded-2xl bg-[#121826] border p-5 space-y-4 transition-colors ${
                  isSelected ? 'border-emerald-500' : 'border-slate-800'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <button
                    type="button"
                    onClick={() => toggleSelect(project.id)}
                    aria-label={`تحديد مشروع ${project.appName}`}
                    className="mt-1 text-slate-400 hover:text-emerald-400 shrink-0"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>

                  <div
                    className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 border border-slate-700 [&>svg]:w-full [&>svg]:h-full [&>svg]:block"
                    dangerouslySetInnerHTML={{ __html: project.svgIcon }}
                  />

                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-extrabold text-white truncate">
                      {project.appName}
                    </h3>
                    <div dir="ltr" className="text-xs font-mono text-slate-400 truncate text-right">
                      {project.packageName}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      المالك: <span className="text-slate-200">{project.ownership.ownerName}</span>
                    </div>
                  </div>
                </div>

                {/* Dual-copy breakdown */}
                <div className="rounded-xl bg-[#0B0F17] border border-slate-800/90 p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>النسخة ١: APK محلي للتثبيت</span>
                    </span>
                    <span dir="ltr" className="font-mono text-slate-400 tabular-nums">
                      {(project.apkSizeBytes / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-sky-400 font-semibold">
                      <Cloud className="w-3.5 h-3.5" />
                      <span>النسخة ٢: سحابية للفحص والتعديل</span>
                    </span>
                    <span className="text-slate-300">
                      {completeness.complete ? 'مكتملة وموقعة' : 'تحتاج مراجعة'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <a
                    href={`/api/projects/${project.shareSlug}/apk`}
                    download={project.apkFileName}
                    className="py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تثبيت APK</span>
                  </a>

                  <a
                    href={`/api/projects/${project.shareSlug}/zip`}
                    download={`${project.englishSlug}-apk-ready.zip`}
                    className="py-2.5 px-3 rounded-xl bg-[#1A2234] hover:bg-[#232D44] border border-slate-700 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>حزمة ZIP</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => openCloudInspector(project)}
                    className="py-2.5 px-3 rounded-xl bg-[#1A2234] hover:bg-[#232D44] border border-slate-700 text-slate-100 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <FileSearch className="w-3.5 h-3.5 text-sky-400" />
                    <span>فحص السحابية</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Cloud Backup Manual Inspection & Re-export Modal */}
      {inspecting && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="فحص وتعديل النسخة السحابية"
        >
          <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl bg-[#101624] border border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 sticky top-0 bg-[#101624] z-10">
              <div>
                <h2 className="text-base font-extrabold text-white">
                  فحص النسخة السحابية وتصحيح الأخطاء يدوياً
                </h2>
                <p className="text-xs text-slate-400">
                  تحقق من اكتمال التوقيع الرقمي والاسم وبيانات الملكية والكود، ثم أعد تصدير APK سليم ومؤكد.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspecting(null)}
                aria-label="إغلاق الفحص السحابي"
                className="p-2 rounded-lg border border-slate-700 text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAndReExportApk} className="p-6 space-y-5">
              {/* Digital Signature Verification Box */}
              <div className="rounded-xl bg-[#0B0F17] border border-emerald-500/30 p-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>حالة التوقيع الرقمي: {inspecting.signature.verified ? 'موثق ومكتمل' : 'بحاجة لإعادة توقيع'}</span>
                  </span>
                  <span dir="ltr" className="font-mono text-slate-400">
                    {inspecting.signature.algorithm}
                  </span>
                </div>
                <div dir="ltr" className="text-[11px] font-mono text-slate-400 break-all">
                  SHA-256: {inspecting.signature.sha256Fingerprint}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="inspect-app-name" className="block text-xs text-slate-300 mb-1">
                    اسم التطبيق
                  </label>
                  <input
                    id="inspect-app-name"
                    type="text"
                    value={editAppName}
                    onChange={(e) => setEditAppName(e.target.value)}
                    required
                    className="w-full rounded-lg bg-[#090D16] border border-slate-700 px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label htmlFor="inspect-pkg-name" className="block text-xs text-slate-300 mb-1">
                    معرف الحزمة البرمجي (بالإنجليزية فقط)
                  </label>
                  <input
                    id="inspect-pkg-name"
                    type="text"
                    dir="ltr"
                    value={editPackageName}
                    onChange={(e) => setEditPackageName(e.target.value)}
                    required
                    className="w-full rounded-lg bg-[#090D16] border border-slate-700 px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="inspect-owner-name" className="block text-xs text-slate-300 mb-1">
                    اسم المالك المسجل
                  </label>
                  <input
                    id="inspect-owner-name"
                    type="text"
                    value={editOwnerName}
                    onChange={(e) => setEditOwnerName(e.target.value)}
                    required
                    className="w-full rounded-lg bg-[#090D16] border border-slate-700 px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label htmlFor="inspect-owner-email" className="block text-xs text-slate-300 mb-1">
                    بريد الملكية الإلكتروني
                  </label>
                  <input
                    id="inspect-owner-email"
                    type="email"
                    dir="ltr"
                    value={editOwnerEmail}
                    onChange={(e) => setEditOwnerEmail(e.target.value)}
                    required
                    className="w-full rounded-lg bg-[#090D16] border border-slate-700 px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1.5">
                  مراجعة وتصحيح الكود البرمجي (LTR)
                </label>
                <textarea
                  dir="ltr"
                  spellCheck={false}
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  rows={10}
                  className="code-editor w-full rounded-xl bg-[#080B12] border border-slate-700 p-3 text-xs font-mono text-slate-200 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {inspectError && (
                <p className="text-xs text-rose-400">{inspectError}</p>
              )}

              <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setInspecting(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingCloud}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-extrabold flex items-center gap-2 disabled:opacity-60"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {savingCloud
                      ? 'جاري التحقق وإعادة التصدير...'
                      : 'حفظ التصحيح وإعادة تصدير APK سليم ومؤكد'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
