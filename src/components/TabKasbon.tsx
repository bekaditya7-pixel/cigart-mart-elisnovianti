import React, { useState, useMemo } from 'react';
import { Penjualan, TransaksiKeuangan, PengaturanToko, RiwayatCicilanKasbon } from '../types.ts';
import { 
  formatRp, 
  getTanggalHariIni, 
  getWaktuSekarang, 
  generateId, 
  formatTanggalIndo,
  hitungSudahDibayar,
  hitungSisaHutang
} from '../utils/format.ts';
import { 
  Clock, 
  CheckCircle2, 
  Send, 
  Search, 
  UserCheck, 
  Check, 
  X, 
  MessageCircle, 
  AlertCircle,
  CreditCard,
  ChevronDown,
  ChevronUp,
  History,
  Coins,
  ArrowRight,
  Users,
  ListFilter,
  Receipt,
  User,
  ShoppingBag
} from 'lucide-react';

interface TabKasbonProps {
  penjualanList: Penjualan[];
  toko: PengaturanToko;
  onUpdatePenjualan: (updated: Penjualan) => void;
  onTambahKeuangan: (transaksi: TransaksiKeuangan) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

interface PelangganKasbonGroup {
  nama: string;
  totalHutangAwal: number;
  totalSudahDibayar: number;
  totalSisaHutang: number;
  transaksiList: Penjualan[];
  transaksiBelumLunas: Penjualan[];
  transaksiLunas: Penjualan[];
  terakhirTransaksi: string;
}

export const TabKasbon: React.FC<TabKasbonProps> = ({
  penjualanList,
  toko,
  onUpdatePenjualan,
  onTambahKeuangan,
  showToast,
}) => {
  // View Mode: 'per_nama' (Grouped by Buyer Name) vs 'per_transaksi' (Individual Transactions)
  const [viewMode, setViewMode] = useState<'per_nama' | 'per_transaksi'>('per_nama');

  // Filter & Search
  const [filterStatus, setFilterStatus] = useState<'Belum Lunas' | 'Bayar Sebagian' | 'Lunas' | 'Semua'>('Belum Lunas');
  const [filterPelanggan, setFilterPelanggan] = useState<'berhutang' | 'semua'>('berhutang');
  const [search, setSearch] = useState('');
  
  // Expanded accordions state
  const [expandedCustomerNames, setExpandedCustomerNames] = useState<Record<string, boolean>>({});
  const [expandedHistories, setExpandedHistories] = useState<Record<string, boolean>>({});

  // Single Transaction Payment Modal State
  const [selectedKasbon, setSelectedKasbon] = useState<Penjualan | null>(null);
  const [tipeBayar, setTipeBayar] = useState<'lunas' | 'sebagian'>('lunas');
  const [nominalBayar, setNominalBayar] = useState<number | ''>('');
  const [metodeBayar, setMetodeBayar] = useState<'Tunai' | 'QR'>('Tunai');
  const [catatanBayar, setCatatanBayar] = useState('');

  // Grouped Customer Total Payment Modal State
  const [selectedCustomerGroup, setSelectedCustomerGroup] = useState<PelangganKasbonGroup | null>(null);
  const [groupNominalBayar, setGroupNominalBayar] = useState<number | ''>('');
  const [groupMetodeBayar, setGroupMetodeBayar] = useState<'Tunai' | 'QR'>('Tunai');
  const [groupCatatanBayar, setGroupCatatanBayar] = useState('');

  // Kasbon Items
  const allKasbon = penjualanList.filter((j) => j.metode === 'Cashbon');
  const belumLunasList = allKasbon.filter((j) => j.statusKasbon !== 'Lunas');
  const lunasList = allKasbon.filter((j) => j.statusKasbon === 'Lunas');

  // Total Piutang is sum of remaining debt
  const totalPiutang = belumLunasList.reduce((sum, j) => sum + hitungSisaHutang(j), 0);
  const totalPelangganBerhutang = new Set(belumLunasList.map((j) => j.nama.toLowerCase().trim())).size;
  const totalSebagianCount = allKasbon.filter((j) => j.statusKasbon === 'Bayar Sebagian').length;

  // Toggle Customer Accordion
  const toggleCustomerExpand = (namaKey: string) => {
    setExpandedCustomerNames((prev) => ({
      ...prev,
      [namaKey]: !prev[namaKey],
    }));
  };

  // Toggle Single History Accordion
  const toggleHistoryExpand = (id: string) => {
    setExpandedHistories((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // -------------------------------------------------------------
  // GROUPING TOTAL HUTANG BERDASARKAN NAMA PEMBELI
  // -------------------------------------------------------------
  const groupedByBuyer: PelangganKasbonGroup[] = useMemo(() => {
    const groups: Record<string, PelangganKasbonGroup> = {};

    allKasbon.forEach((j) => {
      const key = j.nama.trim().toLowerCase();
      const originalName = j.nama.trim();

      if (!groups[key]) {
        groups[key] = {
          nama: originalName,
          totalHutangAwal: 0,
          totalSudahDibayar: 0,
          totalSisaHutang: 0,
          transaksiList: [],
          transaksiBelumLunas: [],
          transaksiLunas: [],
          terakhirTransaksi: j.tgl,
        };
      }

      const g = groups[key];
      const sudah = hitungSudahDibayar(j);
      const sisa = hitungSisaHutang(j);

      g.totalHutangAwal += j.total;
      g.totalSudahDibayar += sudah;
      g.totalSisaHutang += sisa;
      g.transaksiList.push(j);

      if (j.statusKasbon === 'Lunas') {
        g.transaksiLunas.push(j);
      } else {
        g.transaksiBelumLunas.push(j);
      }

      if (j.tgl > g.terakhirTransaksi) {
        g.terakhirTransaksi = j.tgl;
      }
    });

    // Default sort: highest remaining debt first, then latest transaction
    return Object.values(groups).sort((a, b) => {
      if (b.totalSisaHutang !== a.totalSisaHutang) {
        return b.totalSisaHutang - a.totalSisaHutang;
      }
      return b.terakhirTransaksi.localeCompare(a.terakhirTransaksi);
    });
  }, [allKasbon]);

  // Filtered Group List
  const filteredCustomerGroups = groupedByBuyer.filter((g) => {
    if (filterPelanggan === 'berhutang' && g.totalSisaHutang <= 0) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = g.nama.toLowerCase().includes(q);
      const matchItem = g.transaksiList.some((t) => t.barang.toLowerCase().includes(q));
      if (!matchName && !matchItem) return false;
    }
    return true;
  });

  // -------------------------------------------------------------
  // MODAL HANDLERS
  // -------------------------------------------------------------
  // Open Single Transaction Modal
  const handleOpenBayarModal = (kasbon: Penjualan) => {
    setSelectedKasbon(kasbon);
    const sisa = hitungSisaHutang(kasbon);
    setTipeBayar('lunas');
    setNominalBayar(sisa);
    setMetodeBayar('Tunai');
    setCatatanBayar('');
  };

  // Open Customer Group Modal (Pay down customer's total debt)
  const handleOpenGroupBayarModal = (group: PelangganKasbonGroup) => {
    setSelectedCustomerGroup(group);
    setGroupNominalBayar(group.totalSisaHutang);
    setGroupMetodeBayar('Tunai');
    setGroupCatatanBayar('');
  };

  // Submit Single Transaction Payment
  const handleSimpanPembayaran = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKasbon) return;

    const sisaSaatIni = hitungSisaHutang(selectedKasbon);
    const nominal = Number(nominalBayar);

    if (!nominal || nominal <= 0) {
      showToast('Nominal pembayaran harus lebih dari Rp 0!', 'error');
      return;
    }

    if (nominal > sisaSaatIni) {
      showToast(`Nominal melebihi sisa hutang (${formatRp(sisaSaatIni)})!`, 'error');
      return;
    }

    const today = getTanggalHariIni();
    const timeNow = getWaktuSekarang();

    const sudahBayarSebelumnya = hitungSudahDibayar(selectedKasbon);
    const totalSudahBayarBaru = sudahBayarSebelumnya + nominal;
    const sisaHutangBaru = Math.max(0, selectedKasbon.total - totalSudahBayarBaru);
    const isLunas = sisaHutangBaru === 0;

    const cicilanBaru: RiwayatCicilanKasbon = {
      id: generateId('cicil'),
      tgl: today,
      waktu: timeNow,
      nominal: nominal,
      metode: metodeBayar,
      catatan: catatanBayar.trim() || (isLunas ? 'Pelunasan lunas' : 'Bayar sebagian (cicilan)'),
    };

    const riwayatLama = selectedKasbon.riwayatCicilan || [];
    const riwayatBaru = [cicilanBaru, ...riwayatLama];

    const updatedSale: Penjualan = {
      ...selectedKasbon,
      statusKasbon: isLunas ? 'Lunas' : 'Bayar Sebagian',
      tglLunas: isLunas ? today : selectedKasbon.tglLunas,
      metodeLunas: isLunas ? metodeBayar : selectedKasbon.metodeLunas,
      sudahDibayar: totalSudahBayarBaru,
      riwayatCicilan: riwayatBaru,
    };
    onUpdatePenjualan(updatedSale);

    onTambahKeuangan({
      id: generateId('keu'),
      tgl: today,
      waktu: timeNow,
      jenis: 'masuk',
      kategori: isLunas ? 'Pelunasan Kasbon' : 'Cicilan Kasbon',
      metode: metodeBayar === 'QR' ? 'QR' : 'Cash',
      ket: isLunas
        ? `Pelunasan kasbon ${selectedKasbon.nama} (${selectedKasbon.barang} ${selectedKasbon.jumlah} bks - LUNAS)`
        : `Bayar sebagian kasbon ${selectedKasbon.nama} (${selectedKasbon.barang}, bayar ${formatRp(nominal)}, sisa ${formatRp(sisaHutangBaru)})`,
      nominal: nominal,
      refJualId: selectedKasbon.id,
    });

    if (isLunas) {
      showToast(`Hutang an. ${selectedKasbon.nama} BERHASIL LUNAS! Diterima ${formatRp(nominal)}`, 'success');
    } else {
      showToast(
        `Pembayaran sebagian ${formatRp(nominal)} dicatat! Sisa hutang ${selectedKasbon.nama}: ${formatRp(sisaHutangBaru)}`,
        'success'
      );
    }

    setSelectedKasbon(null);
    setNominalBayar('');
    setCatatanBayar('');
  };

  // Submit Customer Group Payment (Distribute payment across customer's unpaid debts from oldest to newest)
  const handleSimpanGroupPembayaran = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerGroup) return;

