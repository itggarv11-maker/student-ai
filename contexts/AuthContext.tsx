

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  UserCredential
} from 'https://esm.sh/firebase/auth';
import { auth as firebaseAuth, isFirebaseConfigured } from '../services/firebase';
import { FirebaseUser } from '../types';

const INITIAL_TOKENS = 100;
const SECRET_ACCESS_KEY = 'stubro_secret_access';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  loading: boolean;
  tokens: number | null;
  signup: (email: string, pass: string) => Promise<any>;
  login: (email: string, pass: string) => Promise<any>;
  logout: () => Promise<void>;
  isFirebaseConfigured: boolean;
  secretAccessActive: boolean;
  activateSecretAccess: () => void;
  endSecretSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

const unconfiguredError = () => Promise.reject(new Error("Firebase is not configured. Please add your project credentials in 'services/firebase.ts'."));

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [tokens, setTokens] = useState<number | null>(null);
  const [secretAccessActive, setSecretAccessActive] = useState<boolean>(() => localStorage.getItem(SECRET_ACCESS_KEY) === 'true');

  useEffect(() => {
    if (!isFirebaseConfigured || !firebaseAuth) {
      setLoading(false);
      return;
    }
    
    const authTimeout = setTimeout(() => {
        console.warn("Firebase auth state check timed out after 15 seconds. Assuming no user is logged in.");
        setLoading(false);
    }, 15000);

    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      clearTimeout(authTimeout);
      setCurrentUser(user);

      if (user) {
        const tokenKey = `userTokens_${user.uid}`;
        
        // If user logs in/signs up while having secret access, bind it to their account.
        if (localStorage.getItem(SECRET_ACCESS_KEY) === 'true') {
            const unlimitedTokens = 999999;
            localStorage.setItem(tokenKey, String(unlimitedTokens));
            setTokens(unlimitedTokens);
            
            // Consume the secret access key as it's now tied to the account.
            localStorage.removeItem(SECRET_ACCESS_KEY);
            setSecretAccessActive(false);
        } else {
            const storedTokens = localStorage.getItem(tokenKey);
            if (storedTokens === null) {
              localStorage.setItem(tokenKey, String(INITIAL_TOKENS));
              setTokens(INITIAL_TOKENS);
            } else {
              setTokens(parseInt(storedTokens, 10));
            }
        }
      } else {
        setTokens(null);
        // Do not clear secretAccessActive here, so a guest session can persist.
      }
      
      setLoading(false);
    });

    // Listen for token changes from the geminiService
    const handleTokenChange = (event: CustomEvent) => {
        if (typeof event.detail.newTokens === 'number') {
            setTokens(event.detail.newTokens);
        }
    };
    window.addEventListener('tokenChange', handleTokenChange as EventListener);


    return () => {
        unsubscribe();
        clearTimeout(authTimeout);
        window.removeEventListener('tokenChange', handleTokenChange as EventListener);
    };
  }, []);

  const activateSecretAccess = () => {
    localStorage.setItem(SECRET_ACCESS_KEY, 'true');
    setSecretAccessActive(true);
    // If a user is already logged in when activating, grant them tokens immediately.
    if (currentUser) {
        const tokenKey = `userTokens_${currentUser.uid}`;
        const unlimitedTokens = 999999;
        localStorage.setItem(tokenKey, String(unlimitedTokens));
        setTokens(unlimitedTokens);
        window.dispatchEvent(new CustomEvent('tokenChange', { detail: { newTokens: unlimitedTokens } }));
        
        // Consume the key immediately since they have an account
        localStorage.removeItem(SECRET_ACCESS_KEY);
        setSecretAccessActive(false);
    }
  };
  
  const endSecretSession = () => {
      localStorage.removeItem(SECRET_ACCESS_KEY);
      setSecretAccessActive(false);
  };

  const signup = async (email: string, pass: string): Promise<UserCredential> => {
    if (!isFirebaseConfigured || !firebaseAuth) return unconfiguredError();
    // onAuthStateChanged will handle token assignment and secret key consumption.
    return createUserWithEmailAndPassword(firebaseAuth, email, pass);
  };

  const login = (email: string, pass: string) => {
    if (!isFirebaseConfigured || !firebaseAuth) return unconfiguredError();
    // After login, onAuthStateChanged will fire and handle token logic.
    return signInWithEmailAndPassword(firebaseAuth, email, pass);
  };
  
  const logout = () => {
    if (!isFirebaseConfigured || !firebaseAuth) return unconfiguredError() as Promise<void>;
    endSecretSession(); // Also clear secret access on full logout
    return signOut(firebaseAuth);
  };

  const value = {
    currentUser,
    loading,
    tokens,
    signup,
    login,
    logout,
    isFirebaseConfigured,
    secretAccessActive,
    activateSecretAccess,
    endSecretSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};