import { api } from '@/utils/api/api';
import { Carteira, Transacao } from '@/types';
import { kzsToVaks } from '@/utils/currency';

const WALLET_TOPUP_DEBUG_PREFIX = '[WalletTopupDebug]';

function walletTopupLog(step: string, payload?: unknown) {
  if (payload !== undefined) {
    return;
  }
}

type WalletCoreResponse = {
  id: string;
  userId: string;
  campaignId: string | null;
  balance: number | string;
  createdAt: string;
  updatedAt: string;
};

type WalletBalanceResponse = {
  balance: number | string;
  currency?: string;
};

type WalletTxApi = {
  id: string;
  fromWalletId: string | null;
  toWalletId: string | null;
  amount: string | number;
  type: 'P2P_TRANSFER' | 'CAMPAIGN_CONTRIBUTION' | 'CAMPAIGN_WITHDRAWAL' | 'DEPOSIT';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt?: string;
};

type WalletTxResponse =
  | { data: WalletTxApi[] }
  | { transactions: WalletTxApi[] }
  | WalletTxApi[];

type WalletCoreWrappedResponse =
  | WalletCoreResponse
  | { data: WalletCoreResponse };

type TransferResponse = WalletTxApi;

const WALLET_TRANSFER_DEBUG_PREFIX = '[WalletTransferDebug]';

function walletTransferLog(step: string, payload?: unknown) {
  if (payload !== undefined) {
    return;
  }
}

export type TopupMethod = 'referencia' | 'multicaixa' | 'visa';
export type TopupMode = 'checkout' | 'instant';

export type TopupResult = {
  id?: string;
  status?: string;
  reference?: string;
  checkoutUrl?: string;
  expiresAt?: string;
  raw: unknown;
};

export type WalletTransactionDetail = {
  id: string;
  fromWalletId: string | null;
  toWalletId: string | null;
  amount: number;
  type: WalletTxApi['type'];
  status: WalletTxApi['status'];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
};

/**
 * Normaliza balance/amount de string para número.
 *
 * Backend retorna balance como string (e.g., "150") em algumas respostas,
 * e como Decimal em outras. Função centralizada garante consistência.
 *
 * Usado em:
 * - getWalletBalance() → normaliza resposta da API
 * - getCarteiraData() → normaliza balance + transações
 * - mapWalletTxToTransacao() → normaliza amount de transações
 * - carregarCarteira() → valida amountKzs antes de enviar POST
 *
 * Exemplo: toNumber("150") → 150, toNumber(150) → 150
 */
function toNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value) || 0;
  return 0;
}

function mapStatus(status: string | undefined): Transacao['status'] {
  if (!status) return 'concluida';
  const normalized = status.toUpperCase();
  if (normalized === 'PENDING' || normalized === 'PENDENTE') return 'pendente';
  if (normalized === 'FAILED' || normalized === 'FALHOU') return 'falhou';
  return 'concluida';
}

function mapWalletTxToTransacao(tx: WalletTxApi, walletId: string): Transacao {
  const amount = Math.abs(toNumber(tx.amount));

  if (tx.type === 'CAMPAIGN_CONTRIBUTION') {
    return {
      id: tx.id,
      tipo: 'contribuicao',
      valor: amount,
      descricao: tx.metadata?.campaignTitle || tx.metadata?.campaignName || 'Contribuicao em campanha',
      origem: tx.metadata?.fromUsername,
      destino: tx.metadata?.campaignTitle,
      status: mapStatus(tx.status),
      criadoEm: new Date(tx.createdAt),
    };
  }

  if (tx.type === 'P2P_TRANSFER') {
    const sentByMe = tx.fromWalletId === walletId;
    return {
      id: tx.id,
      tipo: sentByMe ? 'transferencia' : 'recebimento',
      valor: amount,
      descricao: sentByMe
        ? (tx.metadata?.note || `Transferencia para ${tx.metadata?.toUsername || 'utilizador'}`)
        : (tx.metadata?.note || `Transferencia de ${tx.metadata?.fromUsername || 'utilizador'}`),
      origem: tx.metadata?.fromUsername,
      destino: tx.metadata?.toUsername,
      status: mapStatus(tx.status),
      criadoEm: new Date(tx.createdAt),
    };
  }

  return {
    id: tx.id,
    tipo: 'recebimento',
    valor: amount,
    descricao: tx.metadata?.note || (tx.type === 'DEPOSIT' ? 'Deposito' : 'Reembolso de campanha'),
    origem: tx.metadata?.source,
    destino: tx.metadata?.recipientUsername,
    status: mapStatus(tx.status),
    criadoEm: new Date(tx.createdAt),
  };
}

