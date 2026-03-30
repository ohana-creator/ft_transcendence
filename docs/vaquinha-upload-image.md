# Upload de Imagem para Criacao de Vaquinha

## Objetivo
Permitir upload de imagem em endpoint separado, retornando uma URL publica para ser usada no createCampaign.

## Endpoint (recomendado)
- Metodo: POST
- Rota: /upload/image
- Auth: Bearer JWT (obrigatorio)
- Content-Type: multipart/form-data
- Campo do ficheiro: file

## Regras de validacao
- Tipos permitidos: image/jpeg, image/png, image/webp
- Tamanho maximo: 5MB
- Arquivo invalido ou corrompido: rejeitado com erro 400

## Processamento no backend
1. Recebe o ficheiro no endpoint de upload.
2. Valida tipo e tamanho.
3. Reprocessa para JPEG (qualidade 85, max 1200x1200, sem ampliar).
4. Guarda no storage (R2/S3 compativel).
5. Retorna a URL publica da imagem.

## Resposta esperada
```json
{
  "imageUrl": "https://SEU_PUBLIC_URL/campaigns/<userId>/campaign-<timestamp>.jpg"
}
```

## Fluxo no frontend
1. Utilizador seleciona imagem.
2. Frontend faz POST /upload/image com multipart/form-data (campo file).
3. Frontend recebe imageUrl.
4. Frontend chama createCampaign com imageUrl no payload:

```json
{
  "title": "Ajuda para tratamento",
  "description": "Descricao da vaquinha...",
  "goalAmount": 5000,
  "imageUrl": "https://..."
}
```

## Exemplo rapido (frontend)
```ts
const form = new FormData();
form.append('file', selectedFile);

const uploadRes = await fetch('/upload/image', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: form,
});

if (!uploadRes.ok) throw new Error('Falha no upload da imagem');

const { imageUrl } = await uploadRes.json();

await createCampaign({
  title,
  description,
  goalAmount,
  imageUrl,
});
```

## Notas de integracao
- O endpoint /upload/image e encaminhado pelo api-gateway para o campaign-service.
- O campaign-service tambem aceita /campaigns/upload/image para compatibilidade interna.
- Se nao for enviada imagem, createCampaign continua a funcionar com imageUrl opcional.
