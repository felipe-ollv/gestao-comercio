package com.adega.service;

import com.adega.dto.DashboardResumoResponse;
import com.adega.exception.BusinessException;
import com.adega.model.Comanda;
import com.adega.model.Produto;
import com.adega.model.StatusComanda;
import com.adega.repository.ComandaPagamentoRepository;
import com.adega.repository.ComandaItemRepository;
import com.adega.repository.ComandaRepository;
import com.adega.repository.ProdutoRepository;
import com.adega.util.BusinessTime;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@ApplicationScoped
public class DashboardService {
    private static final int DASHBOARD_LIST_LIMIT = 10;

    @Inject
    SecurityService securityService;

    @Inject
    ComandaRepository comandaRepository;

    @Inject
    ComandaPagamentoRepository comandaPagamentoRepository;

    @Inject
    ComandaItemRepository comandaItemRepository;

    @Inject
    ProdutoRepository produtoRepository;

    @Transactional
    public DashboardResumoResponse summary(LocalDate inicio, LocalDate fim) {
        LocalDate effectiveStart = inicio == null ? BusinessTime.today() : inicio;
        LocalDate effectiveEnd = fim == null ? effectiveStart : fim;
        if (effectiveEnd.isBefore(effectiveStart)) {
            throw new BusinessException("A data final não pode ser anterior à data inicial.");
        }

        UUID adegaUuid = securityService.currentAdegaUuid();
        LocalDateTime startDateTime = effectiveStart.atStartOfDay();
        LocalDateTime exclusiveEndDateTime = effectiveEnd.plusDays(1).atStartOfDay();
        boolean manager = securityService.isGestor();

        BigDecimal totalReceived = manager
                ? comandaPagamentoRepository.totalByPeriod(adegaUuid, startDateTime, exclusiveEndDateTime)
                : null;
        List<DashboardResumoResponse.TotalFormaPagamento> totalsByMethod = manager
                ? comandaPagamentoRepository
                        .totalsByPaymentMethod(adegaUuid, startDateTime, exclusiveEndDateTime)
                        .entrySet()
                        .stream()
                        .map(entry -> new DashboardResumoResponse.TotalFormaPagamento(entry.getKey(), entry.getValue()))
                        .toList()
                : List.of();
        BigDecimal averageTicket = null;
        Long paidCommands = null;
        DashboardResumoResponse.ComparacaoPeriodo periodComparison = null;
        List<DashboardResumoResponse.RecebimentoDiario> dailyReceipts = List.of();
        List<DashboardResumoResponse.ProdutoMaisVendido> topSellingProducts = List.of();

        if (manager) {
            long commandsWithReceipts = comandaPagamentoRepository.countDistinctCommandsByPeriod(
                    adegaUuid,
                    startDateTime,
                    exclusiveEndDateTime
            );
            averageTicket = commandsWithReceipts == 0
                    ? BigDecimal.ZERO
                    : totalReceived.divide(BigDecimal.valueOf(commandsWithReceipts), 2, RoundingMode.HALF_UP);
            paidCommands = comandaRepository.countPaidByPeriod(
                    adegaUuid,
                    startDateTime,
                    exclusiveEndDateTime
            );
            periodComparison = previousPeriodComparison(
                    adegaUuid,
                    effectiveStart,
                    effectiveEnd,
                    totalReceived
            );
            dailyReceipts = dailyReceipts(
                    effectiveStart,
                    effectiveEnd,
                    comandaPagamentoRepository.totalsByDay(
                            adegaUuid,
                            startDateTime,
                            exclusiveEndDateTime
                    )
            );
            topSellingProducts = comandaItemRepository
                    .listTopSellingProducts(
                            adegaUuid,
                            startDateTime,
                            exclusiveEndDateTime,
                            DASHBOARD_LIST_LIMIT
                    )
                    .stream()
                    .map(product -> new DashboardResumoResponse.ProdutoMaisVendido(
                            product.produtoUuid(),
                            product.produtoNome(),
                            product.unidadesVendidas(),
                            product.valorVendido()
                    ))
                    .toList();
        }

        List<DashboardResumoResponse.ComandaAberta> openCommands = comandaRepository
                .listRecentByStatus(adegaUuid, StatusComanda.ABERTA, DASHBOARD_LIST_LIMIT)
                .stream()
                .map(this::toOpenCommand)
                .toList();
        List<DashboardResumoResponse.ProdutoBaixoEstoque> lowStockProducts = produtoRepository
                .listLowStock(adegaUuid, DASHBOARD_LIST_LIMIT)
                .stream()
                .map(this::toLowStockProduct)
                .toList();

        return new DashboardResumoResponse(
                new DashboardResumoResponse.Periodo(effectiveStart, effectiveEnd),
                totalReceived,
                totalsByMethod,
                averageTicket,
                paidCommands,
                periodComparison,
                dailyReceipts,
                topSellingProducts,
                comandaRepository.countByStatus(adegaUuid, StatusComanda.ABERTA),
                comandaRepository.countByStatus(adegaUuid, StatusComanda.FIADO),
                comandaRepository.totalPendingCredit(adegaUuid),
                produtoRepository.countLowStock(adegaUuid),
                openCommands,
                lowStockProducts
        );
    }

