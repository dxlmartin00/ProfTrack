import { useState, useMemo } from 'react';
import type { FC, FormEvent } from 'react';
import { 
  authenticateUser, 
  registerInstructor, 
  formatUsername
} from '../services/auth';
import type { UserAccount } from '../services/auth';
import { 
  GraduationCap, 
  KeyRound, 
  User, 
  Building2, 
  School, 
  UserPlus, 
  LogIn, 
  AlertCircle, 
  CheckCircle2, 
  Eye, 
  EyeOff,
  Loader2
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onLoginSuccess: (user: UserAccount) => void;
  onClose?: () => void;
  onAccountsUpdated?: () => void;
  allowClose?: boolean;
}

export const AuthModal: FC<AuthModalProps> = ({
  isOpen,
  onLoginSuccess,
  onClose,
  onAccountsUpdated,
  allowClose = false,
}) => {
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  
  // Sign In Form State
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [suggestRegisterFor, setSuggestRegisterFor] = useState<string | null>(null);

  // Register Form State
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regDept, setRegDept] = useState('College of Computer Studies');
  const [regInst, setRegInst] = useState('University of Makati');
  const [regPin, setRegPin] = useState('1234');
  const [regSuccessUser, setRegSuccessUser] = useState<UserAccount | null>(null);
  const [regError, setRegError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Real-time computed username preview
  const calculatedUsername = useMemo(() => {
    if (!regLastName && !regFirstName) return '<lastname>.<firstname>';
    return formatUsername(regLastName || 'lastname', regFirstName || 'firstname');
  }, [regLastName, regFirstName]);

  if (!isOpen) return null;

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setSignInError(null);
    setSuggestRegisterFor(null);

    if (!username.trim()) {
      setSignInError('Please enter your username (format: lastname.firstname)');
      return;
    }

    if (pin.trim().length !== 4) {
      setSignInError('Please enter your 4-digit PIN.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authenticateUser(username, pin);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
        if (onClose) onClose();
      } else {
        setSignInError(res.error || 'Authentication failed. Please check your credentials.');
        if (res.accountNotFound) {
          setSuggestRegisterFor(username.trim());
        }
      }
    } catch (err: any) {
      setSignInError(err?.message || 'Authentication error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickSwitchToRegister = (nameToUse: string) => {
    const parts = nameToUse.split('.');
    const cleanLast = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : '';
    const cleanFirst = parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : '';
    setRegLastName(cleanLast);
    setRegFirstName(cleanFirst);
    setSignInError(null);
    setSuggestRegisterFor(null);
    setMode('register');
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setRegError(null);
    setRegSuccessUser(null);

    if (!regFirstName.trim() || !regLastName.trim()) {
      setRegError('First name and last name are required.');
      return;
    }

    if (regPin.trim().length !== 4) {
      setRegError('Please choose a 4-digit PIN.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await registerInstructor({
        firstName: regFirstName,
        lastName: regLastName,
        department: regDept,
        institution: regInst,
        pin: regPin,
      });

      if (res.success && res.user) {
        setRegSuccessUser(res.user);
        if (onAccountsUpdated) onAccountsUpdated();
        // Reset form
        setRegFirstName('');
        setRegLastName('');
      } else {
        setRegError(res.error || 'Failed to register account.');
      }
    } catch (err: any) {
      setRegError(err?.message || 'Failed to register account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/75 backdrop-blur-sm p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
      <div className="bg-white text-zinc-950 rounded-2xl border border-zinc-200 w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto dark:bg-[#12141a] dark:border-zinc-800 dark:text-zinc-100 night:bg-[#0b0d11] night:border-zinc-800/80">
        
        {/* Header Ribbon */}
        <div className="bg-zinc-950 p-6 text-white text-center relative dark:bg-[#0c0d12] dark:border-b dark:border-zinc-800/80">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800 text-white mb-3 shadow-inner border border-zinc-700 dark:bg-zinc-900 dark:border-zinc-700/80">
            <GraduationCap className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 id="auth-modal-title" className="text-xl font-bold tracking-tight">
            ProfTrack Academic Portal
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Faculty Teaching Timetable & Course Syllabus Management
          </p>

          {allowClose && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors cursor-pointer text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 border-b border-zinc-200 bg-zinc-50 p-1.5 gap-1.5 dark:border-zinc-800/80 dark:bg-zinc-900/60">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setSignInError(null);
            }}
            className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mode === 'signin'
                ? 'bg-white text-zinc-950 shadow-2xs dark:bg-zinc-800 dark:text-zinc-100'
                : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-100'
            }`}
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>Sign In</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('register');
              setRegError(null);
              setRegSuccessUser(null);
            }}
            className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-white text-zinc-950 shadow-2xs dark:bg-zinc-800 dark:text-zinc-100'
                : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-100'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>New Instructor</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {mode === 'signin' ? (
            /* Sign In Form */
            <form onSubmit={handleSignIn} className="space-y-4">
              {signInError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2 text-xs text-red-900 animate-in fade-in dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <p className="leading-snug">{signInError}</p>
                  </div>
                  {suggestRegisterFor && (
                    <div className="pt-1 border-t border-red-200/60 dark:border-red-800/40 flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[11px] text-red-800 dark:text-red-300 font-medium">New instructor account?</span>
                      <button
                        type="button"
                        onClick={() => handleQuickSwitchToRegister(suggestRegisterFor)}
                        className="inline-flex items-center gap-1 font-bold text-xs bg-white text-zinc-950 px-2.5 py-1 rounded border border-zinc-300 shadow-2xs hover:bg-zinc-50 cursor-pointer dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-700"
                      >
                        <UserPlus className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                        Create Account Now →
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block dark:text-zinc-300">
                  Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-400 dark:text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    placeholder="e.g. martin.dan"
                    className="w-full rounded-lg border border-zinc-300 bg-white pl-9 pr-3 py-2 text-sm text-zinc-950 shadow-2xs placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-400 dark:focus-visible:ring-zinc-400"
                  />
                </div>
                <span className="text-[11px] text-zinc-600 block dark:text-zinc-300">
                  Format: <span className="font-mono text-zinc-800 dark:text-zinc-200 font-semibold">lastname.firstname</span>
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block dark:text-zinc-300">
                  4-Digit Security PIN
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPin ? 'text' : 'password'}
                    required
                    maxLength={4}
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                    placeholder="••••"
                    className="w-full rounded-lg border border-zinc-300 bg-white pl-9 pr-10 py-2 text-sm text-zinc-950 font-mono tracking-widest shadow-2xs placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-400 dark:focus-visible:ring-zinc-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer dark:text-zinc-400 dark:hover:text-zinc-200"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex h-10 items-center justify-center rounded-lg bg-zinc-950 text-white text-sm font-bold shadow hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In to Dashboard
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Registration Form */
            <form onSubmit={handleRegister} className="space-y-3.5">
              {regSuccessUser ? (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 space-y-2 text-xs text-emerald-950 animate-in fade-in dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm dark:text-emerald-300">
                    <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0 dark:text-emerald-400" />
                    <span>Account Created Successfully!</span>
                  </div>
                  <p className="leading-relaxed">
                    Your account username is <code className="font-mono font-bold text-emerald-950 bg-white px-1.5 py-0.5 rounded border border-emerald-300 dark:bg-zinc-900 dark:text-emerald-300 dark:border-emerald-800">{regSuccessUser.username}</code>.
                  </p>
                  <p className="text-emerald-900 dark:text-emerald-300 font-medium leading-relaxed bg-white/80 dark:bg-zinc-900/80 p-2 rounded border border-emerald-200 dark:border-emerald-800/60">
                    ⏳ <strong>Awaiting Approval:</strong> Your account has been registered with status <strong>Pending</strong>. The system administrator (<code className="font-mono font-bold text-zinc-950 dark:text-zinc-100">admin.admin</code>) must approve your account in the Admin Console before you can log in.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setUsername(regSuccessUser.username);
                      setMode('signin');
                      setRegSuccessUser(null);
                    }}
                    className="w-full inline-flex h-9 items-center justify-center rounded-lg bg-emerald-800 text-white font-bold hover:bg-emerald-900 transition-colors mt-2 cursor-pointer dark:bg-emerald-700 dark:hover:bg-emerald-600"
                  >
                    Go to Sign In
                  </button>
                </div>
              ) : (
                <>
                  {regError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2.5 text-xs text-red-900 animate-in fade-in dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                      <p className="leading-snug">{regError}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block dark:text-zinc-300">
                        First Name
                      </label>
                      <input
                        type="text"
                        required
                        value={regFirstName}
                        onChange={(e) => setRegFirstName(e.target.value)}
                        placeholder="e.g. Maria"
                        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-950 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-400 dark:focus-visible:ring-zinc-400"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block dark:text-zinc-300">
                        Last Name
                      </label>
                      <input
                        type="text"
                        required
                        value={regLastName}
                        onChange={(e) => setRegLastName(e.target.value)}
                        placeholder="e.g. Cruz"
                        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-950 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-400 dark:focus-visible:ring-zinc-400"
                      />
                    </div>
                  </div>

                  {/* Realtime Username Preview */}
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-xs flex items-center justify-between dark:border-zinc-800 dark:bg-zinc-900/80">
                    <span className="text-zinc-600 font-medium dark:text-zinc-300">Assigned Username:</span>
                    <span className="font-mono font-bold text-zinc-950 bg-white px-2 py-0.5 rounded border border-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700">
                      {calculatedUsername}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block dark:text-zinc-300">
                      Department / College
                    </label>
                    <div className="relative">
                      <Building2 className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={regDept}
                        onChange={(e) => setRegDept(e.target.value)}
                        className="w-full rounded-lg border border-zinc-300 bg-white pl-8 pr-3 py-1.5 text-xs text-zinc-950 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-400 dark:focus-visible:ring-zinc-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block dark:text-zinc-300">
                      Institution
                    </label>
                    <div className="relative">
                      <School className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={regInst}
                        onChange={(e) => setRegInst(e.target.value)}
                        className="w-full rounded-lg border border-zinc-300 bg-white pl-8 pr-3 py-1.5 text-xs text-zinc-950 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-400 dark:focus-visible:ring-zinc-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block dark:text-zinc-300">
                      4-Digit Security PIN (Default: 1234)
                    </label>
                    <div className="relative">
                      <KeyRound className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        maxLength={4}
                        inputMode="numeric"
                        pattern="[0-9]{4}"
                        value={regPin}
                        onChange={(e) => setRegPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                        className="w-full rounded-lg border border-zinc-300 bg-white pl-8 pr-3 py-1.5 text-xs text-zinc-950 font-mono tracking-widest shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-400 dark:focus-visible:ring-zinc-400"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full inline-flex h-10 items-center justify-center rounded-lg bg-zinc-950 text-white text-xs font-bold shadow hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer mt-1 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        Submitting Account...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-1.5" />
                        Submit Account for Approval
                      </>
                    )}
                  </button>
                </>
              )}
            </form>
          )}
        </div>

      </div>
    </div>
  );
};
