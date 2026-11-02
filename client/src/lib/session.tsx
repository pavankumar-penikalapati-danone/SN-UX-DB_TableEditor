import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { WhoAmI } from '../../../shared/schema';
import { fetchWhoAmI, getDemoUser, setDemoUser } from './api';

interface SessionValue {
  whoami: WhoAmI | null;
  loading: boolean;
  demoUser: string;
  changeUser: (email: string) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [whoami, setWhoami] = useState<WhoAmI | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoUser, setDemoUserState] = useState<string>(getDemoUser());

  const load = useCallback(() => {
    setLoading(true);
    fetchWhoAmI()
      .then(setWhoami)
      .catch(() => setWhoami(null))
      .finally(() => setLoading(false));
  }, []);

  // Initial identity fetch. State is updated only inside the async callbacks so
  // we never set state synchronously within the effect body.
  useEffect(() => {
    let active = true;
    fetchWhoAmI()
      .then((data) => {
        if (active) setWhoami(data);
      })
      .catch(() => {
        if (active) setWhoami(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const changeUser = useCallback(
    (email: string) => {
      setDemoUser(email);
      setDemoUserState(email);
      load();
    },
    [load],
  );

  return (
    <SessionContext.Provider value={{ whoami, loading, demoUser, changeUser }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
