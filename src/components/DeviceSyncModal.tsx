import type { FC } from 'react';
import { getDeviceId, getDeviceLabel, getUserLastUpdated } from '../services/sync';
import type { UserAccount } from '../services/auth';
import { isFirebaseConfigured } from '../lib/firebase';
import { format } from 'date-fns';
import { 
  X, 
  Smartphone, 
  Laptop, 
  RefreshCw, 
  CheckCircle2, 
  QrCode, 
  Clock, 
  Cloud, 
  CloudOff,
  ArrowRightLeft
} from 'lucide-react';

interface DeviceSyncModalProps {
  isOpen: boolean;
  currentUser: UserAccount | null;
  coursesCount: number;
  logsCount: number;
  lastUpdatedTimestamp: number;
  onClose: () => void;
  onOpenTransfer: () => void;
  onForceCheckSync: () => void;
}

export const DeviceSyncModal: FC<DeviceSyncModalProps> = ({
  isOpen,
  currentUser,
  coursesCount,
  logsCount,
  lastUpdatedTimestamp,
  onClose,
  onOpenTransfer,
  onForceCheckSync,
}) => {
  if (!isOpen) return null;

  const currentDeviceId = getDeviceId();
  const currentDeviceLabel = getDeviceLabel();
  const isMobile = currentDeviceLabel.includes('Smartphone') || currentDeviceLabel.includes('Tablet');

  const effectiveTimestamp = lastUpdatedTimestamp || (currentUser ? getUserLastUpdated(currentUser.id) : 0);
  const formattedLastUpdated = effectiveTimestamp > 0 
    ? format(new Date(effectiveTimestamp), 'EEEE, MMMM d, yyyy • h:mm a')
    : 'No changes recorded yet';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="sync-modal-title">
      <div className="bg-white text-zinc-950 rounded-2xl border border-zinc-200 w-full max-w-lg shadow-2xl flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-200 p-5 shrink-0 bg-white">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-zinc-950 text-white">
                <ArrowRightLeft className="h-4 w-4" />
              </div>
              <h2 id="sync-modal-title" className="text-lg font-bold tracking-tight text-zinc-950">
                Cross-Device Account Sync
              </h2>
            </div>
            <p className="text-xs text-zinc-600">
              Synchronizing data for <span className="font-mono font-bold text-zinc-900">{currentUser?.username || 'Current Account'}</span>
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

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          
          {/* Conflict Resolution Banner */}
          <div className="rounded-xl border border-emerald-300 bg-emerald-50/80 p-3.5 space-y-1 text-xs text-emerald-950">
            <div className="flex items-center gap-2 font-bold text-emerald-900">
              <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
              <span>Conflict Resolution: "Latest Updated Device Wins"</span>
            </div>
            <p className="leading-relaxed text-[11px] text-emerald-900">
              When using this account across multiple devices (e.g. Laptop in faculty room & Phone in classroom), whichever device made the most recent update automatically synchronizes to the other.
            </p>
          </div>

          {/* This Device Details */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 space-y-3">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
              Current Device Information
            </span>

            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-900 shrink-0 shadow-2xs">
                {isMobile ? <Smartphone className="h-6 w-6 text-zinc-800" /> : <Laptop className="h-6 w-6 text-zinc-800" />}
              </div>

              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-zinc-950">
                    {currentDeviceLabel}
                  </span>
                  <span className="font-mono text-[10px] bg-zinc-200 text-zinc-700 px-1.5 py-0.2 rounded font-semibold">
                    {currentDeviceId}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-zinc-600">
                  <Clock className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                  <span className="truncate">Last Updated: <strong className="text-zinc-900">{formattedLastUpdated}</strong></span>
                </div>
              </div>
            </div>

            {/* Current Data Counts */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-200/80 text-xs">
              <div className="bg-white p-2 rounded-lg border border-zinc-200/80 text-center">
                <span className="text-zinc-500 text-[10px] uppercase font-bold block">Current Courses</span>
                <span className="text-sm font-bold text-zinc-950">{coursesCount} courses</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-zinc-200/80 text-center">
                <span className="text-zinc-500 text-[10px] uppercase font-bold block">Session Logs</span>
                <span className="text-sm font-bold text-zinc-950">{logsCount} logs</span>
              </div>
            </div>
          </div>

          {/* Sync Channels Status */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-2.5">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
              Synchronization Channels
            </span>

            {/* Cloud Firestore Status */}
            <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-zinc-50 border border-zinc-200/80">
              <div className="flex items-center gap-2">
                {isFirebaseConfigured ? (
                  <Cloud className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <CloudOff className="h-4 w-4 text-zinc-400 shrink-0" />
                )}
                <div>
                  <span className="font-bold text-zinc-900 block">Cloud Firestore Sync</span>
                  <span className="text-[11px] text-zinc-500">
                    {isFirebaseConfigured ? 'Real-time background sync active' : 'Offline local mode (QR sync active)'}
                  </span>
                </div>
              </div>

              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                isFirebaseConfigured ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-200 text-zinc-700'
              }`}>
                {isFirebaseConfigured ? 'Connected' : 'Local First'}
              </span>
            </div>

            {/* Laptop ⇄ Phone Quick Sync */}
            <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-zinc-50 border border-zinc-200/80">
              <div className="flex items-center gap-2">
                <QrCode className="h-4 w-4 text-zinc-700 shrink-0" />
                <div>
                  <span className="font-bold text-zinc-900 block">Instant QR & Code Transit</span>
                  <span className="text-[11px] text-zinc-500">
                    1-scan peer sync with automatic latest-timestamp adoption
                  </span>
                </div>
              </div>

              <span className="inline-flex items-center bg-zinc-950 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                Ready
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenTransfer();
              }}
              className="w-full inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-zinc-950 text-white text-xs font-bold shadow hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>Open Laptop ⇄ Phone QR Sync</span>
            </button>

            <button
              type="button"
              onClick={onForceCheckSync}
              className="w-full inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white text-zinc-800 text-xs font-semibold hover:bg-zinc-50 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-zinc-600" />
              <span>Check for Newer Updates Now</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
