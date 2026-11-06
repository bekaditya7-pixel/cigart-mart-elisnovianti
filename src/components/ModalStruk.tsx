import React, { useState, useRef } from 'react';
import { Penjualan, PengaturanToko } from '../types.ts';
import { formatRp, formatTanggalIndo, hitungSudahDibayar, hitungSisaHutang } from '../utils/format.ts';
import { 
  Printer, 
  Share2, 
  X, 
  Check, 
  Copy, 
  Send, 
  ExternalLink, 
  Smartphone,
  Image as ImageIcon,
  Download,
  Loader2,
  FileText,
  Camera
} from 'lucide-react';
import { 
  generateWhatsAppUrl, 
  copyToClipboard, 
  cleanWhatsAppNumber,
  openWhatsAppDirect 
} from '../utils/whatsapp.ts';
import { 
  generateReceiptImage, 
  downloadImageBlob, 
  copyImageToClipboard 
} from '../utils/imageReceipt.ts';

interface ModalStrukProps {
  penjualan: Penjualan | null;
  toko: PengaturanToko;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ModalStruk: React.FC<ModalStrukProps> = ({
  penjualan,
  toko,
  onClose,
  showToast,
}) => {
  if (!penjualan) return null;

  const receiptRef = useRef<HTMLDivElement>(null);
  const [nomorWA, setNomorWA] = useState<string>('');
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [copiedImage, setCopiedImage] = useState<boolean>(false);
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false);
  const [formatFoto, setFormatFoto] = useState<'png' | 'jpeg'>('png');
  const [activeTab, setActiveTab] = useState<'foto' | 'teks'>('foto');

  const sudahDibayar = hitungSudahDibayar(penjualan);
  const sisaHutang = hitungSisaHutang(penjualan);

  const handlePrint = () => {
    window.print();
  };

  let statusText = `Metode: ${penjualan.metode}\n`;
  if (penjualan.metode === 'Cashbon') {
    statusText += `Status: ${penjualan.statusKasbon || 'Belum Lunas'}\n`;
    if (sudahDibayar > 0) {
      statusText += `Sudah Dibayar: ${formatRp(sudahDibayar)}\n*Sisa Hutang: ${formatRp(sisaHutang)}*\n`;
    }
  }

  const receiptTextMessage =
    `🧾 *NOTA PENJUALAN - ${toko.namaToko.toUpperCase()}*\n` +
    `--------------------------------\n` +
    `No. Struk: #${penjualan.id.slice(-6).toUpperCase()}\n` +
    `Tanggal: ${formatTanggalIndo(penjualan.tgl)} (${penjualan.waktu || '-'})\n` +
    `Pembeli: ${penjualan.nama}${penjualan.isReseller ? ' (Reseller)' : ''}\n` +
    `--------------------------------\n` +
    `*${penjualan.barang}*${penjualan.isReseller ? ' [Harga Reseller]' : ''}\n` +
    `${penjualan.jumlah} bungkus x ${formatRp(penjualan.hargaSatuan)} = *${formatRp(penjualan.total)}*\n` +
    `--------------------------------\n` +
    `*TOTAL: ${formatRp(penjualan.total)}*\n` +
    statusText +
    (penjualan.metode === 'Tunai' && penjualan.bayarTunai
      ? `Tunai Diterima: ${formatRp(penjualan.bayarTunai)}\nKembalian: ${formatRp(penjualan.kembalian || 0)}\n`
      : '') +
    `--------------------------------\n` +
    `Terima Kasih telah berbelanja\n` +
    `-Dapur tetap ngebul,rokok masih ngebul-\n` +
    (toko.alamat || toko.noHp ? `${toko.alamat || ''} (${toko.noHp || ''})` : '');

  const waUrl = generateWhatsAppUrl(receiptTextMessage, nomorWA);

  // 1. Share Photo Directly to WhatsApp
  const handleShareFotoWhatsApp = async () => {
    if (!receiptRef.current) return;
    setIsProcessingImage(true);

    try {
      const blob = await generateReceiptImage(receiptRef.current, formatFoto);
      if (!blob) {
        showToast('Gagal memproses gambar nota.', 'error');
        return;
      }

      const ext = formatFoto === 'jpeg' ? 'jpg' : 'png';
      const filename = `nota_${penjualan.id.slice(-6).toUpperCase()}.${ext}`;
      const title = `Nota Penjualan #${penjualan.id.slice(-6).toUpperCase()}`;

      // Check native file share (supported on Android Chrome, iOS Safari, etc.)
      if (navigator.canShare && typeof File !== 'undefined') {
        const fileObj = new File([blob], filename, { type: blob.type });
        if (navigator.canShare({ files: [fileObj] })) {
          try {
            await navigator.share({
              title,
              text: `🧾 Nota Penjualan ${toko.namaToko} - #${penjualan.id.slice(-6).toUpperCase()}`,
              files: [fileObj],
            });
            showToast('Membuka WhatsApp untuk mengirim foto nota...', 'success');
            return;
          } catch (e: any) {
            if (e.name === 'AbortError') return;
            console.warn('Native image share fallback:', e);
          }
        }
      }

      // Fallback for Desktop/Web:
      // 1. Copy image to clipboard so user can press Ctrl+V directly into WhatsApp
      await copyImageToClipboard(blob);
      // 2. Download the physical image file
      downloadImageBlob(blob, filename);
      // 3. Open WhatsApp chat
      openWhatsAppDirect(receiptTextMessage, nomorWA);

      showToast('Foto nota telah disalin ke clipboard! Tekan Ctrl+V (Tempel) di obrolan WhatsApp.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Gagal memproses foto nota.', 'error');
    } finally {
      setIsProcessingImage(false);
    }
  };

