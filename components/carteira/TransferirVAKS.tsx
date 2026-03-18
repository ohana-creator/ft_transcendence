/**
 * Componente: TransferirVAKS
 * Formulário para transferir VAKS para outro usuário (peer-to-peer)
 * Permite buscar usuário e especificar valor
 */

'use client';

import { useState } from 'react';
import { Send, User, DollarSign, MessageSquare, Loader } from 'lucide-react';

interface TransferirVAKSProps {
  onTransferComplete?: () => void;
}

export default function TransferirVAKS({ onTransferComplete }: TransferirVAKSProps) {
  const [destinatario, setDestinatario] = useState<string>('');
  const [valor, setValor] = useState<string>('');
  const [nota, setNota] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    // TODO: Implementar chamada à API para transferir
    console.log('Transferindo:', { destinatario, valor, nota });

    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setDestinatario('');
      setValor('');
      setNota('');
      onTransferComplete?.();

      // Limpar mensagem de sucesso após 3s
      setTimeout(() => setSuccess(false), 3000);
    }, 1500);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-vaks-primary/10">
      <div className="flex items-center gap-2 mb-6">
        <div className="bg-vaks-secondary/10 p-2 rounded-lg">
          <Send className="w-5 h-5 text-vaks-secondary" />
        </div>
        <h3 className="text-2xl font-bold text-vaks-primary">
          Transferir VAKS
        </h3>
      </div>

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <div className="mt-0.5">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm font-medium text-green-800">
              Transferência enviada com sucesso!
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Destinatário */}
        <div>
          <label htmlFor="destinatario" className="block text-sm font-semibold text-vaks-primary mb-2">
            Para (Username ou Email)
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-vaks-blue-charcoal" />
            <input
              id="destinatario"
              type="text"
              value={destinatario}
              onChange={(e) => setDestinatario(e.target.value)}
              placeholder="@usuario ou email@exemplo.com"
              required
              className="w-full px-4 py-3 pl-10 border-2 border-vaks-platinum rounded-lg focus:outline-none focus:border-vaks-primary focus:ring-2 focus:ring-vaks-primary/20 transition-all"
            />
          </div>
        </div>

        {/* Valor */}
        <div>
          <label htmlFor="valor" className="block text-sm font-semibold text-vaks-primary mb-2">
            Valor (VAKS)
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-vaks-blue-charcoal" />
            <input
              id="valor"
              type="number"
              step="0.01"
              min="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="100.00"
              required
              className="w-full px-4 py-3 pl-10 border-2 border-vaks-platinum rounded-lg focus:outline-none focus:border-vaks-primary focus:ring-2 focus:ring-vaks-primary/20 transition-all"
            />
          </div>
        </div>

        {/* Valores rápidos */}
        <div className="grid grid-cols-3 gap-2">
          {[10, 50, 100].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setValor(v.toString())}
              className="px-3 py-2 bg-vaks-primary/10 text-vaks-primary rounded-lg hover:bg-vaks-primary/20 transition-colors text-sm font-semibold border border-vaks-primary/20"
            >
              {v} VAKS
            </button>
          ))}
        </div>

        {/* Nota opcional */}
        <div>
          <label htmlFor="nota" className="block text-sm font-semibold text-vaks-primary mb-2 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Mensagem (opcional)
          </label>
          <textarea
            id="nota"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Deixe uma mensagem para o destinatário..."
            rows={3}
            className="w-full px-4 py-3 border-2 border-vaks-platinum rounded-lg focus:outline-none focus:border-vaks-primary focus:ring-2 focus:ring-vaks-primary/20 transition-all resize-none"
          />
        </div>

        {/* Botão de envio */}
        <button
          type="submit"
          disabled={loading || !destinatario || !valor}
          className="w-full bg-gradient-to-r from-vaks-primary to-vaks-secondary text-white py-3 rounded-lg font-bold text-base hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
        >
          {loading ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              Transferir
            </>
          )}
        </button>
      </form>

      {/* Aviso de segurança */}
      <div className="mt-6 p-4 bg-vaks-primary/5 rounded-lg border border-vaks-primary/20">
        <p className="text-xs text-vaks-blue-charcoal leading-relaxed">
          <strong>🔒 Segurança:</strong> Transferências são instantâneas e não podem ser revertidas. Confirme o destinatário antes de enviar.
        </p>
      </div>
    </div>
  );
}
