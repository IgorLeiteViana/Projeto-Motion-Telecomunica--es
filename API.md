# 📊 API Gerenciador Financeiro

Documentação completa dos endpoints disponíveis no servidor de finanças rodando na porta **3000**.

---

## 🔗 Base URL
```
http://localhost:3000/api
```

---

## 📋 Endpoints

### 1️⃣ **Transações**

#### GET `/transacoes`
Retorna lista de transações com filtros opcionais.

**Query Parameters:**
- `mes` (opcional): Mês (1-12)
- `ano` (opcional): Ano (ex: 2026)
- `tipo` (opcional): `'entrada'` ou `'despesa'`
- `categoria` (opcional): `'fixa'` ou `'variavel'`

**Exemplo:**
```bash
GET /api/transacoes?mes=4&ano=2026&tipo=despesa
```

**Response (200):**
```json
[
  {
    "id": 1,
    "nome": "Aluguel",
    "descricao": "Aluguel de abril",
    "valor": 1500.00,
    "tipo": "despesa",
    "categoria": "fixa",
    "concluido": 1,
    "data_criacao": "2026-04-01T10:30:00.000Z"
  }
]
```

---

#### POST `/transacoes`
Cria uma nova transação.

**Body (JSON):**
```json
{
  "nome": "Salário",
  "desc": "Salário mensal",
  "valor": 3500.00,
  "tipo": "entrada",
  "cat": "fixa"
}
```

**Response (201):**
```json
{
  "id": 42,
  "nome": "Salário",
  "desc": "Salário mensal",
  "valor": 3500.00,
  "tipo": "entrada",
  "cat": "fixa",
  "concluido": false
}
```

---

#### PUT `/transacoes/:id`
Atualiza uma transação existente.

**Parameters:**
- `id` (path): ID da transação

**Body (JSON):**
```json
{
  "nome": "Salário Atualizado",
  "desc": "Salário mensal abril",
  "valor": 3600.00,
  "tipo": "entrada",
  "cat": "fixa",
  "concluido": true
}
```

**Response (200):**
```json
{
  "mensagem": "Transação atualizada com sucesso!"
}
```

---

#### DELETE `/transacoes/:id`
Deleta uma transação.

**Parameters:**
- `id` (path): ID da transação

**Response (200):**
```json
{
  "mensagem": "Transação excluída com sucesso!"
}
```

---

### 2️⃣ **Resumo & Estatísticas**

#### GET `/resumo`
Retorna resumo financeiro com filtro de mês/ano.

**Query Parameters:**
- `mes` (opcional): Mês (1-12)
- `ano` (opcional): Ano (ex: 2026)

**Exemplo:**
```bash
GET /api/resumo?mes=4&ano=2026
```

**Response (200):**
```json
{
  "total_despesas": 2500.00,
  "total_entradas": 5000.00,
  "saldo_disponivel": 2200.00,
  "lucro_total": 2500.00,
  "contas_a_pagar": 300.00,
  "contas_pagas": 2200.00,
  "despesa_fixa": 1800.00,
  "despesa_variavel": 700.00,
  "entrada_fixa": 3500.00,
  "entrada_variavel": 1500.00
}
```

---

#### GET `/resumo/comparativo`
Compara mês atual com mês anterior e retorna variação percentual.

**Query Parameters (obrigatórios):**
- `mes`: Mês (1-12)
- `ano`: Ano (ex: 2026)

**Exemplo:**
```bash
GET /api/resumo/comparativo?mes=4&ano=2026
```

**Response (200):**
```json
{
  "mes_atual": {
    "despesas": 2500.00,
    "entradas": 5000.00,
    "saldo": 2500.00,
    "lucro": 2500.00
  },
  "mes_anterior": {
    "despesas": 2000.00,
    "entradas": 4500.00,
    "saldo": 2500.00,
    "lucro": 2500.00
  },
  "variacao_percentual": {
    "despesas": "25.00",
    "entradas": "11.11",
    "saldo": "0.00",
    "lucro": "0.00"
  }
}
```

---

### 3️⃣ **Categorias**

#### GET `/categorias`
Lista todas as categorias criadas.

