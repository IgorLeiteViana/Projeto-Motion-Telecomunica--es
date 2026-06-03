const express = require('express');
const cors = require('cors');
const path = require('path');
const ExcelJS = require('exceljs');
const pool = require('./db'); // Importa a conexão com o banco de dados (MySQL)
const app = express();

async function ensureDatabaseSchema() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS transacoes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nome VARCHAR(255),
                descricao TEXT,
                valor DECIMAL(12,2) DEFAULT 0,
                tipo VARCHAR(30),
                categoria VARCHAR(30),
                concluido TINYINT(1) DEFAULT 0,
                data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                data_vencimento DATE NULL,
                data_pagamento DATE NULL,
                data_ganho DATE NULL,
                recorrencia VARCHAR(50) NULL
            )
        `);

        const [columns] = await pool.query('SHOW COLUMNS FROM transacoes');
        const existing = new Set(columns.map(col => col.Field));
        const alterations = [];

        if (!existing.has('data_vencimento')) alterations.push('ADD COLUMN data_vencimento DATE NULL');
        if (!existing.has('data_pagamento')) alterations.push('ADD COLUMN data_pagamento DATE NULL');
        if (!existing.has('data_ganho')) alterations.push('ADD COLUMN data_ganho DATE NULL');
        if (!existing.has('recorrencia')) alterations.push('ADD COLUMN recorrencia VARCHAR(50) NULL');

        if (alterations.length > 0) {
            await pool.query(`ALTER TABLE transacoes ${alterations.join(', ')}`);
        }
    } catch (erro) {
        console.error('Erro ao inicializar esquema do banco:', erro);
    }
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname));
app.use(express.static(__dirname));

app.use(cors()); // Permite que o front (index.html) acesse o backend
app.use(express.json()); // Permite o receber os dados

app.get(['/', '/dashboard'], (_req, res) => {
    res.render('dashboard');
});

app.get('/api/transacoes', async (req, res) => {
    try {
        const { mes, ano, tipo, categoria } = req.query;
        let query = 'SELECT * FROM transacoes';
        const params = [];
        
        // Aplicar filtros se fornecidos
        const filters = [];
        if (mes && ano) {
            filters.push('MONTH(data_criacao) = ? AND YEAR(data_criacao) = ?');
            params.push(mes, ano);
        }
        if (tipo) {
            filters.push('tipo = ?');
            params.push(tipo);
        }
        if (categoria) {
            filters.push('categoria = ?');
            params.push(categoria);
        }
        
        if (filters.length > 0) {
            query += ' WHERE ' + filters.join(' AND ');
        }
        query += ' ORDER BY data_criacao DESC';
        
        const [linhas] = await pool.query(query, params);
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
    const { nome, desc, valor, tipo, cat, dataVencimento, dataPagamento, dataGanho, recorrencia } = req.body;

    try {
        const query = `
            INSERT INTO transacoes (
                nome, descricao, valor, tipo, categoria,
                data_vencimento, data_pagamento, data_ganho, recorrencia
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [resultado] = await pool.query(query, [
            nome,
            desc,
            valor,
            tipo,
            cat,
            dataVencimento || null,
            dataPagamento || null,
            dataGanho || null,
            recorrencia || null
        ]);
        
        res.status(201).json({
            id: resultado.insertId,
            nome,
            desc,
            valor,
            tipo,
            cat,
            dataVencimento,
            dataPagamento,
            dataGanho,
            recorrencia,
            concluido: false
        });
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
    const { nome, desc, valor, tipo, cat, concluido, dataVencimento, dataPagamento, dataGanho, recorrencia } = req.body;

    try {
        const query = `
            UPDATE transacoes 
            SET nome = ?, descricao = ?, valor = ?, tipo = ?, categoria = ?, concluido = ?,
                data_vencimento = ?, data_pagamento = ?, data_ganho = ?, recorrencia = ?
            WHERE id = ?
        `;
        await pool.query(query, [
            nome,
            desc,
            valor,
            tipo,
            cat,
            concluido,
            dataVencimento || null,
            dataPagamento || null,
            dataGanho || null,
            recorrencia || null,
            id
        ]);
        
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

// ==========================================
// ROTA: RESUMO E ESTATÍSTICAS (READ)
// ==========================================
app.get('/api/resumo', async (req, res) => {
    try {
        const { mes, ano } = req.query;
        let whereClause = '';
        const params = [];
        
        // Aplicar filtro de mês/ano se fornecidos
        if (mes && ano) {
            whereClause = 'WHERE MONTH(data_criacao) = ? AND YEAR(data_criacao) = ?';
            params.push(mes, ano);
        }
        
        const sqlQuery = `
            SELECT 
                SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END) as total_despesas,
                SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END) as total_entradas,
                SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END) - SUM(CASE WHEN tipo = 'despesa' AND concluido = 1 THEN valor ELSE 0 END) as saldo_disponivel,
                GREATEST(0, SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END) - SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END)) as lucro_total,
                SUM(CASE WHEN tipo = 'despesa' AND concluido = 0 THEN valor ELSE 0 END) as contas_a_pagar,
                SUM(CASE WHEN tipo = 'despesa' AND concluido = 1 THEN valor ELSE 0 END) as contas_pagas,
                SUM(CASE WHEN tipo = 'despesa' AND categoria = 'fixa' THEN valor ELSE 0 END) as despesa_fixa,
                SUM(CASE WHEN tipo = 'despesa' AND categoria = 'variavel' THEN valor ELSE 0 END) as despesa_variavel,
                SUM(CASE WHEN tipo = 'entrada' AND categoria = 'fixa' THEN valor ELSE 0 END) as entrada_fixa,
                SUM(CASE WHEN tipo = 'entrada' AND categoria = 'variavel' THEN valor ELSE 0 END) as entrada_variavel
            FROM transacoes
            ${whereClause}
        `;
        
        const [resultado] = await pool.query(sqlQuery, params);
        res.json(resultado[0]);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao calcular resumo' });
    }
});

// ==========================================
// ROTA: GERENCIAR CATEGORIAS
// ==========================================
app.get('/api/categorias', async (req, res) => {
    try {
        const [categorias] = await pool.query('SELECT * FROM categorias ORDER BY nome ASC');
        res.json(categorias);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao buscar categorias' });
    }
});

app.post('/api/categorias', async (req, res) => {
    const { nome, tipo } = req.body;
    
    try {
        const query = 'INSERT INTO categorias (nome, tipo) VALUES (?, ?)';
        const [resultado] = await pool.query(query, [nome, tipo]);
        res.status(201).json({ id: resultado.insertId, nome, tipo });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao criar categoria' });
    }
});

// ==========================================
// ROTA: RESUMO COMPARATIVO (MÊS ANTERIOR)
// ==========================================
app.get('/api/resumo/comparativo', async (req, res) => {
    try {
        const { mes, ano } = req.query;
        
        if (!mes || !ano) {
            return res.status(400).json({ erro: 'Parâmetros mes e ano são obrigatórios' });
        }
        
        // Calcular mês anterior
        let mesPrev = parseInt(mes) - 1;
        let anoPrev = parseInt(ano);
        if (mesPrev === 0) {
            mesPrev = 12;
            anoPrev--;
        }
        
        // Query para mês atual
        const queryAtual = `
            SELECT 
                SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END) as total_despesas,
                SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END) as total_entradas,
                SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END) - SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END) as saldo,
                GREATEST(0, SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END) - SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END)) as lucro
            FROM transacoes
            WHERE MONTH(data_criacao) = ? AND YEAR(data_criacao) = ?
        `;
        
        // Query para mês anterior
        const queryAnterior = `
            SELECT 
                SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END) as total_despesas,
                SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END) as total_entradas,
                SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END) - SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END) as saldo,
                GREATEST(0, SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END) - SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END)) as lucro
            FROM transacoes
            WHERE MONTH(data_criacao) = ? AND YEAR(data_criacao) = ?
        `;
        
        const [resultAtual] = await pool.query(queryAtual, [mes, ano]);
        const [resultAnterior] = await pool.query(queryAnterior, [mesPrev, anoPrev]);
        
        const atual = resultAtual[0];
        const anterior = resultAnterior[0];
        
        // Calcular variação percentual
        const calcularVariacao = (atual, anterior) => {
            if (!anterior || anterior === 0) return 0;
            return ((atual - anterior) / anterior * 100).toFixed(2);
        };
        
        res.json({
            mes_atual: {
                despesas: atual.total_despesas,
                entradas: atual.total_entradas,
                saldo: atual.saldo,
                lucro: atual.lucro
            },
            mes_anterior: {
                despesas: anterior.total_despesas,
                entradas: anterior.total_entradas,
                saldo: anterior.saldo,
                lucro: anterior.lucro
            },
            variacao_percentual: {
                despesas: calcularVariacao(atual.total_despesas, anterior.total_despesas),
                entradas: calcularVariacao(atual.total_entradas, anterior.total_entradas),
                saldo: calcularVariacao(atual.saldo, anterior.saldo),
                lucro: calcularVariacao(atual.lucro, anterior.lucro)
            }
        });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao calcular comparativo' });
    }
});

// ==========================================
// ROTA: EXPORTAR CSV
// ==========================================
app.get('/api/export/csv', async (req, res) => {
    try {
        const { mes, ano } = req.query;
        let query = 'SELECT * FROM transacoes';
        const params = [];
        
        if (mes && ano) {
            query += ' WHERE MONTH(data_criacao) = ? AND YEAR(data_criacao) = ?';
            params.push(mes, ano);
        }
        query += ' ORDER BY data_criacao DESC';
        
        const [transacoes] = await pool.query(query, params);
        
        // Cabeçalhos CSV
        let csv = 'ID,Nome,Descricao,Valor,Tipo,Categoria,Concluido,Data Vencimento,Data Pagamento,Data Ganho,Recorrencia,Data Criacao\n';
        
        // Dados
        transacoes.forEach(t => {
            csv += `${t.id},"${t.nome}","${t.descricao}",${t.valor},"${t.tipo}","${t.categoria}",${t.concluido},"${t.data_vencimento ? new Date(t.data_vencimento).toLocaleDateString('pt-BR') : ''}","${t.data_pagamento ? new Date(t.data_pagamento).toLocaleDateString('pt-BR') : ''}","${t.data_ganho ? new Date(t.data_ganho).toLocaleDateString('pt-BR') : ''}","${t.recorrencia || ''}","${new Date(t.data_criacao).toLocaleDateString('pt-BR')}"\n`;
        });
        
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="transacoes_${mes}_${ano}.csv"`);
        res.send(csv);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao gerar CSV' });
    }
});

// ==========================================
// ROTA: EXPORTAR PDF
// ==========================================
app.get('/api/alertas', async (req, res) => {
    try {
        const [alertas] = await pool.query(`
            SELECT * FROM transacoes
            WHERE tipo = 'despesa' AND concluido = 0
                AND data_vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)
            ORDER BY data_vencimento ASC
        `);
        res.json(alertas);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao buscar alertas' });
    }
});

app.get('/api/export/pdf', async (req, res) => {
    try {
        const { mes, ano } = req.query;
        let query = 'SELECT * FROM transacoes';
        const params = [];
        
        if (mes && ano) {
            query += ' WHERE MONTH(data_criacao) = ? AND YEAR(data_criacao) = ?';
            params.push(mes, ano);
        }
        query += ' ORDER BY data_criacao DESC';
        
        const [transacoes] = await pool.query(query, params);
        
        // Calcular totais
        const totalDespesas = transacoes
            .filter(t => t.tipo === 'despesa')
            .reduce((sum, t) => sum + t.valor, 0);
        const totalEntradas = transacoes
            .filter(t => t.tipo === 'entrada')
            .reduce((sum, t) => sum + t.valor, 0);
        
        // Usar PDFDocument se disponível
        try {
            const PDFDocument = require('pdfkit');
            const doc = new PDFDocument();
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="transacoes_${mes}_${ano}.pdf"`);
            doc.pipe(res);
            
            // Cabeçalho
            doc.fontSize(16).text(`Relatório de Transações - ${mes}/${ano}`, { align: 'center' });
            doc.fontSize(12).text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, { align: 'center' });
            doc.moveDown();
            
            // Resumo
            doc.fontSize(12).text('RESUMO:', { underline: true });
            doc.fontSize(10).text(`Total Entradas: R$ ${totalEntradas.toFixed(2)}`);
            doc.text(`Total Despesas: R$ ${totalDespesas.toFixed(2)}`);
            doc.text(`Saldo: R$ ${(totalEntradas - totalDespesas).toFixed(2)}`);
            doc.moveDown();
            
            // Tabela de transações
            doc.fontSize(12).text('TRANSAÇÕES:', { underline: true });
            doc.fontSize(9);
            
            transacoes.forEach(t => {
                const tipo = t.tipo === 'entrada' ? '✓ Entrada' : '✗ Despesa';
                doc.text(`${t.nome} | ${tipo} | R$ ${t.valor.toFixed(2)} | ${new Date(t.data_criacao).toLocaleDateString('pt-BR')}`);
            });
            
            doc.end();
        } catch (pdfError) {
            // Se pdfkit não estiver instalado, retornar erro
            res.status(400).json({ erro: 'pdfkit não instalado. Execute: npm install pdfkit' });
        }
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao gerar PDF' });
    }
});

