import { Settings, Save, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '@/locales';

interface VaquinhaSettings {
  title: string;
  description: string;
  goalAmount: number;
  goalVisible: boolean;
  minContribution: number;
  deadline: string;
}

interface GerirConfiguracoesModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: VaquinhaSettings;
  onSave: (settings: VaquinhaSettings) => void;
  canEdit: boolean;
}

export function GerirConfiguracoesModal({
  isOpen,
  onClose,
  settings: initialSettings,
  onSave,
  canEdit
}: GerirConfiguracoesModalProps) {
  const { t } = useI18n();
  const gc = t.gerirConfiguracoes;
  const [settings, setSettings] = useState<VaquinhaSettings>(initialSettings);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      setSettings(prev => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked
      }));
    } else if (type === 'number') {
      setSettings(prev => ({
        ...prev,
        [name]: parseFloat(value) || 0
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        [name]: value
      }));
    }
    setSaved(false);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // Simular API call
      onSave(settings);
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-96 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-vaks-primary" />
            <h3 className="text-lg font-bold text-gray-900">{gc.titulo}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {!canEdit && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-700">{gc.aviso_criador}</p>
            </div>
          )}

          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{gc.titulo_label}</label>
            <input
              type="text"
              name="title"
              value={settings.title}
              onChange={handleChange}
              disabled={!canEdit}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:bg-gray-50 disabled:text-gray-500"
              maxLength={100}
            />
            <div className="text-xs text-gray-500 mt-1">{settings.title.length}{gc.titulo_maxlength}</div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{gc.descricao_label}</label>
            <textarea
              name="description"
              value={settings.description}
              onChange={handleChange}
              disabled={!canEdit}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:bg-gray-50 disabled:text-gray-500"
              maxLength={5000}
            />
            <div className="text-xs text-gray-500 mt-1">{settings.description.length}{gc.descricao_maxlength}</div>
          </div>

          {/* Objetivo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{gc.objetivo_label}</label>
            <input
              type="number"
              name="goalAmount"
              value={settings.goalAmount}
              onChange={handleChange}
              disabled={!canEdit}
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          {/* Visibilidade do Objetivo */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="goalVisible"
              checked={settings.goalVisible}
              onChange={handleChange}
              disabled={!canEdit}
              className="w-4 h-4 text-vaks-primary rounded"
              id="goalVisible"
            />
            <label htmlFor="goalVisible" className="text-sm text-gray-700">
              {gc.objetivo_visivel}
            </label>
          </div>

          {/* Data Limite */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{gc.data_limite_label}</label>
            <input
              type="date"
              name="deadline"
              value={settings.deadline}
              onChange={handleChange}
              disabled={!canEdit}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          {/* Mínimo de Contribuição */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {gc.minimo_contribuicao_label}
            </label>
            <input
              type="number"
              name="minContribution"
              value={settings.minContribution}
              onChange={handleChange}
              disabled={!canEdit}
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:bg-gray-50 disabled:text-gray-500"
            />
            <p className="text-xs text-gray-500 mt-1">{gc.minimo_sem_limite}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 shrink-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            {gc.botao_cancelar}
          </button>
          <button
            onClick={handleSave}
            disabled={!canEdit || loading || saved}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-vaks-primary text-white rounded-lg font-medium hover:bg-vaks-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saved ? (
              <>
                <span>{gc.guardado}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{loading ? gc.guardando : gc.botao_guardar}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
