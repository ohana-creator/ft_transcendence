import { Mail, X, Copy, Check, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '@/locales';

interface Invite {
  id: number;
  invitedEmail: string;
  inviterName: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  createdAt: string;
}

interface GerirConvitesModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: number;
  invites: Invite[];
  onSendInvite: (email: string) => void;
  onCancelInvite: (inviteId: number) => void;
}

export function GerirConvitesModal({
  isOpen,
  onClose,
  campaignId,
  invites,
  onSendInvite,
  onCancelInvite
}: GerirConvitesModalProps) {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSendInvite = async () => {
    if (!email.trim()) return;

    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      onSendInvite(email);
      setEmail('');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    const inviteLink = `${window.location.origin}/vaquinhas/privadas/${campaignId}/join`;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const pendingInvites = invites.filter(i => i.status === 'PENDING');
  const acceptedInvites = invites.filter(i => i.status === 'ACCEPTED');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-96 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-vaks-primary" />
            <h3 className="text-lg font-bold text-gray-900">{t.headings.invites}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Enviar Convite */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-gray-900">{t.headings.send_invite}</h4>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSendInvite();
                  }
                }}
                placeholder={t.placeholders.email_example}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-vaks-primary/20 focus:border-vaks-primary outline-none"
              />
              <button
                onClick={handleSendInvite}
                disabled={!email.trim() || loading}
                className="px-3 py-2 bg-vaks-primary text-white rounded-lg font-medium text-sm hover:bg-vaks-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '...' : t.buttons.send}
              </button>
            </div>
          </div>

          {/* Link de Convite */}
          <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-700">{t.labels.invite_link}</p>
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1 text-xs text-vaks-primary hover:text-vaks-secondary transition-colors"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? t.buttons.copied : t.buttons.copy}
              </button>
            </div>
            <p className="text-xs text-gray-600 break-all">
              {window.location.origin}/vaquinhas/privadas/{campaignId}/join
            </p>
          </div>

          {/* Convites Pendentes */}
          {pendingInvites.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-gray-900">
                {t.invitations.pending} ({pendingInvites.length})
              </h4>
              <div className="space-y-2">
                {pendingInvites.map(invite => (
                  <div key={invite.id} className="flex items-center justify-between p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                    <div>
                      <p className="text-gray-900">{invite.invitedEmail}</p>
                      <p className="text-xs text-gray-500">
                        {t.labels.invited_on} {new Date(invite.createdAt).toLocaleDateString('pt-AO')}
                      </p>
                    </div>
                    <button
                      onClick={() => onCancelInvite(invite.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title={t.titles.cancel_invite}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Convites Aceites */}
          {acceptedInvites.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-gray-900">
                {t.invitations.accepted} ({acceptedInvites.length})
              </h4>
              <div className="space-y-2">
                {acceptedInvites.map(invite => (
                  <div key={invite.id} className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200 rounded text-sm">
                    <div>
                      <p className="text-gray-900">{invite.invitedEmail}</p>
                      <p className="text-xs text-emerald-600">✓ {t.labels.member}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {invites.length === 0 && (
            <div className="text-center py-4">
              <Mail className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-500">{t.messages.no_invites_sent}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            {t.common.close}
          </button>
        </div>
      </div>
    </div>
  );
}
