# Sistema de Timeout de Sessão

## 📋 Visão Geral

Sistema implementado para fazer logout automático do usuário após período de inatividade, melhorando a segurança da aplicação.

## ⚠️ Correções Importantes (31/10/2025)

### Problema: Loop Infinito de Re-renders
**Sintoma:** Console exibindo "Perfil encontrado" centenas de vezes, site lento e travando.

**Causa:** O `useEffect` tinha `[user]` como dependência, mas dentro dele estava chamando `setUser()`, criando um ciclo infinito:
```
useEffect → setUser → trigger useEffect → setUser → trigger useEffect → ...
```

**Solução:**
1. Removida dependência `[user]` do useEffect principal, mudando para `[]`
2. Adicionado filtro para ignorar evento `INITIAL_SESSION` no `onAuthStateChange`
3. Criado segundo useEffect separado apenas para listeners de atividade
4. Otimizado carregamento de perfil apenas em eventos específicos (`SIGNED_IN`, `USER_UPDATED`)

### Problema: Erro de CORS no Logout
**Sintoma:** `NetworkError when attempting to fetch resource` e `falha na requisição CORS` ao clicar em Sair.

**Causa:** Supabase tentando fazer logout com scope `global`, o que requer comunicação com o servidor.

**Solução:** Alterado para `scope: 'local'` que limpa apenas a sessão local:
```typescript
await supabase.auth.signOut({ scope: 'local' });
```

## ⏱️ Configuração

**Tempo de inatividade:** 30 minutos (configurável em `/lib/supabase.ts`)

```typescript
export const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutos em milissegundos
```

Para alterar o tempo, modifique esta constante:
- 15 minutos: `15 * 60 * 1000`
- 1 hora: `60 * 60 * 1000`
- 2 horas: `120 * 60 * 1000`

## 🔧 Como Funciona

### 1. Monitoramento de Atividade

O sistema detecta atividade do usuário através dos seguintes eventos:
- `mousedown` - Cliques do mouse
- `keydown` - Teclas pressionadas
- `scroll` - Rolagem da página
- `touchstart` - Toques na tela (mobile)
- `click` - Cliques em geral

### 2. Armazenamento de Última Atividade

- A cada atividade detectada, o timestamp é salvo no `localStorage`
- Chave utilizada: `lastActivityTime`
- Permite verificar inatividade mesmo após recarregar a página

### 3. Timeout Automático

- Um timer é iniciado quando o usuário faz login
- A cada atividade, o timer é resetado
- Quando o tempo expira sem atividade, o logout é executado automaticamente

### 4. Verificação ao Carregar

- Ao abrir o site, o sistema verifica a última atividade registrada
- Se passou mais que o tempo configurado, faz logout imediatamente
- Garante que sessões antigas não sejam mantidas indefinidamente

## 🔐 Fluxo de Funcionamento

```
1. Usuário faz login
   ↓
2. Sistema registra timestamp inicial
   ↓
3. Timer de 30 minutos é iniciado
   ↓
4. Usuário realiza atividades (cliques, scroll, etc)
   ↓
5. A cada atividade:
   - Timestamp é atualizado
   - Timer é resetado para 30 minutos
   ↓
6. Se 30 minutos sem atividade:
   - Logout automático
   - Limpeza do localStorage
   - Redirecionamento para login
```

## 📝 Implementação Técnica

### Arquivo: `/lib/supabase.ts`
- Define a constante `SESSION_TIMEOUT`
- Exporta para uso no AuthContext

### Arquivo: `/context/AuthContext.tsx`

**Funções principais:**

1. `updateLastActivity()` - Salva timestamp no localStorage
2. `checkSessionTimeout()` - Verifica se sessão expirou
3. `setupActivityTimeout()` - Configura timer de logout automático
4. `resetInactivityTimer()` - Reseta timer ao detectar atividade

**Hooks utilizados:**
- `useRef` - Armazena referência do timeout
- `useEffect` - Configura listeners de atividade e cleanup

## 🧪 Como Testar

### Teste 1: Timeout Automático
1. Faça login no sistema
2. Aguarde 30 minutos sem interagir com a página
3. O sistema deve fazer logout automaticamente

### Teste 2: Reset de Timer
1. Faça login no sistema
2. Aguarde 29 minutos
3. Clique em qualquer lugar da página
4. Aguarde mais 29 minutos
5. Clique novamente
6. A sessão deve permanecer ativa

### Teste 3: Sessão Expirada ao Recarregar
1. Faça login no sistema
2. Aguarde 31 minutos
3. Recarregue a página (F5)
4. Deve ser redirecionado para o login automaticamente

### Teste 4: Atividade Contínua
1. Faça login no sistema
2. Use normalmente por 2+ horas
3. Enquanto houver atividade, a sessão permanece

## 🔍 Logs do Console

O sistema registra os seguintes eventos no console:

```javascript
"Sessão obtida: [user-id]"
"Buscando perfil para: [user-id]"
"Perfil encontrado: {...}"
"Auth state changed: [event] [user-id]"
"Timeout de inatividade atingido"
"Sessão expirou por inatividade. Fazendo logout..."
```

## ⚠️ Considerações de Segurança

1. **localStorage vs sessionStorage:**
   - Usamos `localStorage` para persistir entre abas
   - Sessão expira mesmo se usuário abrir nova aba

2. **Limpeza ao Logout:**
   - Timer é limpo
   - localStorage é removido
   - Sessão Supabase é encerrada

3. **Eventos de Atividade:**
   - Apenas eventos reais do usuário resetam o timer
   - Processos automáticos não mantêm sessão ativa

## 🚀 Melhorias Futuras

1. **Aviso antes do logout:**
   - Modal avisando "Sua sessão vai expirar em 2 minutos"
   - Botão para renovar sessão

2. **Configuração por usuário:**
   - Permitir que usuário escolha tempo de timeout
   - Opção "Manter conectado" (maior timeout)

3. **Diferentes timeouts por página:**
   - Páginas críticas (perfil, pagamentos) = menor timeout
   - Páginas de leitura = maior timeout

4. **Sincronização entre abas:**
   - Usar `BroadcastChannel` API
   - Logout em todas as abas simultaneamente

5. **Backend validation:**
   - Verificação adicional no servidor
   - Invalidar tokens expirados

## 📊 Métricas Recomendadas

Para monitorar a eficácia do sistema:

1. **Taxa de logout por inatividade**
   - Quantos usuários são deslogados automaticamente
   
2. **Tempo médio de sessão**
   - Duração típica antes do timeout
   
3. **Padrões de atividade**
   - Horários de maior/menor atividade

4. **Re-logins após timeout**
   - Usuários que retornam após serem deslogados

## 🔗 Recursos Relacionados

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- [Next.js Authentication Patterns](https://nextjs.org/docs/authentication)
