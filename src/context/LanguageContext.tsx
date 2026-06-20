import { createContext, useContext, useState, ReactNode } from 'react';

type Lang = 'en' | 'sw';

interface LangContext {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (en: string, sw: string) => string;
}

const LangCtx = createContext<LangContext>({ lang: 'en', setLang: () => {}, t: (e: string) => e });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');
  const t = (en: string, sw: string) => lang === 'sw' ? sw : en;
  return <LangCtx.Provider value={{ lang, setLang, t }}>{children}</LangCtx.Provider>;
}

export const useLang = () => useContext(LangCtx);
