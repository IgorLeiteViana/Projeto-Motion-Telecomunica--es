const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();


app.use(cors()); // Permite que o front (index.html) acesse o backend
app.use(express.json()); // Permite o receber os dados


app.get('/api/transacoes', async (req, res) => {
    try {
        const [linhas] = await pool.query('SELECT * FROM transacoes ORDER BY data_criacao DESC');
        res.json(linhas);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao buscar transações' });
    }
});

// ==========================================
// ROTA: CRIAR NOVA TRANSAÇÃO (CREATE)
// ==========================================
app.post('/api/transacoes', async (req, res) => {
    // Dados recebidos do btnSalvar no script.js
    const { nome, desc, valor, tipo, cat } = req.body; 

    try {
        const query = `
            INSERT INTO transacoes (nome, descricao, valor, tipo, categoria) 
            VALUES (?, ?, ?, ?, ?)
        `;
        const [resultado] = await pool.query(query, [nome, desc, valor, tipo, cat]);
        
        // Retorna o ID gerado pelo banco e os dados confirmados
        res.status(201).json({ id: resultado.insertId, nome, desc, valor, tipo, cat, concluido: false });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao adicionar transação' });
    }
});

// ==========================================
// ROTA: ATUALIZAR TRANSAÇÃO (UPDATE)
// ==========================================
app.put('/api/transacoes/:id', async (req, res) => {
    const { id } = req.params;
    const { nome, desc, valor, tipo, cat, concluido } = req.body;

    try {
        const query = `
            UPDATE transacoes 
            SET nome = ?, descricao = ?, valor = ?, tipo = ?, categoria = ?, concluido = ? 
            WHERE id = ?
        `;
        await pool.query(query, [nome, desc, valor, tipo, cat, concluido, id]);
        
        res.json({ mensagem: 'Transação atualizada com sucesso!' });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao atualizar transação' });
    }
});

// ==========================================
// ROTA: DELETAR TRANSAÇÃO (DELETE)
// ==========================================
app.delete('/api/transacoes/:id', async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query('DELETE FROM transacoes WHERE id = ?', [id]);
        res.json({ mensagem: 'Transação excluída com sucesso!' });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao excluir transação' });
    }
});

// Inicializando o servidor
const PORTA = 3000;
app.listen(PORTA, () => {
    console.log(`Servidor de finanças rodando na porta ${PORTA}`);
});

app.get('/api/resumo', async (req, res) => {
    try {
        const query = `
            SELECT 
                SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END) as total_despesas,
                SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END) as total_entradas,
                SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END) - SUM(CASE WHEN tipo = 'despesa' AND concluido = 1 THEN valor ELSE 0 END) as saldo_disponivel,
                GREATEST(0, SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END) - SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END)) as lucro_total,
                SUM(CASE WHEN tipo = 'despesa' AND concluido = 0 THEN valor ELSE 0 END) as contas_a_pagar,
                SUM(CASE WHEN tipo = 'despesa' AND concluido = 1 THEN valor ELSE 0 END) as contas_pagas,
                -- NOVOS DADOS PARA RELATÓRIOS
                SUM(CASE WHEN tipo = 'despesa' AND categoria = 'fixa' THEN valor ELSE 0 END) as despesa_fixa,
                SUM(CASE WHEN tipo = 'despesa' AND categoria = 'variavel' THEN valor ELSE 0 END) as despesa_variavel,
                SUM(CASE WHEN tipo = 'entrada' AND categoria = 'fixa' THEN valor ELSE 0 END) as entrada_fixa,
                SUM(CASE WHEN tipo = 'entrada' AND categoria = 'variavel' THEN valor ELSE 0 END) as entrada_variavel
            FROM transacoes;
        `;
        const [resultado] = await pool.query(query);
        const data = resultado[0];
        
        // Retorna o objeto com todos os campos necessários para as duas telas
        res.json({
            ...data,
            saldo_relatorio: data.total_entradas - data.total_despesas,
            lucro_relatorio: Math.max(0, data.total_entradas - data.total_despesas)
        });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao calcular resumo' });
    }
});