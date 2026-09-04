package com.adega.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record RelatorioLucroResponse(
        Periodo periodo,
        BigDecimal valorVendido,
        BigDecimal valorVendidoComCusto,
        BigDecimal custoProdutosVendidos,
        BigDecimal lucroBruto,
        BigDecimal margemBrutaPercentual,
        BigDecimal valorVendidoSemCusto,
        BigDecimal coberturaCustoPercentual,
        List<ProdutoRentabilidade> produtos
) {
    public record Periodo(LocalDate inicio, LocalDate fim) {
    }

    public record ProdutoRentabilidade(
            UUID produtoUuid,
            String produtoNome,
            long unidadesVendidas,
            BigDecimal valorVendido,
            BigDecimal valorVendidoComCusto,
            BigDecimal custoProdutosVendidos,
            BigDecimal lucroBruto,
            BigDecimal margemBrutaPercentual,
            BigDecimal valorVendidoSemCusto,
            BigDecimal coberturaCustoPercentual
    ) {
    }
}
