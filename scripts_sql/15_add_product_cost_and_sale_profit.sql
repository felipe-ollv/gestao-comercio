DROP PROCEDURE IF EXISTS run_if;

DELIMITER //

CREATE PROCEDURE run_if(IN should_run BOOLEAN, IN sql_stmt TEXT)
BEGIN
    IF should_run THEN
        SET @stmt = sql_stmt;
        PREPARE migration_stmt FROM @stmt;
        EXECUTE migration_stmt;
        DEALLOCATE PREPARE migration_stmt;
    END IF;
END//

DELIMITER ;

SET @has_produto_custo_unidade = (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'produto'
      AND column_name = 'custo_unidade'
);
CALL run_if(
    @has_produto_custo_unidade = 0,
    'ALTER TABLE produto ADD COLUMN custo_unidade DECIMAL(10,2) NULL AFTER valor_caixa'
);

SET @has_item_custo_unitario_estoque = (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'comanda_item'
      AND column_name = 'custo_unitario_estoque'
);
CALL run_if(
    @has_item_custo_unitario_estoque = 0,
    'ALTER TABLE comanda_item ADD COLUMN custo_unitario_estoque DECIMAL(10,2) NULL AFTER valor_cobrado_unitario'
);

SET @has_produto_custo_check = (
    SELECT COUNT(*) FROM information_schema.check_constraints
    WHERE constraint_schema = DATABASE()
      AND constraint_name = 'chk_produto_custo_unidade'
);
CALL run_if(
    @has_produto_custo_check = 0,
    'ALTER TABLE produto ADD CONSTRAINT chk_produto_custo_unidade CHECK (custo_unidade IS NULL OR custo_unidade > 0)'
);

SET @has_item_custo_check = (
    SELECT COUNT(*) FROM information_schema.check_constraints
    WHERE constraint_schema = DATABASE()
      AND constraint_name = 'chk_comanda_item_custo_unitario_estoque'
);
CALL run_if(
    @has_item_custo_check = 0,
    'ALTER TABLE comanda_item ADD CONSTRAINT chk_comanda_item_custo_unitario_estoque CHECK (custo_unitario_estoque IS NULL OR custo_unitario_estoque > 0)'
);

SET @has_comanda_profit_period_index = (
    SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'comanda'
      AND index_name = 'idx_comanda_adega_status_fechamento'
);
CALL run_if(
    @has_comanda_profit_period_index = 0,
    'CREATE INDEX idx_comanda_adega_status_fechamento ON comanda (adega_uuid, status, data_fechamento)'
);

DROP PROCEDURE IF EXISTS run_if;
