package com.adega.dto;

import com.adega.model.FormaPagamento;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record PagamentoParcialComandaRequest(
        @NotNull
        @DecimalMin(value = "0.01", message = "O valor do pagamento parcial deve ser maior que zero.")
        BigDecimal valor,
        @NotNull FormaPagamento formaPagamento
) {
}
