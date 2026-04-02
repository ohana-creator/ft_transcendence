/**
 * Serviço de Upload de Imagens
 * Faz upload para /campaigns/upload/image e retorna a URL pública
 */

import { ApiClient, api } from '@/utils/api/api';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const IMAGE_DEBUG =
  process.env.NEXT_PUBLIC_DEBUG_CAMPAIGN_IMAGE === 'true' ||
  process.env.NODE_ENV !== 'production';

function debugLog(message: string, data?: unknown): void {
  if (!IMAGE_DEBUG) return;
  if (data !== undefined) {
    return;
  }
}

export interface UploadResult {
  imageUrl: string;
}

export interface UploadError {
  status: number;
  message: string;
}

function resolveApiOrigin(baseUrl: string): string {
  try {
    return new URL(baseUrl).origin;
  } catch {
    // Base URL relativo (ex.: /api) em ambiente browser
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }

    // Fallback para ambiente sem window
    return 'http://localhost:3000';
  }
}

function toAbsoluteImageUrl(url: string, baseUrl: string): string {
  const trimmed = url.trim();

  if (!trimmed) return trimmed;

  const rewriteCampaignPath = (path: string): string => {
    if (path.startsWith('/api/campaigns/')) {
      return path.replace('/api/campaigns/', '/uploads/campaigns/');
    }
    if (path.startsWith('api/campaigns/')) {
      return path.replace('api/campaigns/', 'uploads/campaigns/');
    }
    return path;
  };

  const normalizeHost = (rawUrl: string): string => {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.hostname === 'localhost') {
        parsed.hostname = '127.0.0.1';
      }
      parsed.pathname = rewriteCampaignPath(parsed.pathname);
      return parsed.toString();
    } catch {
      return rawUrl;
    }
  };

  // Ex.: "localhost:3001/uploads/x.jpg" -> "https://127.0.0.1:3001/uploads/x.jpg"
  if (/^localhost:\d+\//i.test(trimmed)) {
    return normalizeHost(`https://${trimmed}`);
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return normalizeHost(trimmed);
  }

  try {
    const apiOrigin = resolveApiOrigin(baseUrl);
    const relativePath = rewriteCampaignPath(trimmed);
    const absolute = new URL(relativePath, apiOrigin).toString();
    return normalizeHost(absolute);
  } catch {
    return trimmed;
  }
}

/**
 * Valida o ficheiro antes do upload
 */
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `Tipo de ficheiro não suportado. Use JPEG, PNG ou WebP.`;
  }

  if (file.size > MAX_SIZE_BYTES) {
    return `Ficheiro muito grande. Máximo ${MAX_SIZE_MB}MB.`;
  }

  return null;
}

/**
 * Faz upload de uma imagem para o backend
 * @param file - Ficheiro de imagem a enviar
 * @returns URL pública da imagem
 */
export async function uploadImage(file: File): Promise<string> {
  debugLog('upload start', {
    name: file.name,
    type: file.type,
    size: file.size,
  });

  // Validar ficheiro
  const validationError = validateImageFile(file);
  if (validationError) {
    debugLog('upload validation failed', { validationError });
    throw { status: 400, message: validationError } as UploadError;
  }

  // Obter token
  const token = ApiClient.getToken();
  if (!token) {
    throw { status: 401, message: 'Sessão expirada. Faz login novamente.' } as UploadError;
  }

  // Preparar FormData
  const formData = new FormData();
  formData.append('file', file);

  // Fazer upload via API Gateway
  // IMPORTANTE: O api-gateway precisa ter a rota configurada:
  //   POST /upload/image -> campaign-service:3002/upload/image
  const baseUrl = api.getBaseUrl();
  debugLog('resolved API base URL', { baseUrl });

  const response = await fetch(`${baseUrl}/upload/image`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = 'Falha no upload da imagem.';
    
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
      debugLog('upload endpoint returned error payload', errorData);
    } catch {
      // Resposta não é JSON
    }

    debugLog('upload failed', { status: response.status, errorMessage });

    throw { status: response.status, message: errorMessage } as UploadError;
  }

  const data: UploadResult = await response.json();
  debugLog('upload raw response', data);
  
  if (!data.imageUrl) {
    throw { status: 500, message: 'Resposta inválida do servidor.' } as UploadError;
  }

  const normalizedUrl = toAbsoluteImageUrl(data.imageUrl, baseUrl);
  debugLog('upload normalized image URL', {
    original: data.imageUrl,
    normalized: normalizedUrl,
  });

  return normalizedUrl;
}

/**
 * Verifica se uma string é uma URL válida (não base64)
 */
export function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith('data:')) return false;
  
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
