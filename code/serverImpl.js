const path = require('path');
const express = require('express');
const cors = require('cors');

const transacoesRoutes = require('./routes/transacoes.routes');
const resumoRoutes = require('./routes/resumo.routes');

const PORTA = 3000;

function startServer() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // API
  app.use('/api/transacoes', transacoesRoutes);
  app.use('/api', resumoRoutes);

  // Front (index sempre)
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'index.html'));
  });

  app.listen(PORTA, () => {
    console.log(`Servidor de finanças rodando na porta ${PORTA}`);
  });
}

module.exports = { startServer };

