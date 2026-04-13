"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { LANGUAGES, EMOJIS, FLAG_REASONS } from "@/lib/constants";

// ─── Visitor ID (cookie-based) ───
function getVisitorId() {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("jokehub-vid");
  if (!id) { id = "v_" + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem("jokehub-vid", id); }
  return id;
}

// ─── Theme ───
function getTheme() {
  if (typeof window === "undefined") return "light";
  return localStorage.getItem("jokehub-theme") || "light";
}

// ─── Types ───
type Joke = {
  id: string; text: string; author: string; lang: string;
  thumbsUp: number; thumbsDown: number; tags: string[];
  reactions: Record<string, number>;
  createdAt: string; approvedAt: string | null;
};
type TagCount = { name: string; count: number };
type VisitStats = { total: number; countries: { country: string; flag: string; count: number }[] };

const TIME_FILTERS = [
  { key: "today", label: "Today", icon: "🔥" },
  { key: "week", label: "This Week", icon: "📅" },
  { key: "month", label: "This Month", icon: "🗓️" },
  { key: "year", label: "This Year", icon: "🎉" },
  { key: "all", label: "All Time", icon: "👑" },
];
const SORT_OPTIONS = [
  { key: "popular", label: "Most Popular", icon: "🔥" },
  { key: "newest", label: "Newest First", icon: "🆕" },
  { key: "oldest", label: "Oldest First", icon: "⏳" },
];

const TAG_COLORS = ["#7C3AED","#EC4899","#10B981","#F59E0B","#3B82F6","#EF4444","#6366F1","#14B8A6","#F97316","#A855F7","#0EA5E9","#D946EF"];
const GRADIENT_BARS = ["linear-gradient(135deg,#7C3AED,#6366F1)","linear-gradient(135deg,#EC4899,#F472B6)","linear-gradient(135deg,#10B981,#34D399)","linear-gradient(135deg,#F59E0B,#FBBF24)","linear-gradient(135deg,#3B82F6,#60A5FA)"];

function getLangObj(code: string) { return LANGUAGES.find(l => l.code === code) || { code, flag: "🏳️", name: code }; }

function timeAgo(dateStr: string) {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  if (s < 604800) return Math.floor(s / 86400) + "d ago";
  return new Date(dateStr).toLocaleDateString();
}

