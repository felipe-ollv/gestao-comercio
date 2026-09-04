package com.adega.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.adega.dto.ProdutoRequest;
import com.adega.dto.ProdutoResponse;
import com.adega.model.Adega;
import com.adega.model.Produto;
import com.adega.repository.AdegaRepository;
import com.adega.repository.ProdutoRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ProdutoServiceTest {
    private final UUID adegaUuid = UUID.randomUUID();
    private ProdutoService service;
    private ProdutoRepository produtoRepository;
    private AdegaRepository adegaRepository;
    private SecurityService securityService;

    @BeforeEach
    void setUp() {
        service = new ProdutoService();
        produtoRepository = mock(ProdutoRepository.class);
        adegaRepository = mock(AdegaRepository.class);
        securityService = mock(SecurityService.class);
        service.produtoRepository = produtoRepository;
        service.adegaRepository = adegaRepository;
        service.securityService = securityService;
        when(securityService.currentAdegaUuid()).thenReturn(adegaUuid);
    }

    @Test
    void hidesProductCostFromAttendant() {
        Produto produto = productWithCost("4.50");
        when(securityService.isGestor()).thenReturn(false);
        when(produtoRepository.listByAdega(adegaUuid)).thenReturn(List.of(produto));

        ProdutoResponse response = service.list().get(0);

        assertNull(response.custoUnidade());
    }

    @Test
    void returnsProductCostToManager() {
        Produto produto = productWithCost("4.50");
        when(securityService.isGestor()).thenReturn(true);
        when(produtoRepository.listByAdega(adegaUuid)).thenReturn(List.of(produto));

        ProdutoResponse response = service.list().get(0);

        assertEquals(new BigDecimal("4.50"), response.custoUnidade());
    }

    @Test
    void storesOptionalUnitCostOnCreation() {
        Adega adega = new Adega();
        when(adegaRepository.findByUuid(adegaUuid)).thenReturn(Optional.of(adega));

        ProdutoResponse response = service.create(new ProdutoRequest(
                "Cerveja",
                24,
                12,
                6,
                new BigDecimal("8.00"),
                new BigDecimal("42.00"),
                new BigDecimal("3.50")
        ));

        verify(produtoRepository).persist(any(Produto.class));
        assertEquals(new BigDecimal("3.50"), response.custoUnidade());
    }

    private Produto productWithCost(String cost) {
        Produto produto = new Produto();
        produto.uuid = UUID.randomUUID();
        produto.nome = "Produto";
        produto.quantidadeEstoqueUnidades = 10;
        produto.alertaEstoqueUnidades = 2;
        produto.unidadesPorCaixa = 1;
        produto.valorUnidade = new BigDecimal("10.00");
        produto.custoUnidade = new BigDecimal(cost);
        return produto;
    }
}
