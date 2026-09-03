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
  X, 
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
  Building2
} from 'lucide-react';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountsUpdated?: () => void;
}

export const AdminDashboardModal: FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
  onAccountsUpdated
}) => {
  const [users, setUsers] = useState<UserAccount[]>(() => getStoredUsers());
  const [filterTab, setFilterTab] = useState<'pending' | 'approved' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  if (!isOpen) return null;

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
    if (window.confirm(`Reset PIN for ${name} back to default "1234"?`)) {
      const ok = resetUserPin(userId, '1234');
      if (ok) {
        refreshUsers();
        setActionNotice(`Successfully reset PIN for ${name} to "1234".`);
        setTimeout(() => setActionNotice(null), 4000);
      }
    }
  };

  const handleDelete = (userId: string, name: string) => {
    if (window.confirm(`Are you sure you want to permanently delete account ${name}? Their isolated courses and logs will also be removed.`)) {
      const ok = deleteUser(userId);
      if (ok) {
        refreshUsers();
        setActionNotice(`Account ${name} deleted.`);
        setTimeout(() => setActionNotice(null), 4000);
      }
    }
  };

  const pendingCount = users.filter(u => u.status === 'pending').length;
  const approvedCount = users.filter(u => u.status === 'approved').length;

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="admin-title">
      <div className="bg-white text-zinc-950 rounded-2xl border border-zinc-200 w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-200 p-5 shrink-0 bg-white">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-zinc-900 text-white">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
              </div>
              <h2 id="admin-title" className="text-lg sm:text-xl font-bold tracking-tight text-zinc-950">
                Administrator Console — Instructor Accounts
              </h2>
            </div>
            <p className="text-xs text-zinc-600">
              Review and approve pending instructor registrations, manage user access, and maintain data isolation.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Action Notice Toast */}
        {actionNotice && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2.5 text-xs font-semibold text-emerald-950 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="p-4 sm:px-6 bg-zinc-50 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 p-1 bg-zinc-200/80 rounded-lg text-xs font-bold">
            <button
              type="button"
              onClick={() => setFilterTab('pending')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                filterTab === 'pending'
                  ? 'bg-white text-zinc-950 shadow-2xs'
                  : 'text-zinc-700 hover:text-zinc-950'
              }`}
            >
              <Clock className="h-3.5 w-3.5 text-amber-600" />
              <span>Pending Approvals</span>
              {pendingCount > 0 && (
                <span className="bg-amber-500 text-white rounded-full px-1.5 py-0.2 text-[10px] font-mono">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('approved')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                filterTab === 'approved'
                  ? 'bg-white text-zinc-950 shadow-2xs'
                  : 'text-zinc-700 hover:text-zinc-950'
              }`}
            >
              <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Approved ({approvedCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                filterTab === 'all'
                  ? 'bg-white text-zinc-950 shadow-2xs'
                  : 'text-zinc-700 hover:text-zinc-950'
              }`}
            >
              <Users className="h-3.5 w-3.5 text-zinc-600" />
              <span>All ({users.length})</span>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white pl-8 pr-3 py-1.5 text-xs text-zinc-950 shadow-2xs placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
            />
          </div>
        </div>

        {/* Instructors List */}
        <div className="p-4 sm:p-6 space-y-3 overflow-y-auto flex-1 bg-white">
          {filteredUsers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-zinc-600 space-y-1">
              <Users className="h-8 w-8 mx-auto text-zinc-400" />
              <p className="text-sm font-bold text-zinc-950">No instructor accounts found</p>
              <p className="text-xs text-zinc-500">
                {filterTab === 'pending' 
                  ? 'There are no instructor accounts currently pending approval.' 
                  : 'No accounts match the selected filter.'}
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
                  className={`rounded-xl border p-4 transition-all ${
                    isPending 
                      ? 'border-amber-300 bg-amber-50/40' 
                      : 'border-zinc-200 bg-white hover:border-zinc-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    
                    {/* User Info */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                        isAdmin 
                          ? 'bg-zinc-950 text-white' 
                          : isPending 
                          ? 'bg-amber-200 text-amber-900 border border-amber-300' 
                          : 'bg-zinc-100 text-zinc-800 border border-zinc-200'
                      }`}>
                        {u.firstName?.[0] || 'I'}{u.lastName?.[0] || 'U'}
                      </div>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-zinc-950 truncate">
                            {u.fullName}
                          </span>

                          <span className="font-mono text-xs font-semibold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                            {u.username}
                          </span>

                          {isAdmin && (
                            <span className="inline-flex items-center gap-1 rounded bg-zinc-900 text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                              <ShieldCheck className="h-3 w-3 text-emerald-400" />
                              System Admin
                            </span>
                          )}

                          <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            isApproved
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : isPending
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-rose-100 text-rose-900 border border-rose-300'
                          }`}>
                            {u.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-zinc-600 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-zinc-400" />
                            {u.department}
                          </span>
                          <span>•</span>
                          <span>{u.institution}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3 h-3 text-zinc-400" />
                            {dataCounts.coursesCount} courses
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3 text-zinc-400" />
                            {dataCounts.logsCount} session logs
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      {isPending && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(u.id, 'approved', u.fullName)}
                            className="inline-flex h-8 items-center justify-center gap-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white px-3 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                            title="Approve this account to grant full access"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Approve</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusChange(u.id, 'rejected', u.fullName)}
                            className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-zinc-300 hover:bg-zinc-100 text-zinc-700 px-3 text-xs font-semibold transition-colors cursor-pointer"
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
                            className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-700 px-2.5 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                            title="Reset 4-digit PIN to 1234"
                          >
                            <KeyRound className="h-3 w-3 text-zinc-500" />
                            <span>Reset PIN</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusChange(u.id, 'rejected', u.fullName)}
                            className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-zinc-300 bg-white hover:bg-rose-50 hover:text-rose-700 text-zinc-700 px-2.5 text-xs font-semibold transition-colors cursor-pointer"
                            title="Deactivate instructor account"
                          >
                            <span>Deactivate</span>
                          </button>
                        </>
                      )}

                      {isRejected && !isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(u.id, 'approved', u.fullName)}
                            className="inline-flex h-8 items-center justify-center gap-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white px-2.5 text-xs font-bold transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Re-Approve</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(u.id, u.fullName)}
                            className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 px-2.5 text-xs font-semibold transition-colors cursor-pointer"
                            title="Permanently remove account"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Delete</span>
                          </button>
                        </>
                      )}
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 p-4 shrink-0">
          <div className="text-xs text-zinc-500 font-medium">
            Data Isolation Active • Each instructor's courses and logs are stored privately in their own sandbox.
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-zinc-950 px-4 text-xs font-bold text-white shadow-sm hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
