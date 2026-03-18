/**
 * Componente: ContribuicaoForm
 * Formulário para contribuir com VAKS para uma vaquinha
 * Permite escolher valor, adicionar mensagem e marcar como anónimo
 */

'use client';

import { useState } from 'react';
import { Heart, Send } from 'lucide-react';
import { useI18n } from '@/locales';

interface ContribuicaoFormProps {
  vaquinhaId: string;
  onSuccess?: () => void;
}

export default function ContribuicaoForm({ vaquinhaId, onSuccess }: ContribuicaoFormProps) {
  const { t } = useI18n();
  const dt = t.vaquinhas.detalhe;
  const [valor, setValor] = useState<string>('');
  const [mensagem, setMensagem] = useState<string>('');
  const [anonimo, setAnonimo] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // TODO: Implementar chamada à API para contribuir
    console.log('Contribuindo:', { vaquinhaId, valor, mensagem, anonimo });

    setTimeout(() => {
      setLoading(false);
      setValor('');
      setMensagem('');
      onSuccess?.();
    }, 1000);
  };

  return (
    <div className="bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card rounded-2xl shadow-lg p-6 border border-vaks-light-stroke/20 dark:border-vaks-dark-stroke/15">
      <h2 className="text-2xl font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt mb-6 flex items-center gap-2">
        <Heart className="w-6 h-6 text-vaks-light-purple-button dark:text-vaks-dark-purple-button" />
        {dt.contribuir_titulo}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Valor da contribuição */}
        <div>
          <label htmlFor="valor" className="block text-sm font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt mb-2">
            {dt.valor_vaks}
          </label>
          <input
            id="valor"
            type="number"
            step="0.01"
            min="0.01"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="10.00"
            required
            className="w-full px-4 py-3 bg-vaks-light-input dark:bg-vaks-dark-input border border-vaks-light-stroke/20 dark:border-vaks-dark-stroke/15 rounded-xl text-vaks-light-main-txt dark:text-vaks-dark-main-txt placeholder:text-vaks-light-alt-txt/50 dark:placeholder:text-vaks-dark-alt-txt/50 outline-none focus:ring-2 focus:ring-vaks-light-purple-button/30 dark:focus:ring-vaks-dark-purple-button/30 text-lg transition-shadow"
          />
        </div>

        {/* Valores sugeridos */}
        <div className="flex gap-2 flex-wrap">
          {[5, 10, 25, 50, 100].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setValor(v.toString())}
              className="px-4 py-2 bg-vaks-light-input dark:bg-vaks-dark-input text-vaks-light-main-txt dark:text-vaks-dark-main-txt border border-vaks-light-stroke/20 dark:border-vaks-dark-stroke/15 rounded-xl hover:bg-vaks-light-purple-button hover:text-white dark:hover:bg-vaks-dark-purple-button dark:hover:text-white transition-colors text-sm font-semibold"
            >
              {v} VAKS
            </button>
          ))}
        </div>

        {/* Mensagem opcional */}
        <div>
          <label htmlFor="mensagem" className="block text-sm font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt mb-2">
            {dt.mensagem_opcional}
          </label>
          <textarea
            id="mensagem"
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            placeholder={dt.placeholder_mensagem}
            rows={4}
            className="w-full px-4 py-3 bg-vaks-light-input dark:bg-vaks-dark-input border border-vaks-light-stroke/20 dark:border-vaks-dark-stroke/15 rounded-xl text-vaks-light-main-txt dark:text-vaks-dark-main-txt placeholder:text-vaks-light-alt-txt/50 dark:placeholder:text-vaks-dark-alt-txt/50 outline-none focus:ring-2 focus:ring-vaks-light-purple-button/30 dark:focus:ring-vaks-dark-purple-button/30 resize-none transition-shadow"
          />
        </div>

        {/* Contribuir anonimamente */}
        <div className="flex items-center gap-3">
          <input
            id="anonimo"
            type="checkbox"
            checked={anonimo}
            onChange={(e) => setAnonimo(e.target.checked)}
            className="w-5 h-5 rounded accent-vaks-light-purple-button dark:accent-vaks-dark-purple-button"
          />
          <label htmlFor="anonimo" className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt cursor-pointer">
            {dt.contribuir_anonimo}
          </label>
        </div>

        {/* Botão de envio */}
        <button
          type="submit"
          disabled={loading || !valor}
          className="w-full bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button text-white py-4 rounded-xl font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            dt.processando
          ) : (
            <>
              <Send className="w-5 h-5" />
              {dt.contribuir}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
