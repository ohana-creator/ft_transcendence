export const VAKS_EXCHANGE_RATE = 1000; // 1000 KZS = 1 VAKS

export function kzsToVaks(kzs: number): number {
  return kzs / VAKS_EXCHANGE_RATE;
}

export function vaksToKzs(vaks: number): number {
  return vaks * VAKS_EXCHANGE_RATE;
}

export function formatVaks(vaks: number): string {
  return `${vaks.toFixed(2)} VAKS`;
}

export function formatKzs(kzs: number): string {
  return `${kzs.toLocaleString('pt-AO', { maximumFractionDigits: 2 })} KZS`;
}
