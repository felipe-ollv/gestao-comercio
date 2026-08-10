package com.adega.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.adega.dto.DashboardResumoResponse;
import com.adega.exception.BusinessException;
import com.adega.model.FormaPagamento;
import com.adega.model.StatusComanda;
import com.adega.repository.ComandaItemRepository;
import com.adega.repository.ComandaPagamentoRepository;
import com.adega.repository.ComandaRepository;
import com.adega.repository.ProdutoRepository;
import com.adega.util.BusinessTime;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class DashboardServiceTest {
    private final UUID adegaUuid = UUID.randomUUID();

    private DashboardService service;
    private SecurityService securityService;
    private ComandaRepository comandaRepository;
    private ComandaPagamentoRepository pagamentoRepository;
    private ComandaItemRepository comandaItemRepository;
    private ProdutoRepository produtoRepository;

    @BeforeEach
    void setUp() {
        service = new DashboardService();
        securityService = mock(SecurityService.class);
        comandaRepository = mock(ComandaRepository.class);
        pagamentoRepository = mock(ComandaPagamentoRepository.class);
        comandaItemRepository = mock(ComandaItemRepository.class);
        produtoRepository = mock(ProdutoRepository.class);
        service.securityService = securityService;
        service.comandaRepository = comandaRepository;
        service.comandaPagamentoRepository = pagamentoRepository;
        service.comandaItemRepository = comandaItemRepository;
        service.produtoRepository = produtoRepository;

        when(securityService.currentAdegaUuid()).thenReturn(adegaUuid);
        when(comandaRepository.listRecentByStatus(adegaUuid, StatusComanda.ABERTA, 10))
                .thenReturn(List.of());
        when(produtoRepository.listLowStock(adegaUuid, 10)).thenReturn(List.of());
        when(comandaRepository.totalPendingCredit(adegaUuid)).thenReturn(new BigDecimal("40.00"));
        when(comandaItemRepository.listTopSellingProducts(any(), any(), any(), anyInt()))
                .thenReturn(List.of());
    }

    @Test
    void defaultsToCurrentDayAndReturnsManagerFinancialData() {
        when(securityService.isGestor()).thenReturn(true);
        when(pagamentoRepository.totalByPeriod(any(), any(), any()))
                .thenReturn(new BigDecimal("125.50"), new BigDecimal("100.00"));
        when(pagamentoRepository.totalsByPaymentMethod(any(), any(), any()))
                .thenReturn(Map.of(FormaPagamento.PIX, new BigDecimal("125.50")));
        when(pagamentoRepository.countDistinctCommandsByPeriod(any(), any(), any())).thenReturn(2L);
        when(pagamentoRepository.totalsByDay(any(), any(), any()))
                .thenReturn(Map.of(BusinessTime.today(), new BigDecimal("125.50")));
        when(comandaRepository.countPaidByPeriod(any(), any(), any())).thenReturn(1L);
        when(comandaItemRepository.listTopSellingProducts(any(), any(), any(), anyInt()))
                .thenReturn(List.of(new ComandaItemRepository.ProdutoVenda(
                        UUID.randomUUID(),
                        "Produto teste",
                        3,
                        new BigDecimal("75.00")
                )));

        DashboardResumoResponse response = service.summary(null, null);

        assertEquals(BusinessTime.today(), response.periodo().inicio());
        assertEquals(BusinessTime.today(), response.periodo().fim());
        assertEquals(new BigDecimal("125.50"), response.totalRecebido());
        assertEquals(FormaPagamento.PIX, response.recebimentosPorForma().get(0).formaPagamento());
        assertEquals(new BigDecimal("62.75"), response.ticketMedio());
        assertEquals(1L, response.quantidadeComandasPagas());
        assertEquals(new BigDecimal("100.00"), response.comparacaoPeriodoAnterior().totalRecebido());
        assertEquals(new BigDecimal("25.50"), response.comparacaoPeriodoAnterior().diferenca());
        assertEquals(new BigDecimal("25.50"), response.comparacaoPeriodoAnterior().variacaoPercentual());
        assertEquals(new BigDecimal("125.50"), response.evolucaoRecebimentos().get(0).total());
        assertEquals("Produto teste", response.produtosMaisVendidos().get(0).produtoNome());
        assertEquals(new BigDecimal("40.00"), response.valorPendenteFiado());
    }

    @Test
    void hidesFinancialDataFromAttendant() {
        when(securityService.isGestor()).thenReturn(false);

        DashboardResumoResponse response = service.summary(
                LocalDate.of(2026, 8, 1),
                LocalDate.of(2026, 8, 31)
        );

        assertNull(response.totalRecebido());
        assertEquals(List.of(), response.recebimentosPorForma());
        assertNull(response.ticketMedio());
        assertNull(response.quantidadeComandasPagas());
        assertNull(response.comparacaoPeriodoAnterior());
        assertEquals(List.of(), response.evolucaoRecebimentos());
        assertEquals(List.of(), response.produtosMaisVendidos());
        verify(pagamentoRepository, never()).totalByPeriod(any(), any(), any());
        verify(comandaItemRepository, never()).listTopSellingProducts(any(), any(), any(), anyInt());
    }

    @Test
    void fillsDaysWithoutReceiptsAndHandlesComparisonWithoutPreviousMovement() {
        when(securityService.isGestor()).thenReturn(true);
        when(pagamentoRepository.totalByPeriod(any(), any(), any()))
                .thenReturn(BigDecimal.ZERO, BigDecimal.ZERO);
        when(pagamentoRepository.totalsByPaymentMethod(any(), any(), any())).thenReturn(Map.of());
        when(pagamentoRepository.totalsByDay(any(), any(), any())).thenReturn(Map.of());

        DashboardResumoResponse response = service.summary(
                LocalDate.of(2026, 8, 1),
                LocalDate.of(2026, 8, 3)
        );

        assertEquals(BigDecimal.ZERO, response.ticketMedio());
        assertEquals(3, response.evolucaoRecebimentos().size());
        assertEquals(LocalDate.of(2026, 8, 1), response.evolucaoRecebimentos().get(0).data());
        assertEquals(LocalDate.of(2026, 8, 3), response.evolucaoRecebimentos().get(2).data());
        assertEquals(BigDecimal.ZERO, response.evolucaoRecebimentos().get(1).total());
        assertNull(response.comparacaoPeriodoAnterior().variacaoPercentual());
    }

    @Test
    void rejectsInvertedPeriod() {
        assertThrows(
                BusinessException.class,
                () -> service.summary(LocalDate.of(2026, 8, 2), LocalDate.of(2026, 8, 1))
        );
    }
}