    const nominalTotal = Number(groupNominalBayar);
    if (!nominalTotal || nominalTotal <= 0) {
      showToast('Nominal pembayaran harus lebih dari Rp 0!', 'error');
      return;
    }

    if (nominalTotal > selectedCustomerGroup.totalSisaHutang) {
      showToast(`Nominal melebihi total sisa hutang ${selectedCustomerGroup.nama} (${formatRp(selectedCustomerGroup.totalSisaHutang)})!`, 'error');
      return;
    }

    const today = getTanggalHariIni();
    const timeNow = getWaktuSekarang();

    // Sort unpaid from oldest to newest so oldest debts get paid off first
    const sortedUnpaid = [...selectedCustomerGroup.transaksiBelumLunas].sort((a, b) => a.tgl.localeCompare(b.tgl));
    let sisaBudgetBayar = nominalTotal;

    sortedUnpaid.forEach((item) => {
      if (sisaBudgetBayar <= 0) return;

      const sisaHutangItem = hitungSisaHutang(item);
      const bayarKeItemIni = Math.min(sisaHutangItem, sisaBudgetBayar);
      sisaBudgetBayar -= bayarKeItemIni;

      const sudahBayarSebelumnya = hitungSudahDibayar(item);
      const totalSudahBayarBaru = sudahBayarSebelumnya + bayarKeItemIni;
      const sisaBaru = Math.max(0, item.total - totalSudahBayarBaru);
      const isLunas = sisaBaru === 0;

      const cicilanBaru: RiwayatCicilanKasbon = {
        id: generateId('cicil'),
        tgl: today,
        waktu: timeNow,
        nominal: bayarKeItemIni,
        metode: groupMetodeBayar,
        catatan: groupCatatanBayar.trim() || `Pembayaran hutang an. ${selectedCustomerGroup.nama}`,
      };

      const updatedSale: Penjualan = {
        ...item,
        statusKasbon: isLunas ? 'Lunas' : 'Bayar Sebagian',
        tglLunas: isLunas ? today : item.tglLunas,
        metodeLunas: isLunas ? groupMetodeBayar : item.metodeLunas,
        sudahDibayar: totalSudahBayarBaru,
        riwayatCicilan: [cicilanBaru, ...(item.riwayatCicilan || [])],
      };
      onUpdatePenjualan(updatedSale);
    });

