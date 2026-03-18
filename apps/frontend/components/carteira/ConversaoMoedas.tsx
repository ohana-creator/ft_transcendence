/**
 * Componente: Conversor de Moedas
 * Converte entre Kwanza (KZS) e VAKS em tempo real
 * Taxa: 1000 KZS = 1 VAKS
 */

'use client';

import { useState, useEffect } from 'react';
import { kzsToVaks, vaksToKzs, VAKS_EXCHANGE_RATE } from '@/utils/currency';
import { ArrowRightLeft, DollarSign, Banknote } from 'lucide-react';

export default function ConversaoMoedas() {
  const [kzs, setKzs] = useState<string>('1000');
  const [vaks, setVaks] = useState<string>('1.00');
  const [ativo, setAtivo] = useState<'kzs' | 'vaks'>('kzs');

  // Quando KZS muda, atualizar VAKS
  const handleKzsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setKzs(valor);
    setAtivo('kzs');

    if (valor && !isNaN(parseFloat(valor))) {
      const vaksValor = kzsToVaks(parseFloat(valor));
      setVaks(vaksValor.toFixed(2));
    }
  };

  // Quando VAKS muda, atualizar KZS
  const handleVaksChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setVaks(valor);
    setAtivo('vaks');

    if (valor && !isNaN(parseFloat(valor))) {
      const kzsValor = vaksToKzs(parseFloat(valor));
      setKzs(kzsValor.toFixed(0));
    }
  };

  // Trocar valores (reverter)
  const handleSwap = () => {
    const temp = kzs;
    setKzs(vaks);
    setVaks(temp);
    setAtivo(ativo === 'kzs' ? 'vaks' : 'kzs');
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 border border-vaks-primary/10">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="bg-vaks-primary/10 p-3 rounded-lg">
            <ArrowRightLeft className="w-6 h-6 text-vaks-primary" />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-vaks-primary mb-2">
          Conversor de Moedas
        </h2>
        <p className="text-vaks-blue-charcoal">
          Converta entre Kwanza (KZS) e VAKS facilmente
        </p>
        <div className="mt-4 inline-block bg-vaks-secondary/10 px-4 py-2 rounded-lg">
          <p className="text-sm font-semibold text-vaks-secondary">
            Taxa de Câmbio: 1000 KZS = 1 VAKS
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Campo KZS */}
        <div>
          <label htmlFor="kzs" className="block text-sm font-semibold text-vaks-primary mb-3">
            Kwanza (KZS)
          </label>
          <div className="relative">
            <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-vaks-blue-charcoal" />
            <input
              id="kzs"
              type="number"
              value={kzs}
              onChange={handleKzsChange}
              className="w-full px-4 py-4 pl-12 text-lg font-semibold border-2 border-vaks-platinum rounded-xl focus:outline-none focus:border-vaks-primary focus:ring-2 focus:ring-vaks-primary/20 transition-all"
              placeholder="1000"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-vaks-blue-charcoal font-semibold">
              Kzs
            </span>
          </div>
          <p className="text-xs text-vaks-blue-charcoal mt-2">
            Moeda oficial de Angola
          </p>
        </div>

        {/* Botão de troca */}
        <div className="hidden md:flex justify-center">
          <button
            onClick={handleSwap}
            className="bg-gradient-to-r from-vaks-primary to-vaks-secondary text-white p-4 rounded-full hover:shadow-lg transition-all transform hover:scale-110 active:scale-95"
            title="Trocar moedas"
          >
            <ArrowRightLeft className="w-6 h-6" />
          </button>
        </div>

        {/* Campo VAKS */}
        <div>
          <label htmlFor="vaks" className="block text-sm font-semibold text-vaks-primary mb-3">
            VAKS (VAKS)
          </label>
          <div className="relative">
            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-vaks-secondary" />
            <input
              id="vaks"
              type="number"
              value={vaks}
              onChange={handleVaksChange}
              step="0.01"
              className="w-full px-4 py-4 pl-12 text-lg font-semibold border-2 border-vaks-platinum rounded-xl focus:outline-none focus:border-vaks-secondary focus:ring-2 focus:ring-vaks-secondary/20 transition-all"
              placeholder="1.00"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-vaks-secondary font-semibold">
              VAKS
            </span>
          </div>
          <p className="text-xs text-vaks-secondary mt-2">
            Moeda digital do VAKS
          </p>
        </div>
      </div>

      {/* Botão de troca móvel */}
      <div className="md:hidden mt-6 flex justify-center">
        <button
          onClick={handleSwap}
          className="bg-gradient-to-r from-vaks-primary to-vaks-secondary text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all font-semibold flex items-center gap-2"
        >
          <ArrowRightLeft className="w-4 h-4" />
          Trocar Moedas
        </button>
      </div>

      {/* Informações */}
      <div className="mt-8 grid grid-cols-2 gap-4">
        <div className="bg-vaks-primary/5 p-4 rounded-lg border border-vaks-primary/20">
          <p className="text-xs text-vaks-blue-charcoal mb-1">Equivalência</p>
          <p className="text-lg font-bold text-vaks-primary">
            1 VAKS
          </p>
          <p className="text-sm text-vaks-blue-charcoal">
            = 1.000 Kzs
          </p>
        </div>
        <div className="bg-vaks-secondary/5 p-4 rounded-lg border border-vaks-secondary/20">
          <p className="text-xs text-vaks-blue-charcoal mb-1">Sua Conversão</p>
          <p className="text-lg font-bold text-vaks-secondary">
            {parseFloat(vaks)} VAKS
          </p>
          <p className="text-sm text-vaks-blue-charcoal">
            = {kzs} Kzs
          </p>
        </div>
      </div>

      {/* Benefícios */}
      <div className="mt-8 p-6 bg-gradient-to-r from-vaks-primary/5 to-vaks-secondary/5 rounded-xl border border-vaks-primary/20">
        <h3 className="font-bold text-vaks-primary mb-3">Por que usar VAKS?</h3>
        <ul className="space-y-2 text-sm text-vaks-blue-charcoal">
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 bg-vaks-primary rounded-full"></span>
            Taxa de câmbio fixa e transparente (1000 KZS = 1 VAKS)
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 bg-vaks-primary rounded-full"></span>
            Transações instantâneas e seguras
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 bg-vaks-primary rounded-full"></span>
            Sem taxas adicionais nas conversões
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 bg-vaks-primary rounded-full"></span>
            Suporte a causas sociais através de vaquinhas
          </li>
        </ul>
      </div>
    </div>
  );
}
