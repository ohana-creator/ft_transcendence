'use client';

import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Check, X, Loader } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '@/locales';

export default function AceitarConvitePage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;
  const { t } = useI18n();
  const cv = t.vaquinhas.convite;

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'pending' | 'accepted' | 'rejected'>('pending');

  // Dados da vaquinha mockados
  const campaign = {
    id: parseInt(campaignId),
    title: 'Viagem em grupo para Zanzibar',
    description: 'Vamos poupar juntos para uma viagem inesquecível!',
    ownerUsername: 'joao',
    goalAmount: 5000.00,
    currentAmount: 3200.00,
    memberCount: 8
  };

  const handleAccept = async () => {
    setLoading(true);
    try {
      // TODO: Integrar com API - POST /invitations/:id/accept
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStatus('accepted');
      setTimeout(() => {
        router.push(`/vaquinhas/privadas/${campaignId}`);
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      // TODO: Integrar com API - POST /invitations/:id/reject
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStatus('rejected');
      setTimeout(() => {
        router.push('/vaquinhas/privadas');
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-vaks-primary/5 to-vaks-secondary/5">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-6 py-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            {cv.voltar}
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{cv.foi_convidado}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-12">
        {status === 'pending' && (
          <div className="bg-white rounded-lg border border-gray-100 p-8 shadow-lg">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-vaks-primary/10 rounded-full mb-6">
                <svg className="w-8 h-8 text-vaks-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h-2M10 10h-2m11-2v6m0 0v6m0-6h2m-2 0h-2m-11 0v6m0 0v6m0-6h2m-2 0h-2" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{campaign.title}</h2>
              <p className="text-gray-600">{cv.convidado_por} <span className="font-semibold">{campaign.ownerUsername}</span> {cv.para_participar}</p>
            </div>

            {/* Details */}
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">{cv.objetivo}</div>
                  <div className="text-lg font-bold text-gray-900">{campaign.goalAmount.toFixed(2)} VAKS</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">{cv.membros}</div>
                  <div className="text-lg font-bold text-gray-900">{campaign.memberCount}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">{cv.arrecadado}</div>
                  <div className="text-lg font-bold text-vaks-primary">{campaign.currentAmount.toFixed(2)} VAKS</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">{cv.progresso}</div>
                  <div className="text-lg font-bold text-gray-900">{Math.round((campaign.currentAmount / campaign.goalAmount) * 100)}%</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-vaks-primary to-vaks-secondary h-2 rounded-full"
                    style={{ width: `${Math.min(100, (campaign.currentAmount / campaign.goalAmount) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-8">
              <h3 className="font-semibold text-gray-900 mb-2">{cv.descricao}</h3>
              <p className="text-gray-600">{campaign.description}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleReject}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-4 h-4" />
                {cv.rejeitar}
              </button>
              <button
                onClick={handleAccept}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-vaks-primary text-white rounded-lg font-semibold hover:bg-vaks-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    {cv.processando}
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    {cv.aceitar}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {status === 'accepted' && (
          <div className="bg-white rounded-lg border border-emerald-200 bg-emerald-50 p-8 shadow-lg text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-6">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-emerald-900 mb-2">{cv.parabens}</h2>
            <p className="text-emerald-700 mb-6">{cv.membro_agora}</p>
            <div className="w-full bg-emerald-200 rounded-full h-1">
              <div className="bg-emerald-600 h-1 rounded-full animate-pulse" style={{ width: '100%' }} />
            </div>
          </div>
        )}

        {status === 'rejected' && (
          <div className="bg-white rounded-lg border border-gray-300 p-8 shadow-lg text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-6">
              <X className="w-8 h-8 text-gray-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{cv.convite_rejeitado}</h2>
            <p className="text-gray-600 mb-6">{cv.rejeitou_convite}</p>
            <button
              onClick={() => router.push('/vaquinhas/privadas')}
              className="px-6 py-2 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors"
            >
              {cv.voltar_vaquinhas}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
