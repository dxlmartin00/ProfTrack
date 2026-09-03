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
  EyeOff
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onLoginSuccess: (user: UserAccount) => void;
  onClose?: () => void;
  allowClose?: boolean;
}

export const AuthModal: FC<AuthModalProps> = ({
  isOpen,
  onLoginSuccess,
  onClose,
  allowClose = false,
}) => {
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  
  // Sign In Form State
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  // Register Form State
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regDept, setRegDept] = useState('College of Computer Studies');
  const [regInst, setRegInst] = useState('University of Makati');
  const [regPin, setRegPin] = useState('1234');
  const [regSuccessUser, setRegSuccessUser] = useState<UserAccount | null>(null);
  const [regError, setRegError] = useState<string | null>(null);

  // Real-time computed username preview
  const calculatedUsername = useMemo(() => {
    if (!regLastName && !regFirstName) return '<lastname>.<firstname>';
    return formatUsername(regLastName || 'lastname', regFirstName || 'firstname');
  }, [regLastName, regFirstName]);

  if (!isOpen) return null;

  const handleSignIn = (e: FormEvent) => {
    e.preventDefault();
    setSignInError(null);

    if (!username.trim()) {
      setSignInError('Please enter your username (format: lastname.firstname)');
      return;
    }

    if (pin.trim().length !== 4) {
      setSignInError('Please enter your 4-digit PIN.');
      return;
    }

    const res = authenticateUser(username, pin);
    if (res.success && res.user) {
      onLoginSuccess(res.user);
      if (onClose) onClose();
    } else {
      setSignInError(res.error || 'Authentication failed. Please check your credentials.');
    }
  };

  const handleRegister = (e: FormEvent) => {
    e.preventDefault();
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

    const res = registerInstructor({
      firstName: regFirstName,
      lastName: regLastName,
      department: regDept,
      institution: regInst,
      pin: regPin,
    });

    if (res.success && res.user) {
      setRegSuccessUser(res.user);
      // Reset form
      setRegFirstName('');
      setRegLastName('');
    } else {
      setRegError(res.error || 'Failed to register account.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/75 backdrop-blur-sm p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
      <div className="bg-white text-zinc-950 rounded-2xl border border-zinc-200 w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
        
        {/* Header Ribbon */}
        <div className="bg-zinc-950 p-6 text-white text-center relative">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800 text-white mb-3 shadow-inner border border-zinc-700">
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
        <div className="grid grid-cols-2 border-b border-zinc-200 bg-zinc-50 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setSignInError(null);
            }}
            className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mode === 'signin'
                ? 'bg-white text-zinc-950 shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-950'
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
                ? 'bg-white text-zinc-950 shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-950'
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
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2.5 text-xs text-red-900 animate-in fade-in">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <p className="leading-snug">{signInError}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">
                  Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    placeholder="e.g. martin.dan"
                    className="w-full rounded-lg border border-zinc-300 bg-white pl-9 pr-3 py-2 text-sm text-zinc-950 shadow-2xs placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
                  />
                </div>
                <span className="text-[11px] text-zinc-500 block">
                  Format: <span className="font-mono text-zinc-800">lastname.firstname</span>
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">
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
                    className="w-full rounded-lg border border-zinc-300 bg-white pl-9 pr-10 py-2 text-sm text-zinc-950 font-mono tracking-widest shadow-2xs placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full inline-flex h-10 items-center justify-center rounded-lg bg-zinc-950 text-white text-sm font-bold shadow hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Sign In to Dashboard
              </button>
            </form>
          ) : (
            /* Registration Form */
            <form onSubmit={handleRegister} className="space-y-3.5">
              {regSuccessUser ? (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 space-y-2 text-xs text-emerald-950 animate-in fade-in">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                    <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0" />
                    <span>Account Created Successfully!</span>
                  </div>
                  <p className="leading-relaxed">
                    Your account username is <code className="font-mono font-bold text-emerald-950 bg-white px-1.5 py-0.5 rounded border border-emerald-300">{regSuccessUser.username}</code>.
                  </p>
                  <p className="text-emerald-900 font-medium leading-relaxed bg-white/80 p-2 rounded border border-emerald-200">
                    ⏳ <strong>Awaiting Approval:</strong> Your account has been registered with status <strong>Pending</strong>. The system administrator (<code className="font-mono font-bold">admin.admin</code>) must approve your account in the Admin Console before you can log in.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setUsername(regSuccessUser.username);
                      setMode('signin');
                      setRegSuccessUser(null);
                    }}
                    className="w-full inline-flex h-9 items-center justify-center rounded-lg bg-emerald-800 text-white font-bold hover:bg-emerald-900 transition-colors mt-2 cursor-pointer"
                  >
                    Go to Sign In
                  </button>
                </div>
              ) : (
                <>
                  {regError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2.5 text-xs text-red-900 animate-in fade-in">
                      <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                      <p className="leading-snug">{regError}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">
                        First Name
                      </label>
                      <input
                        type="text"
                        required
                        value={regFirstName}
                        onChange={(e) => setRegFirstName(e.target.value)}
                        placeholder="e.g. Maria"
                        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-950 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">
                        Last Name
                      </label>
                      <input
                        type="text"
                        required
                        value={regLastName}
                        onChange={(e) => setRegLastName(e.target.value)}
                        placeholder="e.g. Cruz"
                        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-950 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
                      />
                    </div>
                  </div>

                  {/* Realtime Username Preview */}
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-xs flex items-center justify-between">
                    <span className="text-zinc-600 font-medium">Assigned Username:</span>
                    <span className="font-mono font-bold text-zinc-950 bg-white px-2 py-0.5 rounded border border-zinc-300">
                      {calculatedUsername}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">
                      Department / College
                    </label>
                    <div className="relative">
                      <Building2 className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={regDept}
                        onChange={(e) => setRegDept(e.target.value)}
                        className="w-full rounded-lg border border-zinc-300 bg-white pl-8 pr-3 py-1.5 text-xs text-zinc-950 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">
                      Institution
                    </label>
                    <div className="relative">
                      <School className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={regInst}
                        onChange={(e) => setRegInst(e.target.value)}
                        className="w-full rounded-lg border border-zinc-300 bg-white pl-8 pr-3 py-1.5 text-xs text-zinc-950 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">
                      4-Digit Security PIN (Default: 1234)
                    </label>
                    <div className="relative">
                      <KeyRound className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        maxLength={4}
                        inputMode="numeric"
                        pattern="[0-9]{4}"
                        value={regPin}
                        onChange={(e) => setRegPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                        className="w-full rounded-lg border border-zinc-300 bg-white pl-8 pr-3 py-1.5 text-xs text-zinc-950 font-mono tracking-widest shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full inline-flex h-10 items-center justify-center rounded-lg bg-zinc-950 text-white text-xs font-bold shadow hover:bg-zinc-800 transition-colors cursor-pointer mt-1"
                  >
                    <UserPlus className="w-4 h-4 mr-1.5" />
                    Submit Account for Approval
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
