"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type OperacaoFrequenteRecord,
  type OperacaoPayload,
  type OperacoesFrequentesState,
  OPERACOES_CONFIG,
  gerarIdOperacao,
} from "@/types/operacoesFrequentes";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de persistência
// ─────────────────────────────────────────────────────────────────────────────

function lerDoStorage(): OperacaoFrequenteRecord[] {
  try {
    const raw = localStorage.getItem(OPERACOES_CONFIG.STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OperacaoFrequenteRecord[];
  } catch {
    return [];
  }
}

function salvarNoStorage(registros: OperacaoFrequenteRecord[]): void {
  try {
    localStorage.setItem(
      OPERACOES_CONFIG.STORAGE_KEY,
      JSON.stringify(registros)
    );
  } catch {
    // silently fail — storage pode estar cheio ou desactivado
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Selectors
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Filtra e ordena as operações que atingiram o threshold,
 * retornando no máximo MAX_FREQUENTES, ordenadas por uso recente.
 */
function selectFrequentes(
  todas: OperacaoFrequenteRecord[]
): OperacaoFrequenteRecord[] {
  return todas
    .filter((r) => r.contagem >= OPERACOES_CONFIG.THRESHOLD_USOS)
    .sort((a, b) => b.ultimaExecucao - a.ultimaExecucao)
    .slice(0, OPERACOES_CONFIG.MAX_FREQUENTES);
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export interface UseOperacoesFrequentesReturn extends OperacoesFrequentesState {
  /**
   * Regista uma execução de operação. Deve ser chamado sempre que o utilizador
   * confirmar/submeter uma operação com sucesso.
   *
   * @param payload — dados da operação executada
   */
  registarExecucao: (payload: OperacaoPayload) => void;

  /**
   * Remove manualmente uma operação frequente.
   * Útil para um eventual botão de "remover" no UI.
   */
  removerFrequente: (id: string) => void;

  /**
   * Limpa todo o histórico (para testes ou reset do utilizador).
   */
  limparHistorico: () => void;
}

export interface UseOperacoesFrequentesOptions {
  /**
   * Dados iniciais para desenvolvimento/testes.
   * Quando fornecido, é mesclado com o localStorage — os mocks
   * são tratados como já tendo atingido o threshold (contagem = THRESHOLD_USOS).
   * Em produção, simplesmente não passar este parâmetro.
   */
  initialMock?: OperacaoFrequenteRecord[];
}

export function useOperacoesFrequentes(
  options: UseOperacoesFrequentesOptions = {}
): UseOperacoesFrequentesReturn {
  const { initialMock } = options;

  const [todas, setTodas] = useState<OperacaoFrequenteRecord[]>([]);
  const [frequentes, setFrequentes] = useState<OperacaoFrequenteRecord[]>([]);

  // Hidratação inicial a partir do localStorage (client-side only)
  useEffect(() => {
    const doStorage = lerDoStorage();

    if (initialMock && initialMock.length > 0) {
      // Garante que os mocks têm contagem suficiente para aparecer como frequentes
      const mocksNormalizados = initialMock.map((r) => ({
        ...r,
        contagem: Math.max(r.contagem, OPERACOES_CONFIG.THRESHOLD_USOS),
      }));

      // Mescla: storage tem precedência sobre mock para o mesmo ID
      const idsDoStorage = new Set(doStorage.map((r) => r.id));
      const mocksNovos = mocksNormalizados.filter(
        (r) => !idsDoStorage.has(r.id)
      );
      const merged = [...doStorage, ...mocksNovos];

      setTodas(merged);
      setFrequentes(selectFrequentes(merged));
    } else {
      setTodas(doStorage);
      setFrequentes(selectFrequentes(doStorage));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sincroniza frequentes sempre que `todas` muda
  useEffect(() => {
    setFrequentes(selectFrequentes(todas));
  }, [todas]);

  // ── Registar execução ────────────────────────────────────────────────────

  const registarExecucao = useCallback((payload: OperacaoPayload) => {
    const id = gerarIdOperacao(payload);
    const agora = Date.now();

    setTodas((prev) => {
      const existente = prev.find((r) => r.id === id);

      let atualizado: OperacaoFrequenteRecord[];

      if (existente) {
        // Incrementa contagem e atualiza timestamp + payload (pode ter mudado o nome do destinatário, etc.)
        atualizado = prev.map((r) =>
          r.id === id
            ? {
                ...r,
                contagem: r.contagem + 1,
                ultimaExecucao: agora,
                payload, // atualiza para a versão mais recente
              }
            : r
        );
      } else {
        // Novo registo
        const novo: OperacaoFrequenteRecord = {
          id,
          contagem: 1,
          ultimaExecucao: agora,
          payload,
        };
        atualizado = [...prev, novo];
      }

      salvarNoStorage(atualizado);
      return atualizado;
    });
  }, []);

  // ── Remover frequente ────────────────────────────────────────────────────

  const removerFrequente = useCallback((id: string) => {
    setTodas((prev) => {
      // Ao remover, zeramos a contagem para que não volte a aparecer
      // até ser usada novamente THRESHOLD_USOS vezes
      const atualizado = prev.map((r) =>
        r.id === id ? { ...r, contagem: 0 } : r
      );
      salvarNoStorage(atualizado);
      return atualizado;
    });
  }, []);

  // ── Limpar histórico ─────────────────────────────────────────────────────

  const limparHistorico = useCallback(() => {
    localStorage.removeItem(OPERACOES_CONFIG.STORAGE_KEY);
    setTodas([]);
    setFrequentes([]);
  }, []);

  return {
    todas,
    frequentes,
    registarExecucao,
    removerFrequente,
    limparHistorico,
  };
}