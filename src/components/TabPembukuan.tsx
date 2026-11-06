import React, { useState } from 'react';
import { TransaksiKeuangan, JenisKeuangan, MetodeKeuangan } from '../types.ts';
import { formatRp, getTanggalHariIni, getWaktuSekarang, generateId, downloadCSV, formatTanggalIndo } from '../utils/format.ts';
import { ModalExportShareCSV } from './ModalExportShareCSV.tsx';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Wallet, 
  QrCode, 
  Plus, 
  Trash2, 
  FileSpreadsheet, 
  Search, 
  DollarSign, 
  Calendar,
  CreditCard,
  Percent,
  Truck,
  HandCoins,
  AlertCircle,
  CalendarClock,
  Building2
} from 'lucide-react';

interface TabPembukuanProps {
  keuanganList: TransaksiKeuangan[];
  onTambahKeuangan: (transaksi: TransaksiKeuangan) => void;
  onUpdateKeuangan?: (transaksi: TransaksiKeuangan) => void;
  onHapusKeuangan: (id: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onConfirmHapus: (title: string, message: string, onConfirm: () => void) => void;
}

export const TabPembukuan: React.FC<TabPembukuanProps> = ({
  keuanganList,
  onTambahKeuangan,
  onUpdateKeuangan,
  onHapusKeuangan,
  showToast,
  onConfirmHapus,
}) => {
  // Form State
  const [tgl, setTgl] = useState<string>(getTanggalHariIni());
  const [jenis, setJenis] = useState<JenisKeuangan>('keluar');
  const [metode, setMetode] = useState<MetodeKeuangan>('Cash');
  const [kategori, setKategori] = useState<string>('Belanja Bahan Baku');
  const [keterangan, setKeterangan] = useState<string>('');
  const [nominal, setNominal] = useState<number | ''>('');
  const [pemberiPinjaman, setPemberiPinjaman] = useState<string>('');
  const [jatuhTempoPinjaman, setJatuhTempoPinjaman] = useState<string>('');
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

  // Filter State
  const [filterJenis, setFilterJenis] = useState<'semua' | 'masuk' | 'keluar'>('semua');
  const [filterMetode, setFilterMetode] = useState<'semua' | 'Cash' | 'QR'>('semua');
  const [search, setSearch] = useState<string>('');

  const kategoriMasukList = [
    'Penjualan Harian',
    'Dana Pinjaman',
    'Modal Awal Usaha',
    'Pelunasan Kasbon',
    'Pemasukan Lainnya',
  ];

  const kategoriKeluarList = [
    'Belanja Bahan Baku',
    'Biaya Ongkir Barang',
    'Kemasan & Kertas Bungkus',
    'Listrik, Air & Gas LPG',
    'Sewa Tempat / Lapak',
    'Gaji / Upah Karyawan',
    'Bensin & Transportasi',
    'Biaya Kebersihan & Retribusi',
    'Pengeluaran Lainnya',
  ];

  // Calculations
  const masukTotal = keuanganList
    .filter((k) => k.jenis === 'masuk')
    .reduce((sum, k) => sum + k.nominal, 0);

  const keluarTotal = keuanganList
    .filter((k) => k.jenis === 'keluar')
    .reduce((sum, k) => sum + k.nominal, 0);

  const cashMasuk = keuanganList
    .filter((k) => k.jenis === 'masuk' && k.metode === 'Cash')
    .reduce((sum, k) => sum + k.nominal, 0);

  const cashKeluar = keuanganList
    .filter((k) => k.jenis === 'keluar' && k.metode === 'Cash')
    .reduce((sum, k) => sum + k.nominal, 0);

  const qrMasuk = keuanganList
    .filter((k) => k.jenis === 'masuk' && k.metode === 'QR')
    .reduce((sum, k) => sum + k.nominal, 0);

  const qrKeluar = keuanganList
    .filter((k) => k.jenis === 'keluar' && k.metode === 'QR')
    .reduce((sum, k) => sum + k.nominal, 0);

  const saldoCash = cashMasuk - cashKeluar;
  const saldoQR = qrMasuk - qrKeluar;
  const saldoTotal = masukTotal - keluarTotal;

  // Handle Form Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nom = Number(nominal);
    if (!nom || nom <= 0) {
      showToast('Nominal harus lebih dari 0!', 'error');
      return;
    }

    let finalKet = keterangan.trim();
    if (!finalKet) {
      if (kategori === 'Dana Pinjaman') {
        finalKet = pemberiPinjaman.trim()
          ? `Dana Pinjaman dari ${pemberiPinjaman.trim()}`
          : 'Pemasukan Dana Pinjaman';
      } else if (kategori === 'Biaya Ongkir Barang') {
        finalKet = 'Biaya Ongkir / Pengiriman Barang';
      } else {
        finalKet = `${jenis === 'masuk' ? 'Pemasukan' : 'Pengeluaran'} ${kategori}`;
      }
    }

    const newTrans: TransaksiKeuangan = {
      id: generateId('keu'),
      tgl: tgl || getTanggalHariIni(),
      waktu: getWaktuSekarang(),
      jenis,
      kategori,
      metode,
      ket: finalKet,
      nominal: nom,
      pemberiPinjaman: kategori === 'Dana Pinjaman' && pemberiPinjaman.trim() ? pemberiPinjaman.trim() : undefined,
      jatuhTempoPinjaman: kategori === 'Dana Pinjaman' && jatuhTempoPinjaman ? jatuhTempoPinjaman : undefined,
      statusPinjaman: kategori === 'Dana Pinjaman' ? 'Belum Lunas' : undefined,
    };

    onTambahKeuangan(newTrans);
    showToast(
      `Berhasil dicatat: ${jenis === 'masuk' ? '+' : '-'}${formatRp(nom)} (${kategori})`,
      'success'
    );

    // Reset
    setKeterangan('');
    setNominal('');
    setPemberiPinjaman('');
    setJatuhTempoPinjaman('');
  };

