import { useState } from 'react';
import {
  Archive,
  Check,
  Copy,
  ExternalLink,
  Link2,
  ShieldAlert,
  Terminal,
  X,
} from 'lucide-react';
import { FeemiDesignSpec } from '../types/project';
import { QrWrappedBadge } from './QrWrappedBadge';

interface SecretGearPanelProps {
  isOpen: boolean;
  onClose: () => void;
  spec: FeemiDesignSpec;
  code: string;
  activeShareUrl: string;
  onExecuteUnrestricted: (command: string) => string;
  onResetEngine: () => void;
  onOpenDirectDownload: () => void;
}

export function SecretGearPanel({
  isOpen,
  onClose,
  spec,
  code,
  activeShareUrl,
  onExecuteUnrestricted,
  onResetEngine,
  onOpenDirectDownload,
}: SecretGearPanelProps) {
  const [rawCommand, setRawCommand] = useState('');
  const [logs, setLogs] = useState<string[]>([
    'لوحة التحكم السرية نشطة — جميع أوامر التعديل الجذرية متاحة بلا قيود.',
  ]);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const handleRunCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawCommand.trim()) return;
    const resultMsg = onExecuteUnrestricted(rawCommand);
    setLogs((prev) => [resultMsg, ...prev].slice(0, 8));
    setRawCommand('');
  };

  const handlePreset = (cmd: string) => {
    const resultMsg = onExecuteUnrestricted(cmd);
    setLogs((prev) => [resultMsg, ...prev].slice(0, 8));
  };

  const handleCopyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(activeShareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      // Fallback ignored
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="لوحة التحكم السرية المتقدمة"
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#101624] border border-slate-800 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 sticky top-0 bg-[#101624] z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                لوحة التحكم السرية الجذرية
              </h2>
              <p className="text-xs text-slate-400">
                تنفيذ أوامر وتعديلات مباشرة على الكود وإعدادات النظام بلا قيود
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق لوحة التحكم السرية"
            className="min-w-[40px] min-h-[40px] rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Unrestricted Command Execution Section */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="secret-command-input"
                className="text-sm font-semibold text-slate-200 flex items-center gap-2"
              >
                <Terminal className="w-4 h-4 text-emerald-400" />
                إضافة أو تعديل أمر جذري (بلا حدود)
              </label>
              <span className="text-xs font-mono text-slate-400 tabular-nums">
                {code.split('\n').length} lines · {spec.packageName}
              </span>
            </div>

            <form onSubmit={handleRunCommand} className="space-y-2.5">
              <textarea
                id="secret-command-input"
                dir="ltr"
                value={rawCommand}
                onChange={(e) => setRawCommand(e.target.value)}
                rows={3}
                placeholder='Example: SET packageName=com.vip.game | SET speed=480 | REPLACE 100 => 250 | console.log("Root Patch");'
                className="w-full rounded-xl bg-[#090D16] border border-slate-700 focus:border-emerald-500 focus:outline-none p-3 text-sm font-mono text-emerald-300 placeholder:text-slate-600"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handlePreset('SET speed=500')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors"
                  >
                    سرعة قصوى (500)
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePreset('SET versionCode=99')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors"
                  >
                    ترقية الإصدار v99
                  </button>
                  <button
                    type="button"
                    onClick={onResetEngine}
                    className="px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-800/50 hover:bg-rose-900/60 text-xs text-rose-200 transition-colors"
                  >
                    إعادة تصفير المحرك
                  </button>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors whitespace-nowrap shrink-0"
                >
                  تنفيذ الأمر الجذري
                </button>
              </div>
            </form>

            {/* Execution log */}
            <div className="rounded-xl bg-[#090D16] border border-slate-800 p-3 space-y-1.5 max-h-28 overflow-y-auto">
              {logs.map((entry, idx) => (
                <p key={idx} className="text-xs text-slate-300">
                  • {entry}
                </p>
              ))}
            </div>
          </section>

          <hr className="border-slate-800" />

          {/* Dedicated Barcode & Links Section BELOW the Add/Edit Commands section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-sky-400" />
                قسم الباركود والروابط المباشرة
              </h3>
              <button
                type="button"
                onClick={onOpenDirectDownload}
                className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-semibold"
              >
                <span>فتح صفحة التحميل</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-5 rounded-xl bg-[#0B101B] border border-slate-800 p-4">
              <QrWrappedBadge
                projectName={spec.appName}
                url={activeShareUrl}
                size={172}
                accentColor={spec.primaryColor}
              />
              <div className="flex-1 w-full space-y-3 text-right">
                <div>
                  <div className="text-xs text-slate-400 mb-1">
                    رابط التحميل السحابي الفوري للمشروع
                  </div>
                  <div
                    dir="ltr"
                    className="rounded-lg bg-[#070A11] border border-slate-800 px-3 py-2 text-xs font-mono text-sky-300 break-all"
                  >
                    {activeShareUrl}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyShareUrl}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-100 transition-colors"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>تم نسخ الرابط</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ رابط المشاركة</span>
                      </>
                    )}
                  </button>
                  <a
                    href="/api/export-workspace-zip"
                    download="code-targem-full-project.zip"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-xs font-bold text-emerald-300 transition-colors"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>تنزيل كل ملفات المشروع (ZIP)</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Required Developer Credit directly below QR & Links section */}
            <div className="pt-2 text-center border-t border-slate-800/80">
              <p className="text-sm font-extrabold text-emerald-400 tracking-wide">
                المطور عمر تامر عبد السلام العاشر
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
