import React, { useState } from 'react';
import { Barang, Penjualan, TransaksiKeuangan } from '../types.ts';
import { formatRp, formatAngka, generateId, downloadCSV, getTanggalHariIni, getWaktuSekarang, formatTanggalIndo } from '../utils/format.ts';
import { ModalExportShareCSV } from './ModalExportShareCSV.tsx';
import { 
  Package, 
  Plus, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  FileSpreadsheet, 
  RotateCw, 
  ArrowUpRight, 
  Check, 
  X, 
  Search,
  DollarSign
} from 'lucide-react';

interface TabStokProps {
  barangList: Barang[];
  penjualanList: Penjualan[];
  onTambahBarang: (barang: Barang) => void;
  onUpdateBarang: (barang: Barang) => void;
  onHapusBarang: (id: string) => void;
  onTambahKeuangan?: (transaksi: TransaksiKeuangan) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onConfirmHapus: (title: string, message: string, onConfirm: () => void) => void;
}

export const TabStok: React.FC<TabStokProps> = ({
  barangList,
  penjualanList,
  onTambahBarang,
  onUpdateBarang,
  onHapusBarang,
  onTambahKeuangan,
  showToast,
  onConfirmHapus,
}) => {
  // Search & Filter
  const [search, setSearch] = useState('');
  const [kategoriFilter, setKategoriFilter] = useState('Semua');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBarang, setEditingBarang] = useState<Barang | null>(null);
  const [restockBarang, setRestockBarang] = useState<Barang | null>(null);
  const [tambahStokBungkus, setTambahStokBungkus] = useState<number>(10);
  const [catatKeuanganRestok, setCatatKeuanganRestok] = useState<boolean>(true);
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

  // New item form
  const [namaBarang, setNamaBarang] = useState('');
  const [kategori, setKategori] = useState('Makanan');
  const [hargaJual, setHargaJual] = useState<number | ''>('');
  const [hargaReseller, setHargaReseller] = useState<number | ''>('');
  const [hargaModal, setHargaModal] = useState<number | ''>('');
  const [stokAwal, setStokAwal] = useState<number | ''>('');
  const [minStok, setMinStok] = useState<number>(5);

  const categories = ['Semua', 'Makanan', 'Minuman', 'Snack', 'Lainnya'];

  // Calculations
  const totalMacam = barangList.length;
  const totalBungkus = barangList.reduce((sum, b) => sum + b.stok, 0);
  const totalNilaiModal = barangList.reduce((sum, b) => sum + (b.stok * b.modal), 0);
  const totalNilaiJual = barangList.reduce((sum, b) => sum + (b.stok * b.jual), 0);
  const barangMenipis = barangList.filter((b) => b.stok <= b.minStok);

  // Handle Add Item
  const handleSimpanBarangBaru = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaBarang.trim()) {
      showToast('Nama barang wajib diisi!', 'error');
      return;
    }
    const jual = Number(hargaJual) || 0;
    const reseller = Number(hargaReseller) > 0 ? Number(hargaReseller) : jual;
    const modal = Number(hargaModal) || 0;
    const stok = Number(stokAwal) || 0;

    if (jual <= 0) {
      showToast('Harga jual harus lebih dari 0!', 'error');
      return;
    }

    const newBarang: Barang = {
      id: generateId('brg'),
      nama: namaBarang.trim(),
      kategori,
      jual,
      hargaReseller: reseller,
      modal,
      stok,
      minStok: Number(minStok) || 5,
    };

    onTambahBarang(newBarang);
    showToast(`Barang "${newBarang.nama}" berhasil ditambahkan!`, 'success');

    // Reset Form
    setNamaBarang('');
    setHargaJual('');
    setHargaReseller('');
    setHargaModal('');
    setStokAwal('');
    setMinStok(5);
    setShowAddModal(false);
  };

  // Handle Update Item
  const handleSimpanEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBarang) return;
    if (!editingBarang.nama.trim()) {
      showToast('Nama barang tidak boleh kosong!', 'error');
      return;
    }

    onUpdateBarang(editingBarang);
    showToast(`Data "${editingBarang.nama}" berhasil diperbarui!`, 'success');
    setEditingBarang(null);
  };

  // Handle Quick Restock
  const handleExecuteRestock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockBarang) return;
    const qty = Number(tambahStokBungkus);
    if (qty <= 0) {
      showToast('Jumlah restok minimal 1 bungkus!', 'error');
      return;
    }

    const updated: Barang = {
      ...restockBarang,
      stok: restockBarang.stok + qty,
    };
    onUpdateBarang(updated);

    // If checked, log an expense entry
    if (catatKeuanganRestok && onTambahKeuangan && restockBarang.modal > 0) {
      const totalBelanja = qty * restockBarang.modal;
      onTambahKeuangan({
        id: generateId('keu'),
        tgl: getTanggalHariIni(),
        waktu: getWaktuSekarang(),
        jenis: 'keluar',
        kategori: 'Belanja Bahan Baku',
        metode: 'Cash',
        ket: `Restok ${restockBarang.nama} (${qty} bks @${formatRp(restockBarang.modal)})`,
        nominal: totalBelanja,
      });
    }

    showToast(`Stok ${restockBarang.nama} ditambah +${qty} bungkus!`, 'success');
    setRestockBarang(null);
    setTambahStokBungkus(10);
  };

  // Export CSV & Share WhatsApp
  const handleExportCSV = () => {
    if (barangList.length === 0) {
      showToast('Belum ada data barang!', 'info');
      return;
    }
    let csv = 'ID,Nama Barang,Kategori,Harga Normal (Rp),Harga Reseller (Rp),Harga Modal (Rp),Margin Untung (Rp),Total Terjual (Bungkus),Sisa Stok (Bungkus),Total Nilai Modal (Rp)\n';
    barangList.forEach((b) => {
      const terjual = penjualanList
        .filter((j) => j.barangId === b.id || j.barang === b.nama)
        .reduce((sum, j) => sum + j.jumlah, 0);
      const margin = b.jual - b.modal;
      const nilaiModal = b.stok * b.modal;
      const reseller = b.hargaReseller || b.jual;
      csv += `"${b.id}","${b.nama}","${b.kategori}",${b.jual},${reseller},${b.modal},${margin},${terjual},${b.stok},${nilaiModal}\n`;
    });

    const totalMacam = barangList.length;
    const totalBungkus = barangList.reduce((sum, b) => sum + b.stok, 0);
    const totalNilaiModal = barangList.reduce((sum, b) => sum + (b.stok * b.modal), 0);
    const menipisCount = barangList.filter((b) => b.stok <= b.minStok).length;

    const summaryText =
      `📦 *REKAP STOK BARANG & MENU*\n` +
      `📅 Per Tanggal: ${formatTanggalIndo(getTanggalHariIni())}\n` +
      `📋 Total Menu/Varian: ${totalMacam} macam\n` +
      `🍱 Sisa Stok Tersedia: ${formatAngka(totalBungkus)} bungkus\n` +
      `💵 Total Nilai Aset Modal: *${formatRp(totalNilaiModal)}*\n` +
      (menipisCount > 0 ? `⚠️ Perlu Restok: ${menipisCount} barang stok menipis!` : `✅ Semua stok aman terkontrol.`);

    setExportShareModal({
      isOpen: true,
      title: 'Ekspor & Bagikan Stok Barang',
      filename: `stok_barang_bungkus_${getTanggalHariIni()}.csv`,
      csvContent: csv,
      summaryText: summaryText,
      totalRecords: barangList.length,
    });
  };

  // Filtered List
  const filteredBarang = barangList.filter((b) => {
    if (kategoriFilter !== 'Semua' && b.kategori !== kategoriFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return b.nama.toLowerCase().includes(q) || b.kategori.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* KPI METRICS STOK */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Macam Menu</span>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-xl sm:text-2xl font-black text-slate-900">{totalMacam} <span className="text-sm font-semibold text-slate-500">menu</span></p>
            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">Varian</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Stok Siap Jual</span>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-xl sm:text-2xl font-black text-emerald-700">{formatAngka(totalBungkus)} <span className="text-sm font-semibold text-slate-500">bks</span></p>
            <span className="text-xs bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full font-bold">Tersedia</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Nilai Aset Modal</span>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-xl sm:text-2xl font-black text-blue-700">{formatRp(totalNilaiModal)}</p>
            <span className="text-[11px] text-slate-500">HPP</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Stok Menipis</span>
          <div className="mt-2 flex items-baseline justify-between">
            <p className={`text-xl sm:text-2xl font-black ${barangMenipis.length > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {barangMenipis.length} <span className="text-sm font-semibold text-slate-500">item</span>
            </p>
            {barangMenipis.length > 0 ? (
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Perlu Restok
              </span>
            ) : (
              <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                Aman
              </span>
            )}
          </div>
        </div>
      </div>

      {/* HEADER BAR & ACTIONS */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Manajemen Stok & Menu Bungkus</h2>
            <p className="text-xs text-slate-500">Atur harga jual, harga modal, dan pantau persediaan bungkus</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 text-xs font-bold border border-slate-200 transition flex items-center gap-1.5 shadow-2xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Ekspor & Share CSV</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Barang Baru</span>
            </button>
          </div>
        </div>

        {/* Filter & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama barang atau kategori..."
              className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setKategoriFilter(cat)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition ${
                  kategoriFilter === cat
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Table of Products */}
        {filteredBarang.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Package className="w-12 h-12 mx-auto stroke-1 text-slate-300 mb-2" />
            <p className="font-semibold text-slate-600 text-sm">Tidak ada barang ditemukan</p>
            <p className="text-xs text-slate-400 mt-0.5">Silakan tambah barang baru atau sesuaikan filter pencarian.</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-y border-slate-200">
                  <th className="py-3 px-3 sm:px-4">Barang & Kategori</th>
                  <th className="py-3 px-3 sm:px-4">Harga Normal</th>
                  <th className="py-3 px-3 sm:px-4">Harga Reseller</th>
                  <th className="py-3 px-3 sm:px-4">Modal (HPP)</th>
                  <th className="py-3 px-3 sm:px-4">Margin Normal</th>
                  <th className="py-3 px-3 sm:px-4 text-center">Terjual</th>
                  <th className="py-3 px-3 sm:px-4 text-center">Sisa Stok</th>
                  <th className="py-3 px-3 sm:px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBarang.map((b) => {
                  const terjual = penjualanList
                    .filter((j) => j.barangId === b.id || j.barang === b.nama)
                    .reduce((sum, j) => sum + j.jumlah, 0);
                  const marginRp = b.jual - b.modal;
                  const marginPersen = b.modal > 0 ? Math.round((marginRp / b.modal) * 100) : 0;
                  const hargaResellerVal = b.hargaReseller || b.jual;
                  const marginResellerRp = hargaResellerVal - b.modal;
                  const isHabis = b.stok <= 0;
                  const isLow = b.stok <= b.minStok && b.stok > 0;

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 sm:px-4">
                        <span className="font-bold text-slate-900 block text-sm">{b.nama}</span>
                        <span className="inline-block mt-0.5 text-[10px] font-semibold uppercase px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                          {b.kategori}
                        </span>
                      </td>
                      <td className="py-3 px-3 sm:px-4 font-extrabold text-slate-900 whitespace-nowrap">
                        {formatRp(b.jual)}
                      </td>
                      <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                        <span className="font-black text-purple-700 block">{formatRp(hargaResellerVal)}</span>
                        {b.hargaReseller && b.hargaReseller < b.jual && (
                          <span className="text-[10px] text-purple-600 font-semibold block">
                            Hemat {formatRp(b.jual - b.hargaReseller)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-slate-500 whitespace-nowrap">
                        {formatRp(b.modal)}
                      </td>
                      <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                        <span className="text-emerald-700 font-bold block">+{formatRp(marginRp)}</span>
                        <span className="text-[10px] text-emerald-600 font-semibold">{marginPersen}% margin</span>
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                        <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-md text-xs">
                          {terjual} bks
                        </span>
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center">
                          <span
                            className={`px-2.5 py-1 rounded-full font-black text-xs ${
                              isHabis
                                ? 'bg-rose-100 text-rose-700'
                                : isLow
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {b.stok} bungkus
                          </span>
                          {isLow && (
                            <span className="text-[10px] text-amber-700 font-bold mt-0.5">
                              Min: {b.minStok} bks
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setRestockBarang(b);
                              setTambahStokBungkus(10);
                            }}
                            className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs flex items-center gap-1 transition"
                            title="Tambah Stok Bungkus"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Restok</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingBarang({ ...b })}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                            title="Edit Barang"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onConfirmHapus(
                                'Hapus Menu Barang?',
                                `Apakah Anda yakin ingin menghapus "${b.nama}" dari daftar stok? Riwayat penjualan sebelumnya tetap tersimpan.`,
                                () => {
                                  onHapusBarang(b.id);
                                  showToast(`Barang "${b.nama}" telah dihapus`, 'info');
                                }
                              )
                            }
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Hapus Barang"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL TAMBAH BARANG */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Tambah Menu Bungkus Baru</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSimpanBarangBaru} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Nama Barang / Menu
                </label>
                <input
                  type="text"
                  required
                  value={namaBarang}
                  onChange={(e) => setNamaBarang(e.target.value)}
                  placeholder="Contoh: Nasi Bungkus Cakalang, Kopi Susu"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Kategori
                  </label>
                  <select
                    value={kategori}
                    onChange={(e) => setKategori(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    <option value="Makanan">Makanan</option>
                    <option value="Minuman">Minuman</option>
                    <option value="Snack">Snack</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Stok Awal (bks)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={stokAwal}
                    onChange={(e) => setStokAwal(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Contoh: 30"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Harga Normal
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={hargaJual}
                    onChange={(e) => setHargaJual(e.target.value ? Number(e.target.value) : '')}
                    placeholder="15000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-purple-700 mb-1">
                    🏷️ Harga Reseller
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={hargaReseller}
                    onChange={(e) => setHargaReseller(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Contoh: 12000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-purple-200 bg-purple-50/40 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold text-purple-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Harga Modal (HPP)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={hargaModal}
                    onChange={(e) => setHargaModal(e.target.value ? Number(e.target.value) : '')}
                    placeholder="9000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Batas Peringatan Stok Menipis (bungkus)
                </label>
                <input
                  type="number"
                  min="1"
                  value={minStok}
                  onChange={(e) => setMinStok(Number(e.target.value) || 5)}
                  placeholder="5"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Aplikasi akan memberi tanda kuning jika sisa bungkus sama atau di bawah angka ini.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm"
                >
                  Simpan Barang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT BARANG */}
      {editingBarang && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl overflow-hidden border border-slate-100">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Edit Menu: {editingBarang.nama}</h3>
              <button
                type="button"
                onClick={() => setEditingBarang(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSimpanEdit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Nama Menu
                </label>
                <input
                  type="text"
                  required
                  value={editingBarang.nama}
                  onChange={(e) => setEditingBarang({ ...editingBarang, nama: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Kategori
                  </label>
                  <select
                    value={editingBarang.kategori}
                    onChange={(e) => setEditingBarang({ ...editingBarang, kategori: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    <option value="Makanan">Makanan</option>
                    <option value="Minuman">Minuman</option>
                    <option value="Snack">Snack</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Stok Sekarang (bks)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingBarang.stok}
                    onChange={(e) => setEditingBarang({ ...editingBarang, stok: Number(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Harga Normal
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editingBarang.jual}
                    onChange={(e) => setEditingBarang({ ...editingBarang, jual: Number(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-purple-700 mb-1">
                    🏷️ Harga Reseller
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingBarang.hargaReseller !== undefined ? editingBarang.hargaReseller : editingBarang.jual}
                    onChange={(e) => setEditingBarang({ ...editingBarang, hargaReseller: Number(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-purple-200 bg-purple-50/40 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold text-purple-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Harga Modal (HPP)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingBarang.modal}
                    onChange={(e) => setEditingBarang({ ...editingBarang, modal: Number(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Batas Peringatan Stok Menipis
                </label>
                <input
                  type="number"
                  min="1"
                  value={editingBarang.minStok}
                  onChange={(e) => setEditingBarang({ ...editingBarang, minStok: Number(e.target.value) || 5 })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingBarang(null)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CEPAT RESTOK */}
      {restockBarang && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Restok Menu Bungkus</h3>
                <p className="text-xs text-slate-500">{restockBarang.nama}</p>
              </div>
              <button
                type="button"
                onClick={() => setRestockBarang(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleExecuteRestock} className="p-5 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex justify-between">
                <div>
                  <span className="text-slate-500 block">Stok Saat Ini:</span>
                  <span className="font-black text-slate-800 text-sm">{restockBarang.stok} bungkus</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block">Stok Setelah Restok:</span>
                  <span className="font-black text-emerald-700 text-sm">
                    {restockBarang.stok + (Number(tambahStokBungkus) || 0)} bungkus
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Tambah Jumlah Bungkus
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={tambahStokBungkus}
                  onChange={(e) => setTambahStokBungkus(Number(e.target.value) || 1)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-center font-black text-xl text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <div className="flex gap-2 mt-2">
                  {[5, 10, 20, 50].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setTambahStokBungkus(val)}
                      className={`flex-1 py-1 text-xs rounded-lg font-bold border transition ${
                        tambahStokBungkus === val
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      +{val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Automatic Cashflow Expense Logging */}
              {onTambahKeuangan && restockBarang.modal > 0 && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                  <label className="flex items-start gap-2 text-xs font-semibold text-amber-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={catatKeuanganRestok}
                      onChange={(e) => setCatatKeuanganRestok(e.target.checked)}
                      className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>
                      Catat pengeluaran belanja bahan ke Pembukuan senilai{' '}
                      <b>{formatRp(tambahStokBungkus * restockBarang.modal)}</b> ({tambahStokBungkus} x {formatRp(restockBarang.modal)})
                    </span>
                  </label>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRestockBarang(null)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm"
                >
                  Tambahkan Stok
                </button>
              </div>
            </form>
          </div>
        </div>
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