// ─── Skeleton ───
function JokeSkeleton() {
  return (
    <div className="animate-in" style={{ background: "var(--glass)", borderRadius: 20, border: "1px solid var(--glass-border)", padding: "22px 26px", overflow: "hidden" }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <div className="skeleton" style={{ width: 38, height: 38, borderRadius: 12 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ width: 120, height: 14, marginBottom: 6 }} />
          <div className="skeleton" style={{ width: 80, height: 10 }} />
        </div>
      </div>
      <div className="skeleton" style={{ width: "100%", height: 16, marginBottom: 8 }} />
      <div className="skeleton" style={{ width: "75%", height: 16, marginBottom: 16 }} />
      <div className="skeleton" style={{ width: 80, height: 32 }} />
    </div>
  );
}

// ═══════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════

export default function JokeHubApp() {
  const [theme, setTheme] = useState("light");
  const [page, setPage] = useState<"feed" | "submit" | "admin">("feed");
  const [jokes, setJokes] = useState<Joke[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [timePeriod, setTimePeriod] = useState("today");
  const [sortBy, setSortBy] = useState("popular");
  const [activeLang, setActiveLang] = useState("ALL");
  const [activeTag, setActiveTag] = useState("");
  const [tags, setTags] = useState<TagCount[]>([]);
  const [trendingTags, setTrendingTags] = useState<TagCount[]>([]);
  const [visitStats, setVisitStats] = useState<VisitStats>({ total: 0, countries: [] });
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [showAllLangs, setShowAllLangs] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const [langSearch, setLangSearch] = useState("");
  const [randomJoke, setRandomJoke] = useState<Joke | null>(null);
  const [jokeOfDay, setJokeOfDay] = useState<Joke | null>(null);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);
  const visitorId = typeof window !== "undefined" ? getVisitorId() : "";

  // Theme
  useEffect(() => {
    const t = getTheme();
    setTheme(t);
    if (t === "dark") document.documentElement.setAttribute("data-theme", "dark");
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("jokehub-theme", next);
    if (next === "dark") document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
  };

  // Load votes from localStorage
  useEffect(() => {
    try { const v = localStorage.getItem("jokehub-votes"); if (v) setVotes(JSON.parse(v)); } catch {}
  }, []);
  const saveVotes = (v: Record<string, number>) => { setVotes(v); localStorage.setItem("jokehub-votes", JSON.stringify(v)); };

  // Track visit
  useEffect(() => {
    const codeToFlag = (code: string) => {
      if (!code || code.length !== 2) return "🏳️";
      return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
    };
    fetch("https://ipapi.co/json/").then(r => r.json()).then(geo => {
      const cc = geo.country_code || "XX";
      fetch("/api/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId, country: cc, flag: codeToFlag(cc) }),
      });
    }).catch(() => {
      fetch("/api/visit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitorId, country: "XX", flag: "🏳️" }) });
    });
  }, []);

  // Load visit stats
  useEffect(() => {
    fetch("/api/visit").then(r => r.json()).then(setVisitStats).catch(() => {});
  }, []);

  // Load tags
  useEffect(() => {
    fetch("/api/tags").then(r => r.json()).then(setTags).catch(() => {});
    fetch("/api/tags?trending=true").then(r => r.json()).then(setTrendingTags).catch(() => {});
  }, []);

  // Load joke of the day
  useEffect(() => {
    fetch("/api/jokes?period=today&sort=popular&limit=1").then(r => r.json()).then(d => {
      if (d.jokes?.length) setJokeOfDay(d.jokes[0]);
    }).catch(() => {});
  }, []);

  // Load jokes
  const loadJokes = useCallback(async (pageNum = 1, append = false) => {
    if (pageNum === 1) setLoading(true); else setLoadingMore(true);
    try {
      const params = new URLSearchParams({ page: String(pageNum), limit: "15", sort: sortBy, period: timePeriod, lang: activeLang });
      if (activeTag) params.set("tag", activeTag);
      const res = await fetch("/api/jokes?" + params);
      const data = await res.json();
      if (append) setJokes(prev => [...prev, ...data.jokes]);
      else setJokes(data.jokes || []);
      setTotalPages(data.pages || 1);
      setCurrentPage(pageNum);
    } catch { }
    setLoading(false);
    setLoadingMore(false);
  }, [sortBy, timePeriod, activeLang, activeTag]);

  useEffect(() => { loadJokes(1); }, [loadJokes]);

  // Infinite scroll
  useEffect(() => {
    if (!observerRef.current) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loadingMore && currentPage < totalPages) {
        loadJokes(currentPage + 1, true);
      }
    }, { threshold: 0.1 });
    obs.observe(observerRef.current);
    return () => obs.disconnect();
  }, [currentPage, totalPages, loadingMore, loadJokes]);

  // Vote handler
  const handleVote = async (jokeId: string, value: number) => {
    const res = await fetch("/api/vote", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jokeId, value, visitorId }),
    });
    const data = await res.json();
    if (data.action === "removed") {
      const nv = { ...votes }; delete nv[jokeId]; saveVotes(nv);
    } else {
      saveVotes({ ...votes, [jokeId]: value });
    }
    // Update joke in list
    setJokes(prev => prev.map(j => j.id === jokeId ? { ...j, thumbsUp: data.thumbsUp ?? j.thumbsUp, thumbsDown: data.thumbsDown ?? j.thumbsDown } : j));
    if (data.action === "auto_removed") setJokes(prev => prev.filter(j => j.id !== jokeId));
  };

  // Reaction handler
  const handleReaction = async (jokeId: string, emoji: string) => {
    await fetch("/api/react", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jokeId, emoji, visitorId }),
    });
    loadJokes(1); // Refresh
  };

  // Flag handler
  const handleFlag = async (jokeId: string, reason: string) => {
    await fetch("/api/flag", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jokeId, reason, visitorId }),
    });
  };

  // Random joke
  const loadRandom = async () => {
    const res = await fetch("/api/random");
    if (res.ok) setRandomJoke(await res.json());
  };

  // Share
  const shareJoke = (joke: Joke, method: string) => {
    const url = typeof window !== "undefined" ? window.location.origin + "/joke/" + joke.id : "";
    const text = joke.text + "\n\n— @" + joke.author + " on JokeHub";
    if (method === "copy") { navigator.clipboard.writeText(text + "\n" + url); }
    else if (method === "whatsapp") { window.open("https://wa.me/?text=" + encodeURIComponent(text + "\n" + url)); }
    else if (method === "twitter") { window.open("https://twitter.com/intent/tweet?text=" + encodeURIComponent(text) + "&url=" + encodeURIComponent(url)); }
    else if (method === "facebook") { window.open("https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(url)); }
  };

  const filterCount = (activeLang !== "ALL" ? 1 : 0) + (activeTag ? 1 : 0);
  const visibleLangs = showAllLangs ? LANGUAGES.filter(l => l.name.toLowerCase().includes(langSearch.toLowerCase()) || l.code.toLowerCase().includes(langSearch.toLowerCase())) : LANGUAGES.slice(0, 8);
  const visibleTags = showAllTags ? tags : tags.slice(0, 6);

  // ─── STYLES ───
  const glass = { background: "var(--glass)", backdropFilter: "var(--blur)", WebkitBackdropFilter: "var(--blur)", borderRadius: 20, border: "1px solid var(--glass-border)", boxShadow: "var(--card-shadow), var(--highlight)" } as React.CSSProperties;
  const sideItem = (active: boolean): React.CSSProperties => ({
    background: active ? "var(--purple-faint)" : "transparent",
    borderRadius: 10, padding: "8px 12px", fontSize: 13,
    fontWeight: active ? 700 : 500, color: active ? "var(--purple)" : "var(--text-muted)",
    cursor: "pointer", marginBottom: 2, display: "flex", justifyContent: "space-between", alignItems: "center",
    transition: "all .15s",
  });
  const sideLabel: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: "var(--purple)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8, marginTop: 18, paddingLeft: 4 };

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* ── HEADER ── */}
      <header style={{
        ...glass, borderRadius: 0, position: "sticky", top: 0, zIndex: 50,
        padding: "10px 20px", display: "flex", justifyContent: "space-between", alignItems: "center",
        borderBottom: "1px solid var(--glass-border)", borderTop: "none",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => setPage("feed")}>
          {/* Mobile hamburger */}
          <button onClick={() => setMobileSidebar(!mobileSidebar)} style={{
            display: "none", background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--text)", padding: 4,
          }} className="mobile-menu-btn">☰</button>
          <div style={{
            width: 40, height: 40, borderRadius: 14, background: "var(--btn-gradient)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(124,58,237,0.25), var(--highlight)",
          }}>
            <span style={{ fontSize: 20 }}>😂</span>
          </div>
          <div>
            <span style={{ fontWeight: 800, fontSize: 20, color: "var(--text)", letterSpacing: -0.5 }}>JokeHub</span>
            <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 500 }}>Laugh. Vote. Repeat.</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {activeLang !== "ALL" && (
            <span style={{ fontSize: 12, background: "var(--purple-faint)", color: "var(--purple)", borderRadius: 8, padding: "4px 10px", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              {getLangObj(activeLang).flag} {activeLang}
              <span onClick={() => setActiveLang("ALL")} style={{ cursor: "pointer", marginLeft: 4, fontWeight: 800 }}>×</span>
            </span>
          )}
          {activeTag && (
            <span style={{ fontSize: 12, background: "var(--purple-faint)", color: "var(--purple)", borderRadius: 8, padding: "4px 10px", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              #{activeTag}
              <span onClick={() => setActiveTag("")} style={{ cursor: "pointer", marginLeft: 4, fontWeight: 800 }}>×</span>
            </span>
          )}
          {/* Theme toggle */}
          <button onClick={toggleTheme} style={{
            background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: 10,
            padding: "7px 12px", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center",
          }} title="Toggle theme">
            {theme === "light" ? "🌙" : "☀️"}
          </button>
          {/* Random */}
          <button onClick={loadRandom} style={{
            background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: 10,
            padding: "7px 12px", cursor: "pointer", fontSize: 14, fontWeight: 650,
            color: "var(--purple)", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4,
          }} title="Random joke">🎲</button>
          {/* Submit */}
          <button onClick={() => setPage("submit")} style={{
            background: "var(--btn-gradient)", color: "#fff", border: "none", borderRadius: 12,
            padding: "8px 18px", fontSize: 13, fontWeight: 650, cursor: "pointer",
            boxShadow: "var(--btn-shadow)", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
          }}>✍️ Submit</button>
        </div>
      </header>

      {/* Random joke modal */}
      {randomJoke && (
        <div onClick={() => setRandomJoke(null)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{ ...glass, maxWidth: 500, width: "100%", padding: "32px 30px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--purple)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>🎲 Random Joke</div>
            <p style={{ fontSize: 18, lineHeight: 1.6, color: "var(--text)", margin: "0 0 16px" }}>{randomJoke.text}</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "var(--text-faint)" }}>{getLangObj(randomJoke.lang).flag} @{randomJoke.author}</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={loadRandom} style={{ background: "var(--btn-gradient)", color: "#fff", border: "none", borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 650, cursor: "pointer", fontFamily: "inherit" }}>🎲 Another!</button>
                <button onClick={() => setRandomJoke(null)} style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: 10, padding: "8px 16px", fontSize: 13, cursor: "pointer", color: "var(--text-muted)", fontFamily: "inherit" }}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── BODY ── */}
      <div style={{ display: "flex", maxWidth: 1100, margin: "0 auto", padding: "20px 16px", gap: 20 }}>
        {/* ── SIDEBAR ── */}
        <aside style={{
          width: 240, flexShrink: 0,
        }} className="sidebar-desktop">
          <div style={{ ...glass, background: "var(--sidebar-bg)", padding: "20px 16px", position: "sticky", top: 76 }}>
            {/* Joke of the Day */}
            {jokeOfDay && (
              <div style={{ background: "var(--purple-faint)", borderRadius: 14, padding: "14px 16px", marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--purple)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>⭐ Joke of the Day</div>
                <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--text)", margin: 0 }}>
                  {jokeOfDay.text.length > 100 ? jokeOfDay.text.slice(0, 100) + "…" : jokeOfDay.text}
                </p>
                <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 6 }}>{getLangObj(jokeOfDay.lang).flag} @{jokeOfDay.author} · 👍 {jokeOfDay.thumbsUp}</div>
              </div>
            )}

            {/* Time Period */}
            <div style={sideLabel}>🕒 Time Period</div>
            {TIME_FILTERS.map(t => (
              <div key={t.key} style={sideItem(timePeriod === t.key)} onClick={() => { setTimePeriod(t.key); setPage("feed"); }}>
                <span>{t.icon} {t.label}</span>
              </div>
            ))}

            {/* Sort By */}
            <div style={sideLabel}>↕️ Sort By</div>
            {SORT_OPTIONS.map(s => (
              <div key={s.key} style={sideItem(sortBy === s.key)} onClick={() => { setSortBy(s.key); setPage("feed"); }}>
                <span>{s.icon} {s.label}</span>
              </div>
            ))}

            {/* Language */}
            <div style={sideLabel}>🌐 Language</div>
            {showAllLangs && (
              <div style={{ marginBottom: 6, padding: "0 4px" }}>
                <input value={langSearch} onChange={e => setLangSearch(e.target.value)} placeholder="Search..."
                  style={{ width: "100%", border: "1px solid var(--glass-border)", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontFamily: "inherit", outline: "none", background: "var(--input-bg)", color: "var(--text)", boxSizing: "border-box" }} />
              </div>
            )}
            {visibleLangs.map(l => (
              <div key={l.code} style={sideItem(activeLang === l.code)} onClick={() => { setActiveLang(l.code); setPage("feed"); }}>
                <span>{l.flag} {l.code === "ALL" ? "All" : l.name}</span>
              </div>
            ))}
            <div onClick={() => { setShowAllLangs(!showAllLangs); setLangSearch(""); }}
              style={{ fontSize: 12, color: "var(--purple-light)", cursor: "pointer", padding: "6px 12px", fontWeight: 600 }}>
              {showAllLangs ? "Show less ▲" : `Show all ${LANGUAGES.length} languages ▼`}
            </div>

            {/* Trending Tags */}
            {trendingTags.length > 0 && (
              <>
                <div style={sideLabel}>📈 Trending Now</div>
                {trendingTags.slice(0, 5).map((t, i) => (
                  <div key={t.name} style={sideItem(activeTag === t.name)} onClick={() => { setActiveTag(t.name); setPage("feed"); }}>
                    <span><span style={{ color: TAG_COLORS[i % TAG_COLORS.length], marginRight: 4 }}>●</span> #{t.name}</span>
                    <span style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600, background: "var(--purple-faint)", borderRadius: 6, padding: "2px 7px" }}>{t.count}</span>
                  </div>
                ))}
              </>
            )}

            {/* Topics */}
            <div style={sideLabel}># Topics</div>
            <div style={sideItem(!activeTag)} onClick={() => { setActiveTag(""); setPage("feed"); }}>All Topics</div>
            {visibleTags.map((t, i) => (
              <div key={t.name} style={sideItem(activeTag === t.name)} onClick={() => { setActiveTag(t.name); setPage("feed"); }}>
                <span><span style={{ color: TAG_COLORS[i % TAG_COLORS.length], marginRight: 4 }}>●</span> #{t.name}</span>
                <span style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600, background: "var(--purple-faint)", borderRadius: 6, padding: "2px 7px" }}>{t.count}</span>
              </div>
            ))}
            {tags.length > 6 && (
              <div onClick={() => setShowAllTags(!showAllTags)} style={{ fontSize: 12, color: "var(--purple-light)", cursor: "pointer", padding: "6px 12px", fontWeight: 600 }}>
                {showAllTags ? "Show less ▲" : `Show all ${tags.length} topics ▼`}
              </div>
            )}

            {/* Submit CTA */}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--glass-border)" }}>
              <button onClick={() => setPage("submit")} style={{
                background: "var(--btn-gradient)", color: "#fff", border: "none", borderRadius: 12,
                padding: "10px 16px", fontSize: 13, fontWeight: 650, cursor: "pointer",
                width: "100%", fontFamily: "inherit", boxShadow: "var(--btn-shadow)",
              }}>✍️ Submit Joke</button>
            </div>
          </div>
        </aside>

        {/* ── MAIN FEED ── */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {page === "submit" ? (
            <SubmitForm onBack={() => setPage("feed")} visitorId={visitorId} />
          ) : page === "admin" ? (
            <AdminPanel onBack={() => setPage("feed")} />
          ) : (
            <>
              {/* Feed header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}>
                    {TIME_FILTERS.find(t => t.key === timePeriod)?.icon} {TIME_FILTERS.find(t => t.key === timePeriod)?.label}
                    {activeTag && <span style={{ color: "var(--purple)" }}> · #{activeTag}</span>}
                    {activeLang !== "ALL" && <span style={{ color: "var(--purple)" }}> · {getLangObj(activeLang).flag} {activeLang}</span>}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    {jokes.length} joke{jokes.length !== 1 ? "s" : ""} · sorted by {SORT_OPTIONS.find(s => s.key === sortBy)?.label.toLowerCase()}
                  </div>
                </div>
                {filterCount > 0 && (
                  <button onClick={() => { setActiveLang("ALL"); setActiveTag(""); }}
                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, color: "var(--red)", cursor: "pointer", fontFamily: "inherit" }}>
                    × Clear {filterCount} filter{filterCount > 1 ? "s" : ""}
                  </button>
                )}
              </div>

              {/* Loading skeletons */}
              {loading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[1, 2, 3, 4].map(i => <JokeSkeleton key={i} />)}
                </div>
              ) : jokes.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {jokes.map((j, idx) => (
                    <JokeCard key={j.id} joke={j} idx={idx} votes={votes} onVote={handleVote} onReact={handleReaction} onFlag={handleFlag} onShare={shareJoke} onTagClick={setActiveTag} />
                  ))}
                </div>
              ) : (
                <div style={{ ...glass, padding: "60px 30px", textAlign: "center" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🤔</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>No jokes found</div>
                  <div style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 20 }}>Try changing your filters or submit the first joke!</div>
                  <button onClick={() => setPage("submit")} style={{ background: "var(--btn-gradient)", color: "#fff", border: "none", borderRadius: 14, padding: "12px 24px", fontSize: 15, fontWeight: 650, cursor: "pointer", fontFamily: "inherit", boxShadow: "var(--btn-shadow)" }}>✍️ Be the first!</button>
                </div>
              )}

              {/* Infinite scroll trigger */}
              {!loading && currentPage < totalPages && (
                <div ref={observerRef} style={{ padding: 20, textAlign: "center" }}>
                  {loadingMore && <div style={{ display: "flex", flexDirection: "column", gap: 12 }}><JokeSkeleton /><JokeSkeleton /></div>}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ── FOOTER — Visit Tracker ── */}
      <footer style={{ ...glass, borderRadius: 0, borderTop: "1px solid var(--glass-border)", padding: "16px 24px", marginTop: 40, textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>🌐 {visitStats.total.toLocaleString()} visits</span>
          {visitStats.countries.slice(0, 8).map(c => (
            <span key={c.country} style={{ fontSize: 12, color: "var(--text-muted)", background: "var(--purple-faint)", borderRadius: 8, padding: "3px 10px", fontWeight: 600 }}>
              {c.flag} {c.country} {c.count}
            </span>
          ))}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 8 }}>
          JokeHub © {new Date().getFullYear()} · Made with 😂
          <span onClick={() => setPage("admin")} style={{ cursor: "default", userSelect: "none", color: "transparent" }}> admin</span>
        </div>
      </footer>

      {/* Mobile responsive CSS */}
      <style>{`
        @media (max-width: 768px) {
          .sidebar-desktop { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>

      {/* Mobile sidebar overlay */}
      {mobileSidebar && (
        <div style={{ position: "fixed", inset: 0, zIndex: 90, display: "flex" }}>
          <div onClick={() => setMobileSidebar(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} />
          <div style={{
            position: "relative", width: 280, maxWidth: "80vw", height: "100%", overflowY: "auto",
            background: "var(--bg-solid)", boxShadow: "4px 0 24px rgba(0,0,0,0.2)", padding: "20px 16px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontWeight: 800, fontSize: 18, color: "var(--text)" }}>😂 JokeHub</span>
              <button onClick={() => setMobileSidebar(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--text-muted)" }}>×</button>
            </div>

            {jokeOfDay && (
              <div style={{ background: "var(--purple-faint)", borderRadius: 14, padding: "14px 16px", marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--purple)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>⭐ Joke of the Day</div>
                <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--text)", margin: 0 }}>
                  {jokeOfDay.text.length > 80 ? jokeOfDay.text.slice(0, 80) + "…" : jokeOfDay.text}
                </p>
              </div>
            )}

            <div style={sideLabel}>🕒 Time Period</div>
            {TIME_FILTERS.map(t => (
              <div key={t.key} style={sideItem(timePeriod === t.key)} onClick={() => { setTimePeriod(t.key); setMobileSidebar(false); }}>
                <span>{t.icon} {t.label}</span>
              </div>
            ))}

            <div style={sideLabel}>↕️ Sort By</div>
            {SORT_OPTIONS.map(s => (
              <div key={s.key} style={sideItem(sortBy === s.key)} onClick={() => { setSortBy(s.key); setMobileSidebar(false); }}>
                <span>{s.icon} {s.label}</span>
              </div>
            ))}

            <div style={sideLabel}>🌐 Language</div>
            {LANGUAGES.slice(0, 10).map(l => (
              <div key={l.code} style={sideItem(activeLang === l.code)} onClick={() => { setActiveLang(l.code); setMobileSidebar(false); }}>
                <span>{l.flag} {l.code === "ALL" ? "All" : l.name}</span>
              </div>
            ))}

            <div style={sideLabel}># Topics</div>
            <div style={sideItem(!activeTag)} onClick={() => { setActiveTag(""); setMobileSidebar(false); }}>All Topics</div>
            {tags.slice(0, 8).map((t, i) => (
              <div key={t.name} style={sideItem(activeTag === t.name)} onClick={() => { setActiveTag(t.name); setMobileSidebar(false); }}>
                <span><span style={{ color: TAG_COLORS[i % TAG_COLORS.length], marginRight: 4 }}>●</span> #{t.name}</span>
              </div>
            ))}

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--glass-border)" }}>
              <button onClick={() => { setPage("submit"); setMobileSidebar(false); }} style={{
                background: "var(--btn-gradient)", color: "#fff", border: "none", borderRadius: 12,
                padding: "10px 16px", fontSize: 13, fontWeight: 650, cursor: "pointer",
                width: "100%", fontFamily: "inherit", boxShadow: "var(--btn-shadow)",
              }}>✍️ Submit Joke</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// JOKE CARD
// ═══════════════════════════════════════

function JokeCard({ joke: j, idx, votes, onVote, onReact, onFlag, onShare, onTagClick }: {
  joke: Joke; idx: number; votes: Record<string, number>;
  onVote: (id: string, v: number) => void; onReact: (id: string, e: string) => void;
  onFlag: (id: string, r: string) => void; onShare: (j: Joke, m: string) => void;
  onTagClick: (t: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showFlag, setShowFlag] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [flagSent, setFlagSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const myVote = votes[j.id] || 0;
  const langObj = getLangObj(j.lang);
  const isLong = j.text.length > 200;
  const displayText = isLong && !expanded ? j.text.slice(0, 200) + "…" : j.text;

  return (
    <div className="animate-in" style={{
      animationDelay: `${Math.min(idx * 60, 300)}ms`,
      background: "var(--glass)", backdropFilter: "var(--blur)", WebkitBackdropFilter: "var(--blur)",
      borderRadius: 20, border: "1px solid var(--glass-border)",
      boxShadow: "var(--card-shadow), var(--highlight)", overflow: "hidden",
      transition: "transform .3s, box-shadow .3s",
    }}>
      <div style={{ height: 4, background: GRADIENT_BARS[idx % 5] }} />
      <div style={{ padding: "22px 26px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12, background: GRADIENT_BARS[idx % 5],
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 700, fontSize: 15, flexShrink: 0,
            }}>{j.author[0].toUpperCase()}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>@{j.author}</div>
              <div style={{ fontSize: 12, color: "var(--text-faint)", display: "flex", gap: 6, alignItems: "center" }}>
                <span>{langObj.flag} {j.lang}</span><span>·</span><span>{timeAgo(j.approvedAt || j.createdAt)}</span>
              </div>
            </div>
          </div>
          {/* Actions: share, flag */}
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => setShowShare(!showShare)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: 4, opacity: 0.5 }} title="Share">↗</button>
            <button onClick={() => setShowFlag(!showFlag)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: 4, opacity: 0.4 }} title="Report">⚑</button>
          </div>
        </div>

        {/* Share popover */}
        {showShare && (
          <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
            {[
              { m: "copy", label: copied ? "✓ Copied!" : "📋 Copy", action: () => { onShare(j, "copy"); setCopied(true); setTimeout(() => setCopied(false), 2000); } },
              { m: "whatsapp", label: "💬 WhatsApp", action: () => onShare(j, "whatsapp") },
              { m: "twitter", label: "𝕏 Twitter", action: () => onShare(j, "twitter") },
              { m: "facebook", label: "📘 Facebook", action: () => onShare(j, "facebook") },
            ].map(s => (
              <button key={s.m} onClick={s.action} style={{
                fontSize: 11, background: "var(--purple-faint)", color: "var(--purple)",
                border: "none", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontWeight: 600, fontFamily: "inherit",
              }}>{s.label}</button>
            ))}
          </div>
        )}

        {/* Flag popover */}
        {showFlag && !flagSent && (
          <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
            {FLAG_REASONS.map(r => (
              <button key={r.key} onClick={() => { onFlag(j.id, r.key); setFlagSent(true); setShowFlag(false); }}
                style={{ fontSize: 11, background: "rgba(239,68,68,0.08)", color: "var(--red)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>
                {r.label}
              </button>
            ))}
          </div>
        )}
        {flagSent && <div style={{ fontSize: 12, color: "var(--green)", marginBottom: 8, fontWeight: 600 }}>✓ Report submitted. Thank you!</div>}

        {/* Joke text */}
        <p style={{ fontSize: 16, lineHeight: 1.6, color: "var(--text)", margin: "0 0 12px" }}>{displayText}</p>
        {isLong && (
          <button onClick={() => setExpanded(!expanded)} style={{ background: "none", border: "none", color: "var(--purple)", cursor: "pointer", fontSize: 13, fontWeight: 600, marginBottom: 12, fontFamily: "inherit", padding: 0 }}>
            {expanded ? "Show less ▲" : "Read more ▼"}
          </button>
        )}

        {/* Tags */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {j.tags.map(t => (
            <span key={t} onClick={() => onTagClick(t)} style={{
              fontSize: 11, color: "var(--purple)", background: "var(--purple-faint)",
              borderRadius: 8, padding: "4px 10px", fontWeight: 600, cursor: "pointer",
            }}>#{t}</span>
          ))}
        </div>

        {/* Footer: votes + reactions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {/* Thumbs up */}
            <button onClick={() => onVote(j.id, 1)} style={{
              background: myVote === 1 ? "var(--purple-faint)" : "var(--glass)",
              border: `1.5px solid ${myVote === 1 ? "var(--purple)" : "var(--glass-border)"}`,
              borderRadius: 10, padding: "6px 14px", display: "flex", alignItems: "center", gap: 6,
              cursor: "pointer", fontSize: 13, fontWeight: 600, color: myVote === 1 ? "var(--purple)" : "var(--text-muted)",
              fontFamily: "inherit", transition: "all .2s",
            }}>
              <span style={{ fontSize: 16, transform: myVote === 1 ? "scale(1.15)" : "scale(1)", transition: "transform .3s cubic-bezier(.68,-.55,.265,1.55)" }}>👍</span>
              {j.thumbsUp}
            </button>
            {/* Thumbs down */}
            <button onClick={() => onVote(j.id, -1)} style={{
              background: myVote === -1 ? "rgba(239,68,68,0.1)" : "var(--glass)",
              border: `1.5px solid ${myVote === -1 ? "var(--red)" : "var(--glass-border)"}`,
              borderRadius: 10, padding: "6px 14px", display: "flex", alignItems: "center", gap: 6,
              cursor: "pointer", fontSize: 13, fontWeight: 600, color: myVote === -1 ? "var(--red)" : "var(--text-muted)",
              fontFamily: "inherit", transition: "all .2s",
            }}>
              <span style={{ fontSize: 16 }}>👎</span>
              {j.thumbsDown}
            </button>
          </div>

          {/* Emoji reactions */}
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {EMOJIS.map(e => {
              const count = j.reactions[e] || 0;
              return count > 0 ? (
                <span key={e} onClick={() => onReact(j.id, e)} style={{
                  fontSize: 12, cursor: "pointer", background: "var(--purple-faint)", borderRadius: 8,
                  padding: "3px 8px", display: "flex", alignItems: "center", gap: 3,
                }}>{e} <span style={{ fontWeight: 600, color: "var(--text-muted)" }}>{count}</span></span>
              ) : null;
            })}
            <button onClick={() => setShowReactions(!showReactions)} style={{
              background: "none", border: "1px solid var(--glass-border)", borderRadius: 8,
              padding: "3px 8px", cursor: "pointer", fontSize: 14, color: "var(--text-faint)",
            }}>+</button>
            {showReactions && (
              <div style={{ display: "flex", gap: 2 }}>
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => { onReact(j.id, e); setShowReactions(false); }}
                    style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 16 }}>
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// SUBMIT FORM
// ═══════════════════════════════════════

function SubmitForm({ onBack, visitorId }: { onBack: () => void; visitorId: string }) {
  const [text, setText] = useState("");
  const [author, setAuthor] = useState("");
  const [lang, setLang] = useState("EN");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [showLangDrop, setShowLangDrop] = useState(false);
  const [langSearch, setLangSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const selLang = LANGUAGES.find(l => l.code === lang) || LANGUAGES[1];
  const filtered = LANGUAGES.filter(l => l.code !== "ALL").filter(l =>
    l.name.toLowerCase().includes(langSearch.toLowerCase()) || l.code.toLowerCase().includes(langSearch.toLowerCase())
  );

  const addTag = () => {
    let t = tagInput.trim().toLowerCase();
    if (!t) return;
    if (t.startsWith("#")) t = t.slice(1);
    if (!tags.includes(t) && tags.length < 5) setTags([...tags, t]);
    setTagInput("");
  };

  const submit = async () => {
    if (!text.trim() || text.trim().length < 10) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/jokes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), author: author.trim() || "Anonymous", lang, tags: tags.map(t => "#" + t) }),
      });
      const data = await res.json();
      if (res.ok) setResult({ ok: true, msg: "Your joke is now live! Go back to the feed to see it." });
      else setResult({ ok: false, msg: data.error || "Something went wrong" });
    } catch { setResult({ ok: false, msg: "Network error" }); }
    setSubmitting(false);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", border: "1.5px solid var(--glass-border)", borderRadius: 10,
    padding: "12px 16px", fontSize: 14, fontFamily: "inherit", color: "var(--text)",
    outline: "none", background: "var(--input-bg)", boxSizing: "border-box" as const,
    transition: "border-color .2s",
  };

  if (result?.ok) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 16 }}>
        <div style={{ fontSize: 64 }}>🎉</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text)" }}>Joke Submitted!</div>
        <div style={{ fontSize: 14, color: "var(--text-muted)", textAlign: "center", maxWidth: 300 }}>{result.msg}</div>
        <button onClick={onBack} style={{ background: "var(--btn-gradient)", color: "#fff", border: "none", borderRadius: 14, padding: "12px 24px", fontSize: 15, fontWeight: 650, cursor: "pointer", fontFamily: "inherit", boxShadow: "var(--btn-shadow)", marginTop: 12 }}>← Back to Feed</button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={onBack} style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 650, color: "var(--purple)", cursor: "pointer", fontFamily: "inherit" }}>← Back</button>
        <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>Submit a Joke</div>
      </div>

      <div style={{ background: "var(--glass)", backdropFilter: "var(--blur)", borderRadius: 20, border: "1px solid var(--glass-border)", boxShadow: "var(--card-shadow), var(--highlight)", padding: "28px 30px" }}>
        {result && !result.ok && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "var(--red)", fontWeight: 600 }}>
            ⚠️ {result.msg}
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "var(--purple)", letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Your Joke * <span style={{ fontWeight: 500, textTransform: "none", color: "var(--text-faint)" }}>(10-500 chars)</span></label>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Type your joke here..." rows={4}
            style={{ ...inputStyle, resize: "vertical", minHeight: 100 }} maxLength={500} />
          <div style={{ fontSize: 11, color: text.length > 450 ? "var(--red)" : "var(--text-faint)", textAlign: "right", marginTop: 4 }}>{text.length}/500</div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "var(--purple)", letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Author Name</label>
          <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="@YourName (optional)" style={inputStyle} maxLength={50} />
        </div>

        <div style={{ marginBottom: 20, position: "relative" }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "var(--purple)", letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Language *</label>
          <div onClick={() => setShowLangDrop(!showLangDrop)} style={{ ...inputStyle, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{selLang.flag} {selLang.name}</span>
            <span style={{ color: "var(--text-faint)", fontSize: 12 }}>{showLangDrop ? "▲" : "▼"}</span>
          </div>
          {showLangDrop && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
              background: "var(--glass)", backdropFilter: "var(--blur)", border: "1px solid var(--glass-border)",
              borderRadius: 14, boxShadow: "0 8px 32px rgba(124,58,237,0.15)", maxHeight: 260, overflow: "hidden",
              display: "flex", flexDirection: "column",
            }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--glass-border)" }}>
                <input value={langSearch} onChange={e => setLangSearch(e.target.value)} placeholder="Search language..." autoFocus
                  style={{ ...inputStyle, padding: "8px 12px", fontSize: 13 }} />
              </div>
              <div style={{ overflowY: "auto", maxHeight: 200 }}>
                {filtered.map(l => (
                  <div key={l.code} onClick={() => { setLang(l.code); setShowLangDrop(false); setLangSearch(""); }}
                    style={{ padding: "9px 14px", cursor: "pointer", background: lang === l.code ? "var(--purple-faint)" : "transparent", display: "flex", gap: 10, alignItems: "center", fontSize: 13, color: lang === l.code ? "var(--purple)" : "var(--text)", fontWeight: lang === l.code ? 700 : 500, transition: "all .1s" }}>
                    <span style={{ fontSize: 16 }}>{l.flag}</span><span>{l.name}</span>
                    <span style={{ fontSize: 11, color: "var(--text-faint)", marginLeft: "auto" }}>{l.code}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "var(--purple)", letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Hashtags <span style={{ fontWeight: 500, textTransform: "none", color: "var(--text-faint)" }}>(up to 5)</span></label>
          <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            {tags.map(t => (
              <span key={t} style={{ fontSize: 12, color: "var(--purple)", background: "var(--purple-faint)", borderRadius: 8, padding: "5px 12px", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                #{t} <span onClick={() => setTags(tags.filter(x => x !== t))} style={{ cursor: "pointer", color: "var(--red)", fontWeight: 800, fontSize: 14 }}>×</span>
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={tagInput} onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
              placeholder="#topic (press Enter)" style={{ ...inputStyle, flex: 1 }} />
            <button onClick={addTag} style={{ background: "var(--btn-gradient)", color: "#fff", border: "none", borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 650, cursor: "pointer", fontFamily: "inherit" }}>Add</button>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
            <span style={{ fontSize: 11, color: "var(--text-faint)", marginRight: 4 }}>Popular:</span>
            {["doctors", "animals", "programming", "dad jokes", "marriage", "school", "food"].map(t => (
              <span key={t} onClick={() => { if (!tags.includes(t) && tags.length < 5) setTags([...tags, t]); }}
                style={{ fontSize: 11, color: "var(--purple-light)", cursor: "pointer", fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: "var(--purple-faint)" }}>#{t}</span>
            ))}
          </div>
        </div>

        <button onClick={submit} disabled={submitting || text.trim().length < 10}
          style={{
            background: "var(--btn-gradient)", color: "#fff", border: "none", borderRadius: 14,
            padding: "14px 24px", fontSize: 15, fontWeight: 650, cursor: submitting || text.trim().length < 10 ? "default" : "pointer",
            width: "100%", fontFamily: "inherit", boxShadow: "var(--btn-shadow)",
            opacity: submitting || text.trim().length < 10 ? 0.5 : 1,
          }}>
          {submitting ? "Submitting…" : "🚀 Submit Joke"}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// ADMIN PANEL (discrete)
// ═══════════════════════════════════════

function AdminPanel({ onBack }: { onBack: () => void }) {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<"pending" | "approved" | "flagged" | "removed" | "stats">("pending");
  const [jokes, setJokes] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const headers = { "x-admin-secret": secret, "Content-Type": "application/json" };

  const loadJokes = async (status: string) => {
    setLoading(true);
    const res = await fetch(`/api/admin/jokes?status=${status}`, { headers: { "x-admin-secret": secret } });
    if (res.ok) { const d = await res.json(); setJokes(d.jokes); }
    setLoading(false);
  };

  const loadStats = async () => {
    const res = await fetch("/api/admin/stats", { headers: { "x-admin-secret": secret } });
    if (res.ok) setStats(await res.json());
  };

  const tryAuth = async () => {
    const res = await fetch("/api/admin/stats?secret=" + secret);
    if (res.ok) { setAuthed(true); loadJokes("pending"); loadStats(); }
    else alert("Invalid secret");
  };

  const bulkAction = async (action: "approve" | "reject" | "delete") => {
    const ids = [...selected];
    if (!ids.length) return;
    if (action === "delete") {
      await fetch("/api/admin/jokes", { method: "DELETE", headers, body: JSON.stringify({ ids }) });
    } else {
      await fetch("/api/admin/jokes", { method: "PATCH", headers, body: JSON.stringify({ ids, action }) });
    }
    setSelected(new Set());
    loadJokes(tab === "flagged" ? "approved" : tab);
    loadStats();
  };

  useEffect(() => { if (authed) { if (tab === "stats") loadStats(); else loadJokes(tab === "flagged" ? "approved" : tab); } }, [tab]);

  const inputStyle: React.CSSProperties = { border: "1.5px solid var(--glass-border)", borderRadius: 10, padding: "12px 16px", fontSize: 14, fontFamily: "inherit", color: "var(--text)", outline: "none", background: "var(--input-bg)", width: "100%", boxSizing: "border-box" };

  if (!authed) {
    return (
      <div style={{ maxWidth: 400, margin: "40px auto", textAlign: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 20 }}>🔒 Admin Access</div>
        <input type="password" value={secret} onChange={e => setSecret(e.target.value)} placeholder="Enter admin secret"
          onKeyDown={e => e.key === "Enter" && tryAuth()} style={inputStyle} />
        <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "center" }}>
          <button onClick={tryAuth} style={{ background: "var(--btn-gradient)", color: "#fff", border: "none", borderRadius: 12, padding: "10px 24px", fontSize: 14, fontWeight: 650, cursor: "pointer", fontFamily: "inherit" }}>Login</button>
          <button onClick={onBack} style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: 12, padding: "10px 24px", fontSize: 14, cursor: "pointer", color: "var(--text-muted)", fontFamily: "inherit" }}>Cancel</button>
        </div>
      </div>
    );
  }

  const filteredJokes = tab === "flagged" ? jokes.filter(j => j.flagCount > 0) : jokes;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 650, color: "var(--purple)", cursor: "pointer", fontFamily: "inherit" }}>← Back</button>
        <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>🔧 Admin Panel</div>
      </div>

      {/* Stats bar */}
      {stats && (
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          {[
            { label: "Total", value: stats.total, color: "var(--purple)" },
            { label: "Pending", value: stats.pending, color: "var(--orange)" },
            { label: "Approved", value: stats.approved, color: "var(--green)" },
            { label: "Removed", value: stats.removed, color: "var(--red)" },
            { label: "Flagged", value: stats.flagged, color: "var(--pink)" },
            { label: "Votes Today", value: stats.votesToday, color: "var(--blue)" },
            { label: "Submissions/Week", value: stats.submissionsWeek, color: "var(--accent)" },
            { label: "Visits", value: stats.visits, color: "var(--purple-light)" },
          ].map(s => (
            <div key={s.label} style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: 12, padding: "10px 16px", minWidth: 100, textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {(["pending", "approved", "flagged", "removed", "stats"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: tab === t ? "var(--btn-gradient)" : "var(--glass)",
            color: tab === t ? "#fff" : "var(--text-muted)",
            border: tab === t ? "none" : "1px solid var(--glass-border)",
            borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 650,
            cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize",
          }}>{t} {t === "pending" && stats ? `(${stats.pending})` : ""}</button>
        ))}
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && tab !== "stats" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12, padding: "10px 16px", background: "var(--purple-faint)", borderRadius: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--purple)" }}>{selected.size} selected</span>
          {tab === "pending" && <button onClick={() => bulkAction("approve")} style={{ background: "var(--green)", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 650, cursor: "pointer", fontFamily: "inherit" }}>✓ Approve</button>}
          {tab === "pending" && <button onClick={() => bulkAction("reject")} style={{ background: "var(--orange)", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 650, cursor: "pointer", fontFamily: "inherit" }}>✗ Reject</button>}
          <button onClick={() => bulkAction("delete")} style={{ background: "var(--red)", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 650, cursor: "pointer", fontFamily: "inherit" }}>🗑 Delete</button>
          <button onClick={() => setSelected(new Set())} style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer", color: "var(--text-muted)", fontFamily: "inherit" }}>Clear</button>
        </div>
      )}

      {/* Joke list */}
      {tab !== "stats" && (
        loading ? <div>Loading…</div> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filteredJokes.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "var(--text-faint)" }}>No jokes in this category</div>}
            {filteredJokes.map(j => (
              <div key={j.id} style={{
                background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: 14,
                padding: "14px 18px", display: "flex", gap: 12, alignItems: "flex-start",
              }}>
                <input type="checkbox" checked={selected.has(j.id)}
                  onChange={() => { const s = new Set(selected); if (s.has(j.id)) s.delete(j.id); else s.add(j.id); setSelected(s); }}
                  style={{ marginTop: 4, accentColor: "var(--purple)" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: "var(--text)", marginBottom: 4 }}>{j.text.slice(0, 150)}{j.text.length > 150 ? "…" : ""}</div>
                  <div style={{ fontSize: 11, color: "var(--text-faint)", display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span>@{j.author}</span><span>{getLangObj(j.lang).flag} {j.lang}</span>
                    <span>👍{j.thumbsUp} 👎{j.thumbsDown}</span>
                    {j.flagCount > 0 && <span style={{ color: "var(--red)" }}>⚑{j.flagCount}</span>}
                    <span>{j.tags.map((t: string) => "#" + t).join(" ")}</span>
                    <span>{timeAgo(j.createdAt)}</span>
                    {j.ip && <span style={{ color: "var(--text-faint)", fontSize: 10 }}>IP: {j.ip}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Stats tab */}
      {tab === "stats" && stats && (
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>Top Languages:</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {stats.topLangs.map((l: any) => (
              <span key={l.lang} style={{ fontSize: 13, background: "var(--purple-faint)", color: "var(--purple)", borderRadius: 8, padding: "5px 12px", fontWeight: 600 }}>
                {getLangObj(l.lang).flag} {l.lang}: {l.count}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
