import { useState, useMemo } from 'react';
import type { FC } from 'react';
import { 
  getStoredUsers, 
  updateUserStatus, 
  resetUserPin, 
  deleteUser, 
  getUserDataCounts 
} from '../services/auth';
import type { UserAccount, AccountStatus } from '../services/auth';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  KeyRound, 
  Trash2, 
  UserCheck, 
  Clock, 
  Users, 
  BookOpen, 
  FileText,
  Search,
  Building2,
  GraduationCap,
  LogOut,
  RefreshCw
} from 'lucide-react';

interface AdminAccountManagementViewProps {
  currentUser: UserAccount;
  onLogout: () => void;
  onAccountsUpdated?: () => void;
}

export const AdminAccountManagementView: FC<AdminAccountManagementViewProps> = ({
  currentUser,
  onLogout,
  onAccountsUpdated
}) => {
  const [users, setUsers] = useState<UserAccount[]>(() => getStoredUsers());
  const [filterTab, setFilterTab] = useState<'pending' | 'approved' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const refreshUsers = () => {
    const updated = getStoredUsers();
    setUsers(updated);
    if (onAccountsUpdated) onAccountsUpdated();
  };

  const handleStatusChange = (userId: string, newStatus: AccountStatus, name: string) => {
    const ok = updateUserStatus(userId, newStatus);
    if (ok) {
      refreshUsers();
      setActionNotice(`Updated ${name} status to "${newStatus.toUpperCase()}".`);
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const handleResetPin = (userId: string, name: string) => {
    const confirm = window.confirm(`Reset PIN for ${name} to default "1234"?`);
    if (!confirm) return;

    const ok = resetUserPin(userId, '1234');
    if (ok) {
      refreshUsers();
      setActionNotice(`Reset PIN for ${name} to "1234".`);
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const handleDelete = (userId: string, name: string) => {
    const confirm = window.confirm(
      `Are you sure you want to delete the instructor account for ${name}?\n\nThis will also remove their isolated timetable and lesson data.`
    );
    if (!confirm) return;

    const ok = deleteUser(userId);
    if (ok) {
      refreshUsers();
      setActionNotice(`Instructor account for ${name} was deleted.`);
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const pendingCount = users.filter(u => u.status === 'pending').length;
  const approvedCount = users.filter(u => u.status === 'approved' && u.role === 'instructor').length;
  const totalInstructors = users.filter(u => u.role === 'instructor').length;

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // Filter out admin from list unless viewing all
      if (filterTab !== 'all' && u.role === 'admin') return false;

      // Tab filter
      if (filterTab === 'pending' && u.status !== 'pending') return false;
      if (filterTab === 'approved' && u.status !== 'approved') return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          u.username.toLowerCase().includes(q) ||
          u.fullName.toLowerCase().includes(q) ||
          u.department.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [users, filterTab, searchQuery]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Admin Hero Header Banner */}
      <div className="bg-zinc-950 text-white rounded-2xl p-6 sm:p-8 border border-zinc-800 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800/80 border border-zinc-700 text-xs font-semibold text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Dedicated System Administrator Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Instructor Account Management
            </h1>
            <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
              Logged in as <code className="font-mono text-white font-bold bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">{currentUser.username}</code> (Master Administrator). 
              Your role is strictly focused on approving instructor access, resetting credentials, and safeguarding academic data isolation.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={refreshUsers}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Refresh Accounts"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm"
              title="Sign Out / Switch Account"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Switch Account</span>
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Action Notice Toast */}
      {actionNotice && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3 text-xs font-semibold text-emerald-950 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Pending Approvals */}
        <div 
          onClick={() => setFilterTab('pending')}
          className={`rounded-2xl border p-5 transition-all cursor-pointer ${
            pendingCount > 0 
              ? 'border-amber-300 bg-amber-50/60 shadow-xs hover:border-amber-400' 
              : 'border-zinc-200 bg-white hover:border-zinc-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider">
              Pending Approvals
            </span>
            <span className={`p-2 rounded-xl ${pendingCount > 0 ? 'bg-amber-200 text-amber-900' : 'bg-zinc-100 text-zinc-500'}`}>
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-black ${pendingCount > 0 ? 'text-amber-950' : 'text-zinc-950'}`}>
              {pendingCount}
            </span>
            <span className="text-xs text-zinc-500">
              {pendingCount === 1 ? 'instructor awaiting review' : 'instructors awaiting review'}
            </span>
          </div>
        </div>

        {/* Approved Instructors */}
        <div 
          onClick={() => setFilterTab('approved')}
          className="rounded-2xl border border-zinc-200 bg-white p-5 hover:border-zinc-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider">
              Active Faculty Instructors
            </span>
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <UserCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-zinc-950">
              {approvedCount}
            </span>
            <span className="text-xs text-zinc-500">
              approved & active accounts
            </span>
          </div>
        </div>

        {/* Total Registered Accounts */}
        <div 
          onClick={() => setFilterTab('all')}
          className="rounded-2xl border border-zinc-200 bg-white p-5 hover:border-zinc-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider">
              Total Faculty Directory
            </span>
            <span className="p-2 rounded-xl bg-zinc-100 text-zinc-800">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-zinc-950">
              {totalInstructors}
            </span>
            <span className="text-xs text-zinc-500">
              registered instructor profiles
            </span>
          </div>
        </div>
      </div>

      {/* Main Account Management Card */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        {/* Controls Bar */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 bg-zinc-50/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-zinc-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setFilterTab('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterTab === 'pending'
                  ? 'bg-zinc-950 text-white shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              <span>Pending</span>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-black">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('approved')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterTab === 'approved'
                  ? 'bg-zinc-950 text-white shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              Approved ({approvedCount})
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterTab === 'all'
                  ? 'bg-zinc-950 text-white shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              All Accounts ({users.length})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by name, username, or college..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-zinc-200 bg-white placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none"
            />
          </div>
        </div>

        {/* Instructors List */}
        <div className="p-4 sm:p-6 space-y-3">
          {filteredUsers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 p-12 text-center text-zinc-600 space-y-2">
              <Users className="h-10 w-10 mx-auto text-zinc-400" />
              <p className="text-sm font-bold text-zinc-950">No accounts found</p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                {filterTab === 'pending' 
                  ? 'Great job! There are currently no instructor accounts pending approval.' 
                  : 'No accounts match the current filter or search criteria.'}
              </p>
            </div>
          ) : (
            filteredUsers.map(u => {
              const dataCounts = getUserDataCounts(u.id);
              const isAdmin = u.role === 'admin';
              const isPending = u.status === 'pending';
              const isApproved = u.status === 'approved';
              const isRejected = u.status === 'rejected';

              return (
                <div
                  key={u.id}
                  className={`rounded-xl border p-4 sm:p-5 transition-all ${
                    isPending 
                      ? 'border-amber-300 bg-amber-50/40' 
                      : 'border-zinc-200 bg-white hover:border-zinc-300'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    
                    {/* User Profile Info */}
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <div className={`h-11 w-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs ${
                        isAdmin 
                          ? 'bg-zinc-950 text-white' 
                          : isPending 
                          ? 'bg-amber-200 text-amber-950 border border-amber-300' 
                          : 'bg-zinc-100 text-zinc-800 border border-zinc-200'
                      }`}>
                        {u.firstName?.[0] || 'I'}{u.lastName?.[0] || 'U'}
                      </div>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm sm:text-base text-zinc-950 truncate">
                            {u.fullName}
                          </span>

                          {/* Role Tag */}
                          {isAdmin ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-950 text-white px-2 py-0.5 text-[10px] font-bold">
                              <ShieldCheck className="h-3 w-3 text-emerald-400" />
                              Administrator
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 text-[10px] font-bold">
                              <GraduationCap className="h-3 w-3 text-blue-700" />
                              Instructor
                            </span>
                          )}

                          {/* Status Tag */}
                          {isPending && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 text-[10px] font-bold">
                              <Clock className="h-3 w-3" />
                              Pending Approval
                            </span>
                          )}
                          {isApproved && !isAdmin && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold">
                              <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                              Approved
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-900 border border-red-300 px-2 py-0.5 text-[10px] font-bold">
                              <XCircle className="h-3 w-3 text-red-700" />
                              Rejected
                            </span>
                          )}
                        </div>

                        {/* Username & PIN & College */}
                        <div className="flex items-center gap-3 text-xs text-zinc-600 flex-wrap">
                          <span>
                            Username: <code className="font-mono font-bold text-zinc-900 bg-zinc-100 px-1 py-0.2 rounded border border-zinc-200">{u.username}</code>
                          </span>
                          <span>
                            PIN: <code className="font-mono font-bold text-zinc-900 bg-zinc-100 px-1 py-0.2 rounded border border-zinc-200">{u.pin}</code>
                          </span>
                          <span className="flex items-center gap-1 text-zinc-500">
                            <Building2 className="h-3 w-3" />
                            {u.department}
                          </span>
                        </div>

                        {/* Isolated Data Counts (For Instructors) */}
                        {!isAdmin && (
                          <div className="flex items-center gap-3 text-[11px] text-zinc-500 pt-1 flex-wrap">
                            <span className="flex items-center gap-1 font-medium">
                              <BookOpen className="h-3 w-3 text-zinc-400" />
                              {dataCounts.coursesCount} active courses
                            </span>
                            <span className="text-zinc-300">•</span>
                            <span className="flex items-center gap-1 font-medium">
                              <FileText className="h-3 w-3 text-zinc-400" />
                              {dataCounts.logsCount} session logs
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      {isPending && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(u.id, 'approved', u.fullName)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(u.id, 'rejected', u.fullName)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-bold transition-colors cursor-pointer"
                          >
                            <XCircle className="h-3.5 w-3.5 text-zinc-500" />
                            <span>Reject</span>
                          </button>
                        </>
                      )}

                      {isApproved && !isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleResetPin(u.id, u.fullName)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium transition-colors cursor-pointer"
                            title="Reset PIN back to default 1234"
                          >
                            <KeyRound className="h-3.5 w-3.5 text-zinc-500" />
                            <span>Reset PIN</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(u.id, 'pending', u.fullName)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium transition-colors cursor-pointer"
                            title="Revoke access and set back to Pending"
                          >
                            <Clock className="h-3.5 w-3.5 text-zinc-500" />
                            <span>Set Pending</span>
                          </button>
                        </>
                      )}

                      {isRejected && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(u.id, 'approved', u.fullName)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-colors cursor-pointer"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          <span>Re-approve</span>
                        </button>
                      )}

                      {!isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDelete(u.id, u.fullName)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title={`Delete account for ${u.fullName}`}
                          aria-label={`Delete account for ${u.fullName}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
