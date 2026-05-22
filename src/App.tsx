import { useState, useEffect } from 'react';
import {
  SocialSignal,
  SuggestedConnection,
  Audience,
  GeneratedDraft,
  INTERNAL_INSIGHTS
} from './types';
import {
  Sparkles,
  SkipForward,
  ExternalLink,
  CheckCircle,
  X,
  AlertTriangle,
  Info,
  Layers,
  Star,
  Cpu,
  Flame,
  Database,
  BookOpen,
  Check,
  Users,
  Send,
  FileText,
  ArrowRight,
  ChevronRight
} from 'lucide-react';

export default function App() {
  const [signals, setSignals] = useState<SocialSignal[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [suggestions, setSuggestions] = useState<SuggestedConnection[]>([]);
  const [loadingSignals, setLoadingSignals] = useState<boolean>(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState<boolean>(false);
  const [approvingIndex, setApprovingIndex] = useState<number | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());

  const [config, setConfig] = useState<{
    airtableConfigured: boolean;
    geminiConfigured: boolean;
    baseId: string;
  }>({
    airtableConfigured: false,
    geminiConfigured: false,
    baseId: 'appjGfq4FGNbbd5Ap'
  });

  const [sessionApproved, setSessionApproved] = useState<Array<{
    signalText: string;
    connName: string;
    insight: string;
    type: string;
    timestamp: string;
    mode: 'live' | 'sandbox';
  }>>([]);

  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const [showInsightsList, setShowInsightsList] = useState<boolean>(false);

  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [pendingApproval, setPendingApproval] = useState<{
    conn: SuggestedConnection;
    connectionRecordId: string;
    signalId: string;
  } | null>(null);
  const [selectedAudienceIds, setSelectedAudienceIds] = useState<Set<string>>(new Set());
  const [generatedDrafts, setGeneratedDrafts] = useState<Array<GeneratedDraft & { saved: boolean; savedPostId?: string }>>([]);
  const [loadingDrafts, setLoadingDrafts] = useState<boolean>(false);
  const [savingDraftIdx, setSavingDraftIdx] = useState<number | null>(null);

  const triggerNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(prev => prev?.message === message ? null : prev);
    }, 4500);
  };

  const toggleCard = (idx: number) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  useEffect(() => {
    fetchConfig();
    fetchSignals();
    fetchAudiences();
  }, []);

  // Collapse all cards whenever a new suggestion set arrives
  useEffect(() => {
    setExpandedCards(new Set());
  }, [suggestions]);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/configured');
      if (res.ok) setConfig(await res.json());
    } catch (err) {
      console.error("Config fetch error:", err);
    }
  };

  const fetchAudiences = async () => {
    try {
      const res = await fetch('/api/audiences');
      const data = await res.json();
      if (data.success) setAudiences(data.audiences || []);
    } catch (err) {
      console.error("Audiences fetch error:", err);
    }
  };

  const fetchSignals = async () => {
    setLoadingSignals(true);
    try {
      const res = await fetch('/api/signals');
      const data = await res.json();
      if (data.success) {
        setSignals(data.signals || []);
        setCurrentIndex(0);
        setSuggestions([]);
        if (data.mode === 'sandbox') {
          triggerNotification("Using sandbox mock signals (Airtable key can be set in settings).", "info");
        }
      } else {
        triggerNotification(data.error || "Failed to load social signals", "error");
      }
    } catch (err: any) {
      triggerNotification("Network error loading signals: " + err.message, "error");
    } finally {
      setLoadingSignals(false);
    }
  };

  const handleFindInsights = async () => {
    if (signals.length === 0) return;
    const currentSignal = signals[currentIndex];
    setLoadingSuggestions(true);
    setSuggestions([]);
    try {
      const res = await fetch('/api/suggest-connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signal: currentSignal.signal, insights: INTERNAL_INSIGHTS })
      });
      const data = await res.json();
      if (data.success) {
        setSuggestions(data.suggestions || []);
        triggerNotification(`Gemini suggested ${data.suggestions.length} high-salience connections.`, "success");
      } else {
        triggerNotification(data.error || "Gemini suggested connections failed", "error");
      }
    } catch (err: any) {
      triggerNotification("Error finding insights: " + err.message, "error");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSkip = () => {
    if (signals.length === 0) return;
    if (currentIndex < signals.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSuggestions([]);
    } else {
      triggerNotification("Review cycle finished. Restarting index.", "info");
      setCurrentIndex(0);
      setSuggestions([]);
    }
  };

  const handleApproveConnection = async (conn: SuggestedConnection, index: number) => {
    if (signals.length === 0) return;
    const currentSignal = signals[currentIndex];
    setApprovingIndex(index);
    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection: conn, signalId: currentSignal.id })
      });
      const data = await res.json();
      if (data.success) {
        triggerNotification(`Approved "${conn.connection_name}" — select audiences to translate.`, "success");
        setSessionApproved(prev => [{
          signalText: currentSignal.signal,
          connName: conn.connection_name,
          insight: conn.matched_insight_title,
          type: conn.connection_type,
          timestamp: new Date().toLocaleTimeString(),
          mode: data.mode || 'live'
        }, ...prev]);
        setSuggestions(prev => prev.filter((_, idx) => idx !== index));
        setSelectedAudienceIds(new Set());
        setPendingApproval({ conn, connectionRecordId: data.recordId || "", signalId: currentSignal.id });
      } else {
        triggerNotification(data.error || "Approval write failed.", "error");
      }
    } catch (err: any) {
      triggerNotification("Approval error: " + err.message, "error");
    } finally {
      setApprovingIndex(null);
    }
  };

  const handleToggleAudience = (audienceId: string) => {
    setSelectedAudienceIds(prev => {
      const next = new Set(prev);
      if (next.has(audienceId)) next.delete(audienceId); else next.add(audienceId);
      return next;
    });
  };

  const handleGenerateDrafts = async () => {
    if (!pendingApproval || selectedAudienceIds.size === 0) return;
    const selectedAudiences = audiences.filter(a => selectedAudienceIds.has(a.id));
    setLoadingDrafts(true);
    try {
      const res = await fetch('/api/generate-drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection: pendingApproval.conn, audiences: selectedAudiences })
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedDrafts((data.drafts || []).map((d: GeneratedDraft) => ({ ...d, saved: false })));
        setPendingApproval(null);
        triggerNotification(`${data.drafts.length} drafts generated across ${selectedAudiences.length} audiences.`, "success");
      } else {
        triggerNotification(data.error || "Draft generation failed.", "error");
        setLoadingDrafts(false);
      }
    } catch (err: any) {
      triggerNotification("Draft generation error: " + err.message, "error");
      setLoadingDrafts(false);
    } finally {
      setLoadingDrafts(false);
    }
  };

  const handleSaveDraft = async (draft: GeneratedDraft & { saved: boolean }, draftIdx: number) => {
    if (!draft || draft.saved) return;
    setSavingDraftIdx(draftIdx);
    const audience = audiences.find(a => a.id === draft.audience_id);
    try {
      const res = await fetch('/api/post-drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft,
          connectionRecordId: "",
          audienceRecordId: audience?.id || draft.audience_id,
          batchName: `Draft – ${new Date().toLocaleDateString()}`
        })
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedDrafts(prev => prev.map((d, i) => i === draftIdx ? { ...d, saved: true, savedPostId: data.postId } : d));
        triggerNotification(`Draft saved for "${draft.audience_name}" on ${draft.platform}.`, "success");
      } else {
        triggerNotification(data.error || "Save failed.", "error");
      }
    } catch (err: any) {
      triggerNotification("Save error: " + err.message, "error");
    } finally {
      setSavingDraftIdx(null);
    }
  };

  const handleRejectConnection = (index: number) => {
    setSuggestions(prev => prev.filter((_, idx) => idx !== index));
    triggerNotification("Suggestion discarded from workbench.", "info");
  };

  const activeSignal = signals[currentIndex];

  // Shared microtext label style
  const micro = "font-mono text-xs uppercase tracking-wider text-[#6B7280]";

  return (
    <div id="app-root" className="min-h-screen flex flex-col bg-[#0D0D0E] text-[#e0e0e0] font-sans antialiased selection:bg-[#4070ff] selection:text-white">

      {/* HEADER */}
      <header className="h-14 shrink-0 border-b border-white/[0.06] flex items-center justify-between px-4 sm:px-8 bg-[#0D0D0E] z-10">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#4070ff] flex items-center justify-center font-bold text-white tracking-wider text-xs shadow-[0_0_12px_rgba(64,112,255,0.25)]">
            SS
          </div>
          <div>
            <h1 className="text-xs font-semibold tracking-widest text-white uppercase flex items-center gap-2">
              Social Salience
              <span className="text-[9px] bg-[#4070ff]/10 text-[#4070ff] border border-[#4070ff]/20 px-1.5 py-0.5 rounded font-mono tracking-normal normal-case">
                v1.0
              </span>
            </h1>
            <p className={`${micro} normal-case text-[10px] hidden sm:block mt-0.5`}>Doctrine Collision Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {config.geminiConfigured ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#4070ff]/8 border border-[#4070ff]/20 text-[#4070ff]" title="Using Gemini 2.5 Flash server-side">
              <Cpu className="w-3 h-3" />
              <span className={`hidden md:inline ${micro} text-[#4070ff]`}>GEMINI-2.5-FLASH</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/8 border border-amber-500/20 text-amber-400" title="GEMINI_API_KEY not set">
              <AlertTriangle className="w-3 h-3" />
              <span className={`${micro} text-amber-400`}>GEMINI MISSING</span>
            </span>
          )}
          {config.airtableConfigured ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#C23B1A]/8 border border-[#C23B1A]/15 text-[#C23B1A]" title={`Base: ${config.baseId}`}>
              <Database className="w-3 h-3" />
              <span className={`hidden lg:inline ${micro} text-[#C23B1A] max-w-[110px] truncate`}>BASE {config.baseId}</span>
              <span className={`lg:hidden ${micro} text-[#C23B1A]`}>LIVE</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800/60 border border-white/[0.06] text-zinc-500">
              <Layers className="w-3 h-3" />
              <span className={micro}>SANDBOX</span>
            </span>
          )}
        </div>
      </header>

      {/* TOAST */}
      {notification && (
        <div className="fixed top-16 right-4 sm:right-8 max-w-sm bg-[#16161A] border border-white/[0.06] p-4 rounded-lg shadow-[0_16px_40px_rgba(0,0,0,0.6)] flex items-start gap-3 z-50">
          <div className="mt-0.5 shrink-0">
            {notification.type === 'success' && <CheckCircle className="w-4 h-4 text-[#C23B1A]" />}
            {notification.type === 'error' && <AlertTriangle className="w-4 h-4 text-red-500" />}
            {notification.type === 'info' && <Info className="w-4 h-4 text-[#4070ff]" />}
          </div>
          <p className="flex-1 text-xs text-white leading-relaxed">{notification.message}</p>
          <button type="button" onClick={() => setNotification(null)} className="text-zinc-600 hover:text-zinc-300 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* WORKBENCH */}
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-12 overflow-y-auto lg:overflow-hidden bg-[#0D0D0E]">

        {/* LEFT PANE — SIGNAL REVIEW */}
        <section id="signal-review-pane" className="lg:col-span-5 p-5 sm:p-6 lg:p-8 flex flex-col lg:overflow-y-auto border-b lg:border-b-0 lg:border-r border-white/[0.06] bg-[#0D0D0E]">

          {loadingSignals ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-zinc-600">
              <span className="w-5 h-5 border-2 border-[#4070ff] border-t-transparent rounded-full animate-spin"></span>
              <p className={micro}>Fetching signals...</p>
            </div>
          ) : signals.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border border-dashed border-white/[0.06] rounded-lg">
              <Database className="w-7 h-7 text-zinc-700 mb-3" />
              <h3 className="text-sm font-semibold text-white tracking-tight">No signals found</h3>
              <p className="text-xs text-zinc-600 mt-1 max-w-xs leading-relaxed">
                Check Airtable base or env configuration.
              </p>
              <button type="button" onClick={fetchSignals} className="mt-4 px-4 py-2 bg-[#4070ff] text-white rounded-lg text-xs font-semibold transition-all hover:bg-[#345cd4] active:scale-95">
                Retry
              </button>
            </div>
          ) : (
            <div id="signal-active-card" className="flex-1 flex flex-col justify-between">

              <div className="bg-[#16161A] border border-white/[0.05] p-5 sm:p-6 rounded-lg flex-1 flex flex-col justify-between min-h-[320px]">
                <div>
                  {/* META FLAG */}
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#64748B] flex items-center flex-wrap gap-x-1.5 gap-y-1 leading-none">
                      <span>{activeSignal.sourcePlatform || "Unknown"}</span>
                      {activeSignal.dateCaptured && (
                        <>
                          <span className="opacity-30">•</span>
                          <span>{activeSignal.dateCaptured}</span>
                        </>
                      )}
                    </p>
                    <span className="font-mono text-[10px] px-2 py-0.5 bg-[#0D0D0E] border border-white/[0.06] text-zinc-600 rounded shrink-0">
                      {currentIndex + 1} / {signals.length}
                    </span>
                  </div>

                  {/* HEADLINE */}
                  <h2 className="text-[20px] font-extrabold text-white leading-[1.3] tracking-[-0.01em]">
                    {activeSignal.signal}
                  </h2>

                  <div className="mt-7 pt-5 border-t border-white/[0.06] grid grid-cols-2 gap-4">
                    {activeSignal.painPoint && (
                      <div className="col-span-2">
                        <span className={`${micro} block mb-1`}>Operator Pain Point</span>
                        <p className="text-zinc-200 text-sm leading-relaxed">{activeSignal.painPoint}</p>
                      </div>
                    )}
                    <div>
                      <span className={`${micro} block mb-1`}>Signal Strength</span>
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="text-white text-sm font-mono font-semibold">{activeSignal.signalStrength || "4"}/5</span>
                      </span>
                    </div>
                    {activeSignal.languageUsed && (
                      <div className="col-span-2">
                        <span className={`${micro} block mb-1`}>Jargon Observed</span>
                        <p className="font-mono text-xs text-zinc-500 leading-relaxed">{activeSignal.languageUsed}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* PRIMARY ACTIONS */}
                <div className="mt-7 space-y-2">
                  <button
                    type="button"
                    onClick={handleFindInsights}
                    disabled={loadingSuggestions}
                    className="w-full h-11 bg-[#4070ff] hover:bg-[#345cd4] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 transition-all text-white font-semibold rounded-lg text-sm flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_16px_rgba(64,112,255,0.2)]"
                  >
                    {loadingSuggestions ? (
                      <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Evaluating Collisions...</>
                    ) : (
                      <><Sparkles className="w-4 h-4" /> Find Matching Insights</>
                    )}
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleSkip}
                      className="h-9 border border-white/[0.07] hover:border-white/[0.15] bg-transparent hover:bg-[#16161A] text-zinc-400 hover:text-zinc-200 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <SkipForward className="w-3.5 h-3.5" /> Skip Signal
                    </button>

                    {activeSignal.sourceLink ? (
                      <a
                        href={activeSignal.sourceLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-9 border border-white/[0.07] hover:border-white/[0.15] bg-transparent hover:bg-[#16161A] text-zinc-400 hover:text-zinc-200 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-[#4070ff]" /> Open Source
                      </a>
                    ) : (
                      <button type="button" disabled className="h-9 border border-white/[0.04] bg-transparent text-zinc-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 cursor-not-allowed">
                        <ExternalLink className="w-3.5 h-3.5" /> No Source
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-white/[0.05] flex items-center">
                <button
                  type="button"
                  onClick={() => setShowInsightsList(!showInsightsList)}
                  className={`flex items-center gap-1.5 ${micro} text-zinc-600 hover:text-[#4070ff] transition-colors cursor-pointer normal-case`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  {showInsightsList ? 'Hide Doctrine Corpus' : 'Browse Internal Doctrine (25)'}
                </button>
              </div>

            </div>
          )}
        </section>

        {/* RIGHT PANE — SYNTHESIS WORKSPACE */}
        <section id="synthesis-workspace-pane" className="lg:col-span-7 p-5 sm:p-6 lg:p-8 flex flex-col lg:overflow-y-auto bg-[#0D0D0E] relative">

          {/* DOCTRINE OVERLAY */}
          {showInsightsList && (
            <div className="mb-5 bg-[#16161A] border border-white/[0.05] rounded-lg max-h-[240px] overflow-y-auto">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
                <span className={micro}>Internal Insights Doctrine Corpus (v1 Starter)</span>
                <button type="button" onClick={() => setShowInsightsList(false)} className="text-zinc-600 hover:text-zinc-300 text-xs transition-colors">
                  Close
                </button>
              </div>
              <ul className="p-3 space-y-1">
                {INTERNAL_INSIGHTS.map((insight, idx) => (
                  <li key={idx} className="flex gap-2.5 items-start py-1.5 border-b border-white/[0.04] last:border-0">
                    <span className="font-mono text-[10px] text-zinc-700 w-5 text-right shrink-0 mt-0.5">{idx + 1}</span>
                    <span className="text-xs text-zinc-400 leading-relaxed">{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="suggestions-grid h-full flex flex-col">

            {/* WORKSPACE HEADER */}
            <div className="mb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-4 border-b border-white/[0.05]">
              <div>
                <span className={micro}>Gemini Collision Synthesis</span>
                <h2 className="font-serif text-xl text-white mt-1 tracking-tight">
                  {loadingSuggestions ? "Synthesizing connections..." :
                   suggestions.length > 0 ? `${suggestions.length} Collisions Discovered` :
                   "Ready for Collision Synthesis"}
                </h2>
              </div>
              <div className={micro}>
                {loadingSuggestions ? (
                  <span className="flex items-center gap-1.5 text-[#4070ff]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4070ff] animate-ping"></span>
                    Generating...
                  </span>
                ) : suggestions.length > 0 ? (
                  <span className="text-[#4070ff] flex items-center gap-1">
                    <Flame className="w-3 h-3 fill-[#4070ff]" /> Alignment calibrated
                  </span>
                ) : (
                  <span>Select Find Matching Insights to trigger AI</span>
                )}
              </div>
            </div>

            {/* GEMINI KEY WARNING */}
            {!config.geminiConfigured && (
              <div className="mb-5 p-4 bg-amber-500/[0.04] border border-amber-500/15 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-amber-300">GEMINI_API_KEY not configured</p>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Add <code className="font-mono bg-zinc-900 px-1 rounded text-zinc-400">GEMINI_API_KEY</code> to your environment to enable synthesis.
                  </p>
                </div>
              </div>
            )}

            {/* SUGGESTIONS */}
            {loadingSuggestions ? (
              <div className="flex-grow flex flex-col items-center justify-center gap-4 py-20 bg-[#16161A]/40 rounded-lg border border-white/[0.05]">
                <span className="relative flex h-10 w-10">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4070ff]/15 opacity-75"></span>
                  <span className="relative rounded-full h-10 w-10 bg-[#4070ff]/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-[#4070ff] animate-pulse" />
                  </span>
                </span>
                <div className="text-center px-4">
                  <p className="text-sm font-serif text-white tracking-tight">Triggering Gemini Collision Prompt...</p>
                  <p className="text-xs text-zinc-600 mt-2 max-w-xs mx-auto leading-relaxed">
                    Finding semantic intersections across 25 live doctrine statements.
                  </p>
                </div>
              </div>
            ) : suggestions.length === 0 ? (
              <div className="flex-grow flex flex-col items-center justify-center py-16 text-center border border-dashed border-white/[0.05] rounded-lg px-6">
                <Sparkles className="w-8 h-8 text-zinc-800 mb-4" />
                <h3 className="text-sm font-serif text-zinc-400 tracking-tight">No active suggestions in review</h3>
                <p className="text-xs text-zinc-600 mt-2 max-w-xs leading-relaxed">
                  Scan a signal using "Find Matching Insights" to build structured connection records.
                </p>

                {sessionApproved.length > 0 && (
                  <div className="mt-8 text-left w-full max-w-md">
                    <p className={`${micro} text-center mb-3`}>Session Ledger ({sessionApproved.length})</p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {sessionApproved.map((item, index) => (
                        <div key={index} className="p-3 bg-[#16161A] rounded-lg border border-[#C23B1A]/[0.08] flex items-start gap-2.5">
                          <Check className="w-3 h-3 text-[#C23B1A] mt-0.5 shrink-0" />
                          <div>
                            <p className="text-white text-xs font-medium tracking-tight">{item.connName}</p>
                            <p className={`${micro} normal-case mt-0.5`} style={{ fontSize: '10px' }}>Matched: "{item.insight}"</p>
                            <span className={`inline-block mt-1 ${micro} text-[#C23B1A]`} style={{ fontSize: '9px' }}>
                              {item.mode === 'live' ? 'AIRTABLE LIVE' : 'SANDBOX'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div id="suggestions-list" className="space-y-2">
                {suggestions.map((conn, idx) => {
                  const isExpanded = expandedCards.has(idx);
                  return (
                    <div
                      key={idx}
                      className="bg-[#16161A] border border-white/[0.05] rounded-lg transition-all duration-200 hover:border-white/[0.09]"
                    >
                      {/* COLLAPSED ROW — always visible, click to expand */}
                      <button
                        type="button"
                        onClick={() => toggleCard(idx)}
                        className="w-full px-4 py-4 flex items-center justify-between gap-4 text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <ChevronRight className={`w-3.5 h-3.5 text-zinc-600 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                          <h3 className="text-white text-lg font-serif font-semibold tracking-tight truncate">
                            {conn.connection_name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`${micro} text-[#4070ff] hidden sm:block`}>{conn.connection_type}</span>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, stIdx) => (
                              <Star key={stIdx} className={`w-2.5 h-2.5 ${stIdx < conn.strength_score ? 'text-amber-400 fill-amber-400' : 'text-zinc-800'}`} />
                            ))}
                          </div>
                        </div>
                      </button>

                      {/* EXPANDED BODY */}
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-white/[0.05] pt-4 space-y-4">
                          {/* Doctrine match tag */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
                              <BookOpen className="w-2.5 h-2.5 text-[#4070ff]" />
                              <span className={`${micro} text-zinc-500`} style={{ fontSize: '10px' }}>{conn.matched_insight_title}</span>
                            </span>
                            <span className={`${micro} text-[#4070ff]`}>{conn.connection_type}</span>
                          </div>

                          {/* Detail grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="bg-[#0D0D0E] p-3 rounded-lg border border-white/[0.04]">
                              <span className={`${micro} block mb-1.5`}>Why It Connects</span>
                              <p className="text-zinc-300 text-xs leading-relaxed">{conn.why_it_connects}</p>
                            </div>
                            <div className="bg-[#0D0D0E] p-3 rounded-lg border border-white/[0.04]">
                              <span className={`${micro} block mb-1.5`}>Gap / Opportunity</span>
                              <p className="text-zinc-300 text-xs leading-relaxed">{conn.gap_opportunity}</p>
                            </div>
                            <div className="sm:col-span-2 bg-[#4070ff]/[0.04] p-3 border border-[#4070ff]/10 rounded-lg">
                              <span className={`${micro} text-[#4070ff] block mb-1.5`}>Suggested Angle</span>
                              <p className="text-white text-xs leading-relaxed font-serif tracking-tight">{conn.suggested_angle}</p>
                            </div>
                            {conn.draft_brief && (
                              <div className="sm:col-span-2 bg-[#0D0D0E] p-3 rounded-lg border border-white/[0.04]">
                                <span className={`${micro} block mb-1.5`}>Draft Brief</span>
                                <p className="text-zinc-400 text-xs leading-relaxed whitespace-pre-wrap">{conn.draft_brief}</p>
                              </div>
                            )}
                          </div>

                          {/* Action row */}
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleApproveConnection(conn, idx)}
                              disabled={approvingIndex === idx}
                              className="px-4 py-2 bg-[#4070ff] hover:bg-[#325bd4] active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-[0_2px_8px_rgba(64,112,255,0.2)]"
                            >
                              {approvingIndex === idx ? (
                                <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Saving...</>
                              ) : (
                                <><CheckCircle className="w-3.5 h-3.5" /> Approve to Airtable</>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectConnection(idx)}
                              disabled={approvingIndex !== null}
                              className="px-4 py-2 border border-white/[0.07] hover:border-white/[0.14] bg-transparent hover:bg-[#0D0D0E] text-zinc-500 hover:text-zinc-300 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all"
                            >
                              <X className="w-3.5 h-3.5" /> Discard
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

          </div>

          {/* GENERATED DRAFTS */}
          {generatedDrafts.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.05]">
                <div>
                  <span className={micro}>Translated Drafts</span>
                  <h3 className="font-serif text-xl text-white mt-0.5 tracking-tight">{generatedDrafts.length} Audience Drafts Ready</h3>
                </div>
                <button type="button" onClick={() => setGeneratedDrafts([])} className="text-zinc-700 hover:text-zinc-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                {generatedDrafts.map((draft, draftIdx) => (
                  <div key={draftIdx} className="bg-[#16161A] border border-white/[0.05] rounded-lg p-4 space-y-3 hover:border-white/[0.09] transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`${micro} text-[#4070ff] px-2 py-0.5 rounded bg-[#4070ff]/8 border border-[#4070ff]/15`}>
                          {draft.platform}
                        </span>
                        <span className={`${micro} px-2 py-0.5 rounded bg-[#0D0D0E] border border-white/[0.06] flex items-center gap-1`}>
                          <Users className="w-2.5 h-2.5" />{draft.audience_name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSaveDraft(draft, draftIdx)}
                        disabled={draft.saved || savingDraftIdx === draftIdx}
                        className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                          draft.saved
                            ? 'bg-[#C23B1A]/8 text-[#C23B1A] border border-[#C23B1A]/15 cursor-default'
                            : 'bg-[#4070ff]/8 hover:bg-[#4070ff]/15 text-[#4070ff] border border-[#4070ff]/15 cursor-pointer active:scale-95'
                        }`}
                      >
                        {draft.saved ? (
                          <><Check className="w-3 h-3" /> Saved {draft.savedPostId && <span className="font-mono text-[10px] opacity-60 ml-1">{draft.savedPostId}</span>}</>
                        ) : savingDraftIdx === draftIdx ? (
                          <><span className="w-3 h-3 border border-[#4070ff] border-t-transparent rounded-full animate-spin inline-block" /> Saving...</>
                        ) : (
                          <><Send className="w-3 h-3" /> Save to Airtable</>
                        )}
                      </button>
                    </div>

                    <div className="bg-[#0D0D0E] border border-white/[0.04] p-3 rounded-lg">
                      <span className={`${micro} block mb-1.5`}>Hook</span>
                      <p className="text-white text-sm font-serif leading-relaxed tracking-tight">{draft.hook}</p>
                    </div>

                    <div className="bg-[#0D0D0E] p-3 rounded-lg border border-white/[0.04]">
                      <span className={`${micro} block mb-1.5`}>Post Draft</span>
                      <p className="text-zinc-300 text-xs leading-relaxed whitespace-pre-wrap">{draft.post_draft}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-[#0D0D0E] p-3 rounded-lg border border-white/[0.04]">
                        <span className={`${micro} block mb-1.5`}>CTA</span>
                        <p className="text-zinc-300 text-xs">{draft.cta}</p>
                      </div>
                      <div className="bg-[#4070ff]/[0.03] p-3 rounded-lg border border-[#4070ff]/[0.08]">
                        <span className={`${micro} text-[#4070ff] block mb-1.5`}>Why This Angle Works</span>
                        <p className="text-zinc-400 text-xs leading-relaxed">{draft.why_this_angle_works}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AUDIENCE SELECTION OVERLAY */}
          {(pendingApproval || loadingDrafts) && (
            <div className="absolute inset-0 z-20 bg-[#0D0D0E]/97 backdrop-blur-sm flex flex-col overflow-y-auto">
              {loadingDrafts ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
                  <span className="relative flex h-12 w-12">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4070ff]/15 opacity-75"></span>
                    <span className="relative rounded-full h-12 w-12 bg-[#4070ff]/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-[#4070ff] animate-pulse" />
                    </span>
                  </span>
                  <div className="text-center">
                    <p className="font-serif text-white text-lg tracking-tight">Translating for audiences...</p>
                    <p className="text-xs text-zinc-600 mt-1">Gemini is generating platform-specific drafts</p>
                  </div>
                </div>
              ) : pendingApproval && (
                <div className="flex flex-col h-full p-6 sm:p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <span className={micro}>Approved Connection</span>
                      <h3 className="font-serif text-xl text-white mt-1 tracking-tight">Select Audiences</h3>
                      <p className="text-xs text-zinc-600 mt-1 max-w-xs truncate">"{pendingApproval.conn.connection_name}"</p>
                    </div>
                    <button type="button" onClick={() => setPendingApproval(null)} className="text-zinc-600 hover:text-white transition-colors mt-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-1.5 flex-1 overflow-y-auto">
                    {audiences.map(aud => (
                      <button
                        key={aud.id}
                        type="button"
                        onClick={() => handleToggleAudience(aud.id)}
                        className={`w-full px-4 py-3 rounded-lg border text-left transition-all ${
                          selectedAudienceIds.has(aud.id)
                            ? 'bg-[#4070ff]/8 border-[#4070ff]/30'
                            : 'bg-[#16161A] border-white/[0.05] hover:border-white/[0.12]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-zinc-600" />
                            <span className={`text-sm font-medium tracking-tight ${selectedAudienceIds.has(aud.id) ? 'text-white' : 'text-zinc-300'}`}>
                              {aud.name}
                            </span>
                          </div>
                          {selectedAudienceIds.has(aud.id) && <Check className="w-3.5 h-3.5 text-[#4070ff] shrink-0" />}
                        </div>
                        {aud.description && (
                          <p className="text-[11px] text-zinc-600 mt-0.5 ml-5 leading-relaxed">{aud.description}</p>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/[0.05] space-y-3">
                    <p className={`${micro} text-center`}>
                      {selectedAudienceIds.size === 0
                        ? 'Select at least one audience'
                        : `${selectedAudienceIds.size} audience${selectedAudienceIds.size > 1 ? 's' : ''} selected — 2 drafts each`}
                    </p>
                    <button
                      type="button"
                      onClick={handleGenerateDrafts}
                      disabled={selectedAudienceIds.size === 0}
                      className="w-full h-11 bg-[#4070ff] hover:bg-[#345cd4] active:scale-[0.98] disabled:opacity-40 disabled:scale-100 transition-all text-white font-semibold rounded-lg text-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ArrowRight className="w-4 h-4" /> Translate for Audience
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </section>

      </main>

      {/* FOOTER */}
      <footer className="h-10 shrink-0 border-t border-white/[0.06] px-5 sm:px-8 bg-[#0D0D0E] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1.5 ${micro}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#C23B1A] animate-pulse"></span>
            Pipeline: <span className="text-[#C23B1A]">ACTIVE</span>
          </span>
          <span className={`hidden sm:inline ${micro} text-zinc-700`}>Multi-table target map active</span>
        </div>
        <span className={`${micro} text-zinc-700`}>tblGAMm → tblIbhM → tblXBsD</span>
      </footer>

    </div>
  );
}
