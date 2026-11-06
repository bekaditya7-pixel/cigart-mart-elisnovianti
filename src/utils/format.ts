// Currency formatter for Indonesian Rupiah
export function formatRp(n: number | undefined | null): string {
  const val = Math.round(Number(n || 0));
  return 'Rp ' + val.toLocaleString('id-ID');
}

export function formatAngka(n: number | undefined | null): string {
  return Number(n || 0).toLocaleString('id-ID');
}

// Get current date formatted as YYYY-MM-DD
export function getTanggalHariIni(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get current time formatted as HH:mm
export function getWaktuSekarang(): string {
  const d = new Date();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${mins}`;
}

// Format date nicely in Indonesian (e.g., "12 Nov 2026")
export function formatTanggalIndo(tglStr: string): string {
  if (!tglStr) return '-';
  try {
    const parts = tglStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
        'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
      ];
      const month = monthNames[parseInt(parts[1], 10) - 1] || parts[1];
      const day = parts[2];
      return `${day} ${month} ${year}`;
    }
    return tglStr;
  } catch {
    return tglStr;
  }
}

// Generate unique ID
export function generateId(prefix = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

// Export CSV helper with UTF-8 BOM so Excel opens it with Indonesian characters/accents properly
export function downloadCSV(filename: string, csvContent: string): void {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Kasbon calculation helpers (fully backwards compatible with existing data)
export function hitungSudahDibayar(j: { total: number; statusKasbon?: string; sudahDibayar?: number; riwayatCicilan?: { nominal: number }[] }): number {
  if (j.statusKasbon === 'Lunas') return j.total;
  if (typeof j.sudahDibayar === 'number') return j.sudahDibayar;
  if (j.riwayatCicilan && j.riwayatCicilan.length > 0) {
    return j.riwayatCicilan.reduce((sum, c) => sum + c.nominal, 0);
  }
  return 0;
}

export function hitungSisaHutang(j: { total: number; statusKasbon?: string; sudahDibayar?: number; riwayatCicilan?: { nominal: number }[] }): number {
  if (j.statusKasbon === 'Lunas') return 0;
  const sudah = hitungSudahDibayar(j);
  return Math.max(0, j.total - sudah);
}