**Response (200):**
```json
[
  {
    "id": 1,
    "nome": "Aluguel",
    "tipo": "despesa"
  },
  {
    "id": 2,
    "nome": "Salário",
    "tipo": "entrada"
  }
]
```

---

#### POST `/categorias`
Cria uma nova categoria personalizada.

**Body (JSON):**
```json
{
  "nome": "Internet",
  "tipo": "despesa"
}
```

**Response (201):**
```json
{
  "id": 5,
  "nome": "Internet",
  "tipo": "despesa"
}
```

---

### 4️⃣ **Alertas**

#### GET `/alertas`
Retorna transações de despesa não concluídas com vencimento nos próximos 3 dias.

**Response (200):**
```json
[
  {
    "id": 15,
    "nome": "Conta de Água",
    "descricao": "Vencimento próximo",
    "valor": 150.00,
    "tipo": "despesa",
    "categoria": "fixa",
    "concluido": 0,
    "data_vencimento": "2026-05-31T23:59:59.000Z",
    "data_criacao": "2026-05-28T10:00:00.000Z"
  }
]
```

---

### 5️⃣ **Exportar**

#### GET `/export/csv`
Exporta transações em formato CSV.

**Query Parameters:**
- `mes` (opcional): Mês (1-12)
- `ano` (opcional): Ano (ex: 2026)

**Exemplo:**
```bash
GET /api/export/csv?mes=4&ano=2026
```

**Response:** Arquivo CSV anexado para download
```
ID,Nome,Descricao,Valor,Tipo,Categoria,Concluido,Data Criacao
1,"Aluguel","Aluguel de abril",1500.00,"despesa","fixa",1,"01/04/2026"
```

---

#### GET `/export/pdf`
Exporta transações em formato PDF (requer pdfkit instalado).

**Query Parameters:**
- `mes` (opcional): Mês (1-12)
- `ano` (opcional): Ano (ex: 2026)

**Exemplo:**
```bash
GET /api/export/pdf?mes=4&ano=2026
```

**Response:** Arquivo PDF anexado para download

> **Nota:** Se pdfkit não estiver instalado, instale com:
> ```bash
> npm install pdfkit
> ```

---

## 🌍 Exemplos de Uso com cURL

### Buscar transações de abril/2026 do tipo despesa
```bash
curl "http://localhost:3000/api/transacoes?mes=4&ano=2026&tipo=despesa"
```

### Criar nova transação
```bash
curl -X POST http://localhost:3000/api/transacoes \
  -H "Content-Type: application/json" \
  -d '{"nome":"Netflix","desc":"Assinatura","valor":49.90,"tipo":"despesa","cat":"variavel"}'
```

### Obter resumo do mês
```bash
curl "http://localhost:3000/api/resumo?mes=4&ano=2026"
```

### Comparar com mês anterior
```bash
curl "http://localhost:3000/api/resumo/comparativo?mes=4&ano=2026"
```

### Buscar alertas
```bash
curl "http://localhost:3000/api/alertas"
```

### Exportar CSV
```bash
curl "http://localhost:3000/api/export/csv?mes=4&ano=2026" -o transacoes.csv
```

---

## ⚠️ Códigos de Erro

| Código | Mensagem | Descrição |
|--------|----------|-----------|
| 200 | OK | Sucesso |
| 201 | Created | Recurso criado com sucesso |
| 400 | Bad Request | Parâmetros obrigatórios faltando |
| 500 | Server Error | Erro no servidor ou banco de dados |

---

## 🔧 Tecnologias

- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **MySQL2** - Driver MySQL
- **PDFKit** - Geração de PDF
- **CORS** - Compartilhamento de recursos entre origens

---

## 📦 Instalação de Dependências

```bash
npm install
```

---

## 🚀 Iniciar Servidor

```bash
node server.js
```

O servidor será disponibilizado em: `http://localhost:3000`

---

## 📝 Notas

- Todos os valores monetários estão em **Real (R$)**
- Datas estão no formato ISO 8601
- Meses são de 1 a 12 (janeiro a dezembro)
- O campo `concluido` usa 0 (falso) ou 1 (verdadeiro)
