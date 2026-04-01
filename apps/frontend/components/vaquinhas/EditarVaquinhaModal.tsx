'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { api } from '@/utils/api/api';
import { toast } from '@/utils/toast';
import { useI18n } from '@/locales';

interface EditarVaquinhaModalProps {
  id: string;
  titulo: string;
  descricao: string;
  meta: number;
  deadline?: string | null;
  onSuccess: () => void;
  onClose: () => void;
}

export function EditarVaquinhaModal({
  id,
  titulo,
  descricao,
  meta,
  deadline,
  onSuccess,
  onClose,
}: EditarVaquinhaModalProps) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: titulo,
    description: descricao,
    goalAmount: meta || '',
    deadline: deadline ? new Date(deadline).toISOString().split('T')[0] : '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      const payload: any = {
        title: formData.title,
        description: formData.description,
      };

      if (formData.goalAmount) {
        payload.goalAmount = Number(formData.goalAmount);
      }

      if (formData.deadline) {
        payload.deadline = new Date(formData.deadline).toISOString();
      }

      await api.put(`/campaigns/${id}`, payload);
      
      toast.success(t.edit_campaign.success_title, t.edit_campaign.success_desc);
      
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(t.edit_campaign.error_title, err?.message || t.common.try_again);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-vaks-dark-primary rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
            {t.edit_campaign.modal_title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Título */}
          <div>
            <label className="block text-sm font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt mb-2">
              {t.edit_campaign.label_title}
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={t.edit_campaign.placeholder_title}
              maxLength={100}
              minLength={5}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-vaks-dark-input text-vaks-light-main-txt dark:text-vaks-dark-main-txt focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt mb-2">
              {t.edit_campaign.label_description}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t.edit_campaign.placeholder_description}
              maxLength={5000}
              minLength={20}
              required
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-vaks-dark-input text-vaks-light-main-txt dark:text-vaks-dark-main-txt focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>

          {/* Meta */}
          <div>
            <label className="block text-sm font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt mb-2">
              {t.edit_campaign.label_goal}
            </label>
            <input
              type="number"
              value={formData.goalAmount}
              onChange={(e) => setFormData({ ...formData, goalAmount: e.target.value })}
              placeholder="0.00"
              step="0.01"
              min="0.01"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-vaks-dark-input text-vaks-light-main-txt dark:text-vaks-dark-main-txt focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Data Limite */}
          <div>
            <label className="block text-sm font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt mb-2">
              {t.edit_campaign.label_deadline}
            </label>
            <input
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-vaks-dark-input text-vaks-light-main-txt dark:text-vaks-dark-main-txt focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-vaks-light-main-txt dark:text-vaks-dark-main-txt hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors font-semibold disabled:opacity-50"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg transition-colors font-semibold"
            >
              {loading ? t.edit_campaign.button_saving : t.edit_campaign.button_save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
