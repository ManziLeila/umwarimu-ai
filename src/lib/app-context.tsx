import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "rw";

type Dict = Record<string, { en: string; rw: string }>;

const dict: Dict = {
  "nav.dashboard": { en: "Dashboard", rw: "Imbonerahamwe" },
  "nav.students": { en: "Students", rw: "Abanyeshuri" },
  "nav.analytics": { en: "Analytics", rw: "Isesengura" },
  "nav.tutor": { en: "AI Tutor", rw: "Mwarimu AI" },
  "nav.entry": { en: "Marks & Attendance", rw: "Amanota n'Ubwitabire" },
  "nav.messages": { en: "Messages", rw: "Ubutumwa" },
  "nav.notifications": { en: "Notifications", rw: "Ubutumwa" },
  "nav.settings": { en: "Settings", rw: "Igenamiterere" },
  "nav.adminStaff": { en: "Manage Staff", rw: "Gucunga abakozi" },
  "nav.adminStudents": { en: "Manage Students", rw: "Gucunga abanyeshuri" },
  "dash.sub": {
    en: "Here's what is happening with your students today.",
    rw: "Dore ibiri kubaho ku banyeshuri bawe uyu munsi.",
  },
  "metric.students": { en: "Students", rw: "Abanyeshuri" },
  "metric.avg": { en: "Avg Score", rw: "Impuzandengo" },
  "metric.attendance": { en: "Attendance", rw: "Kwitabira" },
  "metric.support": { en: "Need Support", rw: "Bakeneye Ubufasha" },
  "insight.title": { en: "Umwarimu AI Insight", rw: "Inama ya Umwarimu AI" },
  "status.title": { en: "Student Support Status", rw: "Uko abanyeshuri bahagaze" },
  "status.ontrack": { en: "On Track", rw: "Bagenda neza" },
  "status.improving": { en: "Improving", rw: "Batera imbere" },
  "status.support": { en: "Need Support", rw: "Bakeneye ubufasha" },
  "status.risk": { en: "At Risk", rw: "Bafite ikibazo" },
  "tutor.placeholder": { en: "Ask anything...", rw: "Baza ikibazo icyo ari cyo cyose..." },
  "tutor.practice": { en: "Practice", rw: "Imyitozo" },
  "tutor.simpler": { en: "Explain simpler", rw: "Sobanura byoroshye" },
  "tutor.plan": { en: "Study plan", rw: "Gahunda y'kwiga" },
  "common.viewStudents": { en: "View Students", rw: "Reba abanyeshuri" },
  "common.lastUpdated": { en: "Last updated", rw: "Byavuguruwe" },
  "common.search": { en: "Search students, subjects...", rw: "Shakisha abanyeshuri, amasomo..." },
};

type AppState = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  reduceMotion: boolean;
  setReduceMotion: (v: boolean) => void;
};

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const [reduceMotion, setReduceMotionState] = useState(false);

  useEffect(() => {
    const l = localStorage.getItem("umwarimu.lang") as Lang | null;
    if (l === "en" || l === "rw") setLangState(l);
    setReduceMotionState(localStorage.getItem("umwarimu.reduceMotion") === "1");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", reduceMotion);
  }, [reduceMotion]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("umwarimu.lang", l);
  }, []);

  const setReduceMotion = useCallback((v: boolean) => {
    setReduceMotionState(v);
    localStorage.setItem("umwarimu.reduceMotion", v ? "1" : "0");
  }, []);

  const t = useCallback((key: string) => dict[key]?.[lang] ?? key, [lang]);

  return (
    <AppContext.Provider value={{ lang, setLang, t, reduceMotion, setReduceMotion }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
