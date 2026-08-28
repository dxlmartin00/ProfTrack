import { useState, useRef, useMemo } from 'react';
import type { FC, ChangeEvent } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { compressPayload, decompressPayload } from '../utils/codec';
import type { ClassSession, SessionLog } from '../services/db';
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
  ExternalLink
} from 'lucide-react';

interface DataTransferModalProps {
  classes: ClassSession[];
  logs: (SessionLog & { classInfo: ClassSession })[];
  onClose: () => void;
  onImportData: (importedClasses: ClassSession[], importedLogs: (SessionLog & { classInfo: ClassSession })[]) => void;
}

export const DataTransferModal: FC<DataTransferModalProps> = ({
  classes,
  logs,
  onClose,
  onImportData,
}) => {
  const [activeTab, setActiveTab] = useState<'qrcode' | 'export' | 'import'>('qrcode');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bundle data into clean JSON
  const backupPayload = useMemo(() => ({
    v: '1.0',
    exportedAt: new Date().toISOString(),
    classes,
    logs,
  }), [classes, logs]);

  const backupJsonString = useMemo(() => {
    try {
      return JSON.stringify(backupPayload, null, 2);
    } catch {
      return '{}';
    }
  }, [backupPayload]);

  const compactJsonString = useMemo(() => {
    try {
      return JSON.stringify(backupPayload);
    } catch {
      return '{}';
    }
  }, [backupPayload]);

  // Generate deep-link QR URL with compressed payload
  const qrTransferUrl = useMemo(() => {
    try {
      const compressed = compressPayload(compactJsonString);
      const origin = window.location.origin || '';
      const pathname = window.location.pathname || '/';
      return `${origin}${pathname}#import=${compressed}`;
    } catch (err) {
      console.error('Failed to generate QR URL:', err);
      return window.location.href;
    }
  }, [compactJsonString]);

  // Download .json file
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
    } catch (err: any) {
      alert('Failed to download backup: ' + err.message);
    }
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
        
        const importedClasses = parsed.classes || parsed.c;
        if (!importedClasses || !Array.isArray(importedClasses)) {
          throw new Error('Invalid backup file format: missing classes array.');
        }

        const rawLogs = parsed.logs || parsed.l || [];
        const validLogs = rawLogs.map((item: any) => ({
          ...item,
          date: new Date(item.date),
        }));

        onImportData(importedClasses, validLogs);
        setImportStatus({
          success: true,
          message: `Successfully imported ${importedClasses.length} courses and ${validLogs.length} session logs!`
        });
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
      navigator.clipboard.writeText(compactJsonString);
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
          const importedClasses = decompressed.classes || decompressed.c || [];
          const rawLogs = decompressed.logs || decompressed.l || [];
          const validLogs = rawLogs.map((item: any) => ({
            ...item,
            date: new Date(item.date),
          }));

          onImportData(importedClasses, validLogs);
          setImportStatus({
            success: true,
            message: `Successfully restored ${importedClasses.length} courses and ${validLogs.length} session logs!`
          });
          setManualCodeInput('');
          return;
        }
      }

      const parsed = JSON.parse(inputStr);
      const importedClasses = parsed.classes || parsed.c;
      if (!importedClasses || !Array.isArray(importedClasses)) {
        throw new Error('Invalid sync code format: missing classes array.');
      }
      const rawLogs = parsed.logs || parsed.l || [];
      const validLogs = rawLogs.map((item: any) => ({
        ...item,
        date: new Date(item.date),
      }));

      onImportData(importedClasses, validLogs);
      setImportStatus({
        success: true,
        message: `Successfully restored ${importedClasses.length} courses and ${validLogs.length} session logs!`
      });
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
      <div className="bg-white text-zinc-950 rounded-xl border border-zinc-200 w-full max-w-lg shadow-xl flex flex-col max-h-[90vh] my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Dialog Header */}
        <div className="flex items-start justify-between border-b border-zinc-200 p-5 shrink-0 bg-white">
          <div className="space-y-1">
            <h2 id="transfer-data-title" className="text-xl font-bold tracking-tight text-zinc-950 flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-zinc-900" />
              Transfer Data to Phone / Laptop
            </h2>
            <p className="text-sm text-zinc-600">
              Move your private timetable, syllabus, and logs between devices.
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

        {/* Tab Switcher */}
        <div className="px-6 pt-4 bg-white border-b border-zinc-200 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('qrcode')}
            className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 text-center transition-colors cursor-pointer ${
              activeTab === 'qrcode'
                ? 'border-zinc-950 text-zinc-950'
                : 'border-transparent text-zinc-500 hover:text-zinc-900'
            }`}
          >
            1. Scan QR Code
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 text-center transition-colors cursor-pointer ${
              activeTab === 'export'
                ? 'border-zinc-950 text-zinc-950'
                : 'border-transparent text-zinc-500 hover:text-zinc-950'
            }`}
          >
            2. Export File
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 text-center transition-colors cursor-pointer ${
              activeTab === 'import'
                ? 'border-zinc-950 text-zinc-950'
                : 'border-transparent text-zinc-500 hover:text-zinc-900'
            }`}
          >
            3. Import File
          </button>
        </div>

        {/* Dialog Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 bg-white">
          
          {importStatus && (
            <div className={`flex items-start gap-2.5 p-3.5 rounded-lg border text-xs font-semibold ${
              importStatus.success
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-red-50 border-red-300 text-red-900'
            }`}>
              {importStatus.success ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <span>{importStatus.message}</span>
            </div>
          )}

          {/* TAB 1: QR CODE */}
          {activeTab === 'qrcode' && (
            <div className="space-y-4 text-center">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 flex flex-col items-center justify-center space-y-3.5">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-zinc-950">
                    Scan with Phone Camera
                  </h3>
                  <p className="text-xs text-zinc-600 max-w-xs">
                    Point your camera at this QR code. Tap the link popup to instantly load all your data on your phone.
                  </p>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-zinc-300 shadow-sm">
                  {qrTransferUrl ? (
                    <QRCodeSVG 
                      value={qrTransferUrl}
                      size={200}
                      level="L"
                      includeMargin={true}
                    />
                  ) : (
                    <div className="h-48 w-48 flex items-center justify-center text-xs text-zinc-400">
                      QR unavailable
                    </div>
                  )}
                </div>

                <div className="w-full pt-1 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={handleCopyDirectLink}
                    className="flex-1 inline-flex h-9 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 text-xs font-bold text-zinc-800 shadow-2xs hover:bg-zinc-50 transition-colors cursor-pointer"
                  >
                    {copiedLink ? <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-600" /> : <ExternalLink className="h-3.5 w-3.5 mr-1.5" />}
                    {copiedLink ? 'Link Copied!' : 'Copy 1-Click Link'}
                  </button>

                  <button
                    type="button"
                    onClick={handleCopySyncCode}
                    className="flex-1 inline-flex h-9 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 text-xs font-bold text-zinc-800 shadow-2xs hover:bg-zinc-50 transition-colors cursor-pointer"
                  >
                    {copiedCode ? <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                    {copiedCode ? 'Code Copied!' : 'Copy Sync Code'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-950 text-white shrink-0">
                    <Download className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-950">Download Backup File (.json)</h3>
                    <p className="text-xs text-zinc-600">
                      Contains {classes.length} course(s) and {logs.length} logged session(s).
                    </p>
                  </div>
                </div>

                <p className="text-xs text-zinc-600 leading-relaxed">
                  Download your data file and send it to your phone via Messenger, Telegram, AirDrop, Google Drive, or Email.
                </p>

                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  disabled={classes.length === 0}
                  className="w-full inline-flex h-10 items-center justify-center rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <FileJson className="h-4 w-4 mr-2" />
                  Download Backup File (.json)
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: IMPORT */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-950 text-white shrink-0">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-950">Import Backup File (.json)</h3>
                    <p className="text-xs text-zinc-600">
                      Restore your timetable and syllabus on this device.
                    </p>
                  </div>
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
                  className="w-full inline-flex h-10 items-center justify-center rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Select & Import .json File
                </button>
              </div>

              {/* Paste Sync Code */}
              <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-2.5">
                <label htmlFor="sync-code-input" className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                  Or Paste Sync Code / 1-Click Link
                </label>
                <textarea
                  id="sync-code-input"
                  rows={3}
                  placeholder="Paste your copied sync code or transfer link here..."
                  value={manualCodeInput}
                  onChange={(e) => setManualCodeInput(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-xs font-mono text-zinc-900 placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
                />
                <button
                  type="button"
                  onClick={handleImportFromCode}
                  disabled={!manualCodeInput.trim()}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-300 bg-zinc-100 hover:bg-zinc-200 px-4 text-xs font-bold text-zinc-900 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Restore from Code
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Dialog Footer */}
        <div className="flex items-center justify-between border-t border-zinc-200 p-4 shrink-0 bg-zinc-50">
          <div className="flex items-center gap-1.5 text-xs text-zinc-600 font-medium">
            <Laptop className="h-4 w-4 text-zinc-500" />
            <span>Laptop</span>
            <span>⇄</span>
            <Smartphone className="h-4 w-4 text-zinc-500" />
            <span>Phone</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-xs font-bold text-zinc-800 shadow-2xs hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
