'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, FileText, Layers, FolderOpen, AlertTriangle, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  StrategyBlueprint,
  SharedContentContext,
  ContentItem
} from '@/lib/content-contract';
import {
  getActiveProjectId,
  setActiveProjectId,
  loadProjectData,
  saveProjectData,
  updateProjectMeta,
  getProjectList,
  CalendarSettings,
  DEFAULT_CALENDAR_SETTINGS,
  getDefaultCalendarSettings,
  getProjectCalendarSettings,
  saveProjectCalendarSettings,
  invalidateProjectFunnelStrategy,
  saveProjectFunnelStrategy,
  loadProjectFunnelStrategy,
  validateProjectContext,
  ensureContentItemIdentity,
  clearGlobalTransientState,
  saveProjectSelectedItem
} from '@/lib/storage';
import { buildFunnelStrategyFromContext } from '@/lib/funnel-strategy';
import { ActiveStrategyBadge } from '@/components/ActiveStrategyBadge';
import { GeminiApiKeyControl } from '@/components/GeminiApiKeyControl';
import { GeminiApiKeyOnboardingCard } from '@/components/GeminiApiKeyOnboardingCard';
import { buildGeminiRequestHeaders, useGeminiApiKey } from '@/lib/client-gemini-key';
import CalendarView from '@/components/CalendarView';
import { StrategyIntakeModal } from '@/components/StrategyIntakeModal';
import ContentEngineShell from '@/components/ContentEngineShell';
import { useLicense } from '@/lib/license/license-context';

const safeCopyToClipboard = async (text: string) => {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Clipboard write failed:', error);
    return false;
  }
};

