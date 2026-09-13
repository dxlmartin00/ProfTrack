import { useState, useRef, useMemo } from 'react';
import type { FC, ChangeEvent } from 'react';
import qrcode from 'qrcode-generator';
import DOMPurify from 'dompurify';
import { compressPayload, decompressPayload, packTransferPayload, unpackTransferPayload } from '../utils/codec';
import type { ClassSession, SessionLog, InstructorProfile } from '../services/db';
import { getDeviceId, getDeviceLabel } from '../services/sync';
import { useToast } from '../context/ToastContext';
import { 
  X, 
  Download, 
  Upload, 
  Copy, 
  Check, 
  Smartphone, 
  Laptop, 
  FileJson,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Globe
} from 'lucide-react';

interface DataTransferModalProps {
  classes: ClassSession[];
  logs: (SessionLog & { classInfo: ClassSession })[];
  profile?: InstructorProfile;
  lastUpdatedTimestamp?: number;
  onClose: () => void;
  onImportData: (
    importedClasses: ClassSession[], 
    importedLogs: (SessionLog & { classInfo: ClassSession })[],
    importedProfile?: InstructorProfile,
    updatedAt?: number
  ) => void;
}

export const DataTransferModal: FC<DataTransferModalProps> = ({
  classes,
  logs,
  profile,
  lastUpdatedTimestamp,
  onClose,
  onImportData,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'qrcode' | 'export' | 'import'>('qrcode');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if running on localhost vs production domain
  const isLocalhost = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.startsWith('192.168.')
  );

  // Target domain for mobile QR code scan (If on localhost, default to the production web app so phone can open it!)
  const [targetDomain, setTargetDomain] = useState(() => {
    if (isLocalhost) {
      return 'https://proftrack-pwa.vercel.app';
    }
    return window.location.origin || 'https://proftrack-pwa.vercel.app';
  });

  const [showDomainEdit, setShowDomainEdit] = useState(false);

  // Bundle data into human-readable JSON for file export
  const backupPayload = useMemo(() => ({
    v: '2.0',
    exportedAt: new Date().toISOString(),
    updatedAt: lastUpdatedTimestamp || Date.now(),
    deviceId: getDeviceId(),
    deviceLabel: getDeviceLabel(),
    classes,
    logs,
    profile,
  }), [classes, logs, profile, lastUpdatedTimestamp]);

  const backupJsonString = useMemo(() => {
    try {
      return JSON.stringify(backupPayload, null, 2);
    } catch {
      return '{}';
    }
  }, [backupPayload]);

  // Ultra-compact transit string for QR sync
  const compactTransitString = useMemo(() => {
    try {
      return packTransferPayload(classes, logs, profile, {
        updatedAt: lastUpdatedTimestamp || Date.now(),
        deviceId: getDeviceId(),
        deviceLabel: getDeviceLabel()
      });
    } catch {
      return JSON.stringify(backupPayload);
    }
  }, [classes, logs, profile, backupPayload, lastUpdatedTimestamp]);

  // Generate deep-link QR URL with compressed payload
  const qrTransferUrl = useMemo(() => {
    try {
      const compressed = compressPayload(compactTransitString);
      const base = targetDomain.trim().replace(/\/+$/, '');
      return `${base}/#import=${compressed}`;
    } catch (err) {
      console.error('Failed to generate QR URL:', err);
      return window.location.href;
    }
  }, [compactTransitString, targetDomain]);

  // Generate pure scalable SVG string from qrcode-generator (Sanitized via DOMPurify)
  const qrSvgMarkup = useMemo(() => {
    try {
      if (!qrTransferUrl) return null;
      // Error correction 'L' has highest capacity and scans ultra-fast
      const qr = qrcode(0, 'L');
      qr.addData(qrTransferUrl);
      qr.make();
      const rawSvg = qr.createSvgTag({ scalable: true, margin: 2 });
      return DOMPurify.sanitize(rawSvg, { USE_PROFILES: { svg: true, svgFilters: true } });
    } catch (err) {
      console.error('Failed to generate SVG QR:', err);
      return null;
    }
  }, [qrTransferUrl]);

  // Download .json backup
  const handleDownloadBackup = () => {
    try {
      const blob = new Blob([backupJsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `proftrack_backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Backup JSON downloaded successfully!', 'success');
    } catch (err: any) {
      showToast('Failed to download backup: ' + err.message, 'error');
    }
  };

  // Helper with Latest Device Wins conflict check
  const applyImportWithConflictCheck = (
    importedClasses: ClassSession[], 
    importedLogs: (SessionLog & { classInfo: ClassSession })[], 
    importedProfile?: InstructorProfile,
    incomingUpdatedAt?: number,
    incomingDeviceLabel?: string
  ) => {
    const localTime = lastUpdatedTimestamp || 0;
    const incomingTime = incomingUpdatedAt || 0;

    if (incomingTime > 0 && localTime > 0) {
      if (incomingTime < localTime - 5000) {
        const confirmOverwrite = window.confirm(
          `Notice: Your current device has newer updates than this incoming transfer.\n\nCurrent device: ${new Date(localTime).toLocaleTimeString()}\nIncoming update: ${new Date(incomingTime).toLocaleTimeString()} (${incomingDeviceLabel || 'Other device'})\n\nDo you want to overwrite with the incoming data anyway?`
        );
        if (!confirmOverwrite) {
          setImportStatus({
            success: true,
            message: 'Kept current device’s newer data. No changes applied.'
          });
          return;
        }
      }
    }

    onImportData(importedClasses, importedLogs, importedProfile, incomingTime || Date.now());
    const isNewer = incomingTime > localTime;
    setImportStatus({
      success: true,
      message: isNewer
        ? `✅ Synced with latest updates from ${incomingDeviceLabel || 'your other device'}!`
        : `Successfully imported ${importedClasses.length} courses, ${importedLogs.length} session logs, and profile!`
    });
  };

  // Upload .json file
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        
        const { classes: importedClasses, logs: validLogs, profile: importedProfile, updatedAt: incUpdatedAt, deviceLabel: incDeviceLabel } = unpackTransferPayload(parsed);

        if (!importedClasses || importedClasses.length === 0) {
          throw new Error('Invalid backup file format: missing classes.');
        }

        applyImportWithConflictCheck(importedClasses, validLogs, importedProfile, incUpdatedAt || parsed.updatedAt, incDeviceLabel || parsed.deviceLabel);
      } catch (err: any) {
        setImportStatus({
          success: false,
          message: err.message || 'Failed to read backup file.'
        });
      }
    };
    reader.readAsText(file);
  };

  // Copy sync code
  const handleCopySyncCode = () => {
    try {
      navigator.clipboard.writeText(compactTransitString);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Copy Direct Link
  const handleCopyDirectLink = () => {
    try {
      navigator.clipboard.writeText(qrTransferUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Import from pasted text code or URL
  const handleImportFromCode = () => {
    if (!manualCodeInput.trim()) return;
    try {
      let inputStr = manualCodeInput.trim();
      
      // If user pasted a full import URL (#import=...)
      if (inputStr.includes('#import=')) {
        const encoded = inputStr.split('#import=')[1];
        const decompressed = decompressPayload(encoded);
        if (decompressed) {
          const { classes: importedClasses, logs: validLogs, profile: importedProfile, updatedAt: incUpdatedAt, deviceLabel: incDeviceLabel } = unpackTransferPayload(decompressed);

          applyImportWithConflictCheck(importedClasses, validLogs, importedProfile, incUpdatedAt, incDeviceLabel);
          setManualCodeInput('');
          return;
        }
      }

      const parsed = JSON.parse(inputStr);
      const { classes: importedClasses, logs: validLogs, profile: importedProfile, updatedAt: incUpdatedAt, deviceLabel: incDeviceLabel } = unpackTransferPayload(parsed);

      applyImportWithConflictCheck(importedClasses, validLogs, importedProfile, incUpdatedAt, incDeviceLabel);
      setManualCodeInput('');
    } catch (err: any) {
      setImportStatus({
        success: false,
        message: err.message || 'Invalid sync code.'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="transfer-data-title">
      <div className="bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-100 rounded-xl border border-zinc-200 dark:border-zinc-800 w-full max-w-lg shadow-xl flex flex-col max-h-[90vh] my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Dialog Header */}
        <div className="flex items-start justify-between border-b border-zinc-200 dark:border-zinc-800 p-5 shrink-0 bg-white dark:bg-zinc-900">
          <div className="space-y-1">
            <h2 id="transfer-data-title" className="text-xl font-bold tracking-tight text-zinc-950 dark:text-zinc-100 flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
              Transfer Data (Laptop ⇄ Phone)
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Move your private timetable, syllabus, and logs between devices.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-2 text-zinc-500 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('qrcode')}
            className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 text-center transition-colors cursor-pointer ${
              activeTab === 'qrcode'
                ? 'border-zinc-950 text-zinc-950 dark:border-zinc-100 dark:text-zinc-100'
                : 'border-transparent text-zinc-500 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            1. Scan QR Code
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 text-center transition-colors cursor-pointer ${
              activeTab === 'export'
                ? 'border-zinc-950 text-zinc-950 dark:border-zinc-100 dark:text-zinc-100'
                : 'border-transparent text-zinc-500 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            2. Export File
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 text-center transition-colors cursor-pointer ${
              activeTab === 'import'
                ? 'border-zinc-950 text-zinc-950 dark:border-zinc-100 dark:text-zinc-100'
                : 'border-transparent text-zinc-500 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            3. Import File
          </button>
        </div>

        {/* Dialog Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 bg-white dark:bg-zinc-900">
          
          {importStatus && (
            <div className={`flex items-start gap-2.5 p-3.5 rounded-lg border text-xs font-semibold ${
              importStatus.success
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300'
                : 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-900 dark:text-red-300'
            }`}>
              {importStatus.success ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              )}
              <span>{importStatus.message}</span>
            </div>
          )}

          {/* TAB 1: QR CODE */}
          {activeTab === 'qrcode' && (
            <div className="space-y-4 text-center">
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 p-5 flex flex-col items-center justify-center space-y-3.5">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-100">
                    Scan with Your Phone Camera
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 max-w-xs">
                    Point your mobile phone camera at this QR code. Tap the link popup to instantly load all {classes.length} course(s) and {logs.length} log(s) on your phone.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-zinc-300 dark:border-zinc-700 shadow-sm flex items-center justify-center min-h-[220px]">
                  {qrSvgMarkup ? (
                    <div 
                      className="w-56 h-56 [&>svg]:w-full [&>svg]:h-full [&>svg]:block"
                      dangerouslySetInnerHTML={{ __html: qrSvgMarkup }}
                    />
                  ) : (
                    <div className="h-48 w-48 flex items-center justify-center text-xs text-zinc-500 dark:text-zinc-300 font-medium">
                      Loading QR Code...
                    </div>
                  )}
                </div>

                {/* Target App Domain for Localhost */}
                {isLocalhost && (
                  <div className="w-full text-left bg-zinc-100 dark:bg-zinc-800 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3 text-zinc-500 dark:text-zinc-300" />
                        Target Web App:
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowDomainEdit(!showDomainEdit)}
                        className="text-zinc-950 dark:text-zinc-100 underline font-bold cursor-pointer"
                      >
                        {showDomainEdit ? 'Done' : 'Change Domain'}
                      </button>
                    </div>

                    {showDomainEdit ? (
                      <input
                        type="text"
                        value={targetDomain}
                        onChange={(e) => setTargetDomain(e.target.value)}
                        placeholder="https://proftrack-pwa.vercel.app"
                        className="w-full h-7 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-400"
                      />
                    ) : (
                      <p className="text-xs font-mono text-zinc-600 dark:text-zinc-300 truncate">
                        {targetDomain}
                      </p>
                    )}
                  </div>
                )}

                {/* Quick Link Buttons */}
                <div className="w-full space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCopyDirectLink}
                    className="w-full inline-flex h-9 items-center justify-center rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-xs font-semibold text-zinc-800 dark:text-zinc-200 shadow-2xs hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400" />
                        Direct Link Copied!
                      </>
                    ) : (
                      <>
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5 text-zinc-600 dark:text-zinc-300" />
                        Copy 1-Click Link
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleCopySyncCode}
                    className="w-full inline-flex h-9 items-center justify-center rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-xs font-semibold text-zinc-800 dark:text-zinc-200 shadow-2xs hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400" />
                        Sync Code Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 mr-1.5 text-zinc-600 dark:text-zinc-300" />
                        Copy Sync Code
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EXPORT JSON FILE */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 p-5 space-y-3">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-100 flex items-center gap-1.5">
                    <Download className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
                    Download Offline Backup (.json)
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    Save a full offline backup file containing all your classes, syllabi, topic logs, and instructor profile. You can keep this on your USB or send it to another device.
                  </p>
                </div>

                <div className="bg-white dark:bg-zinc-800/80 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs space-y-1.5 text-zinc-600 dark:text-zinc-300">
                  <div className="flex justify-between">
                    <span>Courses Included:</span>
                    <span className="font-bold text-zinc-950 dark:text-zinc-100">{classes.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Class Logs:</span>
                    <span className="font-bold text-zinc-950 dark:text-zinc-100">{logs.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Instructor Profile:</span>
                    <span className="font-bold text-zinc-950 dark:text-zinc-100">{profile?.fullName || 'Configured'}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="w-full inline-flex h-10 items-center justify-center rounded-lg bg-zinc-950 dark:bg-zinc-100 px-4 text-xs font-semibold text-white dark:text-zinc-950 shadow-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors cursor-pointer"
                >
                  <Download className="h-4 w-4 mr-1.5" />
                  Download Backup File (.json)
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: IMPORT DATA */}
          {activeTab === 'import' && (
            <div className="space-y-5">
              
              {/* Option A: Upload JSON File */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 p-5 space-y-3">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-100 flex items-center gap-1.5">
                    <FileJson className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
                    Option A: Upload Backup File (.json)
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300">
                    Select a previously downloaded <code className="font-mono bg-zinc-200 dark:bg-zinc-700 px-1 py-0.5 rounded text-[11px] text-zinc-900 dark:text-zinc-100">.json</code> backup file.
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full inline-flex h-10 items-center justify-center rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 text-xs font-semibold text-zinc-800 dark:text-zinc-200 shadow-2xs hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                >
                  <Upload className="h-4 w-4 mr-1.5 text-zinc-600 dark:text-zinc-300" />
                  Select .json File to Restore
                </button>
              </div>

              {/* Option B: Paste Sync Code */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 p-5 space-y-3">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-100 flex items-center gap-1.5">
                    <Copy className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
                    Option B: Paste Direct Link or Sync Code
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300">
                    Paste the 1-click link or compressed JSON sync code from your other device.
                  </p>
                </div>

                <textarea
                  value={manualCodeInput}
                  onChange={(e) => setManualCodeInput(e.target.value)}
                  placeholder="Paste #import=... link or JSON sync code here"
                  rows={3}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2.5 text-xs font-mono text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-400"
                />

                <button
                  type="button"
                  onClick={handleImportFromCode}
                  disabled={!manualCodeInput.trim()}
                  className="w-full inline-flex h-9 items-center justify-center rounded-lg bg-zinc-950 dark:bg-zinc-100 px-4 text-xs font-semibold text-white dark:text-zinc-950 shadow-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Restore From Code / Link
                </button>
              </div>

            </div>
          )}

        </div>

        {/* Dialog Footer */}
        <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 p-4 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300">
            <Laptop className="h-3.5 w-3.5" />
            <span>Laptop</span>
            <span>⇄</span>
            <Smartphone className="h-3.5 w-3.5" />
            <span>Phone</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer shadow-2xs"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