  // Export CSV & Share WhatsApp
  const handleExportCSV = () => {
    if (keuanganList.length === 0) {
      showToast('Belum ada transaksi pembukuan untuk diekspor!', 'info');
      return;
    }
    let csv = 'ID,Tanggal,Waktu,Jenis,Metode,Kategori,Keterangan,Nominal (Rp)\n';
    keuanganList.forEach((k) => {
      csv += `"${k.id}","${k.tgl}","${k.waktu}","${k.jenis}","${k.metode}","${k.kategori}","${k.ket}",${k.nominal}\n`;
    });

    const totalMasuk = keuanganList
      .filter((k) => k.jenis === 'masuk')
      .reduce((sum, k) => sum + k.nominal, 0);
    const totalKeluar = keuanganList
      .filter((k) => k.jenis === 'keluar')
      .reduce((sum, k) => sum + k.nominal, 0);
    const selisihKas = totalMasuk - totalKeluar;
    const pinjamanCount = keuanganList.filter((k) => k.kategori === 'Dana Pinjaman' || Boolean(k.pemberiPinjaman)).length;

    const summaryText =
      `📑 *BUKU KAS & CATATAN KEUANGAN*\n` +
      `📅 Per Tanggal: ${formatTanggalIndo(getTanggalHariIni())}\n` +
      `📝 Total Catatan: ${keuanganList.length} transaksi\n` +
      `🟢 Total Uang Masuk: *${formatRp(totalMasuk)}*\n` +
      `🔴 Total Uang Keluar: *${formatRp(totalKeluar)}*\n` +
      `💼 Saldo Kas: *${formatRp(selisihKas)}*` +
      (pinjamanCount > 0 ? `\n📌 Tercatat ${pinjamanCount} transaksi Dana Pinjaman` : '');

    setExportShareModal({
      isOpen: true,
      title: 'Ekspor & Bagikan Pembukuan Kas',
      filename: `pembukuan_keuangan_${getTanggalHariIni()}.csv`,
      csvContent: csv,
      summaryText: summaryText,
      totalRecords: keuanganList.length,
    });
  };

