package com.adega.dto;

import com.adega.model.ComandaPagamento;
import com.adega.model.FormaPagamento;
import com.adega.model.OrigemPagamento;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record ComandaPagamentoResponse(
        UUID uuid,
        BigDecimal valor,
        FormaPagamento formaPagamento,
        OrigemPagamento origem,
        LocalDateTime dataPagamento,
        UUID usuarioUuid,
        String usuarioNome
) {
    public static ComandaPagamentoResponse from(ComandaPagamento pagamento) {
        return new ComandaPagamentoResponse(
                pagamento.uuid,
                pagamento.valor,
                pagamento.formaPagamento,
                pagamento.origem,
                pagamento.dataPagamento,
                pagamento.usuario == null ? null : pagamento.usuario.uuid,
                pagamento.usuario == null ? "Registro migrado" : pagamento.usuario.nome
        );
    }
}
