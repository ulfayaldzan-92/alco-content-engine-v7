'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { BrainCircuit, CalendarDays, Menu, PanelLeftClose, PanelLeftOpen, Zap, ShieldCheck, Key, ArrowUpRight } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { LicenseModal } from '@/components/license/LicenseModal';
import { useLicense } from '@/lib/license/license-context';

interface ContentEngineShellProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  mobileActions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

const mainNavigationItems = [
  { href: '/', label: 'Kalender Konten', icon: CalendarDays },
  { href: '/production-studio', label: 'Production Studio', icon: BrainCircuit },
];

export default function ContentEngineShell({
  title,
  subtitle,
  eyebrow = 'Stage 2: Execution',
  actions,
  mobileActions,
  footer,
  children,
}: ContentEngineShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const { state } = useLicense();

  const isLicensed = state.status === 'active' && !!state.license;
  const planLabel = state.license?.plan?.toUpperCase() || (isLicensed ? 'ACTIVE' : 'UNLICENSED');

  useEffect(() => {
    const saved = window.localStorage.getItem('alco_content_sidebar_open');
    if (saved !== null) {
      setSidebarOpen(saved === 'true');
    } else if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      window.localStorage.setItem('alco_content_sidebar_open', String(next));
      return next;
    });
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex font-sans overflow-hidden">
      {sidebarOpen && (
        <button
          aria-label="Tutup navigasi"
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar: Standard 256px expanded / 64px collapsed */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 border-r border-sidebar-border bg-sidebar transition-all duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'w-64 translate-x-0 p-4' : '-translate-x-full lg:w-16 lg:p-3'
        } flex shrink-0 flex-col`}
      >
        {/* App Identity */}
        <div className={`mb-6 flex items-center gap-2 ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Zap size={17} />
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-sm font-black text-foreground">ALCO Content</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                    Engine
                  </span>
                </div>
                <div className="truncate text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Execution Workspace</div>
              </div>
            )}
          </div>
          <button
            aria-label={sidebarOpen ? 'Ciutkan navigasi' : 'Buka navigasi'}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-primary transition hover:bg-muted"
            onClick={toggleSidebar}
          >
            {sidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
          </button>
        </div>

        <nav className="flex-1 space-y-4">
          {/* SECTION: MAIN / WORKSPACE */}
          <div className="space-y-1">
            {sidebarOpen && <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Workspace</p>}
            {mainNavigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.label === 'Kalender Konten' ? pathname === '/' : item.href !== '/' && pathname.startsWith(item.href);

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex h-10 items-center gap-3 rounded-lg px-3 text-xs font-bold transition ${
                    !sidebarOpen ? 'justify-center px-0' : ''
                  } ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                  title={!sidebarOpen ? item.label : undefined}
                >
                  <Icon size={16} className="shrink-0" />
                  {sidebarOpen && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>

          {/* SECTION: ALCO ECOSYSTEM (Section 8.1 & 18) */}
          <div className="space-y-1 border-t border-sidebar-border/80 pt-3">
            {sidebarOpen && <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">ALCO Ecosystem</p>}
            
            <div
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground ${
                !sidebarOpen ? 'justify-center px-0' : ''
              }`}
              title={!sidebarOpen ? 'Creative System (Input)' : undefined}
            >
              <div className="w-4 h-4 rounded-full bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center text-[9px] font-black shrink-0">
                C
              </div>
              {sidebarOpen && (
                <div className="flex items-center justify-between w-full min-w-0">
                  <span className="truncate text-xs">Creative System</span>
                  <span className="text-[9px] font-semibold text-muted-foreground/80">Input</span>
                </div>
              )}
            </div>

            <div
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground ${
                !sidebarOpen ? 'justify-center px-0' : ''
              }`}
              title={!sidebarOpen ? 'Auto Motion (Output)' : undefined}
            >
              <div className="w-4 h-4 rounded-full bg-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-400 flex items-center justify-center text-[9px] font-black shrink-0">
                M
              </div>
              {sidebarOpen && (
                <div className="flex items-center justify-between w-full min-w-0">
                  <span className="truncate text-xs">Auto Motion</span>
                  <span className="text-[9px] font-semibold text-muted-foreground/80">Output</span>
                </div>
              )}
            </div>
          </div>

          {/* SECTION: SETTINGS & LICENSE */}
          <div className="space-y-1 border-t border-sidebar-border/80 pt-3">
            {sidebarOpen && <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Settings &amp; License</p>}
            <button
              onClick={() => setIsLicenseModalOpen(true)}
              className={`w-full flex h-10 items-center gap-3 rounded-lg px-3 text-xs font-bold transition text-muted-foreground hover:bg-secondary hover:text-foreground ${
                !sidebarOpen ? 'justify-center px-0' : ''
              }`}
              title={!sidebarOpen ? 'Lisensi ALCO' : undefined}
            >
              {isLicensed ? (
                <ShieldCheck size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Key size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
              )}
              {sidebarOpen && (
                <div className="flex items-center justify-between w-full min-w-0">
                  <span className="truncate">Lisensi ALCO</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                      isLicensed
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    {planLabel}
                  </span>
                </div>
              )}
            </button>
          </div>
        </nav>

        {sidebarOpen && (
          <div className="border-t border-sidebar-border pt-3 text-[10px] font-semibold leading-relaxed text-muted-foreground">
            Aladzan Corpora Ecosystem &bull; Desktop Productivity
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header: Standard Contextual Header */}
        <header className="sticky top-0 z-30 shrink-0 border-b border-border bg-card/85 px-4 py-3 backdrop-blur-md md:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <button
                aria-label="Buka navigasi"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-secondary text-primary transition hover:bg-muted lg:hidden"
                onClick={toggleSidebar}
              >
                <Menu size={17} />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-sm font-black text-foreground md:text-base">{title}</h1>
                  <span className="shrink-0 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-700 dark:text-cyan-300">
                    {eyebrow}
                  </span>
                </div>
                {subtitle && <p className="hidden truncate text-xs text-muted-foreground sm:block">{subtitle}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsLicenseModalOpen(true)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs ${
                  isLicensed
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 hover:border-emerald-400'
                    : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 hover:border-amber-400'
                }`}
                title="ALCO License System"
              >
                {isLicensed ? <ShieldCheck size={14} /> : <Key size={14} />}
                <span className="hidden sm:inline">{isLicensed ? `${planLabel}` : 'Lisensi'}</span>
              </button>

              <ThemeToggle />
              {actions && <div className="hidden items-center gap-2 md:flex">{actions}</div>}
              {mobileActions && <div className="flex items-center gap-2 md:hidden">{mobileActions}</div>}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {footer}
      </div>

      <LicenseModal isOpen={isLicenseModalOpen} onClose={() => setIsLicenseModalOpen(false)} />
    </main>
  );
}