  // 2. Download Image File (JPG/PNG)
  const handleDownloadFoto = async () => {
    if (!receiptRef.current) return;
    setIsProcessingImage(true);
    try {
      const blob = await generateReceiptImage(receiptRef.current, formatFoto);
      if (blob) {
        const ext = formatFoto === 'jpeg' ? 'jpg' : 'png';
        const filename = `nota_${penjualan.id.slice(-6).toUpperCase()}.${ext}`;
        downloadImageBlob(blob, filename);
        showToast(`Foto nota (${formatFoto.toUpperCase()}) berhasil disimpan ke perangkat!`, 'success');
      } else {
        showToast('Gagal memproses gambar.', 'error');
      }
    } finally {
      setIsProcessingImage(false);
    }
  };

  // 3. Copy Image to Clipboard
  const handleCopyFoto = async () => {
    if (!receiptRef.current) return;
    setIsProcessingImage(true);
    try {
      const blob = await generateReceiptImage(receiptRef.current, 'png');
      if (blob) {
        const success = await copyImageToClipboard(blob);
        if (success) {
          setCopiedImage(true);
          showToast('Foto nota berhasil disalin! Silakan paste (Ctrl+V) di WhatsApp.', 'success');
          setTimeout(() => setCopiedImage(false), 2500);
        } else {
          showToast('Browser membatasi salin gambar, gunakan tombol Unduh Foto.', 'info');
        }
      }
    } finally {
      setIsProcessingImage(false);
    }
  };

