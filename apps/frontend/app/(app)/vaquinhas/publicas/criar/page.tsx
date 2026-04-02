'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Globe, Target, Calendar, Coins, ChevronRight, Sparkles, Tag, Eye, ImagePlus, X, Loader2 } from 'lucide-react';
import { useI18n } from '@/locales/useI18n';
import { PageTransition } from '@/components/PageTransition';
import { createCampaign } from '@/utils/campaigns';
import { uploadImage, validateImageFile, isValidImageUrl, normalizeUploadedImageUrl } from '@/utils/upload';

const IMAGE_DEBUG =
  process.env.NEXT_PUBLIC_DEBUG_CAMPAIGN_IMAGE === 'true' ||
  process.env.NODE_ENV !== 'production';

interface FormData {
  title: string;
  description: string;
  goalAmount: string;
  deadline: string;
  minContribution: string;
  categoria: string;
  imageUrl: string;
}

type ApiErrorLike = {
  message?: string | string[];
  errors?: Record<string, string[]>;
};

function getApiErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;

  if (error && typeof error === 'object') {
    const apiError = error as ApiErrorLike;

    if (Array.isArray(apiError.message) && apiError.message.length > 0) {
      return apiError.message.join(' | ');
    }

    if (typeof apiError.message === 'string' && apiError.message.trim()) {
      return apiError.message;
    }

    if (apiError.errors && typeof apiError.errors === 'object') {
      const firstFieldErrors = Object.values(apiError.errors)[0];
      if (Array.isArray(firstFieldErrors) && firstFieldErrors.length > 0) {
        return firstFieldErrors.join(' | ');
      }
    }
  }

  return 'Erro ao criar vaquinha';
}

