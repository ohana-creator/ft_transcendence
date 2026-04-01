# Topup Polling Otimizado

## Contexto da Mudança

O backend agora **auto-confirma topups em ~1.5 segundos** (para provider `mock`). Anteriormente, a resposta ficava em estado `PENDING` indefinidamente.

Frontend detecta essa confirmação através de polling da carteira. Este documento descreve como o polling foi otimizado para essa nova realidade.

## Arquitetura do Fluxo

### 1. Submissão de Topup
**Arquivo**: `app/(app)/carteira/carregar/page.tsx` ou `app/(app)/carteira/page.tsx`

```
Usuario clica "Carregar Carteira"
→ handleCarregarCarteira()
  → carregarCarteira() API call
    → Backend: POST /wallet/topup
    → Retorna: { status: "PENDING", checkoutUrl, reference, ... }
  → Redireciona para checkout (mock browser, sem popup)
```

**Timeout de Loading**: Removido. Não bloqueia UI enquanto aguarda confirmação.

### 2. Auto-Confirmação Backend (Não Configurable)
**Arquivo**: Backend (fora deste repositório)

```
Topup criado em PENDING
  ↓ [~1.5s depois]
✓ Backend cria DEPOSIT transaction
✓ Muda status para COMPLETED
✓ Incrementa balance (string: "150")
```

**Resposta de GET /wallet/balance**:
```json
{
  "balance": "150",  // ← String, não número!
  "currency": "VAKS"
}
```

### 3. Polling da Carteira (Otimizado)
**Arquivo**: `app/(app)/carteira/page.tsx` → `iniciarPollingTopup()`

```typescript
// Intervals otimizados para auto-confirm em 1.5s:
const intervals = [1500, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000];
// Total: ~19.5s máximo
// 1º check em 1.5s ← Janela de auto-confirm / tolerância
// 2º-10º checks em 2s cada ← Graça para atrasos de rede/DB
```

**Fluxo**:
```
iniciarPollingTopup(saldoAnterior, totalAnteriorTx)
→ Loop 10 iterações:
   ① Espera interval[i]
   ② getCarteiraData() (GET /wallet + /wallet/transactions)
   ③ Compara saldo/transacoes com anterior
   ④ Se mudou:
      • atualizarCarteira() (recarrega estado global)
      • break (sai do loop)
   ⑤ Se não mudou:
      • Continua para próximo interval
   ⑥ Se 10 iterações sem mudança:
      • Toast: "Pagamento em processamento..."
      • setCarregamentoPendente(false)
```

### 4. Normalização de Balance
**Arquivo**: `utils/wallet.ts` → `toNumber()`

```typescript
// Problema: Backend retorna balance como string ("150")
// Solução: função centralizada toNumber()

toNumber("150")  // → 150
toNumber(150)    // → 150
toNumber(null)   // → 0
```

**Cadeia de Uso**:
```
getWalletBalance() ← Usa toNumber(payload.balance)
  ↓
useCarteira.atualizarSaldo() ← Recebe { balance: number, ... }
  ↓
carteira.saldo ← Estado global garantidamente número
```

## Verificação de Funcionamento

### Debug Logs
Todos os componentes logam com prefixo `[WalletTopupDebug]`:

```javascript
[WalletTopupDebug][ui] handleSubmit:start { metodo: "visa", valor: "1000", ... }
[WalletTopupDebug] carregarCarteira:start { amount: 1000, method: "visa", ... }
[WalletTopupDebug] carregarCarteira:raw-response { status: "PENDING", checkoutUrl: "...", ... }
[WalletTopupDebug][hook] atualizarSaldo:start
[WalletTopupDebug][hook] atualizarSaldo:success { balance: 150, currency: "VAKS" }
```

### Teste Manual (Em Desenvolvimento)

1. **Abra DevTools** → Console tab
2. **Filtre por `[WalletTopupDebug]`** para ver fluxo completo
3. **Clique "Carregar Carteira"**:
   - Veja POST /wallet/topup (status: PENDING)
   - Veja polling iniciado (intervals: 1500, 2000, ...)
   - Aguarde ~3-5s
   - Veja balance atualizar
   - Veja toast: "Carregamento confirmado com sucesso" ou "Pagamento em processamento..."

### Tempo Esperado
```
t=0s   POST /wallet/topup → PENDING
t=1.5s Polling check #1 (ainda não confirmou)
t=3.5s Polling check #2 ← Backend já confirmou em ~t=1.5s
       → getCarteiraData() encontra novo balance ("150")
       → atualizarCarteira()
       → Loop termina
t=3.5s Usuário vê balance atualizado ✓
```

## Tratamento de Falhas

### Timeout (>19.5s sem confirmação)
```
UI mostra: "Pagamento em processamento. Se ja pagaste, pode demorar..."
Usuario pode:
  • Voltar apenas (botão)
  • Recarregar a página (F5) para re-sincronizar balance
  • Contatar suporte se não vir o topup após 5 minutos
```

### Erro de Rede Durante Polling
```
Loop termina com exceção silenciosa (try/catch)
Toast não aparece (apenas debug logs)
UI retorna a estado anterior (carregamentoPendente = false)
```

### Múltiplos Topups Simultâneos
```
topupPollTokenRef impede race conditions:
  • Cada topup incrementa token
  • Polling novo invalida polling anterior
  • Apenas o mais recente atualiza UI
```

## Configurações Ajustáveis

Se backend mudar timing de auto-confirm:

**`app/(app)/carteira/page.tsx` → `iniciarPollingTopup`**:
```typescript
// Ajuste intervals[] conforme necessário
const intervals = [1500, 2000, ...];  // ← Edite aqui
```

**Recomendações**:
- **1º check**: ~500ms antes do auto-confirm teórico (1.5s auto = 1000ms check)
- **Checks subsequentes**: 2-3s cada (tolerância para variação de rede)
- **Total**: 15-30s máximo (evitar polling infinito)

## Referências

- Backend auto-confirm: Requer `provider: "mock"` no POST /wallet/topup
- Backend balance format: Serializado como string (Prisma limitation ou JS JSON)
- Frontend parsing: `toNumber()` centralizado em `utils/wallet.ts`
- Hook state management: `useCarteira()` em `hooks/carteira/useCarteira.ts`
- UI polling: `iniciarPollingTopup()` em `app/(app)/carteira/page.tsx`
