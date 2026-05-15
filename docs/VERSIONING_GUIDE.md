# Guia de Versionamento — Dashboard ADS S4X

Este documento descreve como o sistema de versionamento automático foi implementado e como mantê-lo atualizado.

## Como funciona

O sistema utiliza o `next.config.ts` para injetar variáveis de ambiente durante o processo de **build**. Essas variáveis ficam disponíveis no frontend através do prefixo `NEXT_PUBLIC_`.

### Variáveis Utilizadas

1.  `NEXT_PUBLIC_APP_VERSION`: Obtida do campo `version` no `package.json`.
2.  `NEXT_PUBLIC_GIT_HASH`: Obtida do hash curto do commit atual do Git (`git rev-parse --short HEAD`). Em ambiente Vercel, utiliza a variável `VERCEL_GIT_COMMIT_SHA`.
3.  `NEXT_PUBLIC_BUILD_DATE`: Data e hora em que o build foi realizado.

## Onde a versão é exibida

Atualmente, a versão é exibida em dois locais:
- **Rodapé do Dashboard Compartilhado**: Localizado em `src/components/dashboard/SharedDashboardFooter.tsx`.
- **Barra Lateral Administrativa**: Localizado em `src/components/admin/AdminSidebar.tsx`.

## Como atualizar a versão

### 1. Atualização da Versão Base
Sempre que houver uma entrega importante (milestone), você deve atualizar a versão no `package.json`:

```bash
npm version patch   # Ex: 0.1.0 -> 0.1.1 (Correções)
npm version minor   # Ex: 0.1.1 -> 0.2.0 (Novas funcionalidades)
npm version major   # Ex: 0.2.0 -> 1.0.0 (Mudanças significativas)
```

### 2. Atualização do Hash (Automática)
O hash do commit é atualizado automaticamente a cada novo commit. Não é necessária nenhuma ação manual.

## Configuração Técnica (`next.config.ts`)

```typescript
import { execSync } from "child_process";

const getGitHash = () => {
  try {
    return process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 
           execSync("git rev-parse --short HEAD").toString().trim();
  } catch (e) {
    return "unknown";
  }
};

const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || "0.1.0",
    NEXT_PUBLIC_GIT_HASH: getGitHash(),
  },
};
```

## Benefícios
- **Rastreabilidade**: Facilita saber exatamente qual versão do código o cliente está visualizando.
- **Depuração**: Permite identificar se um bug já foi corrigido em um commit posterior.
- **Auditoria**: Mantém um histórico visual do progresso da plataforma.
