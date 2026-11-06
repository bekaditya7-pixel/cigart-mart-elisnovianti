import React, { useState } from 'react';
import { Barang, Penjualan, TransaksiKeuangan } from '../types.ts';
import { formatRp, formatAngka, formatTanggalIndo, getTanggalHariIni, downloadCSV } from '../utils/format.ts';
import { ModalExportShareCSV } from './ModalExportShareCSV.tsx';
import { 
  BarChart3, 
  TrendingUp, 
  PieChart, 
  FileSpreadsheet, 
  Award, 
  CheckCircle2, 
  DollarSign,
  Package,
  Calendar,
  HandCoins,
  AlertTriangle,
  AlertCircle,
  BellRing,
  Check,
  Clock,
  ArrowUpRight,
  ShieldAlert,
  CheckCircle,
  Truck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface TabLaporanProps {
  barangList: Barang[];
  penjualanList: Penjualan[];
  keuanganList: TransaksiKeuangan[];
  onUpdateKeuangan?: (transaksi: TransaksiKeuangan) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const TabLaporan: React.FC<TabLaporanProps> = ({
  barangList,
  penjualanList,
  keuanganList,
  onUpdateKeuangan,
  showToast,
}) => {
  const [periode, setPeriode] = useState<'semua' | 'hari_ini' | 'bulan_ini'>('semua');
  const [showLunasHistory, setShowLunasHistory] = useState<boolean>(false);
  const [exportShareModal, setExportShareModal] = useState<{
    isOpen: boolean;
    title: string;
    filename: string;
    csvContent: string;
    summaryText: string;
    totalRecords: number;
  }>({
    isOpen: false,
    title: '',
    filename: '',
    csvContent: '',
    summaryText: '',
    totalRecords: 0,
  });
  const today = getTanggalHariIni();
  const currentMonth = today.slice(0, 7); // YYYY-MM

  // Filter sales & cashflow by period
  const filteredSales = penjualanList.filter((j) => {
    if (periode === 'hari_ini') return j.tgl === today;
    if (periode === 'bulan_ini') return j.tgl.startsWith(currentMonth);
    return true;
  });

  const filteredKeuangan = keuanganList.filter((k) => {
    if (periode === 'hari_ini') return k.tgl === today;
    if (periode === 'bulan_ini') return k.tgl.startsWith(currentMonth);
    return true;
  });

  // Financial aggregates
  const totalOmset = filteredSales.reduce((sum, j) => sum + j.total, 0);
  const totalHPP = filteredSales.reduce((sum, j) => sum + (j.modalSatuan * j.jumlah), 0);
  const totalLabaKotor = totalOmset - totalHPP;
  const totalBungkusTerjual = filteredSales.reduce((sum, j) => sum + j.jumlah, 0);

  // Operational expenses from keuangan (excluding modal awal/penjualan)
  const totalBiayaOperasional = filteredKeuangan
    .filter((k) => k.jenis === 'keluar')
    .reduce((sum, k) => sum + k.nominal, 0);

  const labaBersihEstimasi = totalLabaKotor - totalBiayaOperasional;

  // Best selling products calculation
  const productStats: Record<string, { nama: string; terjual: number; omset: number; untung: number }> = {};
  filteredSales.forEach((j) => {
    if (!productStats[j.barang]) {
      productStats[j.barang] = { nama: j.barang, terjual: 0, omset: 0, untung: 0 };
    }
    productStats[j.barang].terjual += j.jumlah;
    productStats[j.barang].omset += j.total;
    productStats[j.barang].untung += j.untung;
  });

  const topProducts = Object.values(productStats).sort((a, b) => b.terjual - a.terjual);

  // Payment Breakdown
  const metodeStats = {
    Tunai: filteredSales.filter((j) => j.metode === 'Tunai').reduce((s, j) => s + j.total, 0),
    QR: filteredSales.filter((j) => j.metode === 'QR').reduce((s, j) => s + j.total, 0),
    Cashbon: filteredSales.filter((j) => j.metode === 'Cashbon').reduce((s, j) => s + j.total, 0),
  };

  // Dana Pinjaman calculation (across all financial history since loan obligations persist)
  const pinjamanList = keuanganList.filter((k) => k.kategori === 'Dana Pinjaman');
  const pinjamanBelumLunas = pinjamanList.filter((k) => k.statusPinjaman !== 'Lunas');
  const pinjamanLunas = pinjamanList.filter((k) => k.statusPinjaman === 'Lunas');

  const totalKewajibanPinjaman = pinjamanBelumLunas.reduce((sum, k) => sum + k.nominal, 0);
  const totalPinjamanPernahDiterima = pinjamanList.reduce((sum, k) => sum + k.nominal, 0);
  const totalPinjamanSudahLunas = pinjamanLunas.reduce((sum, k) => sum + k.nominal, 0);

  // Check for upcoming or overdue deadlines
  const pinjamanMendekatAtauLewat = pinjamanBelumLunas.filter((k) => {
    if (!k.jatuhTempoPinjaman) return false;
    const diffTime = new Date(k.jatuhTempoPinjaman).getTime() - new Date(today).getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  });

  const totalOngkir = filteredKeuangan
    .filter((k) => k.jenis === 'keluar' && k.kategori === 'Biaya Ongkir Barang')
    .reduce((sum, k) => sum + k.nominal, 0);

  const handleToggleStatusPinjaman = (item: TransaksiKeuangan) => {
    if (!onUpdateKeuangan) return;
    const isNowLunas = item.statusPinjaman !== 'Lunas';
    const updated: TransaksiKeuangan = {
      ...item,
      statusPinjaman: isNowLunas ? 'Lunas' : 'Belum Lunas',
      tglLunasPinjaman: isNowLunas ? today : undefined,
    };
    onUpdateKeuangan(updated);
    showToast(
      isNowLunas
        ? `Pinjaman ${item.pemberiPinjaman || item.ket} (${formatRp(item.nominal)}) berhasil ditandai Lunas!`
        : `Status pinjaman ${item.pemberiPinjaman || item.ket} diubah kembali ke Belum Lunas`,
      isNowLunas ? 'success' : 'info'
    );
  };

  const handleExportFullCSV = () => {
    let csv = `LAPORAN KINERJA PENJUALAN BUNGKUS\nPeriode: ${periode.toUpperCase()}\nTanggal Ekspor: ${getTanggalHariIni()}\n\n`;
    csv += `RINGKASAN KEUANGAN:\n`;
    csv += `Total Omset,${totalOmset}\n`;
    csv += `Total Modal HPP,${totalHPP}\n`;
    csv += `Laba Kotor,${totalLabaKotor}\n`;
    csv += `Total Biaya Pengeluaran Operasional,${totalBiayaOperasional}\n`;
    csv += `Total Biaya Ongkir Barang,${totalOngkir}\n`;
    csv += `Estimasi Laba Bersih,${labaBersihEstimasi}\n`;
    csv += `Total Sisa Kewajiban Pinjaman,${totalKewajibanPinjaman}\n\n`;

    csv += `MENU TERLARIS:\nNama Barang,Bungkus Terjual,Total Omset,Total Untung\n`;
    topProducts.forEach((p) => {
      csv += `"${p.nama}",${p.terjual},${p.omset},${p.untung}\n`;
    });

    if (pinjamanList.length > 0) {
      csv += `\nDAFTAR DANA PINJAMAN:\nPemberi Pinjaman,Tanggal Terima,Jatuh Tempo,Nominal,Status,Keterangan\n`;
      pinjamanList.forEach((p) => {
        csv += `"${p.pemberiPinjaman || '-'}",${p.tgl},"${p.jatuhTempoPinjaman || '-'}",${p.nominal},"${p.statusPinjaman || 'Belum Lunas'}","${p.ket}"\n`;
      });
    }

    const periodeLabel = periode === 'hari_ini' ? 'Hari Ini' : periode === 'bulan_ini' ? 'Bulan Ini' : 'Semua Periode';
    const summaryText =
      `📊 *LAPORAN & REKAPITULASI USAHA*\n` +
      `📅 Periode: ${periodeLabel} (${formatTanggalIndo(getTanggalHariIni())})\n` +
      `💰 Total Omset: *${formatRp(totalOmset)}*\n` +
      `📦 HPP / Modal: ${formatRp(totalHPP)}\n` +
      `📈 Laba Kotor: ${formatRp(totalLabaKotor)}\n` +
      `📉 Beban Operasional: ${formatRp(totalBiayaOperasional)}\n` +
      (totalOngkir > 0 ? `🚚 Biaya Ongkir: ${formatRp(totalOngkir)}\n` : '') +
      `🏆 *Estimasi Laba Bersih: ${formatRp(labaBersihEstimasi)}*\n` +
      (totalKewajibanPinjaman > 0 ? `⚠️ Kewajiban Pinjaman: *${formatRp(totalKewajibanPinjaman)}*` : `✅ Bebas dari kewajiban pinjaman`);

    setExportShareModal({
      isOpen: true,
      title: 'Ekspor & Bagikan Laporan Usaha',
      filename: `laporan_lengkap_bungkus_${getTanggalHariIni()}.csv`,
      csvContent: csv,
      summaryText: summaryText,
      totalRecords: filteredSales.length,
    });
  };

  return (
    <div className="space-y-6">
      {/* FILTER PERIODE & EXPORT */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Laporan & Rekapitulasi Usaha</h2>
            <p className="text-xs text-slate-500">Analisis kinerja laba rugi dan ranking menu terlaris</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {(['hari_ini', 'bulan_ini', 'semua'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriode(p)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition capitalize ${
                  periode === p
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p === 'hari_ini' ? 'Hari Ini' : p === 'bulan_ini' ? 'Bulan Ini' : 'Semua'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportFullCSV}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 text-xs font-bold border border-slate-200 transition flex items-center gap-1.5 shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Ekspor & Share CSV</span>
          </button>
        </div>
      </div>

      {/* REKAP LABA RUGI CARD */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
        <h3 className="font-bold text-slate-900 text-sm mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <span>Rekap Laba Rugi Usaha ({periode === 'hari_ini' ? 'Hari Ini' : periode === 'bulan_ini' ? 'Bulan Ini' : 'Seluruh Riwayat'})</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
            <span className="text-xs font-semibold text-slate-500 block">Total Omset Penjualan</span>
            <span className="text-2xl font-black text-slate-900 block">{formatRp(totalOmset)}</span>
            <span className="text-xs text-slate-500 block">Dari {formatAngka(totalBungkusTerjual)} bungkus terjual</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
            <span className="text-xs font-semibold text-slate-500 block">Biaya Modal Menu (HPP)</span>
            <span className="text-2xl font-black text-amber-700 block">{formatRp(totalHPP)}</span>
            <span className="text-xs text-emerald-700 font-bold block">
              Laba Kotor: +{formatRp(totalLabaKotor)}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2">
            <span className="text-xs font-semibold text-emerald-800 block">Estimasi Laba Bersih</span>
            <span className={`text-2xl font-black block ${labaBersihEstimasi >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              {formatRp(labaBersihEstimasi)}
            </span>
            <span className="text-[11px] text-slate-500 block">
              Setelah dikurangi biaya operasional ({formatRp(totalBiayaOperasional)})
              {totalOngkir > 0 && (
                <span className="text-amber-800 font-semibold block mt-0.5">
                  Termasuk ongkir barang: {formatRp(totalOngkir)}
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* PENGINGAT & KEWAJIBAN DANA PINJAMAN */}
      <div className="bg-white rounded-2xl p-5 border border-purple-200/90 shadow-xs space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-purple-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <HandCoins className="w-5 h-5 text-purple-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Pengingat Dana Pinjaman Modal
                </h3>
                {pinjamanBelumLunas.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
                    <BellRing className="w-3 h-3 text-amber-700" />
                    <span>{pinjamanBelumLunas.length} Pinjaman Aktif</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Pemantauan kewajiban pelunasan hutang modal usaha agar kas warung tetap terkontrol
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {pinjamanLunas.length > 0 && (
              <button
                type="button"
                onClick={() => setShowLunasHistory(!showLunasHistory)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition flex items-center gap-1"
              >
                <span>Riwayat Lunas ({pinjamanLunas.length})</span>
                {showLunasHistory ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Ringkasan Angka Pinjaman */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-900 block">
              Sisa Kewajiban Pinjaman
            </span>
            <span className={`text-xl sm:text-2xl font-black block mt-1 ${
              totalKewajibanPinjaman > 0 ? 'text-purple-900' : 'text-emerald-700'
            }`}>
              {formatRp(totalKewajibanPinjaman)}
            </span>
            <span className="text-[11px] text-purple-700 mt-0.5 block">
              {pinjamanBelumLunas.length > 0
                ? `${pinjamanBelumLunas.length} pinjaman perlu dilunasi`
                : 'Alhamdulillah, tidak ada pinjaman aktif'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Total Pernah Dipinjam
            </span>
            <span className="text-xl sm:text-2xl font-black text-slate-800 block mt-1">
              {formatRp(totalPinjamanPernahDiterima)}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Dari {pinjamanList.length} transaksi pinjaman
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">
              Pinjaman Sudah Dilunasi
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-700 block mt-1">
              {formatRp(totalPinjamanSudahLunas)}
            </span>
            <span className="text-[11px] text-emerald-700 mt-0.5 block">
              {pinjamanLunas.length} pinjaman selesai
            </span>
          </div>
        </div>

        {/* Peringatan Jatuh Tempo (Alert Box) */}
        {pinjamanMendekatAtauLewat.length > 0 && (
          <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-sm text-amber-950">
                Peringatan Batas Waktu Pengembalian Pinjaman!
              </p>
              <p className="mt-0.5">
                Terdapat <b>{pinjamanMendekatAtauLewat.length} pinjaman</b> yang telah melewati atau mendekati batas jatuh tempo pengembalian (kurang dari 7 hari). Harap sisihkan kas warung untuk melunasi kewajiban tersebut.
              </p>
            </div>
          </div>
        )}

        {/* Daftar Pinjaman Belum Lunas */}
        {pinjamanList.length === 0 ? (
          <div className="py-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <HandCoins className="w-8 h-8 mx-auto stroke-1 text-slate-300 mb-1" />
            <p className="font-semibold text-slate-700 text-xs">Belum ada catatan dana pinjaman</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Anda dapat mencatat pinjaman modal usaha di menu <b>Pembukuan Kas</b> (pilih <b>Uang Masuk &gt; Dana Pinjaman</b>).
            </p>
          </div>
        ) : pinjamanBelumLunas.length === 0 ? (
          <div className="py-4 px-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center flex items-center justify-center gap-2 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-bold">
              Semua dana pinjaman telah berhasil dilunasi penuh! Tidak ada kewajiban tertunggak.
            </span>
          </div>
        ) : (
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Daftar Pinjaman Aktif (Wajib Dikembalikan):
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pinjamanBelumLunas.map((pinjam) => {
                let badgeTempo = null;
                let isLewat = false;
                if (pinjam.jatuhTempoPinjaman) {
                  const diffTime = new Date(pinjam.jatuhTempoPinjaman).getTime() - new Date(today).getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  if (diffDays < 0) {
                    isLewat = true;
                    badgeTempo = (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-rose-600" />
                        <span>Lewat Tempo {Math.abs(diffDays)} Hari</span>
                      </span>
                    );
                  } else if (diffDays === 0) {
                    badgeTempo = (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-700" />
                        <span>Jatuh Tempo Hari Ini!</span>
                      </span>
                    );
                  } else if (diffDays <= 7) {
                    badgeTempo = (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-700" />
                        <span>Sisa {diffDays} Hari Lagi</span>
                      </span>
                    );
                  } else {
                    badgeTempo = (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                        Tempo: {formatTanggalIndo(pinjam.jatuhTempoPinjaman)}
                      </span>
                    );
                  }
                }

                return (
                  <div
                    key={pinjam.id}
                    className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                      isLewat
                        ? 'bg-rose-50/50 border-rose-300 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-purple-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-slate-900 text-sm">
                              {pinjam.pemberiPinjaman || 'Pemberi Pinjaman'}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                              🤝 Pinjaman
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 block mt-0.5">
                            Diterima: {formatTanggalIndo(pinjam.tgl)} ({pinjam.metode === 'Cash' ? '💵 Tunai' : '📱 QRIS'})
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-base sm:text-lg font-black text-rose-600 block">
                            {formatRp(pinjam.nominal)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between flex-wrap gap-2 text-xs py-1.5 border-t border-slate-100">
                        <span className="text-slate-600 text-[11px] italic">
                          "{pinjam.ket}"
                        </span>
                        {badgeTempo}
                      </div>
                    </div>

                    <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-amber-800">
                        Status: ⏳ Belum Lunas
                      </span>
                      {onUpdateKeuangan && (
                        <button
                          type="button"
                          onClick={() => handleToggleStatusPinjaman(pinjam)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition active:scale-95 flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Tandai Sudah Lunas</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Riwayat Pinjaman yang Sudah Dilunasi (Collapsible) */}
        {showLunasHistory && pinjamanLunas.length > 0 && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Riwayat Pinjaman yang Telah Dilunasi ({pinjamanLunas.length})</span>
            </h4>
            <div className="divide-y divide-slate-200">
              {pinjamanLunas.map((pinjam) => (
                <div key={pinjam.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">
                        {pinjam.pemberiPinjaman || 'Pinjaman'}
                      </span>
                      <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        ✅ Lunas
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 block">
                      Diterima: {formatTanggalIndo(pinjam.tgl)} • Dilunasi: {pinjam.tglLunasPinjaman ? formatTanggalIndo(pinjam.tglLunasPinjaman) : 'Selesai'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-slate-700">{formatRp(pinjam.nominal)}</span>
                    {onUpdateKeuangan && (
                      <button
                        type="button"
                        onClick={() => handleToggleStatusPinjaman(pinjam)}
                        className="text-[11px] text-slate-400 hover:text-amber-700 underline"
                        title="Ubah kembali ke Belum Lunas jika keliru"
                      >
                        Batal Lunas
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* TOP MENU & PAYMENT METHOD ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* TOP SELLING PRODUCTS */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <h3 className="font-bold text-slate-900 text-sm mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Menu Bungkus Terlaris</span>
            </div>
            <span className="text-xs text-slate-400 font-normal">Urut berdasarkan jumlah bungkus</span>
          </h3>

          {topProducts.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">Belum ada data penjualan pada periode ini</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, idx) => {
                const maxTerjual = topProducts[0]?.terjual || 1;
                const percentage = Math.round((p.terjual / maxTerjual) * 100);
                return (
                  <div key={p.nama} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[11px] ${
                            idx === 0
                              ? 'bg-amber-400 text-amber-950'
                              : idx === 1
                              ? 'bg-slate-300 text-slate-800'
                              : idx === 2
                              ? 'bg-amber-700 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span className="font-bold text-slate-900">{p.nama}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500">{formatRp(p.omset)}</span>
                        <span className="font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                          {p.terjual} bks
                        </span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* PAYMENT METHODS SHARE */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-blue-600" />
              <span>Metode Pembayaran</span>
            </h3>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💵</span>
                  <div>
                    <span className="font-bold text-slate-900 text-xs block">Tunai (Cash)</span>
                    <span className="text-[10px] text-slate-500">
                      {totalOmset > 0 ? Math.round((metodeStats.Tunai / totalOmset) * 100) : 0}% omset
                    </span>
                  </div>
                </div>
                <span className="font-black text-xs text-emerald-800">{formatRp(metodeStats.Tunai)}</span>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📱</span>
                  <div>
                    <span className="font-bold text-slate-900 text-xs block">QRIS / Bank</span>
                    <span className="text-[10px] text-slate-500">
                      {totalOmset > 0 ? Math.round((metodeStats.QR / totalOmset) * 100) : 0}% omset
                    </span>
                  </div>
                </div>
                <span className="font-black text-xs text-blue-800">{formatRp(metodeStats.QR)}</span>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📝</span>
                  <div>
                    <span className="font-bold text-slate-900 text-xs block">Cashbon (Piutang)</span>
                    <span className="text-[10px] text-slate-500">
                      {totalOmset > 0 ? Math.round((metodeStats.Cashbon / totalOmset) * 100) : 0}% omset
                    </span>
                  </div>
                </div>
                <span className="font-black text-xs text-amber-800">{formatRp(metodeStats.Cashbon)}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 text-center">
            <span className="text-[11px] text-slate-400">
              💡 Saran: Perbanyak penerimaan QRIS untuk kemudahan rekap otomatis.
            </span>
          </div>
        </div>
      </div>

      {/* MODAL EKSPOR & SHARE CSV */}
      <ModalExportShareCSV
        isOpen={exportShareModal.isOpen}
        onClose={() => setExportShareModal((prev) => ({ ...prev, isOpen: false }))}
        title={exportShareModal.title}
        filename={exportShareModal.filename}
        csvContent={exportShareModal.csvContent}
        summaryText={exportShareModal.summaryText}
        totalRecords={exportShareModal.totalRecords}
        showToast={showToast}
      />
    </div>
  );
};
