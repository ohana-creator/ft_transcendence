# OAuth Social Auth (Google, 42, Facebook)

Este documento explica:
- como o fluxo OAuth está implementado no backend
- como o frontend deve consumir as rotas
- quais variáveis de ambiente são obrigatórias
- como testar ponta a ponta

## 1. Visão geral

O auth-service expõe rotas de login social para três providers:
- Google
- 42 Intra
- Facebook

Em todos os casos, o padrão final é o mesmo:
1. Browser é redirecionado para o provider OAuth
2. Provider autentica o utilizador e chama o callback do auth-service com code
3. auth-service troca code por access token do provider
4. auth-service obtém perfil do utilizador
5. auth-service cria/vincula utilizador interno e gera JWT próprio
6. auth-service redireciona para FRONTEND_URL/auth/callback?token=JWT

## 2. Rotas disponíveis

Base path: /auth

### Google
- GET /auth/google
- GET /auth/google/callback

### 42 Intra
- GET /auth/42
- GET /auth/42/callback

### Facebook
- GET /auth/facebook
- GET /auth/facebook/callback

## 3. Como consumir no frontend

## 3.1 Iniciar login social

No clique do botão, redirecionar o browser para a rota do backend (API Gateway):
- Google: http://localhost:3000/auth/google
- 42: http://localhost:3000/auth/42
- Facebook: http://localhost:3000/auth/facebook

Exemplo em frontend (pseudo-código):

```ts
function handleOAuthLogin(provider: 'google' | '42' | 'facebook') {
  const authBase = 'http://localhost:3000/auth';
  window.location.href = `${authBase}/${provider}`;
}
```

## 3.2 Receber token no callback do frontend

Após sucesso, o backend redireciona para:
- FRONTEND_URL/auth/callback?token=...

No frontend:
1. ler query param token
2. guardar token (ex.: localStorage)
3. redirecionar para dashboard

Exemplo em frontend (pseudo-código):

```ts
const params = new URLSearchParams(window.location.search);
const token = params.get('token');

if (token) {
  localStorage.setItem('accessToken', token);
  window.location.href = '/dashboard';
}
```

## 4. Variáveis de ambiente obrigatórias

## 4.1 Google
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- GOOGLE_CALLBACK_URL

## 4.2 42 Intra
- FORTYTWO_CLIENT_ID
- FORTYTWO_CLIENT_SECRET
- FORTYTWO_CALLBACK_URL

## 4.3 Facebook
- FACEBOOK_CLIENT_ID
- FACEBOOK_CLIENT_SECRET
- FACEBOOK_CALLBACK_URL

## 4.4 Geral
- FRONTEND_URL
- JWT_SECRET
- JWT_EXPIRATION

Exemplo de callbacks em ambiente local:
- GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
- FORTYTWO_CALLBACK_URL=http://localhost:3000/auth/42/callback
- FACEBOOK_CALLBACK_URL=http://localhost:3000/auth/facebook/callback
- FRONTEND_URL=http://localhost:3002

## 5. Respostas e erros comuns

## 5.1 Sucesso
Não retorna JSON no browser no fim do fluxo. O comportamento esperado é redirect para o frontend com token na query.

## 5.2 Erros de configuração
Se faltarem credenciais do provider, a rota inicial responde 403 com mensagem de provider não configurado.

## 5.3 Erro de callback
Se callback vier sem code ou se falhar troca de token/perfil, o backend retorna erro 400 ou 401.

## 6. Fluxo interno de criação/vinculação de utilizador

- Google usa id do Google quando disponível para vincular conta
- 42 e Facebook usam email retornado pelo provider
- Se utilizador não existir, auth-service cria conta interna
- Após isso, auth-service gera JWT interno da plataforma

## 7. Checklist de integração

1. Configurar credenciais OAuth em cada provider
2. Registrar URLs de callback exatas no painel de cada provider
3. Configurar variáveis no ambiente do auth-service
4. Garantir FRONTEND_URL correto
5. Frontend deve redirecionar browser (não fetch) para /auth/{provider}
6. Frontend deve processar token no /auth/callback

## 8. Teste rápido manual

1. Abrir no browser: http://localhost:3000/auth/google
2. Completar login no provider
3. Verificar redirect final para FRONTEND_URL/auth/callback?token=...
4. Confirmar token salvo e sessão autenticada no frontend

Repetir os mesmos passos para:
- http://localhost:3000/auth/42
- http://localhost:3000/auth/facebook