    private DashboardResumoResponse.ComparacaoPeriodo previousPeriodComparison(
            UUID adegaUuid,
            LocalDate currentStart,
            LocalDate currentEnd,
            BigDecimal currentTotal
    ) {
        long periodDays = ChronoUnit.DAYS.between(currentStart, currentEnd) + 1;
        LocalDate previousEnd = currentStart.minusDays(1);
        LocalDate previousStart = currentStart.minusDays(periodDays);
        BigDecimal previousTotal = comandaPagamentoRepository.totalByPeriod(
                adegaUuid,
                previousStart.atStartOfDay(),
                previousEnd.plusDays(1).atStartOfDay()
        );
        BigDecimal difference = currentTotal.subtract(previousTotal);
        BigDecimal percentage = previousTotal.compareTo(BigDecimal.ZERO) == 0
                ? null
                : difference
                        .multiply(BigDecimal.valueOf(100))
                        .divide(previousTotal, 2, RoundingMode.HALF_UP);

        return new DashboardResumoResponse.ComparacaoPeriodo(
                new DashboardResumoResponse.Periodo(previousStart, previousEnd),
                previousTotal,
                difference,
                percentage
        );
    }

    private List<DashboardResumoResponse.RecebimentoDiario> dailyReceipts(
            LocalDate start,
            LocalDate end,
            Map<LocalDate, BigDecimal> totals
    ) {
        List<DashboardResumoResponse.RecebimentoDiario> result = new ArrayList<>();
        LocalDate date = start;
        while (!date.isAfter(end)) {
            result.add(new DashboardResumoResponse.RecebimentoDiario(
                    date,
                    totals.getOrDefault(date, BigDecimal.ZERO)
            ));
            date = date.plusDays(1);
        }
        return result;
    }

    private DashboardResumoResponse.ComandaAberta toOpenCommand(Comanda comanda) {
        BigDecimal total = comanda.itens.stream()
                .map(item -> item.valorCobradoUnitario.multiply(BigDecimal.valueOf(item.quantidadePedida)))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new DashboardResumoResponse.ComandaAberta(
                comanda.uuid,
                comanda.nomeResponsavel,
                comanda.itens.size(),
                total
        );
    }

    private DashboardResumoResponse.ProdutoBaixoEstoque toLowStockProduct(Produto produto) {
        return new DashboardResumoResponse.ProdutoBaixoEstoque(
                produto.uuid,
                produto.nome,
                produto.quantidadeEstoqueUnidades,
                produto.alertaEstoqueUnidades
        );
    }
}
