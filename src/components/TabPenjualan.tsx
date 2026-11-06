import React, { useState } from 'react';
import { 
  Barang, 
  Penjualan, 
  TransaksiKeuangan, 
  MetodePembayaran 
} from '../types.ts';
import { 
  formatRp, 
  formatAngka, 
  getTanggalHariIni, 
  getWaktuSekarang, 
  generateId, 
  downloadCSV, 
  formatTanggalIndo,
  hitungSudahDibayar,
  hitungSisaHutang
} from '../utils/format.ts';
import { 
  Plus, 
  Search, 
  ShoppingBag, 
  FileSpreadsheet, 
  Printer, 
  Trash2, 
  AlertCircle, 
  Check, 
  TrendingUp, 
  Package, 
  Clock, 
  CreditCard, 
  User, 
  RotateCcw,
  Share2,
  Edit3,
  Pencil,
  Banknote,
  QrCode,
  ArrowRightLeft,
  Filter,
  X
} from 'lucide-react';
import { ModalRevisiPembayaran } from './ModalRevisiPembayaran.tsx';
import { ModalExportShareCSV } from './ModalExportShareCSV.tsx';

interface TabPenjualanProps {
  barangList: Barang[];
  penjualanList: Penjualan[];
  onTambahPenjualan: (penjualan: Penjualan, kurangiStok: boolean) => void;
  onUpdatePenjualan?: (penjualan: Penjualan) => void;
  onHapusPenjualan: (id: string) => void;
  onOpenStruk: (penjualan: Penjualan) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onConfirmHapus: (title: string, message: string, onConfirm: () => void) => void;
}