function extractTransactions(payload: WalletTxResponse): WalletTxApi[] {
  if (Array.isArray(payload)) return payload;
  if ('data' in payload && Array.isArray(payload.data)) return payload.data;
  if ('transactions' in payload && Array.isArray(payload.transactions)) return payload.transactions;
  return [];
}

function extractWallet(payload: WalletCoreWrappedResponse): WalletCoreResponse {
  if ('data' in payload && payload.data) return payload.data;
  return payload as WalletCoreResponse;
}

export async function getCarteiraData(): Promise<Carteira> {
  walletTopupLog('getCarteiraData:start');
  let wallet: WalletCoreResponse;

  try {
    const walletPayload = await api.get<WalletCoreWrappedResponse>('/wallet');
    wallet = extractWallet(walletPayload);
    walletTopupLog('getCarteiraData:wallet-loaded', {
      walletId: wallet.id,
      userId: wallet.userId,
      balance: wallet.balance,
    });
  } catch (err: unknown) {
    const maybeError = err as { status?: number; message?: string };
    walletTopupLog('getCarteiraData:wallet-error', {
      status: maybeError?.status,
      message: maybeError?.message,
      raw: err,
    });
    if (maybeError?.status === 404) {
      return {
        usuarioId: '',
        saldo: 0,
        saldoPendente: 0,
        transacoes: [],
      };
    }
    throw err;
  }

  let txs: WalletTxApi[] = [];
  try {
    const txPayload = await api.get<WalletTxResponse>('/wallet/transactions', {
      params: { page: 1, limit: 50 },
    });
    txs = extractTransactions(txPayload);
    walletTopupLog('getCarteiraData:transactions-loaded', {
      count: txs.length,
    });
  } catch (err: unknown) {
    const maybeError = err as { status?: number };
    walletTopupLog('getCarteiraData:transactions-error', {
      status: maybeError?.status,
      raw: err,
    });
    if (maybeError?.status !== 404) {
      throw err;
    }
  }

  const transacoes = txs.map((tx) => mapWalletTxToTransacao(tx, wallet.id));

  const saldoPendente = transacoes
    .filter((tx) => tx.status === 'pendente' && (tx.tipo === 'transferencia' || tx.tipo === 'contribuicao'))
    .reduce((acc, tx) => acc + tx.valor, 0);

  walletTopupLog('getCarteiraData:done', {
    saldo: toNumber(wallet.balance),
    saldoPendente,
    transacoes: transacoes.length,
  });

  return {
    usuarioId: wallet.userId,
    saldo: toNumber(wallet.balance),
    saldoPendente,
    transacoes,
  };
}

export async function getWalletBalance(): Promise<{ balance: number; currency: string }> {
  walletTopupLog('getWalletBalance:start');
  const payload = await api.get<WalletBalanceResponse>('/wallet/balance');
  walletTopupLog('getWalletBalance:done', {
    balance: payload.balance,
    currency: payload.currency || 'VAKS',
  });
  return {
    balance: toNumber(payload.balance),
    currency: payload.currency || 'VAKS',
  };
}

