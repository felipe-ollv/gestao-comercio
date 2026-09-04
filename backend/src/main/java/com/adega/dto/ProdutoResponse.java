package com.adega.dto;

import com.adega.model.Produto;
import java.math.BigDecimal;
import java.util.UUID;

public record ProdutoResponse(
        UUID uuid,
        String nome,
        int quantidadeEstoqueUnidades,
        int alertaEstoqueUnidades,
        int unidadesPorCaixa,
        BigDecimal valorUnidade,
        BigDecimal valorCaixa,
        BigDecimal custoUnidade
) {
    public static ProdutoResponse from(Produto produto, boolean incluirCusto) {
        return new ProdutoResponse(
                produto.uuid,
                produto.nome,
                produto.quantidadeEstoqueUnidades,
                produto.alertaEstoqueUnidades,
                produto.unidadesPorCaixa,
                produto.valorUnidade,
                produto.valorCaixa,
                incluirCusto ? produto.custoUnidade : null
        );
    }
}