export const TabPenjualan: React.FC<TabPenjualanProps> = ({
  barangList,
  penjualanList,
  onTambahPenjualan,
  onUpdatePenjualan,
  onHapusPenjualan,
  onOpenStruk,
  showToast,
  onConfirmHapus,
}) => {
  // Form State
  const [tgl, setTgl] = useState<string>(getTanggalHariIni());
  const [namaPembeli, setNamaPembeli] = useState<string>('');
  const [isReseller, setIsReseller] = useState<boolean>(false);
  const [selectedBarangId, setSelectedBarangId] = useState<string>(
    barangList.length > 0 ? barangList[0].id : ''
  );
  const [jumlah, setJumlah] = useState<number>(1);
  const [metode, setMetode] = useState<MetodePembayaran>('Tunai');
  const [catatan, setCatatan] = useState<string>('');
  const [uangDiterima, setUangDiterima] = useState<number | ''>('');

  // Filter & Search State
  const [search, setSearch] = useState<string>('');
  const [filterMetode, setFilterMetode] = useState<string>('semua');
  const [filterKasbonSub, setFilterKasbonSub] = useState<string>('semua');
  const [filterWaktu, setFilterWaktu] = useState<'hari_ini' | 'semua'>('hari_ini');
  const [selectedSaleForRevisi, setSelectedSaleForRevisi] = useState<Penjualan | null>(null);
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

  const selectedBarang = barangList.find((b) => b.id === selectedBarangId) || barangList[0];
  const hargaSatuanAktif = selectedBarang
    ? isReseller && selectedBarang.hargaReseller
      ? selectedBarang.hargaReseller
      : selectedBarang.jual
    : 0;
  const subtotal = hargaSatuanAktif * jumlah;
  const untungItem = selectedBarang ? (hargaSatuanAktif - selectedBarang.modal) * jumlah : 0;
  const kembalian = typeof uangDiterima === 'number' && uangDiterima >= subtotal ? uangDiterima - subtotal : 0;

  // KPI Calculations
  const today = getTanggalHariIni();
  const todaySales = penjualanList.filter((j) => j.tgl === today);
  const omsetHariIni = todaySales.reduce((sum, j) => sum + j.total, 0);
  const bungkusHariIni = todaySales.reduce((sum, j) => sum + j.jumlah, 0);
  const untungHariIni = todaySales.reduce((sum, j) => sum + j.untung, 0);
  const kasbonHariIni = todaySales
    .filter((j) => j.metode === 'Cashbon' && j.statusKasbon !== 'Lunas')
    .reduce((sum, j) => sum + hitungSisaHutang(j), 0);

  // Quick Customer Chips
  const quickBuyersRegular = ['Umum', 'Pak RT', 'Mbak Fitri', 'Mas Budi', 'Bu Haji', 'Karyawan Ruko'];
  const quickBuyersReseller = ['Reseller Mbak Rina', 'Reseller Pak Doni', 'Reseller Bu Dewi', 'Reseller Mas Andi', 'Toko Barokah', 'Warung Bu Siti'];

  // Handle Submit
  const handleSubmit = (e: React.FormEvent, cetakLangsung = false) => {
    e.preventDefault();
    if (!selectedBarang) {
      showToast('Pilih barang terlebih dahulu!', 'error');
      return;
    }
    if (jumlah <= 0) {
      showToast('Jumlah bungkus minimal 1!', 'error');
      return;
    }
    if (selectedBarang.stok < jumlah) {
      showToast(`Stok tidak cukup! Sisa stok ${selectedBarang.nama} hanya ${selectedBarang.stok} bungkus.`, 'error');
      return;
    }

    const defaultNama = isReseller ? 'Reseller Umum' : 'Umum';
    const newSale: Penjualan = {
      id: generateId('jual'),
      tgl: tgl || getTanggalHariIni(),
      waktu: getWaktuSekarang(),
      nama: namaPembeli.trim() || defaultNama,
      isReseller: isReseller,
      tipeHarga: isReseller ? 'Reseller' : 'Normal',
      barangId: selectedBarang.id,
      barang: selectedBarang.nama,
      jumlah: jumlah,
      hargaSatuan: hargaSatuanAktif,
      modalSatuan: selectedBarang.modal,
      metode: metode,
      total: subtotal,
      untung: untungItem,
      statusKasbon: metode === 'Cashbon' ? 'Belum Lunas' : 'Lunas',
      bayarTunai: metode === 'Tunai' && typeof uangDiterima === 'number' ? uangDiterima : subtotal,
      kembalian: metode === 'Tunai' ? kembalian : 0,
      catatan: catatan.trim(),
    };

    onTambahPenjualan(newSale, true);
    showToast(
      `Penjualan ${isReseller ? 'Reseller' : ''} berhasil dicatat! Total ${formatRp(subtotal)}`,
      'success'
    );

    if (cetakLangsung) {
      onOpenStruk(newSale);
    }

    // Reset some inputs
    setJumlah(1);
    setCatatan('');
    setUangDiterima('');
  };

  // Base list according to time filter for counting method distribution
  const timeFilteredSales = penjualanList.filter((j) => {
    if (filterWaktu === 'hari_ini' && j.tgl !== today) return false;
    return true;
  });

  const countSemua = timeFilteredSales.length;
  const countTunai = timeFilteredSales.filter((j) => j.metode === 'Tunai').length;
  const countQR = timeFilteredSales.filter((j) => j.metode === 'QR').length;
  const countCashbon = timeFilteredSales.filter((j) => j.metode === 'Cashbon').length;
  const countReseller = timeFilteredSales.filter((j) => j.isReseller).length;

  const countKasbonBelumLunas = timeFilteredSales.filter(
    (j) => j.metode === 'Cashbon' && (j.statusKasbon === 'Belum Lunas' || !j.statusKasbon)
  ).length;
  const countKasbonSebagian = timeFilteredSales.filter(
    (j) => j.metode === 'Cashbon' && j.statusKasbon === 'Bayar Sebagian'
  ).length;
  const countKasbonLunas = timeFilteredSales.filter(
    (j) => j.metode === 'Cashbon' && j.statusKasbon === 'Lunas'
  ).length;

  // Filtered List
  const filteredSales = timeFilteredSales.filter((j) => {
    // Filter Metode Pembayaran
    if (filterMetode === 'Tunai' && j.metode !== 'Tunai') return false;
    if (filterMetode === 'QR' && j.metode !== 'QR') return false;
    if (filterMetode === 'Cashbon') {
      if (j.metode !== 'Cashbon') return false;
      if (filterKasbonSub === 'Belum Lunas' && j.statusKasbon !== 'Belum Lunas' && j.statusKasbon !== undefined) return false;
      if (filterKasbonSub === 'Bayar Sebagian' && j.statusKasbon !== 'Bayar Sebagian') return false;
      if (filterKasbonSub === 'Lunas' && j.statusKasbon !== 'Lunas') return false;
    }
    if (filterMetode === 'Reseller' && !j.isReseller) return false;

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchNama = j.nama.toLowerCase().includes(q);
      const matchBarang = j.barang.toLowerCase().includes(q);
      const matchCatatan = (j.catatan || '').toLowerCase().includes(q);
      if (!matchNama && !matchBarang && !matchCatatan) return false;
    }
    return true;
  });

  const totalFilteredNominal = filteredSales.reduce((acc, j) => acc + j.total, 0);

  // Export CSV & Share WhatsApp
  const handleExportCSV = () => {
    if (penjualanList.length === 0) {
      showToast('Belum ada data penjualan untuk diekspor!', 'info');
      return;
    }
    let csv = 'ID,Tanggal,Waktu,Nama Pembeli,Tipe Pembeli,Nama Barang,Jumlah (Bungkus),Harga Satuan,Total (Rp),Untung (Rp),Metode,Status Kasbon,Sudah Dibayar (Rp),Sisa Hutang (Rp),Catatan\n';
    penjualanList.forEach((j) => {
      const sudah = hitungSudahDibayar(j);
      const sisa = hitungSisaHutang(j);
      const tipe = j.isReseller ? 'Reseller' : 'Reguler';
      csv += `"${j.id}","${j.tgl}","${j.waktu}","${j.nama}","${tipe}","${j.barang}",${j.jumlah},${j.hargaSatuan},${j.total},${j.untung},"${j.metode}","${j.statusKasbon || '-'}",${sudah},${sisa},"${j.catatan || ''}"\n`;
    });

    const totalOmset = penjualanList.reduce((acc, j) => acc + j.total, 0);
    const totalBungkus = penjualanList.reduce((acc, j) => acc + j.jumlah, 0);
    const totalUntung = penjualanList.reduce((acc, j) => acc + j.untung, 0);
    const totalReseller = penjualanList.filter((j) => j.isReseller).length;

    const summaryText =
      `📊 *REKAP DATA PENJUALAN*\n` +
      `📅 Tanggal Ekspor: ${formatTanggalIndo(getTanggalHariIni())}\n` +
      `📦 Total Terjual: ${formatAngka(totalBungkus)} bungkus (${penjualanList.length} transaksi)\n` +
      `👥 Transaksi Reseller: ${totalReseller} transaksi\n` +
      `💰 Total Omset: *${formatRp(totalOmset)}*\n` +
      `📈 Estimasi Untung: *${formatRp(totalUntung)}*`;

    setExportShareModal({
      isOpen: true,
      title: 'Ekspor & Bagikan Penjualan',
      filename: `penjualan_bungkus_${getTanggalHariIni()}.csv`,
      csvContent: csv,
      summaryText: summaryText,
      totalRecords: penjualanList.length,
    });
  };

  return (
    <div className="space-y-6">
      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-white shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-100">Omset Hari Ini</span>
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl sm:text-2xl font-black">{formatRp(omsetHariIni)}</p>
            <p className="text-xs text-emerald-100 mt-0.5">{todaySales.length} transaksi hari ini</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 text-white shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-100">Total Terjual</span>
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl sm:text-2xl font-black">{formatAngka(bungkusHariIni)} <span className="text-sm font-medium">bks</span></p>
            <p className="text-xs text-blue-100 mt-0.5">Semua jenis bungkus</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-4 text-white shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-100">Estimasi Untung</span>
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl sm:text-2xl font-black">{formatRp(untungHariIni)}</p>
            <p className="text-xs text-amber-100 mt-0.5">Laba kotor penjualan</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-rose-500 to-red-600 rounded-2xl p-4 text-white shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-100">Kasbon Hari Ini</span>
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Clock className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl sm:text-2xl font-black">{formatRp(kasbonHariIni)}</p>
            <p className="text-xs text-rose-100 mt-0.5">Hutang belum dibayar</p>
          </div>
        </div>
      </div>

      {/* FORM INPUT PENJUALAN */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Catat Penjualan Baru</h2>
            <p className="text-xs text-slate-500">Pilih bungkus menu, jumlah dan metode pembayaran</p>
          </div>
        </div>

        {barangList.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="font-semibold text-amber-800 text-sm">Belum ada barang di daftar stok</p>
            <p className="text-xs text-amber-700 mt-1">Silakan buka tab "Stok" untuk menambahkan barang terlebih dahulu.</p>
          </div>
        ) : (
          <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tanggal */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Tanggal Transaksi
                </label>
                <input
                  type="date"
                  value={tgl}
                  onChange={(e) => setTgl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-slate-50/50"
                  required
                />
              </div>

              {/* Nama Pembeli & Opsi Reseller */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    {isReseller ? 'Nama Reseller' : 'Nama Pembeli / Pelanggan'}
                  </label>
                  
                  {/* TOGGLE TIPE PEMBELI (REGULER VS RESELLER) */}
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setIsReseller(false)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition ${
                        !isReseller
                          ? 'bg-white text-slate-800 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Reguler
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsReseller(true)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition flex items-center gap-1 ${
                        isReseller
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-purple-700 hover:text-purple-900 font-semibold'
                      }`}
                    >
                      <span>🏷️ Reseller</span>
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <User className={`w-4 h-4 absolute left-3.5 top-3.5 ${isReseller ? 'text-purple-600' : 'text-slate-400'}`} />
                  <input
                    type="text"
                    value={namaPembeli}
                    onChange={(e) => setNamaPembeli(e.target.value)}
                    placeholder={isReseller ? "Contoh: Reseller Mbak Rina, Toko Barokah" : "Contoh: Mas Budi, Bu Sri (default: Umum)"}
                    className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm transition ${
                      isReseller
                        ? 'border-purple-300 bg-purple-50/20 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium'
                        : 'border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500'
                    }`}
                  />
                </div>

                {/* Quick Buyer Chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[11px] text-slate-400 self-center">
                    {isReseller ? 'Pilihan Reseller:' : 'Cepat:'}
                  </span>
                  {(isReseller ? quickBuyersReseller : quickBuyersRegular).map((qb) => (
                    <button
                      key={qb}
                      type="button"
                      onClick={() => setNamaPembeli(qb)}
                      className={`text-xs px-2.5 py-1 rounded-full transition ${
                        isReseller
                          ? 'bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {qb}
                    </button>
                  ))}
                </div>

                {isReseller && (
                  <div className="mt-2 p-2 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-between text-xs text-purple-900 font-medium">
                    <span className="flex items-center gap-1.5">
                      <span>🏷️</span>
                      <span><b>Mode Reseller Aktif:</b> Menggunakan tarif khusus reseller otomatis</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Pilihan Barang */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Pilih Barang Bungkus
                </label>
                {isReseller && (
                  <span className="text-[11px] text-purple-700 font-bold bg-purple-100 px-2 py-0.5 rounded-md">
                    🏷️ Tarif Reseller Digunakan
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {barangList.map((b) => {
                  const isSelected = selectedBarangId === b.id;
                  const isHabis = b.stok <= 0;
                  const isLow = b.stok <= b.minStok && b.stok > 0;
                  const hargaResellerVal = b.hargaReseller || b.jual;
                  const activePrice = isReseller ? hargaResellerVal : b.jual;

                  return (
                    <button
                      key={b.id}
                      type="button"
                      disabled={isHabis}
                      onClick={() => setSelectedBarangId(b.id)}
                      className={`text-left p-3 rounded-xl border transition flex flex-col justify-between ${
                        isSelected
                          ? isReseller
                            ? 'border-purple-600 bg-purple-50/80 ring-2 ring-purple-500/20'
                            : 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/20'
                          : isHabis
                          ? 'border-slate-200 bg-slate-100 opacity-60 cursor-not-allowed'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="font-bold text-sm text-slate-900 leading-tight">
                          {b.nama}
                        </span>
                        {isSelected && (
                          <div
                            className={`w-5 h-5 rounded-full text-white flex items-center justify-center shrink-0 ml-1 ${
                              isReseller ? 'bg-purple-600' : 'bg-emerald-600'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <div>
                          <span
                            className={`font-black text-sm block ${
                              isReseller ? 'text-purple-700' : 'text-emerald-700'
                            }`}
                          >
                            {formatRp(activePrice)}
                          </span>
                          {isReseller ? (
                            <span className="text-[10px] text-slate-400 line-through block">
                              Normal: {formatRp(b.jual)}
                            </span>
                          ) : (
                            b.hargaReseller && b.hargaReseller < b.jual && (
                              <span className="text-[10px] text-purple-600 block">
                                Reseller: {formatRp(b.hargaReseller)}
                              </span>
                            )
                          )}
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold ${
                            isHabis
                              ? 'bg-rose-100 text-rose-700'
                              : isLow
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isHabis ? 'Habis' : `Stok: ${b.stok}`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Jumlah & Metode */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Jumlah Bungkus */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Jumlah (Bungkus)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setJumlah((prev) => Math.max(1, prev - 1))}
                    className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-lg font-bold flex items-center justify-center transition"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={selectedBarang ? selectedBarang.stok : 999}
                    value={jumlah}
                    onChange={(e) => setJumlah(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 text-center py-2.5 rounded-xl border border-slate-300 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedBarang && jumlah < selectedBarang.stok) {
                        setJumlah((prev) => prev + 1);
                      } else if (!selectedBarang) {
                        setJumlah((prev) => prev + 1);
                      } else {
                        showToast(`Maksimal stok tersisa ${selectedBarang.stok} bungkus`, 'info');
                      }
                    }}
                    className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-lg font-bold flex items-center justify-center transition"
                  >
                    +
                  </button>
                </div>
                {/* Stepper shortcuts */}
                <div className="flex gap-2 mt-2">
                  {[1, 2, 3, 5, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        if (selectedBarang && num <= selectedBarang.stok) {
                          setJumlah(num);
                        } else if (!selectedBarang) {
                          setJumlah(num);
                        } else {
                          showToast(`Stok hanya ada ${selectedBarang.stok} bungkus`, 'info');
                        }
                      }}
                      className={`flex-1 py-1 text-xs rounded-lg font-medium transition ${
                        jumlah === num
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {num} bks
                    </button>
                  ))}
                </div>
              </div>

              {/* Metode Pembayaran */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Metode Pembayaran
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMetode('Tunai')}
                    className={`py-3 px-2 rounded-xl border text-center font-bold text-xs sm:text-sm transition flex flex-col items-center justify-center gap-1 ${
                      metode === 'Tunai'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="text-base">💵</span>
                    <span>Tunai (Cash)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMetode('QR')}
                    className={`py-3 px-2 rounded-xl border text-center font-bold text-xs sm:text-sm transition flex flex-col items-center justify-center gap-1 ${
                      metode === 'QR'
                        ? 'border-blue-600 bg-blue-50 text-blue-800 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="text-base">📱</span>
                    <span>QRIS / Bank</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMetode('Cashbon')}
                    className={`py-3 px-2 rounded-xl border text-center font-bold text-xs sm:text-sm transition flex flex-col items-center justify-center gap-1 ${
                      metode === 'Cashbon'
                        ? 'border-amber-600 bg-amber-50 text-amber-800 ring-2 ring-amber-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="text-base">📝</span>
                    <span>Cashbon (Hutang)</span>
                  </button>
                </div>
                {metode === 'Cashbon' && (
                  <p className="text-[11px] text-amber-700 mt-2 bg-amber-50 p-2 rounded-lg border border-amber-200">
                    💡 Transaksi Cashbon akan masuk ke <b>Buku Kasbon</b> dan tidak langsung menambah saldo kas sampai dilunasi.
                  </p>
                )}
              </div>
            </div>

            {/* Tunai Change Calculator (If Tunai) */}
            {metode === 'Tunai' && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-700">
                    Hitung Kembalian (Opsional):
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setUangDiterima(subtotal)}
                      className="text-xs px-2.5 py-1 bg-white border border-slate-200 rounded-md font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Uang Pas ({formatRp(subtotal)})
                    </button>
                    {[20000, 50000, 100000].map((nominal) => (
                      <button
                        key={nominal}
                        type="button"
                        onClick={() => setUangDiterima(nominal)}
                        className="text-xs px-2.5 py-1 bg-white border border-slate-200 rounded-md font-medium text-slate-700 hover:bg-slate-100"
                      >
                        {formatRp(nominal)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-[11px] text-slate-500 block mb-1">Uang Diterima dari Pembeli</span>
                    <input
                      type="number"
                      placeholder="Contoh: 50000"
                      value={uangDiterima}
                      onChange={(e) => setUangDiterima(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block mb-1">Kembalian</span>
                    <div className="px-3 py-1.5 bg-emerald-100/70 text-emerald-900 border border-emerald-200 rounded-lg text-sm font-black">
                      {typeof uangDiterima === 'number' && uangDiterima >= subtotal
                        ? formatRp(kembalian)
                        : typeof uangDiterima === 'number' && uangDiterima < subtotal
                        ? 'Uang kurang!'
                        : 'Rp 0'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Catatan Tambahan */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Catatan / Keterangan (Opsional)
              </label>
              <input
                type="text"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Contoh: Sambal dipisah, tanpa bawang goreng, dll"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>

            {/* Total Ringkasan & Submit Buttons */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <span className="text-xs text-slate-500 block">Total Tagihan:</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900">{formatRp(subtotal)}</span>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Untung: +{formatRp(untungItem)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, true)}
                  disabled={!selectedBarang || selectedBarang.stok <= 0}
                  className="flex-1 sm:flex-none px-4 py-3 rounded-xl border border-slate-300 hover:bg-slate-50 font-bold text-slate-700 text-sm transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Printer className="w-4 h-4" />
                  <span>Simpan & Struk</span>
                </button>
                <button
                  type="submit"
                  disabled={!selectedBarang || selectedBarang.stok <= 0}
                  className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Penjualan</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* RIWAYAT PENJUALAN CARD */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Riwayat Penjualan</h2>
            <p className="text-xs text-slate-500">
              Menampilkan {filteredSales.length} dari total {penjualanList.length} transaksi
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
        <div className="space-y-3 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari pembeli, menu, catatan..."
                className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setFilterWaktu('hari_ini')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                  filterWaktu === 'hari_ini'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hari Ini ({todaySales.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterWaktu('semua')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                  filterWaktu === 'semua'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua Waktu ({penjualanList.length})
              </button>
            </div>
          </div>

          {/* Mode Filter Metode Pembayaran (Pills / Buttons Bar) */}
          <div className="bg-slate-50/80 p-2.5 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2 px-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Filter className="w-3.5 h-3.5 text-emerald-600" />
                <span>Mode Filter Sesuai Metode Pembayaran:</span>
              </div>
              {(filterMetode !== 'semua' || filterKasbonSub !== 'semua') && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterMetode('semua');
                    setFilterKasbonSub('semua');
                  }}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 transition"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Filter Metode</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {/* Mode: Semua */}
              <button
                type="button"
                onClick={() => {
                  setFilterMetode('semua');
                  setFilterKasbonSub('semua');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                  filterMetode === 'semua'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <span>Semua Metode</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  filterMetode === 'semua' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {countSemua}
                </span>
              </button>

              {/* Mode: Tunai */}
              <button
                type="button"
                onClick={() => setFilterMetode('Tunai')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                  filterMetode === 'Tunai'
                    ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-500/20'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/70'
                }`}
              >
                <Banknote className="w-3.5 h-3.5" />
                <span>💵 Tunai</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  filterMetode === 'Tunai' ? 'bg-white/20 text-white' : 'bg-emerald-200/80 text-emerald-900'
                }`}>
                  {countTunai}
                </span>
              </button>

              {/* Mode: QRIS */}
              <button
                type="button"
                onClick={() => setFilterMetode('QR')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                  filterMetode === 'QR'
                    ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-500/20'
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200/70'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>📱 QRIS</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  filterMetode === 'QR' ? 'bg-white/20 text-white' : 'bg-blue-200/80 text-blue-900'
                }`}>
                  {countQR}
                </span>
              </button>

              {/* Mode: Cashbon */}
              <button
                type="button"
                onClick={() => setFilterMetode('Cashbon')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                  filterMetode === 'Cashbon'
                    ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-500/20'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/70'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>⏳ Cashbon</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  filterMetode === 'Cashbon' ? 'bg-white/20 text-white' : 'bg-amber-200/80 text-amber-900'
                }`}>
                  {countCashbon}
                </span>
              </button>

              {/* Mode: Reseller */}
              <button
                type="button"
                onClick={() => setFilterMetode(filterMetode === 'Reseller' ? 'semua' : 'Reseller')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                  filterMetode === 'Reseller'
                    ? 'bg-purple-600 text-white shadow-xs ring-2 ring-purple-500/20'
                    : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200/70'
                }`}
              >
                <span>🏷️ Reseller</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  filterMetode === 'Reseller' ? 'bg-white/20 text-white' : 'bg-purple-200/80 text-purple-900'
                }`}>
                  {countReseller}
                </span>
              </button>
            </div>

            {/* Sub-Filter status kasbon jika mode Cashbon aktif */}
            {filterMetode === 'Cashbon' && (
              <div className="flex items-center gap-1.5 pt-2 border-t border-amber-200/70 text-xs overflow-x-auto">
                <span className="text-[11px] font-bold text-amber-900 shrink-0">Status Hutang:</span>
                <button
                  type="button"
                  onClick={() => setFilterKasbonSub('semua')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 ${
                    filterKasbonSub === 'semua'
                      ? 'bg-amber-700 text-white'
                      : 'bg-white text-slate-700 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  Semua ({countCashbon})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterKasbonSub('Belum Lunas')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 ${
                    filterKasbonSub === 'Belum Lunas'
                      ? 'bg-rose-600 text-white'
                      : 'bg-white text-rose-800 hover:bg-rose-50 border border-rose-200'
                  }`}
                >
                  ⏳ Belum Lunas ({countKasbonBelumLunas})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterKasbonSub('Bayar Sebagian')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 ${
                    filterKasbonSub === 'Bayar Sebagian'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-blue-800 hover:bg-blue-50 border border-blue-200'
                  }`}
                >
                  ⚡ Dicicil ({countKasbonSebagian})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterKasbonSub('Lunas')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 ${
                    filterKasbonSub === 'Lunas'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200'
                  }`}
                >
                  ✅ Lunas ({countKasbonLunas})
                </button>
              </div>
            )}
          </div>

          {/* Quick Summary Bar */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Menampilkan <b>{filteredSales.length}</b> transaksi
              {filterMetode !== 'semua' && (
                <span className="ml-1 text-slate-800 font-semibold">
                  (Mode: {filterMetode === 'QR' ? 'QRIS' : filterMetode})
                </span>
              )}
            </span>
            <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
              Total: {formatRp(totalFilteredNominal)}
            </span>
          </div>
        </div>

        {/* Sales Table / List */}
        {filteredSales.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Package className="w-12 h-12 mx-auto stroke-1 text-slate-300 mb-2" />
            <p className="font-semibold text-slate-600 text-sm">Tidak ada transaksi ditemukan</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {penjualanList.length === 0
                ? 'Belum ada penjualan. Catat penjualan pertama Anda di atas!'
                : 'Coba ubah kata kunci pencarian atau filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-y border-slate-200">
                  <th className="py-3 px-3 sm:px-4">Waktu</th>
                  <th className="py-3 px-3 sm:px-4">Pembeli</th>
                  <th className="py-3 px-3 sm:px-4">Menu Bungkus</th>
                  <th className="py-3 px-3 sm:px-4 text-center">Jml</th>
                  <th className="py-3 px-3 sm:px-4">Metode</th>
                  <th className="py-3 px-3 sm:px-4 text-right">Total</th>
                  <th className="py-3 px-3 sm:px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSales.map((jual) => (
                  <tr key={jual.id} className="hover:bg-slate-50/80 transition group">
                    <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                      <span className="font-bold text-slate-800 block">{formatTanggalIndo(jual.tgl)}</span>
                      <span className="text-[11px] text-slate-400">{jual.waktu || '-'}</span>
                    </td>
                    <td className="py-3 px-3 sm:px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900">{jual.nama}</span>
                        {jual.isReseller && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-black bg-purple-100 text-purple-700 border border-purple-200">
                            🏷️ Reseller
                          </span>
                        )}
                      </div>
                      {jual.catatan && (
                        <span className="text-[11px] text-slate-500 italic block">
                          "{jual.catatan}"
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 sm:px-4 font-medium text-slate-800">
                      <div className="font-semibold text-slate-900">{jual.barang}</div>
                      <div className="text-[11px] text-slate-500">
                        @{formatRp(jual.hargaSatuan)}
                        {jual.isReseller && (
                          <span className="ml-1 text-purple-600 font-bold">(Reseller)</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                      <span className="inline-block bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded-md text-xs">
                        {jual.jumlah} bks
                      </span>
                    </td>
                    <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedSaleForRevisi(jual)}
                        title="Klik untuk ubah/revisi metode pembayaran"
                        className="group/btn text-left hover:opacity-95 transition flex items-center gap-1 cursor-pointer focus:outline-none"
                      >
                        {jual.metode === 'Cashbon' ? (
                          <div className="flex flex-col items-start gap-0.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold group-hover/btn:ring-2 group-hover/btn:ring-amber-400/40 transition ${
                                jual.statusKasbon === 'Lunas'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : jual.statusKasbon === 'Bayar Sebagian'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              <span className="mr-1">
                                {jual.statusKasbon === 'Lunas'
                                  ? '✅'
                                  : jual.statusKasbon === 'Bayar Sebagian'
                                  ? '⚡'
                                  : '⏳'}
                              </span>
                              {jual.statusKasbon === 'Bayar Sebagian'
                                ? 'Dicicil Sebagian'
                                : jual.metode}
                              <Pencil className="w-2.5 h-2.5 ml-1 opacity-50 group-hover/btn:opacity-100 text-amber-800" />
                            </span>
                            {jual.statusKasbon === 'Bayar Sebagian' && (
                              <span className="text-[10px] text-rose-600 font-bold">
                                Sisa: {formatRp(hitungSisaHutang(jual))}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold group-hover/btn:ring-2 group-hover/btn:ring-slate-400/30 transition ${
                              jual.metode === 'Tunai'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            <span className="mr-1">{jual.metode === 'Tunai' ? '💵' : '📱'}</span>
                            {jual.metode}
                            <Pencil className="w-2.5 h-2.5 ml-1 opacity-50 group-hover/btn:opacity-100" />
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-right whitespace-nowrap">
                      <span className="font-black text-slate-900 block">{formatRp(jual.total)}</span>
                      <span className="text-[10px] text-emerald-600 font-bold block">
                        +{formatRp(jual.untung)}
                      </span>
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedSaleForRevisi(jual)}
                          title="Ubah / Revisi Metode Pembayaran"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition"
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenStruk(jual)}
                          title="Cetak / Bagikan Struk"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onConfirmHapus(
                              'Hapus Penjualan?',
                              `Hapus transaksi "${jual.barang}" (${jual.jumlah} bungkus) untuk ${jual.nama}? Stok barang akan otomatis dikembalikan sebanyak ${jual.jumlah} bungkus.`,
                              () => {
                                onHapusPenjualan(jual.id);
                                showToast('Transaksi berhasil dihapus & stok dikembalikan', 'info');
                              }
                            )
                          }
                          title="Hapus Penjualan & Kembalikan Stok"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL REVISI PEMBAYARAN */}
      {selectedSaleForRevisi && (
        <ModalRevisiPembayaran
          sale={selectedSaleForRevisi}
          onClose={() => setSelectedSaleForRevisi(null)}
          onSave={(updated) => {
            if (onUpdatePenjualan) {
              onUpdatePenjualan(updated);
            }
            showToast(`Metode pembayaran untuk ${updated.nama} berhasil diubah ke ${updated.metode}!`, 'success');
            setSelectedSaleForRevisi(null);
          }}
        />
      )}

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