export async function getWalletTransactionById(transactionId: string): Promise<WalletTransactionDetail> {
  const tx = await api.get<WalletTxApi>(`/wallet/transactions/${transactionId}`);
  return {
    id: tx.id,
    fromWalletId: tx.fromWalletId,
    toWalletId: tx.toWalletId,
    amount: toNumber(tx.amount),
    type: tx.type,
    status: tx.status,
    metadata: (tx.metadata && typeof tx.metadata === 'object') ? tx.metadata : {},
    createdAt: tx.createdAt,
    updatedAt: tx.updatedAt,
  };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function transferirVaks(payload: {
  recipient: string;
  amount: number;
  note?: string;
}): Promise<void> {
  const recipient = payload.recipient.trim();
  const isUuid = UUID_REGEX.test(recipient);
  const isEmail = EMAIL_REGEX.test(recipient);
  walletTransferLog('transferirVaks:start', {
    recipient,
    amount: payload.amount,
    hasNote: Boolean(payload.note),
    isUuid,
    isEmail,
  });

  if (!recipient) {
    throw new Error('Destinatario obrigatorio. Informa um email ou UUID valido.');
  }

  if (!isUuid && !isEmail) {
    throw new Error('Destinatario invalido. Usa um email valido ou UUID.');
  }

  if (!Number.isFinite(payload.amount)) {
    throw new Error('Valor invalido.');
  }

  if (payload.amount < 0.01 || payload.amount > 1_000_000) {
    throw new Error('Valor deve estar entre 0.01 e 1000000.');
  }

  if (!/^\d+(\.\d{1,2})?$/.test(payload.amount.toString())) {
    throw new Error('Valor deve ter no maximo 2 casas decimais.');
  }

  if (payload.note && payload.note.length > 500) {
    throw new Error('Nota deve ter no maximo 500 caracteres.');
  }

  const requestPayload: Record<string, unknown> = {
    amount: payload.amount,
    note: payload.note || undefined,
    ...(isUuid ? { toUserId: recipient } : { toEmail: recipient.toLowerCase() }),
  };

  walletTransferLog('transferirVaks:request', requestPayload);

  await api.post<TransferResponse>('/wallet/transfer', requestPayload);
  walletTransferLog('transferirVaks:success', {
    recipientType: isUuid ? 'toUserId' : 'toEmail',
    recipient: isUuid ? recipient : recipient.toLowerCase(),
    amount: payload.amount,
  });
}

function mapTopupMethod(method: TopupMethod): string {
  if (method === 'referencia') return 'BANK_REFERENCE';
  if (method === 'multicaixa') return 'MULTICAIXA_EXPRESS';
  return 'CARD';
}

function normalizeCheckoutUrl(rawUrl: string | undefined): string | undefined {
  if (!rawUrl) return undefined;

  try {
    const fallbackOrigin = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3001';
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : fallbackOrigin;
    const url = new URL(rawUrl, currentOrigin);
    const current = new URL(currentOrigin);

    const isSameFrontendHost =
      url.hostname === current.hostname &&
      url.port === current.port;

    // Rotas internas de checkout devem voltar para a página principal da carteira.
    if (isSameFrontendHost && url.pathname.startsWith('/carteira/') && url.pathname !== '/carteira') {
      url.pathname = '/carteira';
    }

    return url.toString();
  } catch {
    return rawUrl;
  }
}

function normalizeTopupResult(payload: unknown): TopupResult {
  const data = payload as Record<string, unknown>;

  const checkoutUrlRaw = (data?.checkoutUrl || data?.paymentUrl || data?.url) as string | undefined;
  const checkoutUrl = normalizeCheckoutUrl(checkoutUrlRaw);
  const reference = (data?.reference || data?.paymentReference || data?.entityReference) as string | undefined;
  const status = (data?.status || data?.state) as string | undefined;
  const expiresAt = (data?.expiresAt || data?.expirationDate) as string | undefined;
  const id = (data?.id || data?.transactionId || data?.topupId) as string | undefined;

  return {
    id,
    status,
    reference,
    checkoutUrl,
    expiresAt,
    raw: payload,
  };
}

export async function carregarCarteira(payload: {
  amountKzs: number;
  method: TopupMethod;
  mode?: TopupMode;
}): Promise<TopupResult> {
  const amountKzs = toNumber(payload.amountKzs);
  const amountVaks = kzsToVaks(amountKzs);
  
  walletTopupLog('carregarCarteira:start', {
    amountKzs,
    amountVaks,
    method: payload.method,
    mode: payload.mode || 'checkout',
  });

  if (amountKzs <= 0) {
    walletTopupLog('carregarCarteira:invalid-amount', { amountKzs });
    throw new Error('Valor invalido para carregamento.');
  }

  const requestPayload = {
    amount: amountVaks,
    paymentMethod: mapTopupMethod(payload.method),
    mode: payload.mode || 'checkout',
  };

  walletTopupLog('carregarCarteira:request', requestPayload);

  try {
    const result = await api.post<unknown>('/wallet/topup', requestPayload);
    walletTopupLog('carregarCarteira:raw-response', result);

    const rawData = result as Record<string, unknown>;
    const rawCheckoutUrl = (rawData?.checkoutUrl || rawData?.paymentUrl || rawData?.url) as string | undefined;

    const normalized = normalizeTopupResult(result);
    walletTopupLog('carregarCarteira:normalized-response', {
      id: normalized.id,
      status: normalized.status,
      reference: normalized.reference,
      checkoutUrlRaw: rawCheckoutUrl,
      checkoutUrl: normalized.checkoutUrl,
      expiresAt: normalized.expiresAt,
    });

    return normalized;
  } catch (err: unknown) {
    const maybeError = err as { status?: number; message?: string; errors?: unknown };
    walletTopupLog('carregarCarteira:error', {
      status: maybeError?.status,
      message: maybeError?.message,
      errors: maybeError?.errors,
      raw: err,
    });
    throw err;
  }
}
