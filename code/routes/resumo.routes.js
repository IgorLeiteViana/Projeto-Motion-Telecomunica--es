const express = require('express');
const pool = require('../../db');

const router = express.Router();

router.get('/resumo', async (req, res) => {
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

module.exports = router;

