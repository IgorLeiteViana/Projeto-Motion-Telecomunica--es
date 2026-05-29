const express = require('express');
const pool = require('../../db');

const router = express.Router();

// GET: buscar todas
router.get('/', async (req, res) => {
  try {
    const [linhas] = await pool.query('SELECT * FROM transacoes ORDER BY data_criacao DESC');
    res.json(linhas);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao buscar transações' });
  }
});

// POST: criar
router.post('/', async (req, res) => {
  const { nome, desc, valor, tipo, cat } = req.body;

  try {
    const query = `
      INSERT INTO transacoes (nome, descricao, valor, tipo, categoria)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [resultado] = await pool.query(query, [nome, desc, valor, tipo, cat]);

    res.status(201).json({
      id: resultado.insertId,
      nome,
      desc,
      valor,
      tipo,
      cat,
      concluido: false
    });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao adicionar transação' });
  }
});

// PUT: atualizar
router.put('/:id', async (req, res) => {
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

// DELETE: remover
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM transacoes WHERE id = ?', [id]);
    res.json({ mensagem: 'Transação excluída com sucesso!' });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao excluir transação' });
  }
});

module.exports = router;

