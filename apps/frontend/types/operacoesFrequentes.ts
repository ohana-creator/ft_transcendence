// ─────────────────────────────────────────────────────────────────────────────
// Tipos do domínio — Operações Frequentes
// ─────────────────────────────────────────────────────────────────────────────

export type TipoOperacao =
  | "transferir"
  | "carregar"
  | "converter"
  | "contribuir";

// ── Payloads por tipo ────────────────────────────────────────────────────────

export interface PayloadTransferir {
  tipo: "transferir";
  iban: string;
  nomeDestinatario: string;
  valor: number;
  moeda?: string; // default "AOA"
}

export interface PayloadCarregar {
  tipo: "carregar";
  numeroTelefone: string;
  operadora: "Unitel" | "AFRICELL" | "Movicel";
  // valor não é guardado — varia por operação
}

export interface PayloadConverter {
  tipo: "converter";
  moedaOrigem: string;
  moedaDestino: string;
  valor: number;
}

export interface PayloadContribuir {
  tipo: "contribuir";
  vaquinhaId: string;
  nomeVaquinha: string;
  valor: number;
}

export type OperacaoPayload =
  | PayloadTransferir
  | PayloadCarregar
  | PayloadConverter
  | PayloadContribuir;

// ── Registo interno (armazenado) ─────────────────────────────────────────────

export interface OperacaoFrequenteRecord {
  /** ID único da operação frequente */
  id: string;
  /** Quantas vezes o utilizador executou esta operação com estes dados */
  contagem: number;
  /** Timestamp da última execução */
  ultimaExecucao: number;
  /** Dados da operação */
  payload: OperacaoPayload;
}

// ── Estado do hook ───────────────────────────────────────────────────────────

export interface OperacoesFrequentesState {
  /** Operações que já atingiram o threshold (≥3 usos) — máx. 5 */
  frequentes: OperacaoFrequenteRecord[];
  /** Todas as operações em tracking (incluindo as que ainda não atingiram threshold) */
  todas: OperacaoFrequenteRecord[];
}

// ── Configuração ─────────────────────────────────────────────────────────────

export const OPERACOES_CONFIG = {
  /** Número de usos para promover a "frequente" */
  THRESHOLD_USOS: 3,
  /** Máximo de operações exibidas no componente */
  MAX_FREQUENTES: 5,
  /** Chave do localStorage */
  STORAGE_KEY: "vaks:operacoes_frequentes",
} as const;

// ── Helpers de URL (query params) ────────────────────────────────────────────

/**
 * Converte um payload em query params para pré-preencher o formulário de destino.
 * Usado com `router.push` ou `<Link href={...}>`.
 */
export function payloadToQueryParams(payload: OperacaoPayload): string {
  const params = new URLSearchParams();

  switch (payload.tipo) {
    case "transferir":
      params.set("iban", payload.iban);
      params.set("destinatario", payload.nomeDestinatario);
      params.set("valor", String(payload.valor));
      if (payload.moeda) params.set("moeda", payload.moeda);
      break;

    case "carregar":
      params.set("telefone", payload.numeroTelefone);
      params.set("operadora", payload.operadora);
      break;

    case "converter":
      params.set("origem", payload.moedaOrigem);
      params.set("destino", payload.moedaDestino);
      params.set("valor", String(payload.valor));
      break;

    case "contribuir":
      params.set("vaquinha", payload.vaquinhaId);
      params.set("valor", String(payload.valor));
      break;
  }

  return params.toString();
}

/**
 * Retorna a rota base de cada tipo de operação.
 */
export function getRotaBase(tipo: TipoOperacao): string {
  const rotas: Record<TipoOperacao, string> = {
    transferir: "/carteira/transferir",
    carregar: "/carteira/carregar",
    converter: "/carteira/converter",
    contribuir: "/vaquinhas/contribuir",
  };
  return rotas[tipo];
}

/**
 * Gera o href completo (rota + query params) para uma operação frequente.
 */
export function getHrefOperacao(payload: OperacaoPayload): string {
  const base = getRotaBase(payload.tipo);
  const query = payloadToQueryParams(payload);
  return query ? `${base}?${query}` : base;
}

/**
 * Gera um ID determinístico baseado no payload (para deduplicação).
 * Operações com os mesmos dados principais geram o mesmo ID.
 */
export function gerarIdOperacao(payload: OperacaoPayload): string {
  switch (payload.tipo) {
    case "transferir":
      return `transferir:${payload.iban}:${payload.valor}`;
    case "carregar":
      return `carregar:${payload.numeroTelefone}:${payload.operadora}`;
    case "converter":
      return `converter:${payload.moedaOrigem}:${payload.moedaDestino}:${payload.valor}`;
    case "contribuir":
      return `contribuir:${payload.vaquinhaId}:${payload.valor}`;
  }
}