package com.adega.dto;

import com.adega.model.FormaPagamento;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record DashboardResumoResponse(
        Periodo periodo,
        BigDecimal totalRecebido,
        List<TotalFormaPagamento> recebimentosPorForma,
        BigDecimal ticketMedio,
        Long quantidadeComandasPagas,
        ComparacaoPeriodo comparacaoPeriodoAnterior,
        List<RecebimentoDiario> evolucaoRecebimentos,
        List<ProdutoMaisVendido> produtosMaisVendidos,
        long quantidadeComandasAbertas,
        long quantidadeComandasFiado,
        BigDecimal valorPendenteFiado,
        long quantidadeProdutosBaixoEstoque,
        List<ComandaAberta> comandasAbertas,
        List<ProdutoBaixoEstoque> produtosBaixoEstoque
) {
    public record Periodo(LocalDate inicio, LocalDate fim) {
    }

    public record TotalFormaPagamento(FormaPagamento formaPagamento, BigDecimal total) {
    }

    public record ComparacaoPeriodo(
            Periodo periodo,
            BigDecimal totalRecebido,
            BigDecimal diferenca,
            BigDecimal variacaoPercentual
    ) {
    }

    public record RecebimentoDiario(LocalDate data, BigDecimal total) {
    }

    public record ProdutoMaisVendido(
            UUID produtoUuid,
            String produtoNome,
            long unidadesVendidas,
            BigDecimal valorVendido
    ) {
    }

    public record ComandaAberta(UUID uuid, String nomeResponsavel, int quantidadeItens, BigDecimal total) {
    }

    public record ProdutoBaixoEstoque(
            UUID uuid,
            String nome,
            int quantidadeEstoqueUnidades,
            int alertaEstoqueUnidades
    ) {
    }
}
