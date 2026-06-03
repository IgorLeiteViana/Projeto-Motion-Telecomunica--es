-- Backup de esquema MySQL para o projeto
-- Use este arquivo para recriar a base de dados se ocorrer perda ou erro.

CREATE DATABASE IF NOT EXISTS `financeiro` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `financeiro`;

CREATE TABLE IF NOT EXISTS `transacoes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nome` VARCHAR(255),
  `descricao` TEXT,
  `valor` DECIMAL(12,2) DEFAULT 0,
  `tipo` VARCHAR(30),
  `categoria` VARCHAR(30),
  `concluido` TINYINT(1) DEFAULT 0,
  `data_criacao` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `data_vencimento` DATE NULL,
  `data_pagamento` DATE NULL,
  `data_ganho` DATE NULL,
  `recorrencia` VARCHAR(50) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `categorias` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nome` VARCHAR(255) NOT NULL,
  `tipo` VARCHAR(30) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Exemplo de categorias básicas
INSERT INTO `categorias` (`nome`, `tipo`) VALUES
  ('Salário', 'entrada'),
  ('Venda', 'entrada'),
  ('Aluguel', 'despesa'),
  ('Internet', 'despesa'),
  ('Educação', 'despesa')
ON DUPLICATE KEY UPDATE `nome` = `nome`;
