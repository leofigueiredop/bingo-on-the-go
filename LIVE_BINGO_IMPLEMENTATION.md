# Implementação do Live Bingo

## Visão Geral

Esta implementação recria fielmente a interface de "Sorteio ao Vivo" da imagem de referência, incluindo toda a lógica de comissionamento e distribuição de prêmios conforme especificado.

## Estrutura dos Componentes

### Componente Principal
- **LiveBingo** (`src/components/LiveBingo.tsx`) - Componente principal que controla o layout desktop/mobile

### Subcomponentes
- **PrizeBlock** - Exibe informações de cada prêmio com status de pagamento
- **NumberGrid** - Grid de números 1-90 com estados visuais (sorteado, atual, disponível)
- **DrawingDisplay** - Exibe o número atual sendo sorteado com animações
- **MobilePreview** - Versão compacta similar ao mobile da imagem
- **MobileLiveBingo** - Versão completa mobile responsiva
- **CommissionStatus** - Painel de status detalhado do comissionamento
- **StatusInfo** - Componentes reutilizáveis para informações (cupom, doador, etc)

### Hook Personalizado
- **useLiveBingo** (`src/hooks/useLiveBingo.tsx`) - Gerencia todo o estado e lógica do sorteio

## Lógica de Comissionamento

### Como Funciona
1. **Percentual Exigido**: Por padrão, 200% do valor total dos prêmios deve ser arrecadado
2. **Distribuição de Prêmios**:
   - Se arrecadação ≥ 200% do total: Todos os prêmios são pagos aos jogadores reais
   - Se arrecadação < 200%: Prêmios são pagos parcialmente, priorizando valores menores primeiro
   - Prêmios não pagos ficam com o "sistema" (jogadores fake)

### Configuração
```typescript
const config = {
  drawIntervalMinutes: 10,           // Intervalo entre sorteios
  requiredCommissionPercentage: 200, // Percentual necessário
  totalNumbers: 90,                  // Total de números (1-90)
  defaultPrizes: [                   // Prêmios padrão
    { level: 1, name: 'Prêmio 1', amount: 20, color: 'bg-amber-500' },
    { level: 2, name: 'Prêmio 2', amount: 30, color: 'bg-pink-500' },
    { level: 3, name: 'Prêmio 3', amount: 60, color: 'bg-blue-600' },
  ]
};
```

## Funcionalidades Implementadas

### ✅ Interface Visual
- [x] Header "SORTEIO AO VIVO" com botão "Depositar"
- [x] Seção de prêmios com indicação de status (Sistema/Jogadores)
- [x] Número central grande com animações de brilho e rotação
- [x] Grid de números 1-90 com estados visuais corretos
- [x] Painel lateral com preview mobile
- [x] Cards com informações (Sorteio, Doação, Data, Hora)
- [x] Rodapé com Cupom, Doador, Faltam
- [x] Design responsivo mobile/desktop

### ✅ Lógica de Negócio
- [x] Sistema de comissionamento configurável
- [x] Cálculo automático de prêmios pagáveis
- [x] Distribuição inteligente baseada na arrecadação
- [x] Timer countdown até próximo sorteio
- [x] Sorteio automático de números
- [x] Estado visual dos números (sorteado, atual, disponível)

### ✅ Animações e UX
- [x] Animações no número central (pulse, glow, rotate)
- [x] Efeitos hover nos elementos interativos
- [x] Transições suaves entre estados
- [x] Feedback visual para prêmios pagos/não pagos
- [x] Design mobile otimizado

## Como Usar

### 1. Navegação
Acesse `/live-bingo` no aplicativo para visualizar o sorteio ao vivo.

### 2. Funcionalidades de Teste
O componente inclui botões para simular:
- **Simular Doação (+R$ 10)**: Adiciona R$ 10 à arrecadação
- **Sortear Próximo Número**: Força o sorteio do próximo número

### 3. Configuração Personalizada
```typescript
import useLiveBingo from '@/hooks/useLiveBingo';

const MyComponent = () => {
  const liveBingo = useLiveBingo({
    requiredCommissionPercentage: 150, // 150% em vez de 200%
    drawIntervalMinutes: 5,            // Sorteio a cada 5 minutos
  });
  
  // ... resto do componente
};
```

## Estrutura de Arquivos

```
src/
├── components/
│   ├── LiveBingo.tsx                 # Componente principal
│   └── LiveBingo/
│       ├── PrizeBlock.tsx           # Blocos de prêmio
│       ├── NumberGrid.tsx           # Grid de números
│       ├── DrawingDisplay.tsx       # Display do número atual
│       ├── MobilePreview.tsx        # Preview mobile
│       ├── MobileLiveBingo.tsx      # Versão mobile completa
│       ├── CommissionStatus.tsx     # Status do comissionamento
│       └── StatusInfo.tsx           # Componentes de informação
├── hooks/
│   └── useLiveBingo.tsx             # Hook principal
└── pages/
    └── LiveBingo.tsx                # Página de rota
```

## Exemplo de Integração com Backend

Para integrar com um backend real, modifique o hook `useLiveBingo` para:

```typescript
// Substituir dados mockados por chamadas à API
const fetchDrawingData = async () => {
  const response = await fetch('/api/live-bingo/current');
  return response.json();
};

// Enviar doações para o backend
const sendDonation = async (amount: number) => {
  const response = await fetch('/api/live-bingo/donate', {
    method: 'POST',
    body: JSON.stringify({ amount }),
    headers: { 'Content-Type': 'application/json' }
  });
  return response.json();
};
```

## Próximos Passos

1. **Integração com Supabase**: Conectar com as tabelas do banco de dados
2. **WebSocket/Realtime**: Implementar atualizações em tempo real
3. **Sistema de Pagamentos**: Integrar com gateway de pagamento
4. **Histórico**: Adicionar histórico de sorteios anteriores
5. **Administração**: Painel para configurar prêmios e percentuais

## Cores e Temas

O sistema utiliza as cores já configuradas no Tailwind CSS do projeto:
- **Tema principal**: Gradiente azul escuro
- **Prêmios**: Verde para pagos, vermelho/amarelo para sistema
- **Números**: Verde para sorteados, vermelho para atual, cinza para disponíveis
- **Responsivo**: Design adaptado para mobile e desktop

Esta implementação está totalmente integrada ao projeto existente e segue todos os padrões de código e estrutura já estabelecidos.
