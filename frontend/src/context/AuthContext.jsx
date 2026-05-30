// context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { auth, saveTokens } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const me = await auth.me();
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
    const handler = () => { setUser(null); };
    window.addEventListener("auth:expired", handler);
    return () => window.removeEventListener("auth:expired", handler);
  }, [fetchMe]);

  const login = async (email, password) => {
    const res = await auth.login({ email, password });
    saveTokens(res);
    setUser(res.user);
    return res;
  };

  const register = async (data) => {
    const res = await auth.register(data);
    setUser(res.user);
    return res;
  };

  const logout = async () => {
    await auth.logout().catch(() => {});
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);