export default function HomePageClient() {
  const [isMounted, setIsMounted] = useState(false);
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(null);
  const [projectList, setProjectList] = useState<any[]>([]);
  const [isProjectIncomplete, setIsProjectIncomplete] = useState(false);
  const isSwitchingRef = useRef(false);
  const activeProjectIdRef = useRef<string | null>(null);
  const onboardingRef = useRef<HTMLDivElement>(null);
  const { hasCustomKey } = useGeminiApiKey();

  const [items, setItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegeneratingItem, setIsRegeneratingItem] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [activeConfigCell, setActiveConfigCell] = useState<number | null>(null);
  const [filterType, setFilterType] = useState('ALL');
  const [revisions, setRevisions] = useState<Record<number, string>>({});
  const [history, setHistory] = useState<any[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [strategyBlueprint, setStrategyBlueprint] = useState<StrategyBlueprint | null>(null);
  const [sharedContext, setSharedContext] = useState<SharedContentContext | null>(null);
  const [isIntakeModalOpen, setIsIntakeModalOpen] = useState(false);

  const { state: licenseState } = useLicense();
  const [accessCode, setAccessCode] = useState('');
  const isAccessValid = licenseState.status === 'active' && !!licenseState.license;
  const [isEditAccessLocked] = useState(false);
  const [, setShowUnlockModal] = useState(false);
  const accessStatus = {
    type: licenseState.license?.plan?.toUpperCase() || (isAccessValid ? 'FULL' : 'UNLICENSED'),
    maxContent: licenseState.license?.plan === 'starter' ? 10 : 30,
  };
  const [usageStats] = useState({ generates: 0, copies: 0 });

  // 14 calendar settings per project
  const [coreTopic, setCoreTopic] = useState(DEFAULT_CALENDAR_SETTINGS.coreTopic);
  const [startDate, setStartDate] = useState(DEFAULT_CALENDAR_SETTINGS.startDate);
  const [skipDays, setSkipDays] = useState<string[]>(DEFAULT_CALENDAR_SETTINGS.skipDays);
  const [gender, setGender] = useState(DEFAULT_CALENDAR_SETTINGS.gender);
  const [ageRange, setAgeRange] = useState<[number, number]>(DEFAULT_CALENDAR_SETTINGS.ageRange);
  const [formats, setFormats] = useState<string[]>(DEFAULT_CALENDAR_SETTINGS.formats);
  const [carouselSlides, setCarouselSlides] = useState<number>(DEFAULT_CALENDAR_SETTINGS.carouselSlides);
  const [reelsDuration, setReelsDuration] = useState<string>(DEFAULT_CALENDAR_SETTINGS.reelsDuration);
  const [ratio, setRatio] = useState(DEFAULT_CALENDAR_SETTINGS.ratio);
  const [hasUserFunnelOverride, setHasUserFunnelOverride] = useState(false);
  const [hasUserCtaOverride, setHasUserCtaOverride] = useState(false);
  const [hasUserHookOverride, setHasUserHookOverride] = useState(false);
  const [hasUserFormulaOverride, setHasUserFormulaOverride] = useState(false);
  const [hasUserCoreTopicOverride, setHasUserCoreTopicOverride] = useState(false);
  const [formatRatio, setFormatRatio] = useState<Record<string, number>>(DEFAULT_CALENDAR_SETTINGS.formatRatio);
  const [selectedVoices, setSelectedVoices] = useState<string[]>(DEFAULT_CALENDAR_SETTINGS.selectedVoices);
  const [hookMix, setHookMix] = useState<{ type: string; percentage?: number }[]>(DEFAULT_CALENDAR_SETTINGS.hookMix);
  const [selectedFormula, setSelectedFormula] = useState(DEFAULT_CALENDAR_SETTINGS.selectedFormula);
  const [referenceType, setReferenceType] = useState(DEFAULT_CALENDAR_SETTINGS.referenceType);
  const [selectedCTAs, setSelectedCTAs] = useState<string[]>(DEFAULT_CALENDAR_SETTINGS.selectedCTAs);
  const [isFastMode, setIsFastMode] = useState(DEFAULT_CALENDAR_SETTINGS.isFastMode);

  // Ref to cancel/discard stale async AI generations on project switch
  const activeGenerationRef = useRef<{ requestId: string; projectId: string } | null>(null);

  const applyCalendarSettings = (
    settings: Partial<CalendarSettings> | null,
    blueprint?: StrategyBlueprint | SharedContentContext | null,
    projectName?: string
  ) => {
    const fallbackDefaults = getDefaultCalendarSettings(blueprint, projectName);
    const s = settings || fallbackDefaults;

    const resolvedCoreTopic = s.coreTopic || fallbackDefaults.coreTopic;

    setCoreTopic(resolvedCoreTopic);
    setStartDate(s.startDate || fallbackDefaults.startDate);
    setSkipDays(Array.isArray(s.skipDays) ? s.skipDays : fallbackDefaults.skipDays);
    setGender(s.gender || fallbackDefaults.gender);
    setAgeRange(Array.isArray(s.ageRange) && s.ageRange.length === 2 ? s.ageRange : fallbackDefaults.ageRange);
    setFormats(Array.isArray(s.formats) && s.formats.length > 0 ? s.formats : fallbackDefaults.formats);
    setCarouselSlides(typeof s.carouselSlides === 'number' ? s.carouselSlides : fallbackDefaults.carouselSlides);
    setReelsDuration(s.reelsDuration || fallbackDefaults.reelsDuration);
    setRatio(s.ratio || fallbackDefaults.ratio);
    setHasUserFunnelOverride(Boolean(s.hasUserFunnelOverride));
    setHasUserCtaOverride(Boolean(s.hasUserCtaOverride));
    setHasUserHookOverride(Boolean(s.hasUserHookOverride));
    setHasUserFormulaOverride(Boolean(s.hasUserFormulaOverride));
    setHasUserCoreTopicOverride(Boolean(s.hasUserCoreTopicOverride));
    setFormatRatio(s.formatRatio || fallbackDefaults.formatRatio);
    setSelectedVoices(Array.isArray(s.selectedVoices) && s.selectedVoices.length > 0 ? s.selectedVoices : fallbackDefaults.selectedVoices);
    setHookMix(Array.isArray(s.hookMix) && s.hookMix.length > 0 ? s.hookMix : fallbackDefaults.hookMix);
    setSelectedFormula(s.selectedFormula || fallbackDefaults.selectedFormula);
    setReferenceType(s.referenceType || fallbackDefaults.referenceType);
    setSelectedCTAs(Array.isArray(s.selectedCTAs) && s.selectedCTAs.length > 0 ? s.selectedCTAs : fallbackDefaults.selectedCTAs);
    setIsFastMode(Boolean(s.isFastMode));
  };

  const saveCurrentProjectSnapshot = (pid: string | null) => {
    if (!pid || isProjectIncomplete || isSwitchingRef.current) return;
    const currentSettings: CalendarSettings = {
      coreTopic,
      startDate,
      skipDays,
      gender,
      ageRange,
      formats,
      carouselSlides,
      reelsDuration,
      ratio,
      hasUserFunnelOverride,
      hasUserCtaOverride,
      hasUserHookOverride,
      hasUserFormulaOverride,
      hasUserCoreTopicOverride,
      formatRatio,
      selectedVoices,
      hookMix,
      selectedFormula,
      referenceType,
      selectedCTAs,
      isFastMode
    };
    saveProjectCalendarSettings(pid, currentSettings);
    saveProjectData(pid, 'items', items);
    saveProjectData(pid, 'history', history);
    saveProjectData(pid, 'revisions', revisions);
  };

  const loadProject = (pid: string | null) => {
    // 0. Invalidate any in-flight AI generation from previous project immediately
    activeGenerationRef.current = null;

    // 1. Save current active project snapshot before switching away
    const oldPid = activeProjectIdRef.current;
    if (oldPid && oldPid !== pid && !isProjectIncomplete) {
      saveCurrentProjectSnapshot(oldPid);
    }

    // 2. Set switching flag to block auto-save effects during transition
    isSwitchingRef.current = true;

    // 3. Immediately clear all states of old project and clear global transient bridge
    setItems([]);
    setHistory([]);
    setRevisions({});
    setStrategyBlueprint(null);
    setSharedContext(null);
    setIsConfiguring(false);
    setActiveConfigCell(null);
    clearGlobalTransientState();

    // 4. Update active project ID
    setActiveProjectIdState(pid);
    setActiveProjectId(pid);
    activeProjectIdRef.current = pid;

    // 5. If pid is null, reset everything to defaults
    if (!pid) {
      setIsProjectIncomplete(false);
      applyCalendarSettings(getDefaultCalendarSettings(null), null);
      setTimeout(() => {
        isSwitchingRef.current = false;
      }, 50);
      return;
    }

    // 6. Validate that both blueprint and context are present, non-corrupted, and scoped to this project
    const savedBlueprint = loadProjectData(pid, 'blueprint');
    const savedContext = loadProjectData(pid, 'context');
    const validation = validateProjectContext(pid, savedBlueprint, savedContext);

    if (!validation.valid) {
      // Incomplete / corrupted / mismatched project data:
      // Do NOT show calendar, context, or items of previous project.
      setIsProjectIncomplete(true);
      setStrategyBlueprint(savedBlueprint || null);
      setSharedContext(savedContext || null);
      setItems([]);
      setHistory([]);
      setRevisions({});
      saveProjectSelectedItem(pid, null);
      applyCalendarSettings(getDefaultCalendarSettings(null), null);
      setTimeout(() => {
        isSwitchingRef.current = false;
      }, 50);
      return;
    }

    // 7. Project is valid and complete
    setIsProjectIncomplete(false);
    setStrategyBlueprint(savedBlueprint);
    setSharedContext(savedContext);

    const rawItems = loadProjectData(pid, 'items', []) as any[];
    const normalizedItems = (Array.isArray(rawItems) ? rawItems : []).map((item, idx) =>
      ensureContentItemIdentity(item, pid, idx)
    );

    const savedHistory = loadProjectData(pid, 'history', []);
    const savedRevisions = loadProjectData(pid, 'revisions', {});
    setItems(normalizedItems);
    setHistory(savedHistory);
    setRevisions(savedRevisions);

    // Sync selected item for this project
    if (normalizedItems.length > 0) {
      const existingSelected = loadProjectData(pid, 'selectedContentItem');
      const validSelected = existingSelected && normalizedItems.some(i => i.no === existingSelected.no);
      saveProjectSelectedItem(pid, validSelected ? existingSelected : normalizedItems[0]);
    } else {
      saveProjectSelectedItem(pid, null);
    }

    // Load or default calendar settings specifically for this project
    const savedSettings = getProjectCalendarSettings(pid);
    if (savedSettings) {
      applyCalendarSettings(savedSettings, savedBlueprint);
    } else {
      const freshDefault = getDefaultCalendarSettings(savedBlueprint);
      saveProjectCalendarSettings(pid, freshDefault);
      applyCalendarSettings(freshDefault, savedBlueprint);
    }

    setTimeout(() => {
      isSwitchingRef.current = false;
    }, 50);
  };

  const loadProjectRef = useRef<(pid: string | null) => void>(() => {});
  loadProjectRef.current = loadProject;

  // Initialization & Storage
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const pList = getProjectList();
      setProjectList(pList);

      const pid = getActiveProjectId();
      if (pid) {
        loadProjectRef.current(pid);
      } else {
        applyCalendarSettings(getDefaultCalendarSettings(null), null);
      }
    }
  }, []);

  // Auto-save blueprint & context
  useEffect(() => {
    if (isSwitchingRef.current || !activeProjectId || isProjectIncomplete || !strategyBlueprint || !sharedContext || activeProjectIdRef.current !== activeProjectId) {
      return;
    }
    saveProjectData(activeProjectId, 'blueprint', strategyBlueprint);
    saveProjectData(activeProjectId, 'context', sharedContext);
    updateProjectMeta(activeProjectId, strategyBlueprint.brand_identity?.brand_name || strategyBlueprint.project_name || 'ALCO Campaign');
    setProjectList(getProjectList());
  }, [strategyBlueprint, sharedContext, activeProjectId, isProjectIncomplete]);

  // Auto-save items & history
  useEffect(() => {
    if (isSwitchingRef.current || !activeProjectId || isProjectIncomplete || activeProjectIdRef.current !== activeProjectId) {
      return;
    }
    saveProjectData(activeProjectId, 'items', items);
    saveProjectData(activeProjectId, 'history', history);
    saveProjectData(activeProjectId, 'revisions', revisions);
  }, [items, history, revisions, activeProjectId, isProjectIncomplete]);

  // Auto-save calendar settings per project
  useEffect(() => {
    if (isSwitchingRef.current || !activeProjectId || isProjectIncomplete || !strategyBlueprint || !sharedContext || activeProjectIdRef.current !== activeProjectId) {
      return;
    }
    const currentSettings: CalendarSettings = {
      coreTopic,
      startDate,
      skipDays,
      gender,
      ageRange,
      formats,
      carouselSlides,
      reelsDuration,
      ratio,
      hasUserFunnelOverride,
      hasUserCtaOverride,
      hasUserHookOverride,
      hasUserFormulaOverride,
      formatRatio,
      selectedVoices,
      hookMix,
      selectedFormula,
      referenceType,
      selectedCTAs,
      isFastMode,
    };
    saveProjectCalendarSettings(activeProjectId, currentSettings);
  }, [
    activeProjectId,
    isProjectIncomplete,
    strategyBlueprint,
    sharedContext,
    coreTopic,
    startDate,
    skipDays,
    gender,
    ageRange,
    formats,
    carouselSlides,
    reelsDuration,
    ratio,
    hasUserFunnelOverride,
    hasUserCtaOverride,
    hasUserHookOverride,
    hasUserFormulaOverride,
    formatRatio,
    selectedVoices,
    hookMix,
    selectedFormula,
    referenceType,
    selectedCTAs,
    isFastMode,
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleApplyStrategy = (newBlueprint: StrategyBlueprint, newContext: SharedContentContext, isNewProject: boolean) => {
    let finalProjectId = activeProjectId;
    const incomingProjectId = newBlueprint.project_id || newContext.project_id;

    if (isNewProject || !finalProjectId) {
      finalProjectId = incomingProjectId || `proj_${Date.now()}`;
      if (finalProjectId === activeProjectId) {
        finalProjectId = `proj_${Date.now()}`;
      }
    }

    newBlueprint.project_id = finalProjectId;
    newContext.project_id = finalProjectId;

    const isDifferentProject = finalProjectId !== activeProjectId;

    if (isDifferentProject || isNewProject) {
      // 1. Snapshot previous project if one existed
      const oldPid = activeProjectIdRef.current;
      if (oldPid && oldPid !== finalProjectId && !isProjectIncomplete) {
        saveCurrentProjectSnapshot(oldPid);
      }

      // 2. Set switching flag to block auto-save effects
      isSwitchingRef.current = true;

      // 3. Reset calendar, items, and revision states completely
      setItems([]);
      setHistory([]);
      setRevisions({});
      setIsConfiguring(false);
      setActiveConfigCell(null);

      // 4. Generate clean default settings based on the new blueprint
      const freshSettings = getDefaultCalendarSettings(newBlueprint, newBlueprint.project_name);

      // 5. Save everything under finalProjectId immediately in storage
      saveProjectData(finalProjectId, 'blueprint', newBlueprint);
      saveProjectData(finalProjectId, 'context', newContext);
      saveProjectCalendarSettings(finalProjectId, freshSettings);
      saveProjectData(finalProjectId, 'items', []);
      saveProjectData(finalProjectId, 'growthItems', []);
      saveProjectData(finalProjectId, 'history', []);
      saveProjectData(finalProjectId, 'revisions', {});

      // 6. Update active project ID & state
      setActiveProjectIdState(finalProjectId);
      setActiveProjectId(finalProjectId);
      activeProjectIdRef.current = finalProjectId;

      // 7. Apply the new settings, blueprint, and context to React state
      applyCalendarSettings(freshSettings, newBlueprint, newBlueprint.project_name);
      setIsProjectIncomplete(false);
      setStrategyBlueprint(newBlueprint);
      setSharedContext(newContext);

      updateProjectMeta(finalProjectId, newBlueprint.brand_identity?.brand_name || newBlueprint.project_name || 'ALCO Campaign');
      setProjectList(getProjectList());

      setTimeout(() => {
        isSwitchingRef.current = false;
      }, 50);

      showToast(isDifferentProject ? `Beralih ke project: ${newBlueprint.brand_identity?.brand_name || newBlueprint.project_name || finalProjectId}` : 'Strategy Blueprint baru berhasil diterapkan!');
    } else {
      // Updating current project blueprint & context
      saveProjectData(finalProjectId, 'blueprint', newBlueprint);
      saveProjectData(finalProjectId, 'context', newContext);
      updateProjectMeta(finalProjectId, newBlueprint.brand_identity?.brand_name || newBlueprint.project_name || 'ALCO Campaign');
      setProjectList(getProjectList());

      setStrategyBlueprint(newBlueprint);
      setSharedContext(newContext);

      // Invalidate old persisted FunnelStrategy so the next generation re-derives strictly from new blueprint
      invalidateProjectFunnelStrategy(finalProjectId);

      // Refresh derived calendar settings while strictly preserving explicit user overrides
      const existingSettings = getProjectCalendarSettings(finalProjectId);
      const freshDerived = getDefaultCalendarSettings(newBlueprint);
      if (!existingSettings) {
        saveProjectCalendarSettings(finalProjectId, freshDerived);
        applyCalendarSettings(freshDerived, newBlueprint);
      } else {
        const merged: CalendarSettings = {
          ...freshDerived,
          ...existingSettings,
          ratio: existingSettings.hasUserFunnelOverride ? existingSettings.ratio : freshDerived.ratio,
          hasUserFunnelOverride: Boolean(existingSettings.hasUserFunnelOverride),
          selectedCTAs: existingSettings.hasUserCtaOverride ? existingSettings.selectedCTAs : freshDerived.selectedCTAs,
          hasUserCtaOverride: Boolean(existingSettings.hasUserCtaOverride),
          hookMix: existingSettings.hasUserHookOverride ? existingSettings.hookMix : freshDerived.hookMix,
          hasUserHookOverride: Boolean(existingSettings.hasUserHookOverride),
          selectedFormula: existingSettings.hasUserFormulaOverride ? existingSettings.selectedFormula : freshDerived.selectedFormula,
          hasUserFormulaOverride: Boolean(existingSettings.hasUserFormulaOverride),
          coreTopic: existingSettings.hasUserCoreTopicOverride
            ? existingSettings.coreTopic
            : freshDerived.coreTopic,
          hasUserCoreTopicOverride: Boolean(existingSettings.hasUserCoreTopicOverride),
        };
        saveProjectCalendarSettings(finalProjectId, merged);
        applyCalendarSettings(merged, newBlueprint);
      }

      showToast('Strategy Blueprint berhasil diperbarui!');
    }
  };

  const toggleSkipDay = (day: string) => {
    setSkipDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const toggleFormat = (fmt: string) => {
    setFormats(prev => prev.includes(fmt) ? prev.filter(f => f !== fmt) : [...prev, fmt]);
  };

  const toggleVoice = (v: string) => {
    setSelectedVoices(prev => prev.includes(v) ? prev.filter(item => item !== v) : [...prev, v]);
  };

  const toggleCTA = (cta: string) => {
    setSelectedCTAs(prev => prev.includes(cta) ? prev.filter(c => c !== cta) : [...prev, cta]);
  };

  const updateHookMix = (index: number, field: string, val: any) => {
    setHookMix(prev => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], [field]: val };
      } else {
        updated[index] = { type: 'Call-Out', [field]: val };
      }
      return updated;
    });
  };

  const handleOpenConfig = () => {
    if (isProjectIncomplete || !strategyBlueprint || !sharedContext) {
      showToast('Project ini tidak lengkap. Silakan upload blueprint ulang.');
      setIsIntakeModalOpen(true);
      return;
    }
    setIsConfiguring(true);
  };

  const handleGenerateCalendar = async () => {
    if (!hasCustomKey) {
      showToast('Hubungkan Gemini API Key dulu untuk menggunakan fitur generate AI.');
      onboardingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!activeProjectId || isProjectIncomplete || !strategyBlueprint || !sharedContext) {
      showToast('Project ini belum lengkap. Silakan impor Strategy Blueprint terlebih dahulu.');
      setIsIntakeModalOpen(true);
      return;
    }

    const validation = validateProjectContext(activeProjectId, strategyBlueprint, sharedContext);
    if (!validation.valid) {
      showToast(validation.reason || 'Project context tidak valid.');
      setIsIntakeModalOpen(true);
      return;
    }

    if (isLoading) return;

    const requestProjectId = activeProjectId;
    const requestId = `${requestProjectId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    activeGenerationRef.current = { requestId, projectId: requestProjectId };

    setIsLoading(true);
    const calculatedTotalPosts = (ratio.tofu || 0) + (ratio.mofu || 0) + (ratio.bofu || 0) || 14;

    showToast('Generasi strategi konten sedang berjalan via Gemini AI...');
    try {
      const response = await fetch('/api/gemini/generate-calendar', {
        method: 'POST',
        headers: buildGeminiRequestHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          projectId: requestProjectId,
          coreTopic: coreTopic || sharedContext?.brand_context?.brand_name || 'Peluncuran Produk Strategy',
          startDate,
          skipDays,
          gender,
          ageRange,
          totalPosts: calculatedTotalPosts,
          ratio: hasUserFunnelOverride ? ratio : undefined,
          hasUserFunnelOverride,
          hasUserCtaOverride,
          hasUserHookOverride,
          hasUserFormulaOverride,
          userOverrides: hasUserFunnelOverride ? { tofu: ratio.tofu, mofu: ratio.mofu, bofu: ratio.bofu } : undefined,
          formats,
          carouselSlides,
          reelsDuration,
          selectedVoices,
          selectedFormula: hasUserFormulaOverride ? selectedFormula : undefined,
          selectedCTAs: hasUserCtaOverride ? selectedCTAs : undefined,
          hookMix: hasUserHookOverride ? hookMix : undefined,
          referenceType,
          isFastMode,
          strategyBlueprint,
          sharedContentContext: sharedContext,
        }),
      });

      if (!response.ok) {
        let errText = 'Failed to generate calendar content';
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            errText = errData.error;
          }
        } catch (_) {}
        throw new Error(errText);
      }

      const data = await response.json();

      // Async race condition check: if user switched away to another project during generation, discard
      if (
        !activeGenerationRef.current ||
        activeGenerationRef.current.requestId !== requestId ||
        activeProjectIdRef.current !== requestProjectId
      ) {
        console.warn('Discarding stale calendar generation response for inactive project:', requestProjectId);
        return;
      }

      if (data.funnelStrategy) {
        saveProjectFunnelStrategy(requestProjectId, data.funnelStrategy);
      }

      if (data.items && data.items.length > 0) {
        const stampedItems = data.items.map((item: any, idx: number) =>
          ensureContentItemIdentity(item, requestProjectId, idx)
        );
        setItems(stampedItems);

        const newHistoryEntry = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          topic: coreTopic || sharedContext?.brand_context?.brand_name || 'Peluncuran Produk',
          itemCount: stampedItems.length,
          items: stampedItems,
        };
        const updatedHistory = [newHistoryEntry, ...history.slice(0, 9)];
        setHistory(updatedHistory);

        // Explicitly persist under requestProjectId
        saveProjectData(requestProjectId, 'items', stampedItems);
        saveProjectData(requestProjectId, 'history', updatedHistory);
        saveProjectSelectedItem(requestProjectId, stampedItems[0]);

        setIsConfiguring(false);
        showToast(`Berhasil membuat ${stampedItems.length} strategi konten berbasis funnel!`);
      } else {
        showToast('Respon tidak valid, silakan coba lagi.');
      }
    } catch (err: any) {
      if (
        !activeGenerationRef.current ||
        activeGenerationRef.current.requestId !== requestId ||
        activeProjectIdRef.current !== requestProjectId
      ) {
        return;
      }
      console.error(err);
      const errMsg = err.message || '';
      if (/dibatasi/i.test(errMsg) || /rate.*limit/i.test(errMsg) || /quota/i.test(errMsg) || /429/i.test(errMsg)) {
        showToast('Permintaan AI sedang dibatasi. Coba lagi beberapa saat.');
      } else {
        showToast('Gagal memuat strategi: ' + errMsg);
      }
    } finally {
      if (
        activeGenerationRef.current?.requestId === requestId &&
        activeProjectIdRef.current === requestProjectId
      ) {
        setIsLoading(false);
        activeGenerationRef.current = null;
      }
    }
  };

  const handleReschedule = (itemId: number, newDate: string) => {
    if (!activeProjectId) return;
    setItems(prev => {
      const next = prev.map(item => item.no === itemId ? { ...item, tanggal: newDate } : item);
      saveProjectData(activeProjectId, 'items', next);
      return next;
    });
    showToast(`Post #${itemId} dijadwalkan ulang ke ${newDate}`);
  };

  const handleUpdateItem = (updatedItem: ContentItem) => {
    if (!activeProjectId) return;
    const stamped = ensureContentItemIdentity(updatedItem, activeProjectId);
    setItems(prev => {
      const next = prev.map(item => {
        if (item.content_item_id && stamped.content_item_id && item.content_item_id === stamped.content_item_id) {
          return { ...stamped, isManualEdited: true };
        }
        if (item.no === stamped.no) {
          return { ...stamped, isManualEdited: true };
        }
        return item;
      });
      saveProjectData(activeProjectId, 'items', next);
      return next;
    });
    showToast(`Post #${stamped.no} diperbarui (manual edit disimpan)`);
  };

  const handleRegenerateItem = async (itemNo: number, instruction: string) => {
    if (!hasCustomKey) {
      showToast('Hubungkan Gemini API Key dulu untuk menggunakan fitur generate AI.');
      onboardingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!activeProjectId || isProjectIncomplete) {
      showToast('Project belum siap untuk revisi item.');
      return;
    }

    const target = items.find(i => i.no === itemNo);
    if (!target || isRegeneratingItem) return;

    const requestProjectId = activeProjectId;
    const requestId = `regen_${requestProjectId}_${itemNo}_${Date.now()}`;
    activeGenerationRef.current = { requestId, projectId: requestProjectId };

    setIsRegeneratingItem(true);
    showToast(`Merevisi Post #${itemNo}...`);

    try {
      const res = await fetch('/api/gemini/regenerate-item', {
        method: 'POST',
        headers: buildGeminiRequestHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          item: target,
          instruction,
          coreTopic,
          sharedContentContext: sharedContext,
          projectId: requestProjectId,
          hasUserFunnelOverride,
          ratio: hasUserFunnelOverride ? ratio : undefined,
          userOverrides: hasUserFunnelOverride ? { tofu: ratio.tofu, mofu: ratio.mofu, bofu: ratio.bofu } : undefined,
        })
      });

      if (!res.ok) {
        let errText = 'Failed to regenerate item';
        try {
          const errData = await res.json();
          if (errData && errData.error) {
            errText = errData.error;
          }
        } catch (_) {}
        throw new Error(errText);
      }

      const data = await res.json();

      // Async race condition check
      if (
        !activeGenerationRef.current ||
        activeGenerationRef.current.requestId !== requestId ||
        activeProjectIdRef.current !== requestProjectId
      ) {
        console.warn('Discarding stale regenerate-item response for inactive project:', requestProjectId);
        return;
      }

      if (data.item) {
        const stamped = ensureContentItemIdentity(data.item, requestProjectId);
        handleUpdateItem(stamped);
        showToast(`Post #${itemNo} berhasil direvisi!`);
      }
    } catch (e: any) {
      if (
        !activeGenerationRef.current ||
        activeGenerationRef.current.requestId !== requestId ||
        activeProjectIdRef.current !== requestProjectId
      ) {
        return;
      }
      console.error(e);
      const errMsg = e.message || '';
      if (/dibatasi/i.test(errMsg) || /rate.*limit/i.test(errMsg) || /quota/i.test(errMsg) || /429/i.test(errMsg)) {
        showToast('Permintaan AI sedang dibatasi. Coba lagi beberapa saat.');
      } else {
        showToast('Gagal merevisi item: ' + errMsg);
      }
    } finally {
      if (
        activeGenerationRef.current?.requestId === requestId &&
        activeProjectIdRef.current === requestProjectId
      ) {
        setIsRegeneratingItem(false);
        activeGenerationRef.current = null;
      }
    }
  };

  const handleCopyTSV = () => {
    if (items.length === 0) return;
    const headers = ["No", "Tanggal", "Jenis", "Tujuan", "Hook Type", "Headline", "Body", "Caption", "Format", "Referensi", "Visual", "Keterangan", "CTA"];
    let tsv = headers.join('\t') + '\n';
    items.forEach(item => {
      const row = [
        item.no, item.tanggal, item.jenis, item.tujuan, item.hookType,
        item.headline, item.body, item.caption, item.format,
        item.referensi, item.visual, item.keterangan, item.cta
      ].map(v => String(v || '').replace(/\t/g, ' ').replace(/\n/g, ' '));
      tsv += row.join('\t') + '\n';
    });
    void (async () => {
      const copied = await safeCopyToClipboard(tsv);
      showToast(copied ? 'Berhasil menyalin data TSV untuk Spreadsheet!' : 'Clipboard tidak tersedia di environment ini.');
    })();
  };

  const handleDownloadCSV = () => {
    if (items.length === 0) return;
    const headers = ["No", "Tanggal", "Jenis", "Tujuan", "Hook Type", "Headline", "Body", "Caption", "Format", "Referensi", "Visual", "Keterangan", "CTA"];
    let csv = headers.join(',') + '\n';
    items.forEach(item => {
      const row = [
        item.no, item.tanggal, item.jenis, item.tujuan, item.hookType,
        item.headline, item.body, item.caption, item.format,
        item.referensi, item.visual, item.keterangan, item.cta
      ].map(v => `"${String(v || '').replace(/"/g, '""')}"`);
      csv += row.join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ALCO_Content_Calendar_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('File CSV berhasil diunduh!');
  };

  const handleReset = () => {
    setItems([]);
    setIsConfiguring(true);
    setCurrentStep(0);
    showToast('Sistem di-reset ke awal.');
  };

  const handleCreateNewProject = () => {
    const newPid = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    updateProjectMeta(newPid, 'Project Baru');
    setProjectList(getProjectList());
    loadProject(newPid);
    setIsIntakeModalOpen(true);
    showToast('Project baru dibuat. Silakan upload / paste Strategy Blueprint.');
  };

  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);

  const tofuCount = items.filter(i => (i.jenis || '').toUpperCase().includes('TOFU')).length;
  const mofuCount = items.filter(i => (i.jenis || '').toUpperCase().includes('MOFU')).length;
  const bofuCount = items.filter(i => (i.jenis || '').toUpperCase().includes('BOFU')).length;
  const currentProjectName = projectList.find(p => p.project_id === activeProjectId)?.project_name || 'Pilih Project';
  const funnelFilters = [
    { type: 'ALL', label: 'Semua', count: items.length, color: 'text-slate-900' },
    { type: 'TOFU', label: 'TOFU Awareness', count: tofuCount, color: 'text-sky-700' },
    { type: 'MOFU', label: 'MOFU Consideration', count: mofuCount, color: 'text-amber-700' },
    { type: 'BOFU', label: 'BOFU Conversion', count: bofuCount, color: 'text-emerald-700' }
  ];
  const projectSelector = (
    <div className="relative">
      <button
        onClick={() => setIsProjectDropdownOpen(prev => !prev)}
        className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground shadow-sm transition hover:bg-muted"
      >
        <FolderOpen size={14} className="text-primary" />
        <span className="max-w-[160px] truncate">{currentProjectName}</span>
      </button>
      {isProjectDropdownOpen && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-64 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
          <div className="border-b border-border bg-muted p-2.5 flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>Daftar Project</span>
            <button
              onClick={() => {
                setIsProjectDropdownOpen(false);
                handleCreateNewProject();
              }}
              className="flex items-center gap-1 text-primary hover:underline font-bold cursor-pointer"
            >
              <Plus size={13} />
              <span>Project Baru</span>
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {projectList.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground">
                Belum ada project tersimpan
              </div>
            ) : (
              projectList.map(p => (
                <button
                  key={p.project_id}
                  onClick={() => {
                    setIsProjectDropdownOpen(false);
                    loadProject(p.project_id);
                  }}
                  className={`w-full px-3.5 py-2.5 text-left text-xs transition-colors ${activeProjectId === p.project_id ? 'bg-primary/10 font-bold text-primary' : 'text-foreground hover:bg-muted'}`}
                >
                  {p.project_name}
                </button>
              ))
            )}
          </div>
          <button
            onClick={() => {
              setIsProjectDropdownOpen(false);
              loadProject(null);
            }}
            className="w-full border-t border-border px-3.5 py-2 text-left text-xs text-rose-600 transition-colors hover:bg-rose-50 cursor-pointer"
          >
            Kosongkan Project Aktif
          </button>
        </div>
      )}
    </div>
  );
  const primaryActions = (
    <>
      {projectSelector}
      <GeminiApiKeyControl onToast={showToast} />
      <button
        onClick={() => setIsIntakeModalOpen(true)}
        className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 text-xs font-semibold text-foreground shadow-sm transition hover:bg-muted"
      >
        <FileText size={14} className="text-primary" />
        Input Strategi
      </button>
      <button
        onClick={handleOpenConfig}
        className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground shadow-sm transition hover:bg-primary/95"
      >
        <Layers size={14} />
        {items.length > 0 ? 'Edit Parameter' : 'Buat Kalender Baru'}
      </button>
    </>
  );
  const mobileActions = (
    <>
      <GeminiApiKeyControl variant="compact" onToast={showToast} />
      <button
        onClick={handleOpenConfig}
        className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground shadow-sm"
      >
        <Layers size={13} />
        Kalender
      </button>
    </>
  );

  return (
    <ContentEngineShell
      title="ALCO Content Engine"
      subtitle="Execution workspace setelah ALCO Creative System"
      eyebrow="Strategy-First v2.5"
      actions={primaryActions}
      mobileActions={mobileActions}
      footer={(
        <footer className="shrink-0 border-t border-border bg-card px-6 py-4 text-xs text-muted-foreground md:px-8">
          <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
            <div>ALCO Content Engine - Powered by Google Gemini 3.6 Flash & Strategy Blueprint</div>
            <div className="flex gap-4 font-medium">
              <span>Funnel Items: {items.length}</span>
              <span>Strategy Status: {isProjectIncomplete ? 'Incomplete' : (sharedContext?.system_flags?.is_complete_for_planning ? 'Complete' : 'Partial')}</span>
            </div>
          </div>
        </footer>
      )}
    >
      {/* Notification Toast */}
      {isMounted && (
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-4 right-4 z-[9999] bg-primary text-white font-bold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs border border-primary/40"
            >
              <Sparkles size={14} />
              {toastMessage}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      <div className="p-4 md:p-8 max-w-[1600px] w-full mx-auto space-y-6">
        <div className="md:hidden flex items-center gap-2 overflow-x-auto no-scrollbar">
          {projectSelector}
          <button
            onClick={() => setIsIntakeModalOpen(true)}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground shadow-sm"
          >
            <FileText size={13} className="text-primary" />
            Input Strategi
          </button>
        </div>
        {/* Onboarding Card */}
        <div ref={onboardingRef}>
          <GeminiApiKeyOnboardingCard />
        </div>

        {/* Active Strategy Context Badge (Only if project is valid and complete) */}
        {activeProjectId && !isProjectIncomplete && sharedContext ? (
          <ActiveStrategyBadge
            context={sharedContext}
            onOpenIntakeModal={() => setIsIntakeModalOpen(true)}
          />
        ) : null}

        {/* Incomplete Project State Warning Card */}
        {activeProjectId && isProjectIncomplete && (
          <div className="bg-card border border-amber-500/40 rounded-2xl p-8 md:p-12 text-center space-y-6 shadow-sm relative overflow-hidden">
            <div className="max-w-md mx-auto space-y-3 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto shadow-xs">
                <AlertTriangle size={24} />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">
                Project ini tidak lengkap. Silakan upload blueprint ulang.
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                Data blueprint atau context strategi untuk project ini tidak ditemukan atau rusak. Silakan upload blueprint untuk mengaktifkan kembali perancangan kalender.
              </p>
            </div>
            <div className="flex justify-center relative z-10">
              <button
                onClick={() => setIsIntakeModalOpen(true)}
                className="flex items-center gap-2 px-6 py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs shadow-sm transition-all group"
              >
                <FileText size={16} className="group-hover:scale-105 transition-transform" />
                Upload Blueprint
              </button>
            </div>
          </div>
        )}

        {/* Empty state / Welcome card when no active project or no items yet */}
        {(!activeProjectId || (!isProjectIncomplete && items.length === 0 && !isConfiguring)) && (
          <div className="bg-card border border-border rounded-2xl p-8 md:p-12 text-center space-y-6 shadow-sm relative overflow-hidden">
            <div className="max-w-2xl mx-auto space-y-3 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
                <Sparkles size={14} />
                Langkah Pertama Strategy
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                {activeProjectId ? 'Buat Kalender Konten Anda' : 'Belum Ada Project Aktif'}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {activeProjectId 
                  ? 'Sistem otomatisasi kalender konten berbasis strategi funnel (TOFU, MOFU, BOFU). Silakan pilih langkah awal untuk mulai menyusun kalender strategi konten Anda.'
                  : 'Sistem penyimpanan sekarang berbasis project agar data tidak tercampur. Mulai Strategy Intake baru untuk membuat project pertama Anda.'}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10 max-w-xl mx-auto">
              {!activeProjectId && (
                <button
                  onClick={() => setIsIntakeModalOpen(true)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs shadow-sm transition-all group"
                >
                  <FileText size={16} className="group-hover:scale-105 transition-transform" />
                  Mulai Project Baru
                </button>
              )}
              {activeProjectId && !isProjectIncomplete && (
                <>
                  <button
                    onClick={() => setIsIntakeModalOpen(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-secondary hover:bg-muted text-foreground font-semibold rounded-xl text-xs border border-border shadow-xs transition-all group"
                  >
                    <FileText size={16} className="text-primary group-hover:scale-105 transition-transform" />
                    Edit Strategy
                  </button>
                  <button
                    onClick={handleOpenConfig}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs shadow-sm transition-all group"
                  >
                    <Layers size={16} className="group-hover:scale-105 transition-transform" />
                    Buat Kalender Pertama
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Active Project Calendar View (Only if project is valid and complete) */}
        {activeProjectId && !isProjectIncomplete && (
          <section className="space-y-4">
            <div className="flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-sm font-black text-foreground">Kalender Konten</h2>
                <p className="text-xs text-muted-foreground">Filter funnel dan jadwal produksi berada di workspace kalender.</p>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {funnelFilters.map(({ type, label, count, color }) => {
                  const isSelected = filterType === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition ${
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                          : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <span className={isSelected ? 'text-primary-foreground' : color}>{label}</span>
                      {items.length > 0 && (
                        <span className={`rounded-full px-1.5 text-[10px] font-semibold ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-muted-foreground'}`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <CalendarView
              items={items}
              onReschedule={handleReschedule}
              filterType={filterType}
              onFilterChange={setFilterType}
              accessCode={accessCode}
              setAccessCode={setAccessCode}
              isAccessValid={isAccessValid}
              isEditAccessLocked={isEditAccessLocked}
              setShowUnlockModal={setShowUnlockModal}
              accessStatus={accessStatus}
              usageStats={usageStats}
              isLoading={isLoading}
              isConfiguring={isConfiguring}
              setIsConfiguring={setIsConfiguring}
              currentStep={currentStep}
              setCurrentStep={setCurrentStep}
              activeConfigCell={activeConfigCell}
              setActiveConfigCell={setActiveConfigCell}
              revisions={revisions}
              setRevisions={setRevisions}
              onRegenerate={handleGenerateCalendar}
              onClear={handleReset}
              onCopy={handleCopyTSV}
              onDownload={handleDownloadCSV}
              onUpdateItem={handleUpdateItem}
              onRegenerateItem={handleRegenerateItem}
              history={history}
              onDeleteHistory={(id) => setHistory(prev => prev.filter(h => h.id !== id))}
              onClearHistory={() => setHistory([])}
              onReset={handleReset}
              onLoadHistory={(entry) => {
                if (entry.items) setItems(entry.items);
                showToast(`Memuat ${entry.items?.length || 0} post dari histori.`);
              }}
              onSendToCalcer={() => showToast('Brief disalin ke clipboard untuk Calcer AI!')}
              configData={{
                coreTopic, setCoreTopic,
                startDate, setStartDate,
                skipDays, setSkipDays, toggleSkipDay,
                gender, setGender,
                ageRange, setAgeRange,
                formats, setFormats, toggleFormat,
                carouselSlides, setCarouselSlides,
                reelsDuration, setReelsDuration,
                ratio, setRatio,
                hasUserFunnelOverride, setHasUserFunnelOverride,
                hasUserCtaOverride, setHasUserCtaOverride,
                hasUserHookOverride, setHasUserHookOverride,
                hasUserFormulaOverride, setHasUserFormulaOverride,
                hasUserCoreTopicOverride, setHasUserCoreTopicOverride,
                formatRatio, setFormatRatio,
                selectedVoices, setSelectedVoices, toggleVoice,
                hookMix, setHookMix, updateHookMix,
                selectedFormula, setSelectedFormula,
                referenceType, setReferenceType,
                selectedCTAs, setSelectedCTAs, toggleCTA,
                isFastMode, setIsFastMode,
                generateContent: handleGenerateCalendar,
                editableContext: {
                  contentStrategy: {
                    pillars: sharedContext?.strategy_context?.content_pillars || ["TOFU Awareness", "MOFU Consideration", "BOFU Conversion"]
                  },
                  audience: {
                    segments: [sharedContext?.audience_context?.primary_audience || "Target Buyers"]
                  },
                  offers: [{ ctaText: sharedContext?.strategy_context?.main_offer || "Link Bio" }]
                },
                sharedContentContext: sharedContext,
                strategyBlueprint: strategyBlueprint,
                selectedProject: activeProjectId
              }}
            />
          </section>
        )}
      </div>

      <StrategyIntakeModal
        isOpen={isIntakeModalOpen}
        onClose={() => setIsIntakeModalOpen(false)}
        onApplyStrategy={handleApplyStrategy}
        currentBlueprint={strategyBlueprint}
        hasActiveProject={!!activeProjectId && !isProjectIncomplete}
      />

    </ContentEngineShell>
  );
}
