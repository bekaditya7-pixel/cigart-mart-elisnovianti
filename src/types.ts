export interface Barang {
  id: string;
  nama: string;
  kategori: string;
  jual: number; // Harga Jual Normal
  hargaReseller?: number; // Harga Jual Khusus Reseller
  modal: number;
  stok: number;
  minStok: number;
}

export type MetodePembayaran = 'Tunai' | 'QR' | 'Cashbon';
export type StatusKasbon = 'Belum Lunas' | 'Bayar Sebagian' | 'Lunas';

export interface RiwayatCicilanKasbon {
  id: string;
  tgl: string; // YYYY-MM-DD
  waktu: string; // HH:mm
  nominal: number;
  metode: 'Tunai' | 'QR';
  catatan?: string;
}

export interface Penjualan {
  id: string;
  tgl: string; // YYYY-MM-DD
  waktu: string; // HH:mm
  nama: string;
  isReseller?: boolean; // Menandai jika transaksi untuk pembeli reseller
  tipeHarga?: 'Normal' | 'Reseller';
  barangId?: string;
  barang: string;
  jumlah: number;
  hargaSatuan: number;
  modalSatuan: number;
  metode: MetodePembayaran;
  total: number;
  untung: number;
  statusKasbon?: StatusKasbon;
  tglLunas?: string;
  metodeLunas?: 'Tunai' | 'QR';
  bayarTunai?: number;
  kembalian?: number;
  catatan?: string;
  // Fitur Bayar Sebagian (Cicilan Kasbon)
  sudahDibayar?: number;
  riwayatCicilan?: RiwayatCicilanKasbon[];
}

export type JenisKeuangan = 'masuk' | 'keluar';
export type MetodeKeuangan = 'Cash' | 'QR';

export interface TransaksiKeuangan {
  id: string;
  tgl: string;
  waktu: string;
  jenis: JenisKeuangan;
  kategori: string;
  metode: MetodeKeuangan;
  ket: string;
  nominal: number;
  refJualId?: string;
  // Khusus Dana Pinjaman:
  pemberiPinjaman?: string;
  jatuhTempoPinjaman?: string; // YYYY-MM-DD
  statusPinjaman?: 'Belum Lunas' | 'Lunas';
  sudahDibayarPinjaman?: number;
  tglLunasPinjaman?: string;
}

export interface PengaturanToko {
  namaToko: string;
  slogan: string;
  alamat: string;
  noHp: string;
}