  // Filter List
  const filteredList = keuanganList.filter((k) => {
    if (filterJenis !== 'semua' && k.jenis !== filterJenis) return false;
    if (filterMetode !== 'semua' && k.metode !== filterMetode) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        k.ket.toLowerCase().includes(q) ||
        k.kategori.toLowerCase().includes(q) ||
        k.tgl.includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* KPI KEUANGAN CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Masuk */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Uang Masuk</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl sm:text-2xl font-black text-emerald-600">{formatRp(masukTotal)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Penjualan & pendapatan</p>
          </div>
        </div>

        {/* Total Keluar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Uang Keluar</span>
            <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl sm:text-2xl font-black text-rose-600">{formatRp(keluarTotal)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Belanja bahan & biaya</p>
          </div>
        </div>

        {/* Saldo Cash */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Saldo Tunai (Laci)</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl sm:text-2xl font-black text-slate-900">{formatRp(saldoCash)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Fisik kas warung</p>
          </div>
        </div>

        {/* Saldo QR */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Saldo QRIS / Bank</span>
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl sm:text-2xl font-black text-blue-700">{formatRp(saldoQR)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Rekening / e-wallet</p>
          </div>
        </div>
      </div>

      {/* TOTAL SALDO HIGHLIGHT BAR */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-4 sm:p-5 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div>
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
            Total Saldo Bersih Kas (Uang Riil)
          </span>
          <span className="text-2xl sm:text-3xl font-black text-white">{formatRp(saldoTotal)}</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="bg-white/10 px-3.5 py-2 rounded-xl border border-white/10">
            <span className="text-slate-300 block text-[10px]">Tunai:</span>
            <span className="font-bold text-white text-sm">{formatRp(saldoCash)}</span>
          </div>
          <div className="bg-white/10 px-3.5 py-2 rounded-xl border border-white/10">
            <span className="text-slate-300 block text-[10px]">QRIS:</span>
            <span className="font-bold text-white text-sm">{formatRp(saldoQR)}</span>
          </div>
        </div>
      </div>

      {/* FORM TAMBAH TRANSAKSI KEUANGAN */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Catat Transaksi Keuangan</h2>
            <p className="text-xs text-slate-500">Catat belanja bahan baku, operasional, atau pemasukan lain</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Tanggal */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Tanggal
              </label>
              <input
                type="date"
                required
                value={tgl}
                onChange={(e) => setTgl(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Jenis Transaksi */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Jenis Transaksi
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setJenis('masuk');
                    setKategori(kategoriMasukList[0]);
                  }}
                  className={`py-2 px-3 rounded-xl border font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                    jenis === 'masuk'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                  <span>Uang Masuk</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setJenis('keluar');
                    setKategori(kategoriKeluarList[0]);
                  }}
                  className={`py-2 px-3 rounded-xl border font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                    jenis === 'keluar'
                      ? 'border-rose-600 bg-rose-50 text-rose-800 ring-2 ring-rose-500/20'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4 text-rose-600" />
                  <span>Uang Keluar</span>
                </button>
              </div>
            </div>

            {/* Metode Pembayaran */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Metode Kas
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMetode('Cash')}
                  className={`py-2 px-3 rounded-xl border font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                    metode === 'Cash'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <span>💵 Cash Tunai</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMetode('QR')}
                  className={`py-2 px-3 rounded-xl border font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                    metode === 'QR'
                      ? 'border-blue-600 bg-blue-50 text-blue-800 ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <span>📱 QRIS / Bank</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Kategori */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Kategori {jenis === 'masuk' ? 'Pemasukan' : 'Pengeluaran'}
              </label>
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                {(jenis === 'masuk' ? kategoriMasukList : kategoriKeluarList).map((kat) => (
                  <option key={kat} value={kat}>
                    {kat}
                  </option>
                ))}
              </select>
            </div>

            {/* Nominal */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Nominal (Rp)
              </label>
              <input
                type="number"
                min="1"
                required
                placeholder="Contoh: 50000"
                value={nominal}
                onChange={(e) => setNominal(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {/* Quick Nominal Chips */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[10000, 20000, 50000, 100000, 200000, 500000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setNominal(val)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
                  >
                    +{formatRp(val)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* BIDANG KHUSUS DANA PINJAMAN */}
          {jenis === 'masuk' && kategori === 'Dana Pinjaman' && (
            <div className="p-4 bg-purple-50/70 rounded-2xl border border-purple-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-900">
                <HandCoins className="w-4 h-4 text-purple-700" />
                <span>Rincian & Informasi Dana Pinjaman:</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-purple-950 mb-1">
                    Pemberi Pinjaman / Sumber Dana
                  </label>
                  <input
                    type="text"
                    value={pemberiPinjaman}
                    onChange={(e) => setPemberiPinjaman(e.target.value)}
                    placeholder="Contoh: Bank BRI, Koperasi, Mas Budi, Keluarga"
                    className="w-full px-3.5 py-2 rounded-xl border border-purple-200 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['Bank', 'Koperasi', 'Keluarga', 'Teman', 'Rekan Bisnis'].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setPemberiPinjaman(q)}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-purple-200 text-purple-800 hover:bg-purple-100 transition"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-purple-950 mb-1">
                    Tanggal Jatuh Tempo Pengembalian (Opsional)
                  </label>
                  <input
                    type="date"
                    value={jatuhTempoPinjaman}
                    onChange={(e) => setJatuhTempoPinjaman(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-purple-200 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-[10px] text-purple-700 mt-1">
                    Batas waktu pelunasan untuk pengingat di Laporan Keuangan
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 pt-1 text-[11px] text-purple-800">
                <AlertCircle className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                <span>
                  Dana pinjaman akan menambah saldo kas riil, dan daftar kewajiban pengembaliannya otomatis dipantau di tab <b>Laporan &gt; Pengingat Dana Pinjaman</b>.
                </span>
              </div>
            </div>
          )}

          {/* QUICK CHIP KETIKA BIAYA ONGKIR BARANG */}
          {jenis === 'keluar' && kategori === 'Biaya Ongkir Barang' && (
            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                <Truck className="w-4 h-4 text-amber-700" />
                <span>Contoh Pengeluaran Ongkir:</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {['Ongkir Beras Pasar Induk', 'Ongkir Kemasan Plastik', 'Ongkir Kurir Paket', 'Ongkir Kirim Bahan'].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setKeterangan(item)}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-amber-800 hover:bg-amber-100 font-medium transition"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Keterangan */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Keterangan / Catatan Transaksi
            </label>
            <input
              type="text"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Contoh: Beli beras 1 karung, Beli plastik bungkus, Bayar token listrik"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-white text-sm shadow-sm transition active:scale-95 flex items-center justify-center gap-1.5 ${
                jenis === 'masuk'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Simpan {jenis === 'masuk' ? 'Pemasukan' : 'Pengeluaran'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* RIWAYAT PEMBUKUAN */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Riwayat Catatan Kas</h2>
            <p className="text-xs text-slate-500">
              Menampilkan {filteredList.length} dari total {keuanganList.length} catatan keuangan
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 text-xs font-bold border border-slate-200 transition shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Ekspor & Share CSV</span>
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari keterangan, kategori..."
              className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            {(['semua', 'masuk', 'keluar'] as const).map((j) => (
              <button
                key={j}
                type="button"
                onClick={() => setFilterJenis(j)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition capitalize ${
                  filterJenis === j
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {j === 'semua' ? 'Semua' : j === 'masuk' ? 'Uang Masuk' : 'Uang Keluar'}
              </button>
            ))}
          </div>

          <div>
            <select
              value={filterMetode}
              onChange={(e) => setFilterMetode(e.target.value as any)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              <option value="semua">Semua Kas (Cash & QR)</option>
              <option value="Cash">Hanya Cash Tunai</option>
              <option value="QR">Hanya QRIS / Bank</option>
            </select>
          </div>
        </div>

        {/* List Table */}
        {filteredList.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Wallet className="w-12 h-12 mx-auto stroke-1 text-slate-300 mb-2" />
            <p className="font-semibold text-slate-600 text-sm">Tidak ada catatan transaksi</p>
            <p className="text-xs text-slate-400 mt-0.5">Catat transaksi keuangan di formulir atas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-y border-slate-200">
                  <th className="py-3 px-3 sm:px-4">Tanggal & Waktu</th>
                  <th className="py-3 px-3 sm:px-4">Jenis</th>
                  <th className="py-3 px-3 sm:px-4">Metode</th>
                  <th className="py-3 px-3 sm:px-4">Kategori & Keterangan</th>
                  <th className="py-3 px-3 sm:px-4 text-right">Nominal</th>
                  <th className="py-3 px-3 sm:px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                      <span className="font-bold text-slate-800 block">{formatTanggalIndo(item.tgl)}</span>
                      <span className="text-[11px] text-slate-400">{item.waktu || '-'}</span>
                    </td>
                    <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          item.jenis === 'masuk'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {item.jenis === 'masuk' ? (
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        )}
                        {item.jenis === 'masuk' ? 'Masuk' : 'Keluar'}
                      </span>
                    </td>
                    <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-xs font-semibold ${
                          item.metode === 'Cash'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {item.metode === 'Cash' ? '💵 Cash' : '📱 QRIS'}
                      </span>
                    </td>
                    <td className="py-3 px-3 sm:px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900">{item.kategori}</span>
                        {item.kategori === 'Dana Pinjaman' && (
                          <>
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                              🤝 Pinjaman
                            </span>
                            {item.statusPinjaman === 'Lunas' ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                ✅ Lunas
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                                ⏳ Belum Lunas
                              </span>
                            )}
                          </>
                        )}
                        {item.kategori === 'Biaya Ongkir Barang' && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            🚚 Ongkir
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-600 block mt-0.5">{item.ket}</span>
                      {item.pemberiPinjaman && (
                        <span className="text-[11px] text-purple-700 block font-medium">
                          Pemberi Pinjaman: <b>{item.pemberiPinjaman}</b>
                        </span>
                      )}
                      {item.jatuhTempoPinjaman && (
                        <span className="text-[10px] text-slate-500 block">
                          Jatuh tempo: {formatTanggalIndo(item.jatuhTempoPinjaman)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-right whitespace-nowrap">
                      <span
                        className={`font-black text-sm block ${
                          item.jenis === 'masuk' ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {item.jenis === 'masuk' ? '+' : '-'}
                        {formatRp(item.nominal)}
                      </span>
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() =>
                          onConfirmHapus(
                            'Hapus Catatan Pembukuan?',
                            `Hapus transaksi "${item.ket}" (${formatRp(item.nominal)})?`,
                            () => {
                              onHapusKeuangan(item.id);
                              showToast('Catatan pembukuan berhasil dihapus', 'info');
                            }
                          )
                        }
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Hapus Catatan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
