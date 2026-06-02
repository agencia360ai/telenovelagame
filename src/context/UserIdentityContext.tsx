import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

type UserIdentity = {
  userId: string | null;
  loading: boolean;
};

const UserIdentityContext = createContext<UserIdentity>({
  userId: null,
  loading: true,
});

const ANON_USER_KEY = "anon_user_id";

export function UserIdentityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (supabase) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.user) {
            setUserId(session.user.id);
          } else {
            const { data } = await supabase.auth.signInAnonymously();
            if (data.user) {
              setUserId(data.user.id);
            }
          }
        } else {
          let localId = await AsyncStorage.getItem(ANON_USER_KEY);
          if (!localId) {
            localId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            await AsyncStorage.setItem(ANON_USER_KEY, localId);
          }
          setUserId(localId);
        }
      } catch {
        let localId = await AsyncStorage.getItem(ANON_USER_KEY);
        if (!localId) {
          localId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;
          await AsyncStorage.setItem(ANON_USER_KEY, localId);
        }
        setUserId(localId);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <UserIdentityContext.Provider value={{ userId, loading }}>
      {children}
    </UserIdentityContext.Provider>
  );
}

export function useUserIdentity() {
  return useContext(UserIdentityContext);
}
