import React, { useState, useEffect } from 'react';
import { Penjualan, MetodePembayaran, StatusKasbon } from '../types.ts';
import { formatRp, formatTanggalIndo } from '../utils/format.ts';
import { 
  X, 
  Check, 
  CreditCard, 
  Banknote, 
  QrCode, 
  Clock, 
  ArrowRightLeft, 
  AlertCircle, 
  RotateCcw 
} from 'lucide-react';

interface ModalRevisiPembayaranProps {
  sale: Penjualan | null;
  onClose: () => void;
  onSave: (updated: Penjualan) => void;
}

export const ModalRevisiPembayaran: React.FC<ModalRevisiPembayaranProps> = ({
  sale,
  onClose,
  onSave,
}) => {
  if (!sale) return null;

  const [metode, setMetode] = useState<MetodePembayaran>(sale.metode);
  const [uangDiterima, setUangDiterima] = useState<number | ''>(
    sale.metode === 'Tunai' ? (sale.bayarTunai ?? sale.total) : sale.total
  );
  const [statusKasbon, setStatusKasbon] = useState<StatusKasbon>(
    sale.statusKasbon ?? 'Belum Lunas'
  );
  const [catatan, setCatatan] = useState<string>(sale.catatan ?? '');

  // Reset local state if sale changes
  useEffect(() => {
    if (sale) {
      setMetode(sale.metode);
      setUangDiterima(sale.metode === 'Tunai' ? (sale.bayarTunai ?? sale.total) : sale.total);
      setStatusKasbon(sale.statusKasbon ?? 'Belum Lunas');
      setCatatan(sale.catatan ?? '');
    }
  }, [sale]);

  const total = sale.total;
  const nominalUang = typeof uangDiterima === 'number' ? uangDiterima : 0;
  const kembalian = metode === 'Tunai' && nominalUang >= total ? nominalUang - total : 0;
  const isKurang = metode === 'Tunai' && nominalUang > 0 && nominalUang < total;

  const quickNominals = [
    { label: 'Uang Pas', val: total },
    { label: 'Rp 10.000', val: 10000 },
    { label: 'Rp 20.000', val: 20000 },
    { label: 'Rp 50.000', val: 50000 },
    { label: 'Rp 100.000', val: 100000 },
  ].filter((q) => q.val >= total);

  const handlePilihMetode = (newMetode: MetodePembayaran) => {
    setMetode(newMetode);
    if (newMetode === 'Tunai' && (uangDiterima === '' || uangDiterima < total)) {
      setUangDiterima(total);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let bayarTunaiVal: number | undefined = undefined;
    let kembalianVal: number | undefined = undefined;
    let statusKasbonVal: StatusKasbon | undefined = undefined;
    let sudahDibayarVal = sale.sudahDibayar;
    let riwayatCicilanVal = sale.riwayatCicilan;

    if (metode === 'Tunai') {
      bayarTunaiVal = typeof uangDiterima === 'number' && uangDiterima >= total ? uangDiterima : total;
      kembalianVal = bayarTunaiVal - total;
      statusKasbonVal = undefined;
      // Jika sebelumnya kasbon, reset status hutang karena sekarang tunai langsung
      sudahDibayarVal = undefined;
      riwayatCicilanVal = undefined;
    } else if (metode === 'QR') {
      bayarTunaiVal = undefined;
      kembalianVal = undefined;
      statusKasbonVal = undefined;
      sudahDibayarVal = undefined;
      riwayatCicilanVal = undefined;
    } else if (metode === 'Cashbon') {
      bayarTunaiVal = undefined;
      kembalianVal = undefined;
      statusKasbonVal = statusKasbon;
      if (sale.metode !== 'Cashbon') {
        sudahDibayarVal = 0;
        riwayatCicilanVal = [];
      }
    }

    const updatedSale: Penjualan = {
      ...sale,
      metode,
      bayarTunai: bayarTunaiVal,
      kembalian: kembalianVal,
      statusKasbon: statusKasbonVal,
      sudahDibayar: sudahDibayarVal,
      riwayatCicilan: riwayatCicilanVal,
      catatan: catatan.trim(),
    };

    onSave(updatedSale);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-6">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <ArrowRightLeft className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Revisi Metode Pembayaran</h3>
              <p className="text-xs text-slate-500">Ubah cara bayar untuk transaksi terpilih</p>
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Detail Transaksi Saat Ini */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
            <div className="flex justify-between items-center text-slate-500">
              <span>No. Transaksi: #{sale.id.slice(-6).toUpperCase()}</span>
              <span>{formatTanggalIndo(sale.tgl)} ({sale.waktu || '-'})</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-200/70">
              <div>
                <span className="font-bold text-slate-900 text-sm block">{sale.nama}</span>
                <span className="text-slate-600 text-[11px]">
                  {sale.barang} • {sale.jumlah} bungkus
                  {sale.isReseller && (
                    <span className="ml-1.5 px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 text-[10px] font-bold">
                      Reseller
                    </span>
                  )}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Tagihan</span>
                <span className="font-black text-slate-900 text-base">{formatRp(sale.total)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/70 text-slate-600">
              <span>Metode Saat Ini:</span>
              <span className="font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                {sale.metode} {sale.statusKasbon ? `(${sale.statusKasbon})` : ''}
              </span>
            </div>
          </div>

          {/* PILIH METODE PEMBAYARAN BARU */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Pilih Metode Pembayaran Baru:
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {/* Tunai */}
              <button
                type="button"
                onClick={() => handlePilihMetode('Tunai')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  metode === 'Tunai'
                    ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <Banknote className={`w-5 h-5 ${metode === 'Tunai' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  {metode === 'Tunai' && <Check className="w-4 h-4 text-emerald-600" />}
                </div>
                <div>
                  <span className={`font-bold text-xs block ${metode === 'Tunai' ? 'text-emerald-900' : 'text-slate-800'}`}>
                    💵 Tunai (Cash)
                  </span>
                  <span className="text-[10px] text-slate-500">Uang tunai fisik</span>
                </div>
              </button>

              {/* QRIS */}
              <button
                type="button"
                onClick={() => handlePilihMetode('QR')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  metode === 'QR'
                    ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <QrCode className={`w-5 h-5 ${metode === 'QR' ? 'text-blue-600' : 'text-slate-400'}`} />
                  {metode === 'QR' && <Check className="w-4 h-4 text-blue-600" />}
                </div>
                <div>
                  <span className={`font-bold text-xs block ${metode === 'QR' ? 'text-blue-900' : 'text-slate-800'}`}>
                    📱 QRIS (QR)
                  </span>
                  <span className="text-[10px] text-slate-500">Transfer / e-Wallet</span>
                </div>
              </button>

              {/* Cashbon */}
              <button
                type="button"
                onClick={() => handlePilihMetode('Cashbon')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  metode === 'Cashbon'
                    ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <Clock className={`w-5 h-5 ${metode === 'Cashbon' ? 'text-amber-600' : 'text-slate-400'}`} />
                  {metode === 'Cashbon' && <Check className="w-4 h-4 text-amber-600" />}
                </div>
                <div>
                  <span className={`font-bold text-xs block ${metode === 'Cashbon' ? 'text-amber-900' : 'text-slate-800'}`}>
                    ⏳ Cashbon
                  </span>
                  <span className="text-[10px] text-slate-500">Hutang / tempo</span>
                </div>
              </button>
            </div>
          </div>

          {/* OPSI TAMBAHAN SESUAI METODE */}
          {metode === 'Tunai' && (
            <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-3">
              <label className="block text-xs font-bold text-emerald-950">
                Uang Tunai Diterima (Rp)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-400">Rp</span>
                <input
                  type="number"
                  value={uangDiterima}
                  onChange={(e) => setUangDiterima(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder={total.toString()}
                  className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold text-slate-900 bg-white"
                />
              </div>

              {/* Quick Nominal Buttons */}
              <div className="flex flex-wrap gap-1.5">
                {quickNominals.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setUangDiterima(item.val)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 transition"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Kembalian / Status */}
              <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-xs">
                <span className="font-medium text-emerald-900">Uang Kembalian:</span>
                <span className="font-extrabold text-sm text-emerald-700">{formatRp(kembalian)}</span>
              </div>
              {isKurang && (
                <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Uang tunai kurang dari total tagihan ({formatRp(total - nominalUang)})
                </p>
              )}
            </div>
          )}

          {metode === 'QR' && (
            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-blue-900 flex items-start gap-2">
              <QrCode className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Pembayaran Non-Tunai (QRIS)</p>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  Nominal sebesar <b>{formatRp(total)}</b> otomatis disinkronkan ke Saldo QR di Pembukuan Kas.
                </p>
              </div>
            </div>
          )}

          {metode === 'Cashbon' && (
            <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-2.5">
              <div className="flex items-start gap-2 text-xs text-amber-900">
                <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Pencatatan Hutang / Cashbon</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Transaksi ini akan otomatis muncul pada tab <b>Kasbon</b> untuk pelanggan <b>{sale.nama}</b>.
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t border-amber-200/60">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Status Awal Kasbon:
                </label>
                <select
                  value={statusKasbon}
                  onChange={(e) => setStatusKasbon(e.target.value as StatusKasbon)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="Belum Lunas">⏳ Belum Lunas (Hutang Penuh)</option>
                  <option value="Lunas">✅ Lunas (Sudah Dibayar)</option>
                </select>
              </div>
            </div>
          )}

          {/* CATATAN REVISI */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Catatan / Alasan Revisi (Opsional):
            </label>
            <input
              type="text"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: Pembeli ganti bayar pakai QRIS / uang pas"
              className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* ACTIONS */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition active:scale-95 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Simpan Perubahan Pembayaran</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