// ==========================================
// ROTA: EXPORTAR EXCEL
// ==========================================
app.get('/api/export/excel', async (req, res) => {
    try {
        const { mes, ano } = req.query;
        let query = 'SELECT * FROM transacoes';
        const params = [];

        if (mes && ano) {
            query += ' WHERE MONTH(data_criacao) = ? AND YEAR(data_criacao) = ?';
            params.push(mes, ano);
        }
        query += ' ORDER BY data_criacao DESC';

        const [transacoes] = await pool.query(query, params);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Transações');

        worksheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Nome', key: 'nome', width: 30 },
            { header: 'Descrição', key: 'descricao', width: 40 },
            { header: 'Valor', key: 'valor', width: 15 },
            { header: 'Tipo', key: 'tipo', width: 15 },
            { header: 'Categoria', key: 'categoria', width: 15 },
            { header: 'Concluído', key: 'concluido', width: 12 },
            { header: 'Data Vencimento', key: 'data_vencimento', width: 15 },
            { header: 'Data Pagamento', key: 'data_pagamento', width: 15 },
            { header: 'Data Ganho', key: 'data_ganho', width: 15 },
            { header: 'Recorrência', key: 'recorrencia', width: 15 },
            { header: 'Data Criação', key: 'data_criacao', width: 20 }
        ];

        transacoes.forEach(t => {
            worksheet.addRow({
                id: t.id,
                nome: t.nome,
                descricao: t.descricao,
                valor: t.valor,
                tipo: t.tipo,
                categoria: t.categoria,
                concluido: t.concluido ? 'Sim' : 'Não',
                data_vencimento: t.data_vencimento ? new Date(t.data_vencimento).toLocaleDateString('pt-BR') : '',
                data_pagamento: t.data_pagamento ? new Date(t.data_pagamento).toLocaleDateString('pt-BR') : '',
                data_ganho: t.data_ganho ? new Date(t.data_ganho).toLocaleDateString('pt-BR') : '',
                recorrencia: t.recorrencia || '',
                data_criacao: new Date(t.data_criacao).toLocaleDateString('pt-BR')
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="transacoes_${mes || 'todas'}_${ano || 'todas'}.xlsx"`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao exportar Excel' });
    }
});

// Inicializando o servidor
const PORTA = 3000;
ensureDatabaseSchema().then(() => {
    app.listen(PORTA, () => {
        console.log(`Servidor de finanças rodando na porta ${PORTA}`);
    });
});
