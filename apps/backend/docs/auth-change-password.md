# Auth: Change Password

Este endpoint permite alterar a palavra-passe de uma conta local já autenticada.

## Endpoint

`POST /auth/change-password`

## Autenticação

O pedido exige um JWT válido no header `Authorization`.

```http
Authorization: Bearer <access_token>
```

## Body

```json
{
  "currentPassword": "Str0ngP@ss",
  "newPassword": "N3wStr0ngP@ss1"
}
```

### Campos

- `currentPassword`: password atual da conta.
- `newPassword`: nova password.

## Regras

- A password atual tem de corresponder à guardada no auth-service.
- A nova password tem de cumprir a regra de password forte.
- O endpoint funciona apenas para contas locais.
- Contas OAuth/Google/42 sem password local recebem erro.

## Resposta de sucesso

```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

## Erros possíveis

- `400 Bad Request`: body inválido ou nova password fraca.
- `401 Unauthorized`: password atual incorreta ou token inválido.
- `400 Bad Request`: tentativa de alterar password numa conta não-local.

## Exemplo com curl

```bash
curl -X POST http://localhost:3000/auth/change-password \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <access_token>' \
  -d '{
    "currentPassword": "Str0ngP@ss",
    "newPassword": "N3wStr0ngP@ss1"
  }'
```

## Exemplo com fetch

```ts
async function changePassword(accessToken: string) {
  const response = await fetch('http://localhost:3000/auth/change-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      currentPassword: 'Str0ngP@ss',
      newPassword: 'N3wStr0ngP@ss1',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message?.[0] ?? error.message ?? 'Failed to change password');
  }

  return response.json();
}
```

## Como funciona internamente

1. O controller lê o `userId` do JWT.
2. O service busca o utilizador na base de dados.
3. Confirma se a conta tem `hashedPassword`.
4. Compara `currentPassword` com a password atual guardada.
5. Faz hash da nova password com bcrypt.
6. Atualiza o utilizador no `authDb`.
7. Retorna confirmação de sucesso.

## Integração no frontend

Quando o utilizador submeter o formulário de alteração de password:

1. Ler o token atual guardado na sessão/localStorage.
2. Enviar `currentPassword` e `newPassword` para `/auth/change-password`.
3. Mostrar a mensagem de sucesso ao utilizador.
4. Se receber `401`, pedir para confirmar a password atual.
5. Se receber `400`, mostrar validação da nova password.
