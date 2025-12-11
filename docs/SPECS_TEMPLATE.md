# 📝 TEMPLATE DE SPEC - SLIM QUALITY

## 🎯 Como Usar Este Template

Este template deve ser usado para criar a spec detalhada de cada sprint antes de iniciar sua execução.

**Processo:**
1. Copiar este template
2. Renomear para `SPEC_SPRINT_X_NOME.md`
3. Preencher todas as seções
4. Revisar e aprovar
5. Executar o sprint

---

# SPEC: SPRINT X - [NOME DO MÓDULO]

## 📋 Informações Gerais

**Sprint:** X  
**Módulo:** [Nome]  
**Duração Estimada:** X-Y dias  
**Complexidade:** ⭐⭐⭐ [Baixa/Média/Alta/Muito Alta]  
**Prioridade:** 🔴 [Obrigatória/Alta/Média/Baixa]  
**Responsável:** [Nome]  
**Data de Início:** DD/MM/YYYY  
**Data de Conclusão Prevista:** DD/MM/YYYY  

---

## 🎯 Objetivo do Sprint

[Descrever em 2-3 parágrafos o objetivo principal deste sprint]

**O que será entregue:**
- Item 1
- Item 2
- Item 3

**O que NÃO será entregue:**
- Item 1
- Item 2

---

## 📊 Contexto

### O Que Foi Feito Até Agora
[Resumo dos sprints anteriores relevantes]

### Dependências
**Este sprint depende de:**
- Sprint X: [Motivo]
- Sprint Y: [Motivo]

**Este sprint prepara para:**
- Sprint Z: [O que será usado]

---

## 🗄️ Estrutura de Banco de Dados

### Tabelas a Criar

#### Tabela 1: `nome_tabela`

**Objetivo:** [Para que serve esta tabela]

**Estrutura:**
```sql
CREATE TABLE nome_tabela (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Campos principais
  campo1 TEXT NOT NULL,
  campo2 INTEGER,
  
  -- ⭐ Campos preparatórios (se houver)
  campo_futuro TEXT, -- Para Sprint X
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX idx_nome_tabela_campo1 ON nome_tabela(campo1) WHERE deleted_at IS NULL;

-- Trigger
CREATE TRIGGER update_nome_tabela_updated_at
  BEFORE UPDATE ON nome_tabela
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE nome_tabela ENABLE ROW LEVEL SECURITY;

CREATE POLICY "policy_name"
  ON nome_tabela FOR SELECT
  USING (auth.uid() = user_id);
```

**Relacionamentos:**
- `campo_fk` → `outra_tabela(id)`

**Índices:**
- `idx_nome_tabela_campo1` - Para queries de busca
- `idx_nome_tabela_campo2` - Para ordenação

**Políticas RLS:**
- SELECT: [Quem pode ver]
- INSERT: [Quem pode criar]
- UPDATE: [Quem pode editar]
- DELETE: [Quem pode deletar]

---

### Migrations

**Arquivos a criar:**
```
supabase/migrations/
├── YYYYMMDDHHMMSS_create_tabela1.sql
├── YYYYMMDDHHMMSS_create_tabela2.sql
└── YYYYMMDDHHMMSS_seed_data.sql (se necessário)
```

**Ordem de execução:**
1. Criar tabelas principais
2. Criar tabelas de relacionamento
3. Criar índices
4. Criar triggers
5. Criar políticas RLS
6. Seed de dados (se necessário)

---

## 🔧 Implementação Backend

### Estrutura de Pastas

```
src/
├── services/
│   └── modulo/
│       ├── service.ts
│       ├── validator.ts
│       └── types.ts
├── api/
│   └── routes/
│       └── modulo.routes.ts
└── types/
    └── modulo.types.ts
```

### Services a Implementar

#### 1. `ModuloService`

**Responsabilidade:** [O que este service faz]

**Métodos:**
```typescript
class ModuloService {
  /**
   * Descrição do método
   * @param param1 - Descrição
   * @returns Descrição do retorno
   */
  async metodo1(param1: Type): Promise<ReturnType> {
    // Implementação
  }
  
  async metodo2(param2: Type): Promise<ReturnType> {
    // Implementação
  }
}
```

**Validações:**
- Validação 1
- Validação 2

**Regras de Negócio:**
- Regra 1
- Regra 2

---

### APIs a Criar

#### Endpoint 1: `POST /api/modulo`

**Descrição:** [O que faz]

**Autenticação:** Requerida / Não requerida

**Permissões:** [Roles necessárias]

**Request:**
```typescript
{
  campo1: string;
  campo2: number;
}
```

**Response (200):**
```typescript
{
  id: string;
  campo1: string;
  campo2: number;
  created_at: string;
}
```

**Response (400):**
```typescript
{
  error: string;
  details: string[];
}
```

**Validações:**
- Campo1: obrigatório, min 3 caracteres
- Campo2: obrigatório, > 0

**Exemplo:**
```bash
curl -X POST https://api.slimquality.com/api/modulo \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "campo1": "valor",
    "campo2": 123
  }'
```

---

## 🧪 Testes

### Testes Unitários

**Arquivo:** `tests/unit/modulo.test.ts`

