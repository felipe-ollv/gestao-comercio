package com.adega.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;

public record ProdutoRequest(
        @NotBlank String nome,
        @PositiveOrZero int quantidadeEstoqueUnidades,
        @PositiveOrZero int alertaEstoqueUnidades,
        @Min(1) int unidadesPorCaixa,
        @NotNull @DecimalMin("0.01") BigDecimal valorUnidade,
        @Positive BigDecimal valorCaixa,
        @Positive BigDecimal custoUnidade
) {
}
