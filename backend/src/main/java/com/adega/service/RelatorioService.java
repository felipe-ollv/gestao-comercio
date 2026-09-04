package com.adega.service;

import com.adega.dto.RelatorioLucroResponse;
import com.adega.exception.BusinessException;
import com.adega.repository.ComandaItemRepository;
import com.adega.util.BusinessTime;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class RelatorioService {
    @Inject
    SecurityService securityService;

    @Inject
    ComandaItemRepository comandaItemRepository;

    @Transactional
    public RelatorioLucroResponse lucro(LocalDate inicio, LocalDate fim) {
        LocalDate effectiveStart = inicio == null ? BusinessTime.today() : inicio;
        LocalDate effectiveEnd = fim == null ? effectiveStart : fim;
        if (effectiveEnd.isBefore(effectiveStart)) {
            throw new BusinessException("A data final não pode ser anterior à data inicial.");
        }

        UUID adegaUuid = securityService.currentAdegaUuid();
        LocalDateTime startDateTime = effectiveStart.atStartOfDay();
        LocalDateTime exclusiveEndDateTime = effectiveEnd.plusDays(1).atStartOfDay();
        List<RelatorioLucroResponse.ProdutoRentabilidade> products = comandaItemRepository
                .listProfitabilityByPeriod(adegaUuid, startDateTime, exclusiveEndDateTime)
                .stream()
                .map(this::toProductProfitability)
                .toList();

        BigDecimal soldValue = sum(products, RelatorioLucroResponse.ProdutoRentabilidade::valorVendido);
        BigDecimal coveredSoldValue = sum(
                products,
                RelatorioLucroResponse.ProdutoRentabilidade::valorVendidoComCusto
        );
        BigDecimal cost = sum(products, RelatorioLucroResponse.ProdutoRentabilidade::custoProdutosVendidos);
        BigDecimal missingCostValue = sum(
                products,
                RelatorioLucroResponse.ProdutoRentabilidade::valorVendidoSemCusto
        );
        BigDecimal grossProfit = coveredSoldValue.subtract(cost);

        return new RelatorioLucroResponse(
                new RelatorioLucroResponse.Periodo(effectiveStart, effectiveEnd),
                soldValue,
                coveredSoldValue,
                cost,
                grossProfit,
                percentage(grossProfit, coveredSoldValue),
                missingCostValue,
                percentage(coveredSoldValue, soldValue),
                products
        );
    }

    private RelatorioLucroResponse.ProdutoRentabilidade toProductProfitability(
            ComandaItemRepository.ProdutoRentabilidade product
    ) {
        BigDecimal grossProfit = product.valorVendidoComCusto().subtract(product.custoProdutosVendidos());
        return new RelatorioLucroResponse.ProdutoRentabilidade(
                product.produtoUuid(),
                product.produtoNome(),
                product.unidadesVendidas(),
                product.valorVendido(),
                product.valorVendidoComCusto(),
                product.custoProdutosVendidos(),
                grossProfit,
                percentage(grossProfit, product.valorVendidoComCusto()),
                product.valorVendidoSemCusto(),
                percentage(product.valorVendidoComCusto(), product.valorVendido())
        );
    }

    private BigDecimal sum(
            List<RelatorioLucroResponse.ProdutoRentabilidade> products,
            java.util.function.Function<RelatorioLucroResponse.ProdutoRentabilidade, BigDecimal> value
    ) {
        return products.stream().map(value).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal percentage(BigDecimal value, BigDecimal base) {
        if (base.compareTo(BigDecimal.ZERO) == 0) {
            return null;
        }
        return value.multiply(BigDecimal.valueOf(100)).divide(base, 2, RoundingMode.HALF_UP);
    }
}
