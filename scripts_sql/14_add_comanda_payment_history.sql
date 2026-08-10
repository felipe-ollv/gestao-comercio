CREATE TABLE IF NOT EXISTS comanda_pagamento (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    uuid BINARY(16) NOT NULL UNIQUE,
    adega_uuid BINARY(16) NOT NULL,
    comanda_uuid BINARY(16) NOT NULL,
    usuario_uuid BINARY(16) NULL,
    valor DECIMAL(10,2) NOT NULL,
    forma_pagamento VARCHAR(30) NOT NULL,
    origem VARCHAR(20) NOT NULL,
    data_pagamento DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pagamento_adega_uuid FOREIGN KEY (adega_uuid) REFERENCES adega(uuid),
    CONSTRAINT fk_pagamento_comanda_uuid FOREIGN KEY (comanda_uuid) REFERENCES comanda(uuid),
    CONSTRAINT fk_pagamento_usuario_uuid FOREIGN KEY (usuario_uuid) REFERENCES usuario(uuid),
    CONSTRAINT chk_pagamento_valor CHECK (valor > 0),
    CONSTRAINT chk_pagamento_forma CHECK (
        forma_pagamento IN ('DINHEIRO', 'PIX', 'CARTAO_DEBITO', 'CARTAO_CREDITO', 'OUTRO', 'NAO_INFORMADA')
    ),
    CONSTRAINT chk_pagamento_origem CHECK (origem IN ('PARCIAL', 'FECHAMENTO', 'MIGRADO')),
    INDEX idx_pagamento_adega_data (adega_uuid, data_pagamento),
    INDEX idx_pagamento_comanda_data (comanda_uuid, data_pagamento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Preserva o acumulado legado. A data e a forma são aproximações explicitamente
-- identificadas como MIGRADO/NAO_INFORMADA, pois o modelo anterior não guardava eventos.
INSERT INTO comanda_pagamento (
    uuid,
    adega_uuid,
    comanda_uuid,
    usuario_uuid,
    valor,
    forma_pagamento,
    origem,
    data_pagamento
)
SELECT
    UUID_TO_BIN(UUID()),
    comanda.adega_uuid,
    comanda.uuid,
    NULL,
    comanda.valor_pago_parcial,
    'NAO_INFORMADA',
    'MIGRADO',
    COALESCE(
        CASE
            WHEN comanda.status IN ('PAGA', 'FIADO') THEN comanda.data_fechamento
            ELSE comanda.data_abertura
        END,
        comanda.data_abertura,
        CURRENT_TIMESTAMP
    )
FROM comanda
WHERE comanda.valor_pago_parcial > 0
  AND NOT EXISTS (
      SELECT 1
      FROM comanda_pagamento pagamento
      WHERE pagamento.comanda_uuid = comanda.uuid
        AND pagamento.origem = 'MIGRADO'
  );
