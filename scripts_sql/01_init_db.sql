CREATE TABLE IF NOT EXISTS adega (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    uuid BINARY(16) NOT NULL UNIQUE,
    nome VARCHAR(100) NOT NULL,
    cnpj_cpf VARCHAR(14) NOT NULL UNIQUE,
    data_cadastro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS usuario (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    uuid BINARY(16) NOT NULL UNIQUE,
    adega_uuid BINARY(16) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    perfil VARCHAR(20) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    data_cadastro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_usuario_adega_uuid FOREIGN KEY (adega_uuid) REFERENCES adega(uuid),
    CONSTRAINT chk_usuario_perfil CHECK (perfil IN ('GESTOR', 'ATENDENTE'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS adega_mensalidade (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    adega_uuid BINARY(16) NOT NULL,
    competencia DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
    data_vencimento DATE NOT NULL,
    data_pagamento DATETIME NULL,
    data_cadastro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_mensalidade_adega_uuid FOREIGN KEY (adega_uuid) REFERENCES adega(uuid),
    CONSTRAINT chk_mensalidade_status CHECK (status IN ('PENDENTE', 'PAGO')),
    CONSTRAINT uk_mensalidade_adega_competencia UNIQUE (adega_uuid, competencia),
    INDEX idx_mensalidade_competencia_status (competencia, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO adega_mensalidade (adega_uuid, competencia, status, data_vencimento)
SELECT
    a.uuid,
    DATE(a.data_cadastro),
    'PENDENTE',
    DATE_SUB(
        DATE_ADD(
            DATE(a.data_cadastro),
            INTERVAL 1 MONTH
        ),
        INTERVAL 1 DAY
    )
FROM adega a
WHERE NOT EXISTS (
    SELECT 1
    FROM adega_mensalidade m
    WHERE m.adega_uuid = a.uuid
      AND m.competencia = DATE(a.data_cadastro)
);

CREATE TABLE IF NOT EXISTS produto (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    uuid BINARY(16) NOT NULL UNIQUE,
    adega_uuid BINARY(16) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    quantidade_estoque_unidades INT NOT NULL,
    alerta_estoque_unidades INT NOT NULL DEFAULT 12,
    alerta_estoque_notificado BOOLEAN NOT NULL DEFAULT FALSE,
    alerta_estoque_ciclo INT NOT NULL DEFAULT 0,
    unidades_por_caixa INT NOT NULL DEFAULT 1,
    valor_unidade DECIMAL(10,2) NOT NULL,
    valor_caixa DECIMAL(10,2) NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_produto_adega_uuid FOREIGN KEY (adega_uuid) REFERENCES adega(uuid),
    CONSTRAINT chk_produto_estoque CHECK (quantidade_estoque_unidades >= 0),
    CONSTRAINT chk_produto_alerta_estoque CHECK (alerta_estoque_unidades >= 0),
    CONSTRAINT chk_produto_alerta_ciclo CHECK (alerta_estoque_ciclo >= 0),
    CONSTRAINT chk_produto_unidades_caixa CHECK (unidades_por_caixa >= 1),
    INDEX idx_produto_adega_nome (adega_uuid, nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notificacao_email (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    uuid BINARY(16) NOT NULL UNIQUE,
    adega_uuid BINARY(16) NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    chave_referencia VARCHAR(255) NOT NULL UNIQUE,
    destinatario VARCHAR(120) NOT NULL,
    provider_id VARCHAR(100) NULL,
    data_envio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notificacao_email_adega_uuid FOREIGN KEY (adega_uuid) REFERENCES adega(uuid),
    INDEX idx_notificacao_email_adega_tipo (adega_uuid, tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comanda (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    uuid BINARY(16) NOT NULL UNIQUE,
    adega_uuid BINARY(16) NOT NULL,
    nome_responsavel VARCHAR(100) NOT NULL,
    data_abertura DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_fechamento DATETIME NULL,
    data_exclusao DATETIME NULL,
    status VARCHAR(20) NOT NULL,
    valor_pago_parcial DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    observacao_exclusao VARCHAR(500) NULL,
    CONSTRAINT fk_comanda_adega_uuid FOREIGN KEY (adega_uuid) REFERENCES adega(uuid),
    CONSTRAINT chk_comanda_status CHECK (status IN ('ABERTA', 'PAGA', 'FIADO', 'EXCLUIDA')),
    INDEX idx_comanda_adega_status (adega_uuid, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comanda_item (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    uuid BINARY(16) NOT NULL UNIQUE,
    comanda_uuid BINARY(16) NOT NULL,
    produto_uuid BINARY(16) NOT NULL,
    quantidade_pedida INT NOT NULL,
    unidades_deduzidas INT NOT NULL,
    tipo_medida_vendida VARCHAR(20) NOT NULL,
    valor_cobrado_unitario DECIMAL(10,2) NOT NULL,
    grupo_uuid BINARY(16) NULL,
    ordem_grupo INT NULL,
    data_adicao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_item_comanda_uuid FOREIGN KEY (comanda_uuid) REFERENCES comanda(uuid),
    CONSTRAINT fk_item_produto_uuid FOREIGN KEY (produto_uuid) REFERENCES produto(uuid),
    CONSTRAINT chk_item_quantidade CHECK (quantidade_pedida > 0),
    CONSTRAINT chk_item_unidades CHECK (unidades_deduzidas > 0),
    CONSTRAINT chk_item_tipo_medida CHECK (tipo_medida_vendida IN ('UNIDADE', 'CAIXA')),
    INDEX idx_item_comanda (comanda_uuid),
    INDEX idx_item_produto (produto_uuid),
    INDEX idx_item_grupo (grupo_uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