    // Add financial entry to bookkeeping
    onTambahKeuangan({
      id: generateId('keu'),
      tgl: today,
      waktu: timeNow,
      jenis: 'masuk',
      kategori: 'Pelunasan Kasbon',
      metode: groupMetodeBayar === 'QR' ? 'QR' : 'Cash',
      ket: `Pembayaran hutang an. ${selectedCustomerGroup.nama} (${formatRp(nominalTotal)})${groupCatatanBayar ? ' - ' + groupCatatanBayar : ''}`,
      nominal: nominalTotal,
    });

    showToast(`Pembayaran hutang ${selectedCustomerGroup.nama} sebesar ${formatRp(nominalTotal)} berhasil dicatat!`, 'success');
    setSelectedCustomerGroup(null);
    setGroupNominalBayar('');
    setGroupCatatanBayar('');
  };

  // WhatsApp Message for Single Transaction
  const generateWhatsAppReminderSingle = (j: Penjualan) => {
    const sudah = hitungSudahDibayar(j);
    const sisa = hitungSisaHutang(j);

    let infoPembayaran = `- Total Belanja: *${formatRp(j.total)}*\n`;
    if (sudah > 0) {
      infoPembayaran += `- Sudah Dibayar: ${formatRp(sudah)}\n- *SISA TAGIHAN: ${formatRp(sisa)}*\n`;
    } else {
      infoPembayaran += `- *Total Tagihan: ${formatRp(j.total)}*\n`;
    }

    const text = encodeURIComponent(
      `Halo Kak / Pak / Bu ${j.nama},\n\nSalam dari *${toko.namaToko}*.\nMohon izin menginfokan catatan kasbon belanja bungkus:\n- Menu: *${j.barang}* (${j.jumlah} bungkus)\n- Tanggal Bon: ${formatTanggalIndo(j.tgl)}\n${infoPembayaran}\nPembayaran dapat dilakukan secara Tunai langsung di warung atau via transfer / QRIS.\nTerima kasih banyak atas perhatian dan kerjasamanya! 🙏`
    );
    return `https://wa.me/?text=${text}`;
  };

  // WhatsApp Message for Grouped Customer Debt Summary
  const generateWhatsAppReminderGroup = (g: PelangganKasbonGroup) => {
    let listPesanan = '';
    g.transaksiBelumLunas.forEach((j, idx) => {
      const sisa = hitungSisaHutang(j);
      listPesanan += `${idx + 1}. ${formatTanggalIndo(j.tgl)}: *${j.barang}* (${j.jumlah} bks) - Sisa: ${formatRp(sisa)}\n`;
    });

    const text = encodeURIComponent(
      `Halo Kak / Pak / Bu *${g.nama}*,\n\n` +
      `Salam dari *${toko.namaToko}*.\n` +
      `Mohon izin menyampaikan rekap rincian kasbon belanja bungkus Anda:\n\n` +
      listPesanan +
      `\n--------------------------------\n` +
      `*TOTAL SISA HUTANG: ${formatRp(g.totalSisaHutang)}*\n` +
      `(Total belanja: ${formatRp(g.totalHutangAwal)}, sudah dicicil: ${formatRp(g.totalSudahDibayar)})\n` +
      `--------------------------------\n\n` +
      `Pembayaran dapat dilakukan secara Tunai langsung di warung atau via transfer / QRIS (bisa lunas maupun dicicil sebagian).\n` +
      `Terima kasih banyak atas perhatian dan kerjasamanya! 🙏`
    );
    return `https://wa.me/?text=${text}`;
  };

  // Filtered List for Transaction View
  const filteredList = allKasbon.filter((j) => {
    if (filterStatus === 'Belum Lunas' && j.statusKasbon === 'Lunas') return false;
    if (filterStatus === 'Bayar Sebagian' && j.statusKasbon !== 'Bayar Sebagian') return false;
    if (filterStatus === 'Lunas' && j.statusKasbon !== 'Lunas') return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        j.nama.toLowerCase().includes(q) ||
        j.barang.toLowerCase().includes(q) ||
        (j.catatan || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* KPI METRICS KASBON */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-4 sm:p-5 text-white shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-100">
              Total Sisa Piutang
            </span>
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Clock className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl sm:text-3xl font-black">{formatRp(totalPiutang)}</p>
            <p className="text-xs text-amber-100 mt-0.5">
              {belumLunasList.length} pesanan belum lunas ({totalPelangganBerhutang} orang pelanggan)
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pelanggan Berhutang
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl sm:text-3xl font-black text-slate-900">
              {totalPelangganBerhutang} <span className="text-sm font-semibold text-slate-500">orang</span>
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Dijumlahkan total per nama pembeli</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Sudah Dilunasi
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl sm:text-3xl font-black text-emerald-600">
              {lunasList.length} <span className="text-sm font-semibold text-slate-500">transaksi</span>
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Telah lunas penuh</p>
          </div>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-6">
        {/* Header & View Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Buku Kasbon & Hutang Pelanggan</h2>
            <p className="text-xs text-slate-500">
              Total hutang dapat dilihat <b>dikelompokkan berdasarkan nama pembeli</b> atau rincian per transaksi
            </p>
          </div>

          {/* VIEW SWITCHER: PER NAMA VS PER TRANSAKSI */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('per_nama')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
                viewMode === 'per_nama'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Per Nama Pembeli</span>
              {totalPelangganBerhutang > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-black">
                  {totalPelangganBerhutang}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setViewMode('per_transaksi')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
                viewMode === 'per_transaksi'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Per Transaksi</span>
              {belumLunasList.length > 0 && (
                <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-full text-[10px] font-bold">
                  {belumLunasList.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search & Sub-Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama pembeli atau menu bungkus..."
              className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Sub Filters based on View Mode */}
          {viewMode === 'per_nama' ? (
            <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setFilterPelanggan('berhutang')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  filterPelanggan === 'berhutang'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Masih Berhutang ({totalPelangganBerhutang})
              </button>
              <button
                type="button"
                onClick={() => setFilterPelanggan('semua')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  filterPelanggan === 'semua'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua Pelanggan ({groupedByBuyer.length})
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl">
              {(['Belum Lunas', 'Bayar Sebagian', 'Lunas', 'Semua'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                    filterStatus === st
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st}
                  {st === 'Bayar Sebagian' && totalSebagianCount > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 text-[10px]">
                      {totalSebagianCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* VIEW 1: REKAP TOTAL HUTANG BERDASARKAN NAMA PEMBELI          */}
        {/* ============================================================ */}
        {viewMode === 'per_nama' && (
          <div>
            {filteredCustomerGroups.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Users className="w-12 h-12 mx-auto stroke-1 text-slate-300 mb-2" />
                <p className="font-semibold text-slate-600 text-sm">Tidak ada pelanggan berhutang</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {allKasbon.length === 0
                    ? 'Belum ada transaksi kasbon yang tercatat.'
                    : 'Semua pelanggan telah melunasi hutangnya!'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCustomerGroups.map((g) => {
                  const key = g.nama.toLowerCase().trim();
                  const isExpanded = !!expandedCustomerNames[key];
                  const hasDebt = g.totalSisaHutang > 0;
                  const percentPaid = g.totalHutangAwal > 0 
                    ? Math.min(100, Math.round((g.totalSudahDibayar / g.totalHutangAwal) * 100)) 
                    : 0;

                  return (
                    <div
                      key={key}
                      className={`rounded-2xl border transition overflow-hidden ${
                        hasDebt
                          ? 'bg-white border-amber-200/90 shadow-xs hover:border-amber-300'
                          : 'bg-slate-50/70 border-slate-200 text-slate-600'
                      }`}
                    >
                      {/* Customer Card Header */}
                      <div className="p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {/* Name & Badge */}
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 ${
                                hasDebt
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              {g.nama.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center flex-wrap gap-2">
                                <h3 className="font-black text-slate-900 text-base sm:text-lg">
                                  {g.nama}
                                </h3>
                                {g.transaksiList.some((t) => t.isReseller) && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-100 text-purple-700 border border-purple-200">
                                    🏷️ Reseller
                                  </span>
                                )}
                                {hasDebt ? (
                                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-amber-700" />
                                    <span>{g.transaksiBelumLunas.length} Pesanan Belum Lunas</span>
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                    <Check className="w-3 h-3" />
                                    <span>Semua Lunas</span>
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Terakhir berhutang: {formatTanggalIndo(g.terakhirTransaksi)} • Total {g.transaksiList.length} transaksi kasbon
                              </p>
                            </div>
                          </div>

                          {/* TOTAL SISA HUTANG (HIGHLIGHTED) */}
                          <div className="text-left sm:text-right bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-0 border-slate-100">
                            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                              Total Sisa Hutang {g.nama}
                            </span>
                            <span
                              className={`text-xl sm:text-2xl font-black block ${
                                hasDebt ? 'text-rose-600' : 'text-emerald-700'
                              }`}
                            >
                              {formatRp(g.totalSisaHutang)}
                            </span>
                            {g.totalSudahDibayar > 0 && hasDebt && (
                              <span className="text-[11px] text-slate-400 block">
                                Sudah dicicil: {formatRp(g.totalSudahDibayar)} (dari {formatRp(g.totalHutangAwal)})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Progress Bar of Debt Payment if partially paid */}
                        {hasDebt && g.totalSudahDibayar > 0 && (
                          <div className="mt-3 pt-2 border-t border-slate-100">
                            <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
                              <span className="text-emerald-700">Sudah Dibayar: {formatRp(g.totalSudahDibayar)} ({percentPaid}%)</span>
                              <span className="text-rose-600 font-bold">Sisa: {formatRp(g.totalSisaHutang)}</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                style={{ width: `${percentPaid}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Action Buttons for this Buyer */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => toggleCustomerExpand(key)}
                            className="text-xs font-bold text-slate-700 hover:text-emerald-700 flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-slate-100 transition"
                          >
                            <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                            <span>
                              {isExpanded ? 'Tutup Rincian Pesanan' : `Lihat ${g.transaksiList.length} Rincian Pesanan`}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                          </button>

                          {hasDebt && (
                            <div className="flex items-center gap-2">
                              <a
                                href={generateWhatsAppReminderGroup(g)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs flex items-center gap-1.5 transition"
                                title="Kirim Rekap Total Hutang via WhatsApp"
                              >
                                <MessageCircle className="w-4 h-4 text-emerald-600" />
                                <span className="hidden sm:inline">Kirim Rekap WA</span>
                              </a>

                              <button
                                type="button"
                                onClick={() => handleOpenGroupBayarModal(g)}
                                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition active:scale-95 flex items-center gap-1.5"
                              >
                                <Coins className="w-4 h-4" />
                                <span>Bayar / Cicil Total</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Expanded Itemized Orders for this Customer */}
                      {isExpanded && (
                        <div className="bg-slate-50/80 p-4 border-t border-slate-200/80 space-y-2.5">
                          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2">
                            Daftar Pesanan Bungkus - {g.nama}
                          </h4>

                          <div className="space-y-2">
                            {g.transaksiList.map((item) => {
                              const itemSudah = hitungSudahDibayar(item);
                              const itemSisa = hitungSisaHutang(item);
                              const itemLunas = item.statusKasbon === 'Lunas';
                              const itemSebagian = item.statusKasbon === 'Bayar Sebagian';

                              return (
                                <div
                                  key={item.id}
                                  className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-slate-900">{item.barang}</span>
                                      <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.2 rounded text-[11px]">
                                        {item.jumlah} bks
                                      </span>
                                      {item.isReseller && (
                                        <span className="bg-purple-100 text-purple-700 font-bold px-1.5 py-0.2 rounded text-[10px] border border-purple-200">
                                          🏷️ Reseller
                                        </span>
                                      )}
                                      <span
                                        className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                                          itemLunas
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : itemSebagian
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-amber-100 text-amber-800'
                                        }`}
                                      >
                                        {itemLunas
                                          ? '✅ Lunas'
                                          : itemSebagian
                                          ? `⚡ Dicicil (Sisa ${formatRp(itemSisa)})`
                                          : '⏳ Belum Bayar'}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap gap-2">
                                      <span>Tgl: {formatTanggalIndo(item.tgl)} ({item.waktu})</span>
                                      <span>Total: {formatRp(item.total)}</span>
                                      {item.catatan && (
                                        <span className="text-amber-800 italic">"{item.catatan}"</span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                                    <div className="text-right">
                                      <span className="text-[10px] text-slate-400 block">Sisa Hutang:</span>
                                      <span
                                        className={`font-black ${
                                          itemLunas ? 'text-slate-400 line-through' : 'text-rose-600'
                                        }`}
                                      >
                                        {formatRp(itemSisa)}
                                      </span>
                                    </div>

                                    {!itemLunas && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenBayarModal(item)}
                                        className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition"
                                      >
                                        Bayar Ini
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 2: DAFTAR KASBON PER TRANSAKSI                           */}
        {/* ============================================================ */}
        {viewMode === 'per_transaksi' && (
          <div>
            {filteredList.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <CheckCircle2 className="w-12 h-12 mx-auto stroke-1 text-slate-300 mb-2" />
                <p className="font-semibold text-slate-600 text-sm">Tidak ada catatan kasbon</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {allKasbon.length === 0
                    ? 'Semua penjualan dibayar langsung (Tunai / QRIS).'
                    : 'Tidak ada kasbon yang sesuai filter pencarian.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredList.map((item) => {
                  const sudahDibayar = hitungSudahDibayar(item);
                  const sisaHutang = hitungSisaHutang(item);
                  const isLunas = item.statusKasbon === 'Lunas';
                  const isSebagian = item.statusKasbon === 'Bayar Sebagian';
                  const isBelumSamaSekali = item.statusKasbon === 'Belum Lunas' && sudahDibayar === 0;

                  const percentPaid = item.total > 0 ? Math.min(100, Math.round((sudahDibayar / item.total) * 100)) : 0;
                  const hasRiwayat = item.riwayatCicilan && item.riwayatCicilan.length > 0;
                  const isExpanded = !!expandedHistories[item.id];

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border transition ${
                        isLunas
                          ? 'bg-slate-50/60 border-slate-200 text-slate-600'
                          : isSebagian
                          ? 'bg-blue-50/30 border-blue-200 hover:border-blue-300'
                          : 'bg-amber-50/40 border-amber-200/80 hover:border-amber-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        {/* Customer & Food Info */}
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center flex-wrap gap-2">
                            <span className="font-bold text-slate-900 text-sm sm:text-base">{item.nama}</span>
                            {item.isReseller && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-100 text-purple-700 border border-purple-200">
                                🏷️ Reseller
                              </span>
                            )}
                            {isLunas && (
                              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                <Check className="w-3 h-3" /> Lunas Penuh
                              </span>
                            )}
                            {isSebagian && (
                              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 flex items-center gap-1">
                                <Coins className="w-3 h-3" /> Dicicil Sebagian ({percentPaid}%)
                              </span>
                            )}
                            {isBelumSamaSekali && (
                              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                ⏳ Belum Ada Pembayaran
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-600">
                            <b>{item.barang}</b> • {item.jumlah} bungkus (@{formatRp(item.hargaSatuan)})
                          </p>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                            <span>Tanggal Bon: {formatTanggalIndo(item.tgl)} ({item.waktu || '-'})</span>
                            {item.catatan && (
                              <span className="text-amber-800 italic font-medium">
                                Catatan: "{item.catatan}"
                              </span>
                            )}
                          </div>

                          {/* Partial Payment Progress Bar */}
                          {!isLunas && (
                            <div className="pt-1 max-w-md">
                              <div className="flex justify-between text-[11px] font-semibold mb-1">
                                <span className="text-emerald-700">Terbayar: {formatRp(sudahDibayar)}</span>
                                <span className="text-rose-600 font-bold">Sisa: {formatRp(sisaHutang)}</span>
                              </div>
                              <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                                <div
                                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                  style={{ width: `${percentPaid}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Amount & Actions */}
                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 shrink-0">
                          <div className="text-left sm:text-right">
                            <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                              {isLunas ? 'Total Lunas' : 'Sisa Hutang'}
                            </span>
                            <span
                              className={`font-black text-base sm:text-lg block ${
                                isLunas ? 'text-slate-800' : 'text-rose-600'
                              }`}
                            >
                              {formatRp(isLunas ? item.total : sisaHutang)}
                            </span>
                            {!isLunas && sudahDibayar > 0 && (
                              <span className="text-[10px] text-slate-400 block">
                                Total Awal: {formatRp(item.total)}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {!isLunas ? (
                              <>
                                <a
                                  href={generateWhatsAppReminderSingle(item)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition"
                                  title="Kirim Pesan WhatsApp Pengingat"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleOpenBayarModal(item)}
                                  className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition active:scale-95 flex items-center gap-1.5"
                                >
                                  <Coins className="w-4 h-4" />
                                  <span>Bayar / Cicil</span>
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-emerald-700 font-semibold px-2.5 py-1 bg-emerald-50 rounded-lg">
                                Dilunasi {item.tglLunas ? formatTanggalIndo(item.tglLunas) : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Riwayat Cicilan Accordion (If any partial payments exist) */}
                      {hasRiwayat && (
                        <div className="mt-3 pt-2.5 border-t border-slate-200/70">
                          <button
                            type="button"
                            onClick={() => toggleHistoryExpand(item.id)}
                            className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition"
                          >
                            <History className="w-3.5 h-3.5 text-blue-600" />
                            <span>Riwayat Pembayaran / Cicilan ({item.riwayatCicilan?.length} transaksi)</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </button>

                          {isExpanded && (
                            <div className="mt-2 space-y-1.5 bg-white/80 p-2.5 rounded-xl border border-slate-200 text-xs">
                              {item.riwayatCicilan?.map((c, idx) => (
                                <div
                                  key={c.id || idx}
                                  className="flex items-center justify-between py-1 border-b border-slate-100 last:border-b-0"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-slate-800">
                                      {formatTanggalIndo(c.tgl)} ({c.waktu})
                                    </span>
                                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-600 font-semibold">
                                      {c.metode === 'QR' ? '📱 QRIS' : '💵 Cash'}
                                    </span>
                                    {c.catatan && (
                                      <span className="text-slate-500 italic text-[11px]">
                                        "{c.catatan}"
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-black text-emerald-700">
                                    +{formatRp(c.nominal)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* MODAL 1: PEMBAYARAN KASBON PER TRANSAKSI                     */}
      {/* ============================================================ */}
      {selectedKasbon && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Pembayaran Kasbon</h3>
                <p className="text-xs text-slate-500">Pelanggan: <b>{selectedKasbon.nama}</b></p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedKasbon(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSimpanPembayaran} className="p-5 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Menu Belanja:</span>
                  <span className="font-bold text-slate-900">
                    {selectedKasbon.barang} ({selectedKasbon.jumlah} bks)
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total Tagihan Awal:</span>
                  <span className="font-bold text-slate-900">{formatRp(selectedKasbon.total)}</span>
                </div>
                {hitungSudahDibayar(selectedKasbon) > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Sudah Dibayar Sebelumnya:</span>
                    <span>-{formatRp(hitungSudahDibayar(selectedKasbon))}</span>
                  </div>
                )}
                <div className="flex justify-between text-rose-700 font-black text-sm pt-1 border-t border-slate-200">
                  <span>Sisa Hutang Saat Ini:</span>
                  <span className="text-base">{formatRp(hitungSisaHutang(selectedKasbon))}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Pilihan Pembayaran
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTipeBayar('lunas');
                      setNominalBayar(hitungSisaHutang(selectedKasbon));
                    }}
                    className={`py-2.5 px-3 rounded-xl border font-bold text-xs transition flex flex-col items-center justify-center gap-1 ${
                      tipeBayar === 'lunas'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="text-base">✅</span>
                    <span>Bayar Lunas Penuh</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTipeBayar('sebagian');
                      const sisa = hitungSisaHutang(selectedKasbon);
                      setNominalBayar(Math.round(sisa / 2));
                    }}
                    className={`py-2.5 px-3 rounded-xl border font-bold text-xs transition flex flex-col items-center justify-center gap-1 ${
                      tipeBayar === 'sebagian'
                        ? 'border-blue-600 bg-blue-50 text-blue-800 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="text-base">⚡</span>
                    <span>Bayar Sebagian (Cicil)</span>
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Nominal yang Dibayar Sekarang (Rp)
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Maks: {formatRp(hitungSisaHutang(selectedKasbon))}
                  </span>
                </div>

                <input
                  type="number"
                  min="1"
                  max={hitungSisaHutang(selectedKasbon)}
                  required
                  value={nominalBayar}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : '';
                    setNominalBayar(val);
                    if (typeof val === 'number') {
                      const sisa = hitungSisaHutang(selectedKasbon);
                      if (val >= sisa) {
                        setTipeBayar('lunas');
                      } else {
                        setTipeBayar('sebagian');
                      }
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-lg font-black text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />

                {tipeBayar === 'sebagian' && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="text-[11px] text-slate-400 self-center">Pilihan:</span>
                    {[5000, 10000, 20000, 50000].map((val) => {
                      const sisa = hitungSisaHutang(selectedKasbon);
                      if (val > sisa) return null;
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setNominalBayar(val)}
                          className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
                        >
                          {formatRp(val)}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        const sisa = hitungSisaHutang(selectedKasbon);
                        setNominalBayar(Math.round(sisa / 2));
                      }}
                      className="text-xs px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold transition"
                    >
                      50% ({formatRp(Math.round(hitungSisaHutang(selectedKasbon) / 2))})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTipeBayar('lunas');
                        setNominalBayar(hitungSisaHutang(selectedKasbon));
                      }}
                      className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold transition"
                    >
                      Lunas Penuh
                    </button>
                  </div>
                )}
              </div>

              {typeof nominalBayar === 'number' && nominalBayar > 0 && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-slate-500 block">Sisa Hutang Setelah Bayar:</span>
                    <span
                      className={`font-black text-sm ${
                        hitungSisaHutang(selectedKasbon) - nominalBayar <= 0
                          ? 'text-emerald-700'
                          : 'text-rose-600'
                      }`}
                    >
                      {hitungSisaHutang(selectedKasbon) - nominalBayar <= 0
                        ? 'Rp 0 (LUNAS PENUH)'
                        : formatRp(hitungSisaHutang(selectedKasbon) - nominalBayar)}
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${
                      hitungSisaHutang(selectedKasbon) - nominalBayar <= 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {hitungSisaHutang(selectedKasbon) - nominalBayar <= 0
                      ? 'Status: Lunas'
                      : 'Status: Bayar Sebagian'}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Uang Diterima Melalui
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMetodeBayar('Tunai')}
                    className={`py-2.5 px-3 rounded-xl border font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                      metodeBayar === 'Tunai'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span>💵 Tunai (Cash)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMetodeBayar('QR')}
                    className={`py-2.5 px-3 rounded-xl border font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                      metodeBayar === 'QR'
                        ? 'border-blue-600 bg-blue-50 text-blue-800 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span>📱 QRIS / Bank</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Catatan Pembayaran (Opsional)
                </label>
                <input
                  type="text"
                  value={catatanBayar}
                  onChange={(e) => setCatatanBayar(e.target.value)}
                  placeholder="Contoh: Cicilan pertama, titip teman, dll"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl text-[11px] text-slate-500">
                💡 Uang masuk senilai <b>{formatRp(Number(nominalBayar) || 0)}</b> akan otomatis ditambahkan ke laporan <b>Pembukuan Kas</b> hari ini.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedKasbon(null)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2.5 rounded-xl text-white font-bold text-sm shadow-sm transition active:scale-95 flex items-center gap-1.5 ${
                    tipeBayar === 'lunas'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {tipeBayar === 'lunas' ? 'Konfirmasi Lunas' : 'Simpan Pembayaran Sebagian'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: BAYAR TOTAL HUTANG PER NAMA PELANGGAN               */}
      {/* ============================================================ */}
      {selectedCustomerGroup && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Bayar Total Hutang Pelanggan</h3>
                <p className="text-xs text-slate-500">Pelanggan: <b className="text-slate-900">{selectedCustomerGroup.nama}</b></p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomerGroup(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSimpanGroupPembayaran} className="p-5 space-y-4">
              <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 text-xs space-y-1.5">
                <div className="flex justify-between text-amber-900">
                  <span>Nama Pembeli:</span>
                  <span className="font-bold">{selectedCustomerGroup.nama}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Jumlah Pesanan Belum Lunas:</span>
                  <span className="font-bold text-slate-900">{selectedCustomerGroup.transaksiBelumLunas.length} pesanan</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total Belanja Kasbon:</span>
                  <span className="font-bold text-slate-900">{formatRp(selectedCustomerGroup.totalHutangAwal)}</span>
                </div>
                {selectedCustomerGroup.totalSudahDibayar > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Sudah Dicicil Sebelumnya:</span>
                    <span>-{formatRp(selectedCustomerGroup.totalSudahDibayar)}</span>
                  </div>
                )}
                <div className="flex justify-between text-rose-700 font-black text-sm pt-1.5 border-t border-amber-200">
                  <span>GRAND TOTAL SISA HUTANG:</span>
                  <span className="text-base">{formatRp(selectedCustomerGroup.totalSisaHutang)}</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Nominal Pembayaran Diterima (Rp)
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Maks: {formatRp(selectedCustomerGroup.totalSisaHutang)}
                  </span>
                </div>

                <input
                  type="number"
                  min="1"
                  max={selectedCustomerGroup.totalSisaHutang}
                  required
                  value={groupNominalBayar}
                  onChange={(e) => setGroupNominalBayar(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-lg font-black text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />

                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[11px] text-slate-400 self-center">Pilihan:</span>
                  <button
                    type="button"
                    onClick={() => setGroupNominalBayar(selectedCustomerGroup.totalSisaHutang)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold transition shadow-xs"
                  >
                    Lunasi Seluruhnya ({formatRp(selectedCustomerGroup.totalSisaHutang)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setGroupNominalBayar(Math.round(selectedCustomerGroup.totalSisaHutang / 2))}
                    className="text-xs px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold transition"
                  >
                    50% ({formatRp(Math.round(selectedCustomerGroup.totalSisaHutang / 2))})
                  </button>
                </div>
              </div>

              {typeof groupNominalBayar === 'number' && groupNominalBayar > 0 && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-slate-500 block">Sisa Total Hutang Setelah Bayar:</span>
                    <span
                      className={`font-black text-sm ${
                        selectedCustomerGroup.totalSisaHutang - groupNominalBayar <= 0
                          ? 'text-emerald-700'
                          : 'text-rose-600'
                      }`}
                    >
                      {selectedCustomerGroup.totalSisaHutang - groupNominalBayar <= 0
                        ? 'Rp 0 (SEMUA HUTANG LUNAS)'
                        : formatRp(selectedCustomerGroup.totalSisaHutang - groupNominalBayar)}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Otomatis dialokasikan ke pesanan terlama
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Uang Diterima Melalui
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGroupMetodeBayar('Tunai')}
                    className={`py-2.5 px-3 rounded-xl border font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                      groupMetodeBayar === 'Tunai'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span>💵 Tunai (Cash)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGroupMetodeBayar('QR')}
                    className={`py-2.5 px-3 rounded-xl border font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                      groupMetodeBayar === 'QR'
                        ? 'border-blue-600 bg-blue-50 text-blue-800 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span>📱 QRIS / Bank</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Catatan Pembayaran (Opsional)
                </label>
                <input
                  type="text"
                  value={groupCatatanBayar}
                  onChange={(e) => setGroupCatatanBayar(e.target.value)}
                  placeholder="Contoh: Titip uang lewat istri, transfer bank, dll"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl text-[11px] text-slate-500">
                💡 Uang masuk senilai <b>{formatRp(Number(groupNominalBayar) || 0)}</b> akan otomatis ditambahkan ke laporan <b>Pembukuan Kas</b> hari ini.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCustomerGroup(null)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition active:scale-95 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Pembayaran Hutang</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
