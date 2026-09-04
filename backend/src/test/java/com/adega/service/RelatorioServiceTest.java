package com.adega.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.adega.dto.RelatorioLucroResponse;
import com.adega.exception.BusinessException;
import com.adega.repository.ComandaItemRepository;
import com.adega.util.BusinessTime;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class RelatorioServiceTest {
    private final UUID adegaUuid = UUID.randomUUID();
    private RelatorioService service;
    private ComandaItemRepository comandaItemRepository;

    @BeforeEach
    void setUp() {
        service = new RelatorioService();
        SecurityService securityService = mock(SecurityService.class);
        comandaItemRepository = mock(ComandaItemRepository.class);
        service.securityService = securityService;
        service.comandaItemRepository = comandaItemRepository;
        when(securityService.currentAdegaUuid()).thenReturn(adegaUuid);
    }

    @Test
    void calculatesGrossProfitAndPartialCostCoverage() {
        when(comandaItemRepository.listProfitabilityByPeriod(any(), any(), any())).thenReturn(List.of(
                product("Cerveja", "100.00", "100.00", "60.00", "0.00"),
                product("Gelo", "50.00", "0.00", "0.00", "50.00")
        ));

        RelatorioLucroResponse response = service.lucro(
                LocalDate.of(2026, 8, 1),
                LocalDate.of(2026, 8, 31)
        );

        assertEquals(new BigDecimal("150.00"), response.valorVendido());
        assertEquals(new BigDecimal("100.00"), response.valorVendidoComCusto());
        assertEquals(new BigDecimal("60.00"), response.custoProdutosVendidos());
        assertEquals(new BigDecimal("40.00"), response.lucroBruto());
        assertEquals(new BigDecimal("40.00"), response.margemBrutaPercentual());
        assertEquals(new BigDecimal("50.00"), response.valorVendidoSemCusto());
        assertEquals(new BigDecimal("66.67"), response.coberturaCustoPercentual());
        assertNull(response.produtos().get(1).margemBrutaPercentual());
        assertEquals(BigDecimal.ZERO.setScale(2), response.produtos().get(1).coberturaCustoPercentual());
    }

    @Test
    void allowsNegativeGrossMargin() {
        when(comandaItemRepository.listProfitabilityByPeriod(any(), any(), any())).thenReturn(List.of(
                product("Produto com prejuízo", "40.00", "40.00", "50.00", "0.00")
        ));

        RelatorioLucroResponse response = service.lucro(null, null);

        assertEquals(BusinessTime.today(), response.periodo().inicio());
        assertEquals(new BigDecimal("-10.00"), response.lucroBruto());
        assertEquals(new BigDecimal("-25.00"), response.margemBrutaPercentual());
    }

    @Test
    void returnsUnavailablePercentagesWithoutSales() {
        when(comandaItemRepository.listProfitabilityByPeriod(any(), any(), any())).thenReturn(List.of());

        RelatorioLucroResponse response = service.lucro(null, null);

        assertEquals(BigDecimal.ZERO, response.valorVendido());
        assertNull(response.margemBrutaPercentual());
        assertNull(response.coberturaCustoPercentual());
    }

    @Test
    void rejectsInvertedPeriod() {
        assertThrows(
                BusinessException.class,
                () -> service.lucro(LocalDate.of(2026, 8, 2), LocalDate.of(2026, 8, 1))
        );
    }

    private ComandaItemRepository.ProdutoRentabilidade product(
            String name,
            String sold,
            String covered,
            String cost,
            String missing
    ) {
        return new ComandaItemRepository.ProdutoRentabilidade(
                UUID.randomUUID(),
                name,
                5,
                new BigDecimal(sold),
                new BigDecimal(covered),
                new BigDecimal(cost),
                new BigDecimal(missing)
        );
    }
}
