import React, { useState, useEffect } from 'react';
import { ManagerDashboard } from './views/ManagerDashboard';
import { StaffDashboard } from './views/StaffDashboard';
import { RegisterView } from './views/RegisterView';
import { UserRole, User } from './types';
import { supabase } from './services/supabaseClient';
import { UserProvider, useUser } from './contexts/UserContext';
import { Loader2, ShieldCheck, Database, Smartphone, Bug, QrCode } from 'lucide-react';
import liff from '@line/liff';

// ------------------------------------------------------------------
// 🛠 MOCK DATA (Only for Dev/Fallback)
// ------------------------------------------------------------------
const MOCK_MANAGER: User = {
  id: 'dev-manager-id',
  line_user_id: 'U11111',
  display_name: 'Dev Manager',
  role: UserRole.MANAGER,
  reliability_score: 100,
  is_active: true,
  avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Manager'
};

const MOCK_STAFF: User = {
  id: 'dev-staff-id',
  line_user_id: 'U22222',
  display_name: 'Dev Staff',
  role: UserRole.STAFF,
  reliability_score: 95,
  is_active: true,
  avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Staff'
};

const AppContent: React.FC = () => {
  const { user, setUser, isLoading, setIsLoading } = useUser();
  const [lineUserId, setLineUserId] = useState<string | null>(null);
  const [lineProfile, setLineProfile] = useState<{ displayName: string; pictureUrl?: string } | null>(null);
  
  const [view, setView] = useState<'LOADING' | 'MANAGER' | 'STAFF' | 'REGISTER' | 'LINE_REQUIRED'>('LOADING');
  const [error, setError] = useState<string | null>(null);
  
  // Track if we are strictly in dev mode with mocks
  const [usingMockData, setUsingMockData] = useState(false);

  useEffect(() => {
    const initializeGatekeeper = async () => {
      try {
        let currentUserId = '';
        let shouldUseMock = false;

        // ---------------------------------------------------------
        // 1. LIFF INITIALIZATION & AUTH
        // ---------------------------------------------------------
        try {
          // Use safe access for env variables with optional chaining (?.)
          const liffId = (import.meta as any).env?.VITE_LIFF_ID;
          
          if (!liffId) {
             // If no ID is present, we consider this a configuration error or dev environment without env vars.
             // We throw specific error to catch below.
             throw new Error("VITE_LIFF_ID is missing");
          }

          await liff.init({ liffId });

          if (!liff.isLoggedIn()) {
            liff.login();
            return; // 🛑 Halt execution while redirecting
          }

          const profile = await liff.getProfile();
          currentUserId = profile.userId;
          setLineUserId(currentUserId);
          setLineProfile({
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl
          });

        } catch (liffError) {
          // ⚠️ AUTH FAILURE HANDLING
          
          // Safe check for PROD environment
          const isProd = (import.meta as any).env?.PROD;

          if (isProd) {
             // PRODUCTION: STRICT FAILURE
             console.error("LIFF Init failed in Production:", liffError);
             setView('LINE_REQUIRED');
             setIsLoading(false);
             return; 
          } 
          
          // DEVELOPMENT: FALLBACK ALLOWED
          console.warn("⚠️ LIFF Init failed. Falling back to Dev Mode (Mock Data).", liffError);
          shouldUseMock = true;
          currentUserId = MOCK_MANAGER.line_user_id;
          setLineUserId(currentUserId);
          setLineProfile({
            displayName: "Dev User",
            pictureUrl: undefined
          });
        }

        // ---------------------------------------------------------
        // 2. SUPABASE USER CHECK
        // ---------------------------------------------------------
        let foundUser: User | null = null;

        if (!shouldUseMock) {
          try {
             const { data, error: dbError } = await supabase
               .from('users')
               .select('*')
               .eq('line_user_id', currentUserId)
               .maybeSingle();

             if (dbError) throw dbError;
             
             if (data) {
               foundUser = data;
             } else {
               // User not found in DB -> Register
             }

          } catch (dbError) {
             // Safe check for PROD environment
             const isProd = (import.meta as any).env?.PROD;

             if (isProd) {
                // In Prod, DB error is fatal
                throw dbError; 
             } else {
                // In Dev, DB error triggers fallback
                console.warn("⚠️ Supabase check failed. Using Mock Data.", dbError);
                shouldUseMock = true;
             }
          }
        }

        // ---------------------------------------------------------
        // 3. SET MOCK DATA (IF NEEDED)
        // ---------------------------------------------------------
        if (shouldUseMock) {
           setUsingMockData(true);
           // Default to Manager for initial Dev load
           foundUser = currentUserId === MOCK_MANAGER.line_user_id ? MOCK_MANAGER : MOCK_STAFF;
        }

        // ---------------------------------------------------------
        // 4. ROUTING LOGIC
        // ---------------------------------------------------------
        if (foundUser) {
          // Safe check for DEV environment logging
          if ((import.meta as any).env?.DEV) {
             console.log(`✅ Logged in as: ${foundUser.display_name} (${foundUser.role})`);
          }
          setUser(foundUser);
          setView(foundUser.role === UserRole.MANAGER ? 'MANAGER' : 'STAFF');
        } else {
          // New User Flow
          setView('REGISTER');
        }

      } catch (err: any) {
        console.error("🔥 Critical Gatekeeper Error:", err);
        setError(err.message || "An unexpected error occurred.");
      } finally {
        // Only stop loading if we haven't redirected to LINE_REQUIRED (which has its own static view)
        if (view !== 'LINE_REQUIRED') {
            setIsLoading(false);
        }
      }
    };

    initializeGatekeeper();
  }, [setUser, setIsLoading]);

  // --- Dev Mode Role Switcher ---
  const toggleDevRole = (role: UserRole) => {
    const mockUser = role === UserRole.MANAGER ? MOCK_MANAGER : MOCK_STAFF;
    setUser(mockUser);
    setLineUserId(mockUser.line_user_id);
    setView(role === UserRole.MANAGER ? 'MANAGER' : 'STAFF');
    setUsingMockData(true);
  };

  const handleRegisterSuccess = (newUser: User) => {
    setUser(newUser);
    setView(newUser.role === UserRole.MANAGER ? 'MANAGER' : 'STAFF');
  };

  // ---------------------------------------------------------
  // RENDER STATES
  // ---------------------------------------------------------

  if (view === 'LINE_REQUIRED') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center font-inter">
         <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 max-w-sm w-full transform transition-all hover:scale-[1.02]">
             <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <Smartphone className="w-10 h-10 text-green-600" />
             </div>
             <h2 className="text-2xl font-bold text-gray-900 mb-3">Open in LINE</h2>
             <p className="text-gray-500 text-base mb-8 leading-relaxed">
                ShiftSaver is designed to work seamlessly inside LINE. Please open this link using the app.
             </p>
             
             {/* Decorative QR Area */}
             <div className="bg-gray-50 border-2 border-dashed border-gray-200 p-6 rounded-2xl flex flex-col items-center justify-center gap-2 group cursor-default">
                 <QrCode className="w-24 h-24 text-gray-300 group-hover:text-green-500 transition-colors duration-500" />
                 <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">Mobile Only</span>
             </div>
         </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <div className="bg-red-100 p-4 rounded-full mb-4">
          <ShieldCheck className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Authentication Error</h2>
        <p className="text-gray-500 mt-2 max-w-xs mx-auto">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-6 px-4 py-2 bg-gray-900 text-white rounded-lg font-medium">
          Retry
        </button>
      </div>
    );
  }

  if (view === 'LOADING' || isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-indigo-950 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="relative flex flex-col items-center">
           <Loader2 className="w-12 h-12 animate-spin mb-6 text-indigo-400" />
           <h2 className="text-2xl font-bold tracking-tight">Verifying Identity...</h2>
           <p className="text-indigo-300 text-sm mt-2">Securing connection to ShiftSaver</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* 🚀 Main Application Views */}
      {view === 'MANAGER' && <ManagerDashboard />}
      {view === 'STAFF' && user && <StaffDashboard currentUser={user} />}
      {view === 'REGISTER' && (
        <RegisterView 
          lineUserId={lineUserId || 'Unknown'} 
          lineProfile={lineProfile}
          onRegisterSuccess={handleRegisterSuccess} 
        />
      )}

      {/* 🛠 Dev Mode Floating Controls (HIDDEN IN PROD) */}
      {/* We use safe check here. If env is undefined, this block simply won't show, which is fine. */}
      {((import.meta as any).env?.DEV || !(import.meta as any).env?.PROD) && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-500">
           <div className="bg-gray-900/95 backdrop-blur-md border border-gray-700 text-white p-3 rounded-xl shadow-2xl flex flex-col gap-3">
              <div className="flex items-center gap-2 text-[10px] font-bold text-yellow-400 uppercase tracking-widest border-b border-gray-700 pb-2">
                 <Bug className="w-3 h-3" />
                 {usingMockData ? 'Dev: Mock Data' : 'Dev: Real Data'}
              </div>
              
              <div className="flex items-center gap-2">
                 <button 
                    onClick={() => toggleDevRole(UserRole.MANAGER)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                       user?.role === UserRole.MANAGER 
                       ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                       : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                 >
                    <Database className="w-3 h-3" />
                    Manager
                 </button>
                 
                 <button 
                    onClick={() => toggleDevRole(UserRole.STAFF)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                       user?.role === UserRole.STAFF 
                       ? 'bg-green-600 text-white shadow-lg shadow-green-500/30' 
                       : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                 >
                    <Smartphone className="w-3 h-3" />
                    Staff
                 </button>
              </div>
           </div>
        </div>
      )}
    </>
  );
};

const App: React.FC = () => {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
};

export default App;