import { useState } from 'react';
import { Check, Copy, ExternalLink, QrCode } from 'lucide-react';
import { BuiltProjectRecord } from '../types/project';
import { QrWrappedBadge } from './QrWrappedBadge';

interface BarcodeHubProps {
  projects: BuiltProjectRecord[];
  originUrl: string;
  onOpenDirectDownload: (slug: string) => void;
  onCreateNewProject: () => void;
}

export function BarcodeHub({
  projects,
  originUrl,
  onOpenDirectDownload,
  onCreateNewProject,
}: BarcodeHubProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyLink = async (id: string, shareUrl: string) => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-[#121826] border border-slate-800 p-5">
        <h1 className="text-xl font-extrabold text-white flex items-center gap-2.5">
          <QrCode className="w-6 h-6 text-sky-400" />
          <span>الباركود — المشاركة والتسليم الفوري</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          يولّد الخادم السحابي لكل مشروع رمز باركود خاصاً يحمل اسم المشروع ملفوفاً حول إطاره. عند مسحه بأي هاتف تفتح صفحة التحميل المباشر لتثبيت الـ APK فوراً.
        </p>
      </section>

      {projects.length === 0 ? (
        <div className="rounded-2xl bg-[#121826] border border-slate-800 p-10 text-center space-y-4">
          <QrCode className="w-12 h-12 text-slate-600 mx-auto" />
          <h2 className="text-lg font-bold text-white">لا توجد رموز باركود بعد</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            قم ببناء لعبة أو تطبيق في المرحلة الثانية ليتم توليد باركود المشاركة المباشر تلقائياً.
          </p>
          <button
            type="button"
            onClick={onCreateNewProject}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-extrabold"
          >
            الذهاب للاستوديو
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => {
            const shareUrl = `${originUrl}/?download=${encodeURIComponent(project.shareSlug)}`;
            const isCopied = copiedId === project.id;

            return (
              <article
                key={project.id}
                className="rounded-2xl bg-[#121826] border border-slate-800 p-5 flex flex-col items-center text-center space-y-4"
              >
                <QrWrappedBadge
                  projectName={project.appName}
                  url={shareUrl}
                  size={220}
                  accentColor={project.spec.primaryColor}
                />

                <div className="w-full space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <div
                      className="w-6 h-6 rounded-md overflow-hidden shrink-0 [&>svg]:w-full [&>svg]:h-full [&>svg]:block"
                      dangerouslySetInnerHTML={{ __html: project.svgIcon }}
                    />
                    <h2 className="text-base font-extrabold text-white truncate">
                      {project.appName}
                    </h2>
                  </div>
                  <div dir="ltr" className="text-xs font-mono text-slate-400 truncate">
                    {project.packageName}
                  </div>
                </div>

                <div className="w-full grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleCopyLink(project.id, shareUrl)}
                    className="py-2.5 px-3 rounded-xl bg-[#1A2234] hover:bg-[#232D44] border border-slate-700 text-xs font-bold text-slate-100 flex items-center justify-center gap-1.5"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ الرابط</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenDirectDownload(project.shareSlug)}
                    className="py-2.5 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>صفحة التنزيل</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