**Casos de teste:**
```typescript
describe('ModuloService', () => {
  describe('metodo1', () => {
    it('deve fazer X quando Y', async () => {
      // Arrange
      const input = { ... };
      
      // Act
      const result = await service.metodo1(input);
      
      // Assert
      expect(result).toBe(...);
    });
    
    it('deve lançar erro quando Z', async () => {
      // ...
    });
  });
});
```

**Cobertura esperada:** > 80%

---

### Testes de Integração

**Arquivo:** `tests/integration/modulo.test.ts`

**Casos de teste:**
```typescript
describe('Modulo API', () => {
  it('POST /api/modulo deve criar registro', async () => {
    const response = await request(app)
      .post('/api/modulo')
      .send({ ... })
      .expect(200);
    
    expect(response.body).toHaveProperty('id');
  });
});
```

---

### Testes E2E (Sprint 10)

**Fluxo completo:**
1. Passo 1
2. Passo 2
3. Passo 3

**Validações:**
- [ ] Fluxo completo funciona
- [ ] Dados persistidos corretamente
- [ ] Notificações enviadas

---

## 🔗 Integrações Externas

### Integração 1: [Nome da API]

**Endpoint:** `https://api.externa.com/endpoint`

**Autenticação:** [Tipo]

**Request:**
```typescript
{
  campo: string;
}
```

**Response:**
```typescript
{
  resultado: string;
}
```

**Tratamento de Erros:**
- Erro 400: [Como tratar]
- Erro 500: [Como tratar]
- Timeout: [Como tratar]

**Retry Policy:**
- Tentativas: 3
- Intervalo: 1s, 2s, 4s (exponencial)

---

## 📋 Checklist de Preparação

### Antes de Iniciar o Sprint

**Dependências:**
- [ ] Sprint X concluído
- [ ] Tabelas Y criadas
- [ ] Credenciais Z configuradas

**Ambiente:**
- [ ] .env atualizado
- [ ] Supabase linkado
- [ ] Migrations anteriores aplicadas

**Conhecimento:**
- [ ] Documentação da API X lida
- [ ] Regras de negócio compreendidas
- [ ] Steering files consultados

---

## ✅ Critérios de Aceite

### Funcionalidades

- [ ] Funcionalidade 1 implementada
- [ ] Funcionalidade 2 implementada
- [ ] Funcionalidade 3 implementada

### Técnico

- [ ] Todas as tabelas criadas
- [ ] Todos os índices criados
- [ ] RLS ativo em todas as tabelas
- [ ] Migrations aplicadas sem erros
- [ ] Testes unitários passando (> 80% cobertura)
- [ ] Testes de integração passando
- [ ] APIs documentadas
- [ ] Código revisado

### Qualidade

- [ ] ESLint sem erros
- [ ] Prettier aplicado
- [ ] TypeScript sem erros
- [ ] Sem console.log em produção
- [ ] Tratamento de erros adequado
- [ ] Logs estruturados

### Segurança

- [ ] Validação de entrada implementada
- [ ] RLS testado
- [ ] Credenciais não expostas
- [ ] Rate limiting configurado (se aplicável)

### Performance

- [ ] Queries otimizadas
- [ ] Índices criados
- [ ] Tempo de resposta < 500ms
- [ ] Sem N+1 queries

### Documentação

- [ ] README atualizado
- [ ] API documentada
- [ ] Comentários em código complexo
- [ ] Steering files atualizados (se necessário)

---

## 🚨 Riscos e Mitigações

### Risco 1: [Descrição]

**Probabilidade:** Alta/Média/Baixa  
**Impacto:** Alto/Médio/Baixo  

**Mitigação:**
- Ação 1
- Ação 2

**Plano B:**
- Alternativa 1
- Alternativa 2

---

## 📊 Validação de Saída

### Testes Manuais

**Cenário 1: [Nome]**
1. Passo 1
2. Passo 2
3. Resultado esperado: [X]

**Cenário 2: [Nome]**
1. Passo 1
2. Passo 2
3. Resultado esperado: [Y]

### Validação com Stakeholder

- [ ] Demo realizada
- [ ] Feedback coletado
- [ ] Ajustes implementados (se necessário)

### Preparação para Próximo Sprint

- [ ] Campos preparatórios criados
- [ ] Hooks implementados
- [ ] Documentação atualizada

---

## 📝 Notas de Implementação

### Decisões Técnicas

**Decisão 1:**
- Problema: [X]
- Opções consideradas: [A, B, C]
- Escolha: [B]
- Motivo: [Porque...]

### Lições Aprendidas

- Lição 1
- Lição 2

### Melhorias Futuras

- Melhoria 1 (Sprint X)
- Melhoria 2 (Sprint Y)

---

## 📞 Contatos e Referências

### Documentação
- Steering files: `.kiro/steering/`
- Roadmap técnico: `docs/ROADMAP_TECNICO.md`
- Cronograma: `docs/CRONOGRAMA_MACRO.md`

### APIs Externas
- [Nome da API]: [Link da documentação]

### Suporte
- Supabase: https://supabase.com/docs
- Asaas: https://docs.asaas.com

---

## 📅 Histórico de Alterações

| Data | Alteração | Responsável |
|------|-----------|-------------|
| DD/MM/YYYY | Criação da spec | [Nome] |
| DD/MM/YYYY | Ajuste X | [Nome] |

---

**Status:** 🟡 Em Preparação / 🟢 Aprovado / 🔵 Em Execução / ✅ Concluído

**Última atualização:** DD/MM/YYYY
