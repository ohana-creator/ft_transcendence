# Carregamento da Carteira no Frontend

## Objetivo
Padronizar como o frontend deve iniciar, acompanhar e concluir o carregamento de saldo da carteira (topup), com UX clara e debug simples.

## Resumo do Fluxo
1. Utilizador escolhe método de pagamento e valor.
2. Front envia `POST /wallet/topup` (ou endpoint equivalente do gateway).
3. Backend responde com pedido de carregamento:
   - `status: "PENDING"`
   - `reference`
   - `checkoutUrl` (quando modo exige checkout externo)
4. Front abre checkout.
5. Front acompanha estado do carregamento (polling curto + atualização da carteira).
6. Quando backend confirmar, saldo e histórico são atualizados.

## Contrato Esperado (Frontend)
### Request
- Metodo: `POST`
- URL: `${NEXT_PUBLIC_API_URL}/wallet/topup`
- Auth: `Authorization: Bearer <JWT>`
- Content-Type: `application/json`

Body:
```json
{
  "amount": 10000,
  "paymentMethod": "CARD",
  "mode": "checkout"
}
```

### Response (exemplo)
```json
{
  "status": "PENDING",
  "provider": "mock",
  "reference": "a4ec1789-3fe1-4a21-993e-af24750d0c68",
  "amount": 10000,
  "currency": "VAKS",
  "checkoutUrl": "http://localhost:3001/carteira/carregar?ref=a4ec1789-3fe1-4a21-993e-af24750d0c68",
  "expiresAt": "2026-03-31T15:58:19.948Z",
  "nextAction": "Confirm payment externally, then call internal confirm endpoint with API key"
}
```

## Regras de UX no Front
### Estado de submissao
- `isSubmitting` deve bloquear clique duplo.
- Se o backend responder com `PENDING`, **nao manter bloqueio infinito**.
- O botao deve voltar ao estado normal apos iniciar o fluxo externo.

### Abertura do checkout
1. Tentar abrir aba/janela no gesto do utilizador.
2. Se popup for bloqueado (Firefox/Safari), usar fallback:
   - redirecionar na mesma aba para `checkoutUrl`.
3. Mostrar toast informativo:
   - "Pedido de carregamento criado. Conclua o pagamento para atualizar o saldo."

### Atualizacao de dados
- Fazer refresh de carteira apos iniciar topup.
- Enquanto `status` estiver `PENDING`, atualizar em background (sem travar tela).
- Ao confirmar, recarregar:
  - saldo
  - saldo pendente (se aplicavel)
  - transacoes

## Polling Recomendado
- Intervalo: 3 a 5 segundos.
- Duracao maxima: 30 a 60 segundos.
- Encerrar quando:
  - status virar `COMPLETED`/`FAILED`/`CANCELLED`
  - timeout atingir limite
- Nao manter spinner global da tela durante polling.

## Logs de Debug (padrao)
Usar prefixo unico:
- `WalletTopupDebug`

Pontos minimos de log:
1. `carregarCarteira:start` (valor, metodo, modo)
2. `carregarCarteira:request` (payload)
3. `carregarCarteira:raw-response`
4. `carregarCarteira:normalized-response`
5. `atualizarCarteira:start/success/error`
6. `checkout:popup-blocked` (quando ocorrer)

## Mapeamento de Estados
- `PENDING`: aguardando acao externa/confirmacao.
- `COMPLETED`: saldo deve refletir valor.
- `FAILED`: mostrar motivo e permitir nova tentativa.
- `CANCELLED`: informar cancelamento e liberar fluxo.

## Erros Comuns e Tratamento
1. Popup bloqueado
- Sintoma: checkout nao abre e fluxo parece travado.
- Solucao: fallback para navegacao na mesma aba.

2. UI presa em "A processar..."
- Sintoma: botao/loading nao volta.
- Solucao: separar `isSubmitting` de estado de polling.

3. Saldo nao atualiza apos pagar
- Sintoma: resposta de topup OK, saldo continua igual.
- Solucao: refetch de carteira/transacoes e polling de confirmacao.

4. Endpoint retorna `PENDING` sem `id`
- Sintoma: frontend espera `id` e quebra fluxo.
- Solucao: usar `reference` como identificador de acompanhamento.

## Checklist de Implementacao
1. Envio de topup com JWT e payload valido.
2. Abertura de checkout com fallback sem popup.
3. Polling em background (sem travar UI).
4. Atualizacao de saldo/transacoes apos confirmacao.
5. Logs `WalletTopupDebug` habilitados em dev.
6. Mensagens claras para utilizador em cada estado.

## Criterios de Aceite
1. Clicar em carregar nunca deixa a tela travada indefinidamente.
2. Em navegador com bloqueio de popup, checkout ainda abre (mesma aba).
3. Ao confirmar pagamento, saldo atualiza sem refresh manual.
4. Logs permitem identificar rapidamente onde o fluxo falhou.
