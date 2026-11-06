import React, { useState, useEffect } from 'react';
import { 
  Barang, 
  Penjualan, 
  TransaksiKeuangan, 
  PengaturanToko 
} from './types.ts';
import { 
  DEFAULT_BARANG, 
  getDefaultPenjualan, 
  getDefaultKeuangan, 
  DEFAULT_TOKO 
} from './utils/initialData.ts';
import { getTanggalHariIni, getWaktuSekarang } from './utils/format.ts';
import { TabPenjualan } from './components/TabPenjualan.tsx';
import { TabStok } from './components/TabStok.tsx';
import { TabPembukuan } from './components/TabPembukuan.tsx';
import { TabKasbon } from './components/TabKasbon.tsx';
import { TabLaporan } from './components/TabLaporan.tsx';
import { ModalStruk } from './components/ModalStruk.tsx';
import { ModalKonfirmasi } from './components/ModalKonfirmasi.tsx';
import { ModalPengaturan } from './components/ModalPengaturan.tsx';
import { ToastContainer, ToastMessage } from './components/Toast.tsx';
import { 
  ShoppingBag, 
  Package, 
  Wallet, 
  Clock, 
  BarChart3, 
  Settings, 
  RotateCcw,
  Store,
  Sparkles
} from 'lucide-react';

