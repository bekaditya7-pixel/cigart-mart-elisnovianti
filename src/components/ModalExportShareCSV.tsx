import React, { useState } from 'react';
import { 
  X, 
  Share2, 
  Download, 
  Copy, 
  Check, 
  FileSpreadsheet, 
  MessageSquare,
  Smartphone,
  ExternalLink,
  Send,
  FileCheck,
  TableProperties
} from 'lucide-react';
import { downloadCSV } from '../utils/format.ts';
import { 
  generateWhatsAppUrl, 
  copyToClipboard, 
  cleanWhatsAppNumber,
  shareToWhatsAppOrNative 
} from '../utils/whatsapp.ts';

interface ModalExportShareCSVProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  filename: string;
  csvContent: string;
  summaryText: string;
  totalRecords: number;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ModalExportShareCSV: React.FC<ModalExportShareCSVProps> = ({
  isOpen,
  onClose,
  title,
  filename,
  csvContent,
  summaryText,
  totalRecords,
  showToast,
}) => {
  if (!isOpen) return null;

  const [nomorWA, setNomorWA] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isSharingFile, setIsSharingFile] = useState<boolean>(false);

  // Text message to be sent to WhatsApp
  const fullWhatsAppMessage = 
    `${summaryText}\n\n` +
    `📁 *Dokumen File Spreadsheet*: ${filename}\n` +
    `ℹ️ _File CSV berformat standar UTF-8 Excel & Google Sheets. Penerima di WhatsApp bisa langsung klik untuk membuka dan mengunduh data di aplikasi spreadsheet (Microsoft Excel, Google Spreadsheet, WPS Office)._`;

  const waUrl = generateWhatsAppUrl(fullWhatsAppMessage, nomorWA);

  const handleDownloadOnly = () => {
    downloadCSV(filename, csvContent);
    showToast(`File ${filename} berhasil diunduh ke folder Downloads!`, 'success');
  };

  // Direct CSV Document Sharing into WhatsApp / native share
  const handleShareFileDirect = async () => {
    setIsSharingFile(true);
    try {
      // 1. Download file locally so user always has the physical CSV
      downloadCSV(filename, csvContent);

      // 2. Check native file sharing
      const method = await shareToWhatsAppOrNative(
        title,
        fullWhatsAppMessage,
        nomorWA,
        { filename, content: csvContent }
      );

      if (method === 'native-share') {
        showToast('Membuka WhatsApp untuk mengirim dokumen CSV...', 'success');
      } else {
        showToast('File CSV telah diunduh! Silakan lampirkan (ikon klip 📎) di obrolan WhatsApp.', 'info');
      }
    } catch (err) {
      console.error(err);
      showToast('Gagal memproses pengiriman file. Coba unduh file CSV secara manual.', 'error');
    } finally {
      setIsSharingFile(false);
    }
  };

  const handleCopyText = async () => {
    const success = await copyToClipboard(fullWhatsAppMessage);
    if (success) {
      setCopied(true);
      showToast('Ringkasan teks berhasil disalin ke clipboard!', 'success');
      setTimeout(() => setCopied(false), 2500);
    } else {
      showToast('Gagal menyalin teks', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-6">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">{title}</h3>
              <p className="text-xs text-slate-500">
                Dokumen CSV siap dibuka di Excel, Google Sheets, & WhatsApp ({totalRecords} data)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Target WhatsApp Number Input (Optional) */}
          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-emerald-700" />
                <span>Nomor WhatsApp Penerima (Opsional):</span>
              </label>
              {nomorWA && (
                <span className="text-[10px] text-emerald-700 font-bold">
                  Format: +{cleanWhatsAppNumber(nomorWA)}
                </span>
              )}
            </div>
            <input
              type="tel"
              value={nomorWA}
              onChange={(e) => setNomorWA(e.target.value)}
              placeholder="Contoh: 08123456789 (kosongkan untuk pilih kontak langsung di WhatsApp)"
              className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-emerald-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            />
            <p className="text-[10px] text-slate-500">
              Kosongkan jika ingin memilih kontak atau grup WhatsApp secara manual saat menu berbagi muncul.
            </p>
          </div>

          {/* Compatibility Badge Notice */}
          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start gap-2.5">
            <TableProperties className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-xs text-blue-900 leading-relaxed">
              <span className="font-bold block text-blue-950">Kompatibel Langsung dengan Aplikasi Spreadsheet:</span>
              File CSV menggunakan standar UTF-8 BOM, sehingga saat penerima mengunduh file ini di WhatsApp, otomatis tersusun rapi dalam kolom-kolom <strong>Microsoft Excel, Google Spreadsheet, dan WPS Office</strong> tanpa karakter rusak.
            </div>
          </div>

          {/* Message Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                <span>Pratinjau Pesan Rekapitulasi:</span>
              </span>
              <button
                type="button"
                onClick={handleCopyText}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Tersalin!' : 'Salin Teks'}</span>
              </button>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 font-mono whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed shadow-inner">
              {fullWhatsAppMessage}
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="space-y-2.5 pt-1">
            {/* 1. Share Document File Directly (Native share attaches the actual .csv file to WhatsApp) */}
            <button
              type="button"
              onClick={handleShareFileDirect}
              disabled={isSharingFile}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold text-sm shadow-sm transition flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4 text-white" />
              <span>Kirim Dokumen CSV ke WhatsApp (Kirim Berkas)</span>
            </button>

            {/* 2. Secondary Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* WhatsApp Web text link */}
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  downloadCSV(filename, csvContent);
                  showToast(`File ${filename} diunduh & membuka WhatsApp!`, 'success');
                }}
                className="py-2.5 px-3 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 font-bold text-xs transition flex items-center justify-center gap-1.5 text-center"
              >
                <Send className="w-3.5 h-3.5 text-emerald-700" />
                <span>Kirim Ringkasan Teks ke WA</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>

              {/* Direct Download Only */}
              <button
                type="button"
                onClick={handleDownloadOnly}
                className="py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Unduh File CSV Saja</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>{filename}</span>
          </span>
          <span className="font-semibold text-slate-600">Excel / Google Sheets Ready</span>
        </div>
      </div>
    </div>
  );
};
