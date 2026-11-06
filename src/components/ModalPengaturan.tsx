import React, { useState, useRef } from 'react';
import { PengaturanToko, Barang, Penjualan, TransaksiKeuangan } from '../types.ts';
import { Store, Download, Upload, RotateCcw, X, Check, Save } from 'lucide-react';

interface ModalPengaturanProps {
  isOpen: boolean;
  toko: PengaturanToko;
  barangList: Barang[];
  penjualanList: Penjualan[];
  keuanganList: TransaksiKeuangan[];
  onSaveToko: (updated: PengaturanToko) => void;
  onRestoreData: (backup: {
    toko?: PengaturanToko;
    barang?: Barang[];
    jual?: Penjualan[];
    keu?: TransaksiKeuangan[];
  }) => void;
  onResetData: () => void;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ModalPengaturan: React.FC<ModalPengaturanProps> = ({
  isOpen,
  toko,
  barangList,
  penjualanList,
  keuanganList,
  onSaveToko,
  onRestoreData,
  onResetData,
  onClose,
  showToast,
}) => {
  const [formToko, setFormToko] = useState<PengaturanToko>({ ...toko });
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSaveInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formToko.namaToko.trim()) {
      showToast('Nama warung tidak boleh kosong!', 'error');
      return;
    }
    onSaveToko(formToko);
    showToast('Informasi warung berhasil disimpan!', 'success');
  };

  const handleBackup = () => {
    const backupData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      toko: formToko,
      barang: barangList,
      jual: penjualanList,
      keu: keuanganList,
    };
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_pembukuan_bungkus_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('File backup JSON berhasil diunduh!', 'success');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed.barang || parsed.jual || parsed.keu) {
          onRestoreData(parsed);
          showToast('Data berhasil dipulihkan dari backup JSON!', 'success');
          onClose();
        } else {
          showToast('Format file backup tidak valid!', 'error');
        }
      } catch (err) {
        showToast('Gagal membaca file JSON!', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Pengaturan & Cadangan</h3>
              <p className="text-xs text-slate-500">Profil warung dan kelola file data</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-6">
          {/* Toko Info Form */}
          <form onSubmit={handleSaveInfo} className="space-y-3.5">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
              Identitas Warung / Usaha
            </h4>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Warung / Toko Bungkus
              </label>
              <input
                type="text"
                required
                value={formToko.namaToko}
                onChange={(e) => setFormToko({ ...formToko, namaToko: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Slogan / Deskripsi Singkat
              </label>
              <input
                type="text"
                value={formToko.slogan}
                onChange={(e) => setFormToko({ ...formToko, slogan: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor WhatsApp
                </label>
                <input
                  type="text"
                  value={formToko.noHp}
                  onChange={(e) => setFormToko({ ...formToko, noHp: e.target.value })}
                  placeholder="0812-xxxx-xxxx"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alamat Singkat
                </label>
                <input
                  type="text"
                  value={formToko.alamat}
                  onChange={(e) => setFormToko({ ...formToko, alamat: e.target.value })}
                  placeholder="Jl. Mawar No. 12"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="pt-1 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Profil</span>
              </button>
            </div>
          </form>

          {/* Backup & Restore Section */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
              Cadangan & Pemulihan Data
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Semua data disimpan di peramban ini. Anda dapat mengunduh salinan berkas cadangan (JSON) agar aman dari pembersihan browser.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleBackup}
                className="p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-slate-800 text-xs font-bold transition flex flex-col items-center justify-center gap-1.5 text-center"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Unduh Cadangan (JSON)</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 text-slate-800 text-xs font-bold transition flex flex-col items-center justify-center gap-1.5 text-center"
              >
                <Upload className="w-4 h-4 text-blue-600" />
                <span>Pulihkan dari File</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Reset to Example Data */}
          <div className="pt-4 border-t border-slate-100">
            <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200 flex items-center justify-between">
              <div>
                <p className="font-bold text-xs text-rose-900">Reset ke Data Contoh</p>
                <p className="text-[11px] text-rose-700">Muat ulang sampel menu bungkus & transaksi demo</p>
              </div>
              <button
                type="button"
                onClick={onResetData}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