export default function App() {
  // --- Persistent States ---
  const [barangList, setBarangList] = useState<Barang[]>(() => {
    try {
      const saved = localStorage.getItem('barang');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_BARANG;
  });

  const [penjualanList, setPenjualanList] = useState<Penjualan[]>(() => {
    try {
      const saved = localStorage.getItem('jual');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return getDefaultPenjualan();
  });

  const [keuanganList, setKeuanganList] = useState<TransaksiKeuangan[]>(() => {
    try {
      const saved = localStorage.getItem('keu');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return getDefaultKeuangan();
  });

  const [toko, setToko] = useState<PengaturanToko>(() => {
    try {
      const saved = localStorage.getItem('toko_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_TOKO;
  });

  // --- Active Tab State ---
  type TabType = 'penjualan' | 'stok' | 'pembukuan' | 'kasbon' | 'laporan';
  const [activeTab, setActiveTab] = useState<TabType>('penjualan');

  // --- Modals State ---
  const [selectedSaleForStruk, setSelectedSaleForStruk] = useState<Penjualan | null>(null);
  const [showPengaturanModal, setShowPengaturanModal] = useState<boolean>(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // --- Toasts State ---
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // --- Sync to LocalStorage ---
  useEffect(() => {
    localStorage.setItem('barang', JSON.stringify(barangList));
  }, [barangList]);

  useEffect(() => {
    localStorage.setItem('jual', JSON.stringify(penjualanList));
  }, [penjualanList]);

  useEffect(() => {
    localStorage.setItem('keu', JSON.stringify(keuanganList));
  }, [keuanganList]);

  useEffect(() => {
    localStorage.setItem('toko_config', JSON.stringify(toko));
  }, [toko]);

  // --- Sales Handlers ---
  const handleTambahPenjualan = (sale: Penjualan, kurangiStok = true) => {
    // 1. Kurangi stok barang jika barangId ada
    if (kurangiStok && sale.barangId) {
      setBarangList((prev) =>
        prev.map((b) =>
          b.id === sale.barangId ? { ...b, stok: Math.max(0, b.stok - sale.jumlah) } : b
        )
      );
    }

    // 2. Tambah penjualan ke list
    setPenjualanList((prev) => [sale, ...prev]);

    // 3. Jika bukan Cashbon, otomatis catat uang masuk ke Keuangan
    if (sale.metode !== 'Cashbon') {
      const newKeu: TransaksiKeuangan = {
        id: `keu_auto_${sale.id}`,
        tgl: sale.tgl,
        waktu: sale.waktu || getWaktuSekarang(),
        jenis: 'masuk',
        kategori: 'Penjualan',
        metode: sale.metode === 'QR' ? 'QR' : 'Cash',
        ket: `Jual ${sale.barang} ${sale.jumlah} bks - ${sale.nama}`,
        nominal: sale.total,
        refJualId: sale.id,
      };
      setKeuanganList((prev) => [newKeu, ...prev]);
    }
  };

  const handleHapusPenjualan = (saleId: string) => {
    const target = penjualanList.find((j) => j.id === saleId);
    if (!target) return;

    // 1. Kembalikan stok barang
    setBarangList((prev) =>
      prev.map((b) => {
        if (b.id === target.barangId || b.nama === target.barang) {
          return { ...b, stok: b.stok + target.jumlah };
        }
        return b;
      })
    );

    // 2. Hapus catatan penjualan
    setPenjualanList((prev) => prev.filter((j) => j.id !== saleId));

    // 3. Hapus juga catatan otomatis di keuangan jika ada
    setKeuanganList((prev) =>
      prev.filter((k) => k.refJualId !== saleId && k.id !== `keu_auto_${saleId}`)
    );
  };

  const handleUpdatePenjualan = (updated: Penjualan) => {
    const previous = penjualanList.find((j) => j.id === updated.id);

    setPenjualanList((prev) =>
      prev.map((j) => (j.id === updated.id ? updated : j))
    );

    // Sinkronkan catatan keuangan otomatis jika metode pembayaran berubah
    if (previous) {
      const oldMetode = previous.metode;
      const newMetode = updated.metode;

      if (newMetode === 'Cashbon') {
        // Jika diubah menjadi Cashbon, hapus catatan uang masuk otomatis jika belum lunas
        if (updated.statusKasbon !== 'Lunas') {
          setKeuanganList((prev) =>
            prev.filter((k) => k.refJualId !== updated.id && k.id !== `keu_auto_${updated.id}`)
          );
        }
      } else {
        // Jika diubah menjadi Tunai atau QR
        const targetKeuMetode = newMetode === 'QR' ? 'QR' : 'Cash';
        setKeuanganList((prev) => {
          const exists = prev.some((k) => k.refJualId === updated.id || k.id === `keu_auto_${updated.id}`);
          if (exists) {
            return prev.map((k) => {
              if (k.refJualId === updated.id || k.id === `keu_auto_${updated.id}`) {
                return {
                  ...k,
                  metode: targetKeuMetode,
                  nominal: updated.total,
                  ket: `Jual ${updated.barang} ${updated.jumlah} bks - ${updated.nama} (${newMetode})`,
                };
              }
              return k;
            });
          } else {
            const newKeu: TransaksiKeuangan = {
              id: `keu_auto_${updated.id}`,
              tgl: updated.tgl,
              waktu: updated.waktu || getWaktuSekarang(),
              jenis: 'masuk',
              kategori: 'Penjualan',
              metode: targetKeuMetode,
              ket: `Jual ${updated.barang} ${updated.jumlah} bks - ${updated.nama} (${newMetode})`,
              nominal: updated.total,
              refJualId: updated.id,
            };
            return [newKeu, ...prev];
          }
        });
      }
    }
  };

  // --- Product Handlers ---
  const handleTambahBarang = (item: Barang) => {
    setBarangList((prev) => [item, ...prev]);
  };

  const handleUpdateBarang = (item: Barang) => {
    setBarangList((prev) =>
      prev.map((b) => (b.id === item.id ? item : b))
    );
  };

  const handleHapusBarang = (id: string) => {
    setBarangList((prev) => prev.filter((b) => b.id !== id));
  };

  // --- Keuangan Handlers ---
  const handleTambahKeuangan = (trans: TransaksiKeuangan) => {
    setKeuanganList((prev) => [trans, ...prev]);
  };

  const handleUpdateKeuangan = (updated: TransaksiKeuangan) => {
    setKeuanganList((prev) =>
      prev.map((k) => (k.id === updated.id ? updated : k))
    );
  };

  const handleHapusKeuangan = (id: string) => {
    setKeuanganList((prev) => prev.filter((k) => k.id !== id));
  };

  // --- Restore & Reset Handlers ---
  const handleRestoreData = (data: {
    toko?: PengaturanToko;
    barang?: Barang[];
    jual?: Penjualan[];
    keu?: TransaksiKeuangan[];
  }) => {
    if (data.toko) setToko(data.toko);
    if (data.barang) setBarangList(data.barang);
    if (data.jual) setPenjualanList(data.jual);
    if (data.keu) setKeuanganList(data.keu);
  };

  const handleResetData = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Reset ke Data Contoh?',
      message: 'Semua perubahan data saat ini akan diganti dengan data contoh awal.',
      onConfirm: () => {
        setBarangList(DEFAULT_BARANG);
        setPenjualanList(getDefaultPenjualan());
        setKeuanganList(getDefaultKeuangan());
        setToko(DEFAULT_TOKO);
        showToast('Data berhasil di-reset ke pengaturan awal', 'info');
      },
    });
  };

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm,
    });
  };

  // Badges count
  const unpaidKasbonCount = penjualanList.filter(
    (j) => j.metode === 'Cashbon' && j.statusKasbon !== 'Lunas'
  ).length;

  const lowStockCount = barangList.filter((b) => b.stok <= b.minStok).length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col antialiased selection:bg-emerald-500 selection:text-white pb-24 md:pb-12">
      {/* TOP HEADER */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Logo & Store Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-sm">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight tracking-tight">
                  {toko.namaToko}
                </h1>
                <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Bungkus POS
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate max-w-[200px] sm:max-w-xs">
                {toko.slogan || 'Pembukuan & Penjualan Bungkus'}
              </p>
            </div>
          </div>

          {/* Desktop Tab Switcher */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/60">
            <button
              type="button"
              onClick={() => setActiveTab('penjualan')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
                activeTab === 'penjualan'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Penjualan</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('stok')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 relative ${
                activeTab === 'stok'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Stok Bungkus</span>
              {lowStockCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 absolute top-1 right-1" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pembukuan')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
                activeTab === 'pembukuan'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Pembukuan Kas</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('kasbon')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 relative ${
                activeTab === 'kasbon'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Kasbon</span>
              {unpaidKasbonCount > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-black">
                  {unpaidKasbonCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('laporan')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
                activeTab === 'laporan'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Laporan</span>
            </button>
          </nav>

          {/* Quick Header Action */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPengaturanModal(true)}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-1.5"
              title="Pengaturan Warung & Cadangan Data"
            >
              <Settings className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">Pengaturan</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-6 flex-1">
        {activeTab === 'penjualan' && (
          <TabPenjualan
            barangList={barangList}
            penjualanList={penjualanList}
            onTambahPenjualan={handleTambahPenjualan}
            onUpdatePenjualan={handleUpdatePenjualan}
            onHapusPenjualan={handleHapusPenjualan}
            onOpenStruk={(sale) => setSelectedSaleForStruk(sale)}
            showToast={showToast}
            onConfirmHapus={triggerConfirm}
          />
        )}

        {activeTab === 'stok' && (
          <TabStok
            barangList={barangList}
            penjualanList={penjualanList}
            onTambahBarang={handleTambahBarang}
            onUpdateBarang={handleUpdateBarang}
            onHapusBarang={handleHapusBarang}
            onTambahKeuangan={handleTambahKeuangan}
            showToast={showToast}
            onConfirmHapus={triggerConfirm}
          />
        )}

        {activeTab === 'pembukuan' && (
          <TabPembukuan
            keuanganList={keuanganList}
            onTambahKeuangan={handleTambahKeuangan}
            onUpdateKeuangan={handleUpdateKeuangan}
            onHapusKeuangan={handleHapusKeuangan}
            showToast={showToast}
            onConfirmHapus={triggerConfirm}
          />
        )}

        {activeTab === 'kasbon' && (
          <TabKasbon
            penjualanList={penjualanList}
            toko={toko}
            onUpdatePenjualan={handleUpdatePenjualan}
            onTambahKeuangan={handleTambahKeuangan}
            showToast={showToast}
          />
        )}

        {activeTab === 'laporan' && (
          <TabLaporan
            barangList={barangList}
            penjualanList={penjualanList}
            keuanganList={keuanganList}
            onUpdateKeuangan={handleUpdateKeuangan}
            showToast={showToast}
          />
        )}
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 py-2 px-2 flex justify-around items-center shadow-lg">
        <button
          type="button"
          onClick={() => setActiveTab('penjualan')}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition ${
            activeTab === 'penjualan'
              ? 'text-emerald-700 font-extrabold'
              : 'text-slate-400 hover:text-slate-700 font-medium'
          }`}
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5">Penjualan</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('stok')}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition ${
            activeTab === 'stok'
              ? 'text-emerald-700 font-extrabold'
              : 'text-slate-400 hover:text-slate-700 font-medium'
          }`}
        >
          <div className="relative">
            <Package className="w-5 h-5" />
            {lowStockCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 absolute -top-0.5 -right-0.5" />
            )}
          </div>
          <span className="text-[10px] mt-0.5">Stok</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pembukuan')}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition ${
            activeTab === 'pembukuan'
              ? 'text-emerald-700 font-extrabold'
              : 'text-slate-400 hover:text-slate-700 font-medium'
          }`}
        >
          <Wallet className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Pembukuan</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('kasbon')}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition ${
            activeTab === 'kasbon'
              ? 'text-emerald-700 font-extrabold'
              : 'text-slate-400 hover:text-slate-700 font-medium'
          }`}
        >
          <div className="relative">
            <Clock className="w-5 h-5" />
            {unpaidKasbonCount > 0 && (
              <span className="px-1 py-0.2 bg-amber-500 text-white rounded-full text-[9px] font-black absolute -top-1.5 -right-2">
                {unpaidKasbonCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5">Kasbon</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('laporan')}
          className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition ${
            activeTab === 'laporan'
              ? 'text-emerald-700 font-extrabold'
              : 'text-slate-400 hover:text-slate-700 font-medium'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Laporan</span>
        </button>
      </nav>

      {/* MODALS */}
      <ModalStruk
        penjualan={selectedSaleForStruk}
        toko={toko}
        onClose={() => setSelectedSaleForStruk(null)}
        showToast={showToast}
      />

      <ModalKonfirmasi
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

      <ModalPengaturan
        isOpen={showPengaturanModal}
        toko={toko}
        barangList={barangList}
        penjualanList={penjualanList}
        keuanganList={keuanganList}
        onSaveToko={(updated) => setToko(updated)}
        onRestoreData={handleRestoreData}
        onResetData={handleResetData}
        onClose={() => setShowPengaturanModal(false)}
        showToast={showToast}
      />

      {/* TOAST NOTIFICATIONS */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