  // 4. Copy Text Receipt
  const handleCopyTeksNota = async () => {
    const success = await copyToClipboard(receiptTextMessage);
    if (success) {
      setCopiedText(true);
      showToast('Teks nota berhasil disalin! Silakan tempel di WhatsApp.', 'success');
      setTimeout(() => setCopiedText(false), 2500);
    } else {
      showToast('Gagal menyalin teks nota.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-6">
        {/* Modal Header */}
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Camera className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <span className="font-bold text-slate-800 text-sm block">Nota & Bukti Transaksi</span>
              <span className="text-[10px] text-slate-500">Bisa dibagikan format Foto (JPG/PNG) & Teks</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection: Foto vs Teks */}
        <div className="px-4 pt-2.5 pb-1 bg-slate-50/70 border-b border-slate-100 flex gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('foto')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'foto'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Format Foto (JPG/PNG)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('teks')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'teks'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Teks & Cetak</span>
          </button>
        </div>

        {/* RECEIPT CONTENT (PRINTABLE & CAPTURABLE) */}
        <div className="p-4 overflow-y-auto max-h-[55vh] bg-slate-100/50">
          <div
            ref={receiptRef}
            id="printable-receipt"
            className="bg-white p-5 rounded-xl border border-slate-300 font-mono text-xs text-slate-800 shadow-sm space-y-3"
          >
            {/* Store Info */}
            <div className="text-center space-y-0.5">
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900">
                {toko.namaToko}
              </h3>
              {toko.slogan && <p className="text-[10px] text-slate-500">{toko.slogan}</p>}
              {toko.alamat && <p className="text-[10px] text-slate-500">{toko.alamat}</p>}
              {toko.noHp && <p className="text-[10px] text-slate-500">WA: {toko.noHp}</p>}
            </div>

            <div className="border-t border-dashed border-slate-300 my-2" />

            {/* Meta */}
            <div className="flex justify-between text-[11px] text-slate-600">
              <span>No: #{penjualan.id.slice(-6).toUpperCase()}</span>
              <span>{penjualan.waktu || '00:00'}</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-600">
              <span>Tgl: {penjualan.tgl}</span>
              <span>
                Pelanggan: <strong className="text-slate-900">{penjualan.nama}</strong>
                {penjualan.isReseller && (
                  <span className="ml-1 px-1 py-0.2 bg-purple-100 text-purple-800 text-[9px] font-bold rounded">
                    Reseller
                  </span>
                )}
              </span>
            </div>

            <div className="border-t border-dashed border-slate-300 my-2" />

            {/* Itemized row */}
            <div className="space-y-1">
              <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
                <span>{penjualan.barang}</span>
                {penjualan.isReseller && (
                  <span className="text-[10px] text-purple-700 font-semibold">(Harga Reseller)</span>
                )}
              </div>
              <div className="flex justify-between text-[11px] text-slate-600">
                <span>
                  {penjualan.jumlah} bks x {formatRp(penjualan.hargaSatuan)}
                </span>
                <span className="font-bold text-slate-900">{formatRp(penjualan.total)}</span>
              </div>
              {penjualan.catatan && (
                <p className="text-[10px] text-slate-500 italic">
                  *Catatan: {penjualan.catatan}
                </p>
              )}
            </div>

            <div className="border-t border-dashed border-slate-300 my-2" />

            {/* Total and Payment */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between font-black text-sm text-slate-900 pt-0.5">
                <span>TOTAL:</span>
                <span>{formatRp(penjualan.total)}</span>
              </div>
              <div className="flex justify-between text-slate-600 text-[11px]">
                <span>Metode:</span>
                <span className="font-bold uppercase">{penjualan.metode}</span>
              </div>

              {penjualan.metode === 'Tunai' && penjualan.bayarTunai && (
                <>
                  <div className="flex justify-between text-slate-600 text-[11px]">
                    <span>Tunai:</span>
                    <span>{formatRp(penjualan.bayarTunai)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 text-[11px]">
                    <span>Kembalian:</span>
                    <span className="font-bold text-slate-900">{formatRp(penjualan.kembalian || 0)}</span>
                  </div>
                </>
              )}

              {penjualan.metode === 'Cashbon' && (
                <div className="space-y-1 text-[11px] pt-1 border-t border-dashed border-slate-200">
                  <div className="flex justify-between font-bold text-amber-800">
                    <span>Status Kasbon:</span>
                    <span>{penjualan.statusKasbon}</span>
                  </div>
                  {sudahDibayar > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Sudah Dibayar:</span>
                      <span>{formatRp(sudahDibayar)}</span>
                    </div>
                  )}
                  {sisaHutang > 0 && (
                    <div className="flex justify-between font-black text-rose-700">
                      <span>Sisa Hutang:</span>
                      <span>{formatRp(sisaHutang)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-slate-300 my-2" />

            {/* Footer */}
            <div className="text-center text-[10px] text-slate-500 space-y-0.5 pt-1">
              <p className="font-bold text-slate-700">Terima Kasih telah berbelanja</p>
              <p className="italic text-slate-600">-Dapur tetap ngebul,rokok masih ngebul-</p>
            </div>
          </div>
        </div>

        {/* Modal Action Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-2.5">
          {/* Optional Phone Number */}
          <div className="relative">
            <input
              type="tel"
              value={nomorWA}
              onChange={(e) => setNomorWA(e.target.value)}
              placeholder="No WA Penerima (opsional, cth: 0812...)"
              className="w-full pl-7 pr-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
            />
            <Smartphone className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
          </div>

          {activeTab === 'foto' ? (
            /* TAB 1: SHARE FOTO (JPG / PNG) */
            <div className="space-y-2">
              {/* Format Selection: PNG vs JPG */}
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                  <span>Pilihan Format Foto:</span>
                </span>
                <div className="flex bg-slate-200/70 p-0.5 rounded-lg text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setFormatFoto('png')}
                    className={`px-2 py-0.5 rounded-md transition ${
                      formatFoto === 'png'
                        ? 'bg-white text-emerald-800 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    PNG (Jernih)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormatFoto('jpeg')}
                    className={`px-2 py-0.5 rounded-md transition ${
                      formatFoto === 'jpeg'
                        ? 'bg-white text-emerald-800 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    JPG (Ringan)
                  </button>
                </div>
              </div>

              {/* Primary: Share Foto ke WhatsApp */}
              <button
                type="button"
                onClick={handleShareFotoWhatsApp}
                disabled={isProcessingImage}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm"
              >
                {isProcessingImage ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memproses Foto Nota...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>Share Foto Nota ke WhatsApp ({formatFoto.toUpperCase()})</span>
                  </>
                )}
              </button>

              {/* Secondary: Unduh Foto & Salin Foto */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDownloadFoto}
                  disabled={isProcessingImage}
                  className="py-2 px-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  <span>Unduh Foto {formatFoto.toUpperCase()}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyFoto}
                  disabled={isProcessingImage}
                  className="py-2 px-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-2xs"
                >
                  {copiedImage ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
                  <span>{copiedImage ? 'Foto Tersalin!' : 'Salin Foto'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* TAB 2: TEKS & CETAK THERMAL */
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => showToast('Membuka WhatsApp...', 'success')}
                  className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm text-center"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim Teks ke WA</span>
                  <ExternalLink className="w-3 h-3 opacity-80" />
                </a>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Thermal</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleCopyTeksNota}
                className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-2xs"
              >
                {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copiedText ? 'Teks Nota Berhasil Disalin!' : 'Salin Seluruh Teks Nota'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
