/**
 * VAKS - Tipos TypeScript globais
 * Define as interfaces e tipos usados em toda a aplicação
 */

export interface Vaquinha {
  id: string;
  titulo: string;
  descricao: string;
  meta: number; // Valor meta em VAKS
  arrecadado: number; // Valor arrecadado em VAKS
  imagemUrl?: string;
  categoria: string;
  publica: boolean;
  ativa: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
  criador: Usuario;
  beneficiario?: string;
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  username: string;
  avatarUrl?: string;
  saldoVaks: number;
}

export interface Contribuicao {
  id: string;
  vaquinhaId: string;
  usuarioId: string;
  usuario: Usuario;
  valor: number; // Valor em VAKS
  mensagem?: string;
  anonimo: boolean;
  criadoEm: Date;
}

export interface Transacao {
  id: string;
  tipo: 'contribuicao' | 'transferencia' | 'recebimento' | 'cashback';
  valor: number;
  descricao: string;
  origem?: string;
  destino?: string;
  status: 'pendente' | 'concluida' | 'falhou';
  criadoEm: Date;
}

export interface Carteira {
  usuarioId: string;
  saldo: number;
  saldoPendente: number;
  transacoes: Transacao[];
}

export interface FiltrosVaquinha {
  categoria?: string;
  busca?: string;
  ordenacao?: 'recentes' | 'populares' | 'proximas-meta';
  pagina?: number;
  limite?: number;
}

export interface NotificacaoRealTime {
  tipo: 'nova_contribuicao' | 'meta_atingida' | 'transferencia_recebida';
  vaquinhaId?: string;
  contribuicao?: Contribuicao;
  mensagem: string;
  timestamp: Date;
}