export default function CriarVaquinhaPublicaPage() {
  const router = useRouter();
  const { t } = useI18n();
  const criar = t.criar.publicas;
  
  // Construir categorias a partir das locales
  const categorias = Object.entries(criar.informacoes.categorias).map(([value, label]) => ({
    value: value.charAt(0).toUpperCase() + value.slice(1),
    label,
  }));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    goalAmount: '',
    deadline: '',
    minContribution: '',
    categoria: '',
    imageUrl: '',
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeStep, setActiveStep] = useState(0);

  const fieldLabels: Record<string, string> = {
    title: 'nome da vaquinha',
    description: 'descricao',
    goalAmount: 'objetivo',
    deadline: 'data limite',
    categoria: 'categoria',
    image: 'imagem de capa',
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => {
      if (!prev[name] && !prev.submit) return prev;
      const next = { ...prev };
      delete next[name];
      delete next.submit;
      return next;
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar ficheiro localmente
    const validationError = validateImageFile(file);
    if (validationError) {
      setErrors(prev => ({ ...prev, image: validationError }));
      return;
    }

    // Mostrar preview local enquanto faz upload
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Guardar ficheiro para upload posterior
    setSelectedFile(file);
    setErrors(prev => {
      const next = { ...prev };
      delete next.image;
      return next;
    });
  };

  const removeImage = () => {
    setImagePreview(null);
    setSelectedFile(null);
    setFormData(prev => ({ ...prev, imageUrl: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (formData.title.length < 5 || formData.title.length > 100) {
      newErrors.title = 'Título deve ter entre 5 e 100 caracteres';
    }
    if (formData.description.length < 20 || formData.description.length > 5000) {
      newErrors.description = 'Descrição deve ter entre 20 e 5000 caracteres';
    }
    if (formData.goalAmount && parseFloat(formData.goalAmount) <= 0) {
      newErrors.goalAmount = 'Objetivo deve ser maior que 0';
    }
    if (formData.deadline) {
      const deadline = new Date(formData.deadline);
      if (deadline <= new Date()) {
        newErrors.deadline = 'Data limite deve ser no futuro';
      }
    }
    if (!formData.categoria) {
      newErrors.categoria = 'Selecione uma categoria';
    }

    const invalidFields = Object.keys(newErrors);
    if (invalidFields.length > 0) {
      const labels = invalidFields.map((field) => fieldLabels[field] || field);
      newErrors.submit = `Nao foi possivel criar. Corrija: ${labels.join(', ')}.`;
    }

    setErrors(newErrors);
    return invalidFields.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    
    try {
      let finalImageUrl: string | undefined;

      if (IMAGE_DEBUG) {
      }

      // Se há ficheiro selecionado, fazer upload primeiro
      if (selectedFile) {
        setUploadingImage(true);
        try {
          finalImageUrl = await uploadImage(selectedFile);
          if (IMAGE_DEBUG) {
          }
        } catch (uploadError) {
          if (IMAGE_DEBUG) {
          }
          const err = uploadError as { message?: string };
          setErrors(prev => ({ ...prev, image: err.message || 'Falha no upload da imagem' }));
          setLoading(false);
          setUploadingImage(false);
          return;
        }
        setUploadingImage(false);
      } else if (formData.imageUrl && !formData.imageUrl.startsWith('data:')) {
        // Se tem URL válida (não base64), usa diretamente
        finalImageUrl = formData.imageUrl;
      }

      if (finalImageUrl) {
        finalImageUrl = normalizeUploadedImageUrl(finalImageUrl);
      }

      if (finalImageUrl && !isValidImageUrl(finalImageUrl)) {
        if (IMAGE_DEBUG) {
        }
        setErrors(prev => ({ ...prev, image: 'A imagem retornada não é uma URL pública válida.' }));
        setLoading(false);
        return;
      }
      
      const campaignPayload = {
        title: formData.title,
        description: formData.description,
        isPrivate: false,
        goalAmount: formData.goalAmount ? parseFloat(formData.goalAmount) : undefined,
        goalVisible: true,
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : undefined,
        ...(finalImageUrl ? { imageUrl: finalImageUrl } : {}),
      };

      if (IMAGE_DEBUG) {
      }

      const campaign = await createCampaign(campaignPayload);
      if (IMAGE_DEBUG) {
      }
      router.push(campaign.isPrivate ? `/vaquinhas/privadas/${campaign.id}` : `/vaquinhas/${campaign.id}`);
    } catch (error) {
      if (IMAGE_DEBUG) {
      }
      const errorMessage = getApiErrorMessage(error);
      setErrors(prev => ({ ...prev, submit: errorMessage }));
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { icon: Sparkles, label: criar.informacoes.label },
    { icon: Target, label: criar.regras.label },
  ];

  const completionPercent =
    [formData.title, formData.description, formData.goalAmount, formData.deadline, formData.categoria]
      .filter(Boolean).length * 20;

  return (
    <div className="min-h-screen bg-vaks-light-primary dark:bg-vaks-dark-primary">
      {/* ─── Hero Banner ──────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/assets/assets1.jpg"
            alt="Equipa a colaborar"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-r from-purple-900/80 via-purple-800/70 to-pink-700/60" />
        </div>
        <div className="relative mx-auto max-w-4xl px-6 py-14 md:py-20">
          {/* <button
            onClick={() => router.back()}
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-white/80 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button> */}
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <Globe className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold leading-tight text-white md:text-4xl">
                {criar.titulo}
              </h1>
              <p className="mt-1 text-base text-white/80">
                {criar.descricao}
              </p>
            </div>
          </div>
        </div>
      </div>
      <PageTransition>

      {/* ─── Steps indicator + Completion ─── */}
      <div className="relative z-10 mx-auto -mt-6 max-w-4xl px-6">
        <div className="flex items-center gap-4 rounded-2xl border border-vaks-light-purple-card-hover dark:border-vaks-dark-purple-card-hover bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card p-4 shadow-lg">
          {steps.map((step, i) => (
            <button
              key={step.label}
              onClick={() => setActiveStep(i)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-300 ${
                activeStep === i
                  ? 'bg-linear-to-r from-violet-700 via-violet-600 to-violet-500 text-white shadow-lg shadow-violet-500/25'
                  : 'text-vaks-light-main-txt dark:text-vaks-dark-main-txt hover:bg-gray-100 hover:text-gray-700'
              }`}
            >
              <step.icon className="h-4 w-4" />
              {step.label}
            </button>
          ))}
          <div className="hidden items-center gap-3 border-l border-gray-200 pl-4 sm:flex">
            <div className="h-2.5 w-24 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-linear-to-r from-violet-700 via-violet-600 to-violet-500 transition-all duration-700"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <span className="text-xs font-bold text-purple-600">{completionPercent}%</span>
          </div>
        </div>
      </div>

      {/* ─── Form ─────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-4xl px-6 py-10">
        <form onSubmit={handleSubmit} className="space-y-8">

          {/* ── Step 0: Informações Básicas ── */}
          {activeStep === 0 && (
            <div className="space-y-6">
              <div className="group rounded-3xl border border-vaks-light-purple-card-hover dark:border-vaks-dark-purple-card-hover bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card p-8 shadow-sm transition-all duration-300 hover:shadow-xl">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-linear-to-br from-violet-700 via-violet-600 to-violet-500 shadow-lg shadow-violet-300 transition-transform group-hover:scale-110">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-extrabold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{criar.informacoes.titulo}</h2>
                </div>

                <div className="space-y-5">
                  {/* Título */}
                  <div>
                    <label className="mb-2 flex items-center gap-1 text-sm font-medium text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                      {criar.informacoes.nome}
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      placeholder={criar.informacoes.placeholder_nome}
                      maxLength={100}
                      className={`w-full rounded-2xl border bg-vaks-light-input dark:bg-vaks-dark-input px-5 py-3.5 text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt outline-none transition-all focus:ring-2 focus:ring-purple-300 focus:border-purple-400 shadow-sm ${
                        errors.title ? 'border-red-300' : 'border-vaks-light-stroke dark:border-vaks-dark-stroke'
                      }`}
                    />
                    <div className="mt-2 flex justify-between">
                      {errors.title && (
                        <span className="text-sm text-red-500">{errors.title}</span>
                      )}
                      <span className="ml-auto text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{formData.title.length}/100</span>
                    </div>
                  </div>

                  {/* Descrição */}
                  <div>
                    <label className="mb-2 flex items-center gap-1 text-sm font-medium text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                      {criar.informacoes.descricao}
                      <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder={criar.informacoes.placeholder_descricao}
                      rows={5}
                      maxLength={5000}
                      className={`w-full resize-none rounded-2xl border bg-vaks-light-input dark:bg-vaks-dark-input px-5 py-3.5 text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt outline-none transition-all focus:ring-2 focus:ring-purple-300 focus:border-purple-400 shadow-sm ${
                        errors.description ? 'border-red-300' : 'border-vaks-light-stroke dark:border-vaks-dark-stroke'
                      }`}
                    />
                    <div className="mt-2 flex justify-between">
                      {errors.description && (
                        <span className="text-sm text-red-500">{errors.description}</span>
                      )}
                      <span className="ml-auto text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{formData.description.length}/5000</span>
                    </div>
                  </div>

                  {/* Categoria */}
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                      <Tag className="h-4 w-4 text-purple-500" />
                      {criar.informacoes.categoria}
                      <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {categorias.map((cat) => (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, categoria: cat.value }))}
                          className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition-all duration-300 ${
                            formData.categoria === cat.value
                              ? 'border-violet-400 bg-linear-to-r from-violet-700 via-violet-600 to-violet-500 text-white shadow-lg shadow-violet-500/25'
                              : 'border-vaks-light-stroke dark:border-vaks-dark-stroke bg-vaks-light-input dark:bg-vaks-dark-input text-vaks-light-main-txt dark:text-vaks-dark-main-txt hover:border-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/20'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                    {errors.categoria && (
                      <span className="mt-2 block text-sm text-red-500">{errors.categoria}</span>
                    )}
                  </div>
                </div>

                {/* Next step */}
                <div className="mt-8 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveStep(1)}
                    className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-violet-700 via-violet-600 to-violet-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition-all duration-300 hover:scale-105 hover:shadow-xl"
                  >
                    {criar.informacoes.seguinte}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 1: Regras da Vaquinha ── */}
          {activeStep === 1 && (
            <div className="space-y-6">
              <div className="group rounded-3xl border border-vaks-light-purple-card-hover dark:border-vaks-dark-purple-card-hover bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card p-8 shadow-sm transition-all duration-300 hover:shadow-xl">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-linear-to-br from-violet-700 via-violet-600 to-violet-500 shadow-lg shadow-violet-300 transition-transform group-hover:scale-110">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-extrabold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{criar.regras.titulo}</h2>
                </div>

                <div className="space-y-5">
                  {/* Objetivo */}
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                      <Coins className="h-4 w-4 text-purple-500" />
                      {criar.regras.objetivo} (VAKS)
                    </label>
                    <input
                      type="number"
                      name="goalAmount"
                      value={formData.goalAmount}
                      onChange={handleChange}
                      placeholder={t.placeholders.ex_5000}
                      step="0.01"
                      min="0"
                      className={`w-full rounded-2xl border bg-vaks-light-input dark:bg-vaks-dark-input px-5 py-3.5 text-sm text-vaks-light-main-txt dark:text-vaks-dark-main-txt outline-none transition-all focus:ring-2 focus:ring-purple-300 focus:border-purple-400 shadow-sm ${
                        errors.goalAmount ? 'border-red-300' : 'border-vaks-light-stroke dark:border-vaks-dark-stroke'
                      }`}
                    />
                    {errors.goalAmount && (
                      <span className="mt-1 block text-sm text-red-500">{errors.goalAmount}</span>
                    )}
                  </div>

                  {/* Data Limite */}
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                      <Calendar className="h-4 w-4 text-purple-500" />
                      {criar.regras.data_resumo}
                    </label>
                    <input
                      type="date"
                      name="deadline"
                      value={formData.deadline}
                      onChange={handleChange}
                      className={`w-full rounded-2xl border bg-vaks-light-input dark:bg-vaks-dark-input px-5 py-3.5 text-sm text-vaks-light-main-txt dark:text-vaks-dark-main-txt outline-none transition-all focus:ring-2 focus:ring-purple-300 focus:border-purple-400 shadow-sm ${
                        errors.deadline ? 'border-red-300' : 'border-vaks-light-stroke dark:border-vaks-dark-stroke'
                      }`}
                    />
                    {errors.deadline && (
                      <span className="mt-1 block text-sm text-red-500">{errors.deadline}</span>
                    )}
                  </div>

                  {/* Mínimo de Contribuição */}
                  <div>
                    <label className="mb-2 text-sm font-medium text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                      {criar.regras.minimo}
                    </label>
                    <input
                      type="number"
                      name="minContribution"
                      value={formData.minContribution}
                      onChange={handleChange}
                      placeholder={t.placeholders.ex_10}
                      step="0.01"
                      min="0"
                      className="w-full rounded-2xl border border-vaks-light-stroke dark:border-vaks-dark-stroke bg-vaks-light-input dark:bg-vaks-dark-input px-5 py-3.5 text-sm text-vaks-light-main-txt dark:text-vaks-dark-main-txt shadow-sm outline-none transition-all focus:border-purple-400 focus:ring-2 focus:ring-purple-300"
                    />
                    <p className="mt-1.5 text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{criar.regras.alerta}</p>
                  </div>
                </div>

                {/* Navigation */}
                <div className="mt-8 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveStep(0)}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {criar.regras.anterior}
                  </button>
                </div>
              </div>

              {/* ── Resumo ── */}
              <div className="overflow-hidden rounded-3xl border border-vaks-light-purple-card-hover dark:border-vaks-dark-purple-card-hover bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card p-8">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-linear-to-br from-violet-700 via-violet-600 to-violet-500 shadow-lg shadow-violet-300">
                    <Eye className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-extrabold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{criar.regras.resumo}</h3>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-vaks-light-purple-card-hover dark:bg-vaks-dark-purple-card-hover p-4 backdrop-blur-sm">
                    <p className="text-xs font-medium uppercase tracking-wider text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{criar.regras.titulo_resumo}</p>
                    <p className="mt-1 text-base font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{formData.title || '—'}</p>
                  </div>
                  <div className="rounded-2xl bg-vaks-light-purple-card-hover dark:bg-vaks-dark-purple-card-hover p-4 backdrop-blur-sm">
                    <p className="text-xs font-medium uppercase tracking-wider text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{criar.regras.objetivo_resumo}</p>
                    <p className="mt-1 text-base font-bold text-purple-600">
                      {formData.goalAmount ? `${parseFloat(formData.goalAmount).toLocaleString()} VAKS` : '—'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-vaks-light-purple-card-hover dark:bg-vaks-dark-purple-card-hover p-4 backdrop-blur-sm">
                    <p className="text-xs font-medium uppercase tracking-wider text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{criar.regras.data_resumo}</p>
                    <p className="mt-1 text-base font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                      {formData.deadline ? new Date(formData.deadline).toLocaleDateString('pt-PT') : '—'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-vaks-light-purple-card-hover dark:bg-vaks-dark-purple-card-hover p-4 backdrop-blur-sm">
                    <p className="text-xs font-medium uppercase tracking-wider text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{criar.regras.categoria_resumo}</p>
                    <p className="mt-1 text-base font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                      {formData.categoria
                        ? categorias.find(c => c.value === formData.categoria)?.label
                        : '—'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-vaks-light-purple-card-hover dark:bg-vaks-dark-purple-card-hover p-4 backdrop-blur-sm sm:col-span-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{criar.regras.visibilidade_resumo}</p>
                    <p className="mt-1 flex items-center gap-2 text-base font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                      <Globe className="h-4 w-4 text-violet-500" />
                      {criar.regras.visibilidade}
                    </p>
                  </div>
                </div>
              </div>

              {/* ── Submit Buttons ── */}
              {errors.submit && (
                <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errors.submit}
                </div>
              )}

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex-1 rounded-2xl bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card px-6 py-3.5 text-sm font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt shadow-sm transition-all hover:bg-gray-50 dark:hover:bg-purple-900 hover:shadow-md"
                >
                  {criar.regras.cancelar}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-2xl bg-linear-to-r from-violet-700 via-violet-600 to-violet-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition-all duration-300 hover:scale-[1.01] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? t.vaquinhas.criar_comum.criando : criar.regras.criar}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
      </PageTransition>
    </div>
  );
}
