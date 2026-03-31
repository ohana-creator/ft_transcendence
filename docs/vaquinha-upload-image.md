# Upload de imagem da vaquinha (Front -> Back)

## Objetivo
Definir como o frontend deve enviar a imagem para o backend e depois usar a `imageUrl` retornada ao criar a vaquinha.

## Contrato de upload

### Endpoint
- Metodo: `POST`
- URL: `/upload/image`
- Auth: `Authorization: Bearer <JWT>`
- Content-Type: `multipart/form-data`
- Campo do arquivo: `file`

### Validacoes do backend
- Tipos permitidos: `image/jpeg`, `image/png`, `image/webp`
- Tamanho maximo: `5MB`
- Arquivo invalido/corrompido: `400`

### Resposta esperada
```json
{
  "imageUrl": "http://localhost:3000/uploads/campaigns/<userId>/campaign-<timestamp>.jpg"
}
```

## Fluxo correto no frontend
1. Usuario seleciona imagem.
2. Front faz upload via `POST /upload/image` com `FormData` e campo `file`.
3. Front recebe `imageUrl`.
4. Front envia `POST /campaigns` incluindo `imageUrl` no payload da campanha.

## Exemplo completo (frontend)
```ts
async function uploadCampaignImage(file: File, token: string): Promise<string> {
  const form = new FormData();
  form.append('file', file);

  const response = await fetch('http://localhost:3000/upload/image', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Falha no upload da imagem: ${response.status} ${errText}`);
  }

  const data = await response.json() as { imageUrl?: string };
  if (!data.imageUrl) {
    throw new Error('Backend nao retornou imageUrl');
  }

  return data.imageUrl;
}

async function createCampaignWithImage(input: {
  title: string;
  description: string;
  goalAmount?: number;
  isPrivate?: boolean;
  deadline?: string;
  imageFile?: File;
  token: string;
}) {
  let imageUrl: string | undefined;

  if (input.imageFile) {
    imageUrl = await uploadCampaignImage(input.imageFile, input.token);
  }

  const payload = {
    title: input.title,
    description: input.description,
    goalAmount: input.goalAmount,
    isPrivate: input.isPrivate,
    deadline: input.deadline,
    imageUrl,
  };

  const response = await fetch('http://localhost:3000/campaigns', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${input.token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Falha ao criar vaquinha: ${response.status} ${errText}`);
  }

  return response.json();
}
```

## Exemplo do payload de criacao
```json
{
  "title": "Ajuda para tratamento",
  "description": "Descricao da vaquinha...",
  "goalAmount": 5000,
  "imageUrl": "http://localhost:3000/uploads/campaigns/USER_ID/campaign-1774967425256.jpg"
}
```

## Erros comuns no frontend
- Enviar campo diferente de `file` no `FormData`.
- Tentar enviar base64 no `createCampaign` em vez de fazer upload antes.
- Criar campanha sem aguardar o retorno de `imageUrl`.
- Receber `imageUrl` correta, mas o componente de imagem bloquear dominio remoto (ex.: `next/image`).

## Se estiver usando Next.js (`next/image`)
Se a imagem existe no backend, mas no browser aparece cinza/fallback e erro `/_next/image ... 400`, liberar o dominio no `next.config.js`:

```js
module.exports = {
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '3000', pathname: '/uploads/**' },
      { protocol: 'http', hostname: '127.0.0.1', port: '3000', pathname: '/uploads/**' },
    ],
  },
};
```

Depois disso, reiniciar o frontend.

## Notas de backend
- `/upload/image` e proxy para o `campaign-service`.
- A imagem local fica em `CAMPAIGN_UPLOADS_DIR` (padrao `/app/uploads` no Docker).
- URL publica local e servida em `/uploads/...` pelo gateway.
