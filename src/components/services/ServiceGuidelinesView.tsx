'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Info, ShieldCheck, Sparkles } from 'lucide-react';
import { Bi } from '@/components/Bi';
import { T } from '@/components/T';
import { cn } from '@/lib/utils';
import { getServiceGuidelines, type ServiceGuideline } from '@/lib/services/guidelines';

interface Props {
  slug: string;
  selectedPackageId?: string;
  onPackageChange?: (pkgId: string) => void;
  variant?: 'detail' | 'booking';
  className?: string;
}

export function ServiceGuidelinesView({
  slug,
  selectedPackageId,
  onPackageChange,
  variant = 'detail',
  className,
}: Props) {
  const guide = getServiceGuidelines(slug);
  const [activePackageId, setActivePackageId] = useState<string>(() => {
    return selectedPackageId ?? guide?.packages?.[0]?.id ?? '';
  });

  if (!guide) return null;

  const handleSelectPackage = (pkgId: string) => {
    setActivePackageId(pkgId);
    onPackageChange?.(pkgId);
  };

  const currentPkg = guide.packages?.find((p) => p.id === (selectedPackageId ?? activePackageId));

  // Merge general inclusions + package specific inclusions
  const allIncluded = [
    ...guide.included,
    ...(currentPkg?.specificIncluded ?? []),
  ];

  // Merge general exclusions + package specific exclusions
  const allNotIncluded = [
    ...guide.notIncluded,
    ...(currentPkg?.specificNotIncluded ?? []),
  ];

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header & Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
              <ShieldCheck className="h-4 w-4" />
              <span>Service Scope & Guidelines</span>
            </span>
            {guide.label_en && (
              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-500 dark:text-amber-400">
                <Bi en={guide.label_en} ne={guide.label_ne} />
              </span>
            )}
          </div>
          <h2 className={cn(
            'tracking-tight text-fg',
            variant === 'detail' ? 'mt-1 text-2xl font-light sm:text-3xl' : 'mt-1 text-xl font-medium'
          )}>
            <Bi en="What's Included & What's Not Included" ne="के समावेश छ र के समावेश छैन" />
          </h2>
          <p className="mt-1 text-sm text-muted">
            <Bi
              en="Please review what the worker will and will not do before booking."
              ne="कृपया बुक गर्नुअघि सहयोगीले के काम गर्नेछन् र के काम गर्ने छैनन् स्पष्ट बुझ्नुहोस्।"
            />
          </p>
        </div>

        {/* Package Selector Tabs (e.g. Tuition Offline vs Online) */}
        {guide.packages && guide.packages.length > 0 && (
          <div className="flex rounded-full border border-line bg-surface p-1">
            {guide.packages.map((pkg) => {
              const active = pkg.id === (selectedPackageId ?? activePackageId);
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => handleSelectPackage(pkg.id)}
                  aria-pressed={active}
                  className={cn(
                    'rounded-full px-4 py-1.5 text-xs font-medium transition',
                    active
                      ? 'bg-primary text-primary-fg shadow-sm'
                      : 'text-muted hover:text-fg'
                  )}
                >
                  <Bi en={pkg.name_en} ne={pkg.name_ne} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Package Description if applicable */}
      {currentPkg?.description_en && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-fg">
          <p className="font-medium text-primary">
            <Bi en={currentPkg.name_en} ne={currentPkg.name_ne} />
          </p>
          <p className="mt-0.5 text-xs text-muted">
            <Bi en={currentPkg.description_en} ne={currentPkg.description_ne} />
          </p>
        </div>
      )}

      {/* Two Clearly Separated Cards: Included vs Not Included */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Included Card */}
        <div className="rounded-app border border-ok/30 bg-surface/90 p-5 sm:p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2.5 pb-3 border-b border-line/60">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-ok/15 text-ok">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-semibold text-fg">
                <Bi en="What the Worker Will Do" ne="सहयोगीले के काम गर्नेछन्" />
              </h3>
              <p className="text-xs text-muted">
                <Bi en="Included in this service" ne="यस सेवाभित्र समावेश गरिएका कार्यहरू" />
              </p>
            </div>
          </div>

          <ul className="space-y-3">
            {allIncluded.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-sm leading-relaxed text-fg/90">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok" />
                <span>
                  <Bi en={item.en} ne={item.ne} />
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Not Included Card */}
        <div className="rounded-app border border-bad/30 bg-surface/90 p-5 sm:p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2.5 pb-3 border-b border-line/60">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-bad/15 text-bad">
              <XCircle className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-semibold text-fg">
                <Bi en="What the Worker Will Not Do" ne="सहयोगीले के काम गर्ने छैनन्" />
              </h3>
              <p className="text-xs text-muted">
                <Bi en="Not included in this service" ne="यस सेवाभित्र नपर्ने / निषेधित कार्यहरू" />
              </p>
            </div>
          </div>

          <ul className="space-y-3">
            {allNotIncluded.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-sm leading-relaxed text-muted">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-bad/80" />
                <span>
                  <Bi en={item.en} ne={item.ne} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Disclaimers & Notes */}
      {(guide.disclaimer || guide.importantNote) && (
        <div className="space-y-3">
          {guide.disclaimer && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-600 dark:text-amber-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <div>
                <p className="font-semibold uppercase tracking-wider">
                  <Bi en="Important Notice" ne="महत्त्वपूर्ण जानकारी" />
                </p>
                <p className="mt-0.5">
                  <Bi en={guide.disclaimer.en} ne={guide.disclaimer.ne} />
                </p>
              </div>
            </div>
          )}

          {guide.importantNote && (
            <div className="flex items-start gap-3 rounded-xl border border-line bg-elev/50 p-4 text-xs leading-relaxed text-muted">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="font-medium text-fg">
                  <Bi en="Customer Booking Note" ne="बुकिङ गर्दा ध्यान दिनुपर्ने कुरा" />
                </p>
                <p className="mt-0.5">
                  <Bi en={guide.importantNote.en} ne={guide.importantNote.ne} />
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fair Work Agreement Statement */}
      <div className="rounded-xl border border-line bg-surface/50 px-4 py-3 text-center text-xs text-muted">
        <p>
          <Bi
            en="Workers will perform only the agreed tasks. Additional work requires separate approval and may incur additional charges."
            ne="सहयोगीले सहमति भएका तोकिएका कार्यहरू मात्र गर्नेछन्। थप कामको लागि पूर्वस्वीकृति र अतिरिक्त शुल्क लाग्न सक्छ।"
          />
        </p>
      </div>
    </div>
  );
}
