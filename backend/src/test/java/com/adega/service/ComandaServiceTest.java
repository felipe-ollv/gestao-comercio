package com.adega.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.adega.dto.AdicionarItemRequest;
import com.adega.dto.AdicionarItensRequest;
import com.adega.dto.ComandaResponse;
import com.adega.dto.AtualizarItemRequest;
import com.adega.dto.FecharComandaRequest;
import com.adega.dto.PagamentoParcialComandaRequest;
import com.adega.exception.BusinessException;
import com.adega.model.Comanda;
import com.adega.model.ComandaItem;
import com.adega.model.ComandaPagamento;
import com.adega.model.FormaPagamento;
import com.adega.model.OrigemPagamento;
import com.adega.model.Produto;
import com.adega.model.StatusComanda;
import com.adega.model.TipoMedidaVenda;
import com.adega.model.Usuario;
import com.adega.repository.AdegaRepository;
import com.adega.repository.ComandaItemRepository;
import com.adega.repository.ComandaPagamentoRepository;
import com.adega.repository.ComandaRepository;
import com.adega.repository.ProdutoRepository;
import com.adega.repository.UsuarioRepository;
import com.adega.util.BusinessTime;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ComandaServiceTest {
    private final UUID adegaUuid = UUID.randomUUID();
    private final UUID comandaUuid = UUID.randomUUID();
    private final UUID usuarioUuid = UUID.randomUUID();

    private ComandaService service;
    private ComandaRepository comandaRepository;
    private ComandaItemRepository comandaItemRepository;
    private ProdutoRepository produtoRepository;

    @BeforeEach
    void setUp() {
        service = new ComandaService();
        comandaRepository = mock(ComandaRepository.class);
        comandaItemRepository = mock(ComandaItemRepository.class);
        produtoRepository = mock(ProdutoRepository.class);
        SecurityService securityService = mock(SecurityService.class);

        service.comandaRepository = comandaRepository;
        service.comandaItemRepository = comandaItemRepository;
        service.produtoRepository = produtoRepository;
        service.adegaRepository = mock(AdegaRepository.class);
        service.comandaPagamentoRepository = mock(ComandaPagamentoRepository.class);
        service.usuarioRepository = mock(UsuarioRepository.class);
        service.securityService = securityService;

        when(securityService.currentAdegaUuid()).thenReturn(adegaUuid);
        when(securityService.currentUsuarioUuid()).thenReturn(usuarioUuid);
        Usuario usuario = new Usuario();
        usuario.uuid = usuarioUuid;
        usuario.nome = "Operador";
        when(service.usuarioRepository.findByUuidAndAdega(usuarioUuid, adegaUuid))
                .thenReturn(Optional.of(usuario));
        doAnswer(invocation -> {
            ComandaItem item = invocation.getArgument(0);
            if (item.uuid == null) {
                item.uuid = UUID.randomUUID();
            }
            return null;
        }).when(comandaItemRepository).persist(any(ComandaItem.class));
        doAnswer(invocation -> {
            ComandaPagamento pagamento = invocation.getArgument(0);
            pagamento.uuid = UUID.randomUUID();
            if (pagamento.dataPagamento == null) {
                pagamento.dataPagamento = BusinessTime.now();
            }
            return null;
        }).when(service.comandaPagamentoRepository).persist(any(ComandaPagamento.class));
    }

    @Test
    void addsComboWithIndividualStockAndSummedPrice() {
        Comanda comanda = openComanda();
        Produto whisky = produto("Whisky", 10, 1, "10.00", null);
        Produto energetico = produto("Energético", 24, 6, "7.00", "36.00");
        whisky.custoUnidade = new BigDecimal("4.00");
        energetico.custoUnidade = new BigDecimal("3.00");
        stubComanda(comanda);
        stubProduto(whisky);
        stubProduto(energetico);

        ComandaResponse response = service.addItems(
                comandaUuid,
                new AdicionarItensRequest(List.of(
                        new AdicionarItemRequest(whisky.uuid, 2, TipoMedidaVenda.UNIDADE),
                        new AdicionarItemRequest(energetico.uuid, 1, TipoMedidaVenda.CAIXA)
                ))
        );

        assertEquals(8, whisky.quantidadeEstoqueUnidades);
        assertEquals(18, energetico.quantidadeEstoqueUnidades);
        assertEquals(new BigDecimal("56.00"), response.total());
        assertEquals(2, response.itens().size());
        assertNotNull(response.itens().get(0).grupoUuid());
        assertEquals(response.itens().get(0).grupoUuid(), response.itens().get(1).grupoUuid());
        assertEquals(new BigDecimal("4.00"), comanda.itens.get(0).custoUnitarioEstoque);
        assertEquals(new BigDecimal("3.00"), comanda.itens.get(1).custoUnitarioEstoque);
        assertEquals(0, response.itens().get(0).ordemGrupo());
        assertEquals(1, response.itens().get(1).ordemGrupo());
        assertNotNull(response.itens().get(0).dataAdicao());
        assertEquals(response.itens().get(0).dataAdicao(), response.itens().get(1).dataAdicao());
    }

    @Test
    void keepsCostSnapshotWhenProductCostChangesLater() {
        Comanda comanda = openComanda();
        Produto cerveja = produto("Cerveja", 12, 1, "8.00", null);
        cerveja.custoUnidade = new BigDecimal("3.50");
        stubComanda(comanda);
        stubProduto(cerveja);

        service.addItem(
                comandaUuid,
                new AdicionarItemRequest(cerveja.uuid, 2, TipoMedidaVenda.UNIDADE)
        );
        cerveja.custoUnidade = new BigDecimal("4.25");

        assertEquals(new BigDecimal("3.50"), comanda.itens.get(0).custoUnitarioEstoque);
    }

    @Test
    void addsItemsToCreditComandaAndRecordsAdditionDate() {
        Comanda comanda = openComanda();
        comanda.status = StatusComanda.FIADO;
        Produto cerveja = produto("Cerveja", 12, 1, "8.00", null);
        stubComanda(comanda);
        stubProduto(cerveja);

        ComandaResponse response = service.addItem(
                comandaUuid,
                new AdicionarItemRequest(cerveja.uuid, 2, TipoMedidaVenda.UNIDADE)
        );

        assertEquals(StatusComanda.FIADO, response.status());
        assertEquals(10, cerveja.quantidadeEstoqueUnidades);
        assertEquals(new BigDecimal("16.00"), response.total());
        assertNotNull(response.itens().get(0).dataAdicao());
    }

    @Test
    void rejectsAddingItemsToPaidComanda() {
        Comanda comanda = openComanda();
        comanda.status = StatusComanda.PAGA;
        Produto cerveja = produto("Cerveja", 12, 1, "8.00", null);
        stubComanda(comanda);

        assertThrows(
                BusinessException.class,
                () -> service.addItem(
                        comandaUuid,
                        new AdicionarItemRequest(cerveja.uuid, 1, TipoMedidaVenda.UNIDADE)
                )
        );

        verify(produtoRepository, never()).findByUuidAndAdega(any(), any());
    }

    @Test
    void acceptsPartialPaymentOnCreditComanda() {
        Comanda comanda = openComanda();
        comanda.status = StatusComanda.FIADO;
        comanda.valorPagoParcial = new BigDecimal("5.00");
        Produto cerveja = produto("Cerveja", 10, 1, "10.00", null);
        ComandaItem item = item(comanda, cerveja, null, 0);
        item.quantidadePedida = 2;
        comanda.itens.add(item);
        stubComanda(comanda);

        ComandaResponse response = service.payPartial(
                comandaUuid,
                new PagamentoParcialComandaRequest(new BigDecimal("7.00"), FormaPagamento.PIX)
        );

        assertEquals(StatusComanda.FIADO, response.status());
        assertEquals(new BigDecimal("12.00"), response.valorPagoParcial());
        assertEquals(new BigDecimal("8.00"), response.saldoPendente());
        assertEquals(1, response.pagamentos().size());
        assertEquals(FormaPagamento.PIX, response.pagamentos().get(0).formaPagamento());
        assertEquals("Operador", response.pagamentos().get(0).usuarioNome());
    }

    @Test
    void rejectsPartialPaymentOnPaidComanda() {
        Comanda comanda = openComanda();
        comanda.status = StatusComanda.PAGA;
        stubComanda(comanda);

        assertThrows(
                BusinessException.class,
                () -> service.payPartial(
                        comandaUuid,
                        new PagamentoParcialComandaRequest(new BigDecimal("1.00"), FormaPagamento.PIX)
                )
        );
    }

    @Test
    void closingAsPaidRecordsOnlyTheRemainingBalance() {
        Comanda comanda = openComanda();
        comanda.valorPagoParcial = new BigDecimal("5.00");
        Produto cerveja = produto("Cerveja", 10, 1, "10.00", null);
        ComandaItem item = item(comanda, cerveja, null, 0);
        item.quantidadePedida = 2;
        comanda.itens.add(item);
        stubComanda(comanda);

        ComandaResponse response = service.close(
                comandaUuid,
                new FecharComandaRequest(StatusComanda.PAGA, FormaPagamento.CARTAO_DEBITO)
        );

        assertEquals(StatusComanda.PAGA, response.status());
        assertEquals(new BigDecimal("20.00"), response.valorPagoParcial());
        assertEquals(BigDecimal.ZERO.setScale(2), response.saldoPendente());
        assertEquals(1, response.pagamentos().size());
        assertEquals(new BigDecimal("15.00"), response.pagamentos().get(0).valor());
        assertEquals(FormaPagamento.CARTAO_DEBITO, response.pagamentos().get(0).formaPagamento());
        assertEquals(OrigemPagamento.FECHAMENTO, response.pagamentos().get(0).origem());
    }

    @Test
    void requiresPaymentMethodWhenClosingWithRemainingBalance() {
        Comanda comanda = openComanda();
        Produto cerveja = produto("Cerveja", 10, 1, "10.00", null);
        comanda.itens.add(item(comanda, cerveja, null, 0));
        stubComanda(comanda);

        assertThrows(
                BusinessException.class,
                () -> service.close(comandaUuid, new FecharComandaRequest(StatusComanda.PAGA, null))
        );

        assertEquals(StatusComanda.ABERTA, comanda.status);
        assertEquals(BigDecimal.ZERO, comanda.valorPagoParcial);
    }

    @Test
    void doesNotChangeAnyStockWhenAComboComponentIsUnavailable() {
        Comanda comanda = openComanda();
        Produto whisky = produto("Whisky", 10, 1, "10.00", null);
        Produto gelo = produto("Gelo", 1, 1, "5.00", null);
        stubComanda(comanda);
        stubProduto(whisky);
        stubProduto(gelo);

        assertThrows(
                BusinessException.class,
                () -> service.addItems(
                        comandaUuid,
                        new AdicionarItensRequest(List.of(
                                new AdicionarItemRequest(whisky.uuid, 2, TipoMedidaVenda.UNIDADE),
                                new AdicionarItemRequest(gelo.uuid, 2, TipoMedidaVenda.UNIDADE)
                        ))
                )
        );

        assertEquals(10, whisky.quantidadeEstoqueUnidades);
        assertEquals(1, gelo.quantidadeEstoqueUnidades);
        verify(comandaItemRepository, never()).persist(any(ComandaItem.class));
    }

    @Test
    void rejectsRepeatedProductsInTheSameCombo() {
        Comanda comanda = openComanda();
        Produto whisky = produto("Whisky", 10, 1, "10.00", null);
        stubComanda(comanda);

        assertThrows(
                BusinessException.class,
                () -> service.addItems(
                        comandaUuid,
                        new AdicionarItensRequest(List.of(
                                new AdicionarItemRequest(whisky.uuid, 1, TipoMedidaVenda.UNIDADE),
                                new AdicionarItemRequest(whisky.uuid, 2, TipoMedidaVenda.UNIDADE)
                        ))
                )
        );

        verify(produtoRepository, never()).findByUuidAndAdega(any(), any());
    }

    @Test
    void rejectsChangingAComponentToAnotherProductAlreadyInTheGroup() {
        Comanda comanda = openComanda();
        Produto whisky = produto("Whisky", 10, 1, "10.00", null);
        Produto gelo = produto("Gelo", 10, 1, "5.00", null);
        UUID grupoUuid = UUID.randomUUID();
        ComandaItem whiskyItem = item(comanda, whisky, grupoUuid, 0);
        ComandaItem geloItem = item(comanda, gelo, grupoUuid, 1);
        comanda.itens.addAll(List.of(whiskyItem, geloItem));
        stubComanda(comanda);
        stubProduto(gelo);
        when(comandaItemRepository.findByUuidAndComandaAndAdega(
                whiskyItem.uuid,
                comandaUuid,
                adegaUuid
        )).thenReturn(Optional.of(whiskyItem));

        assertThrows(
                BusinessException.class,
                () -> service.updateItem(
                        comandaUuid,
                        whiskyItem.uuid,
                        new AtualizarItemRequest(gelo.uuid, 1, TipoMedidaVenda.UNIDADE)
                )
        );

        assertEquals(10, whisky.quantidadeEstoqueUnidades);
        assertEquals(10, gelo.quantidadeEstoqueUnidades);
    }

    @Test
    void deletingAComponentReturnsOnlyItsStock() {
        Comanda comanda = openComanda();
        Produto whisky = produto("Whisky", 8, 1, "10.00", null);
        Produto gelo = produto("Gelo", 9, 1, "5.00", null);
        UUID grupoUuid = UUID.randomUUID();
        ComandaItem whiskyItem = item(comanda, whisky, grupoUuid, 0);
        whiskyItem.quantidadePedida = 2;
        whiskyItem.unidadesDeduzidas = 2;
        ComandaItem geloItem = item(comanda, gelo, grupoUuid, 1);
        comanda.itens.addAll(List.of(whiskyItem, geloItem));
        stubComanda(comanda);
        when(comandaItemRepository.findByUuidAndComandaAndAdega(
                geloItem.uuid,
                comandaUuid,
                adegaUuid
        )).thenReturn(Optional.of(geloItem));

        ComandaResponse response = service.deleteItem(comandaUuid, geloItem.uuid);

        assertEquals(8, whisky.quantidadeEstoqueUnidades);
        assertEquals(10, gelo.quantidadeEstoqueUnidades);
        assertEquals(1, response.itens().size());
        assertEquals(whisky.uuid, response.itens().get(0).produtoUuid());
        verify(comandaItemRepository).delete(geloItem);
    }

    private Comanda openComanda() {
        Comanda comanda = new Comanda();
        comanda.uuid = comandaUuid;
        comanda.status = StatusComanda.ABERTA;
        comanda.nomeResponsavel = "Cliente";
        comanda.itens = new ArrayList<>();
        comanda.valorPagoParcial = BigDecimal.ZERO;
        return comanda;
    }

    private Produto produto(
            String nome,
            int estoque,
            int unidadesPorCaixa,
            String valorUnidade,
            String valorCaixa
    ) {
        Produto produto = new Produto();
        produto.uuid = UUID.randomUUID();
        produto.nome = nome;
        produto.ativo = true;
        produto.quantidadeEstoqueUnidades = estoque;
        produto.unidadesPorCaixa = unidadesPorCaixa;
        produto.valorUnidade = new BigDecimal(valorUnidade);
        produto.valorCaixa = valorCaixa == null ? null : new BigDecimal(valorCaixa);
        return produto;
    }

    private ComandaItem item(Comanda comanda, Produto produto, UUID grupoUuid, int ordemGrupo) {
        ComandaItem item = new ComandaItem();
        item.uuid = UUID.randomUUID();
        item.comanda = comanda;
        item.produto = produto;
        item.quantidadePedida = 1;
        item.unidadesDeduzidas = 1;
        item.tipoMedidaVendida = TipoMedidaVenda.UNIDADE;
        item.valorCobradoUnitario = produto.valorUnidade;
        item.grupoUuid = grupoUuid;
        item.ordemGrupo = ordemGrupo;
        return item;
    }

    private void stubComanda(Comanda comanda) {
        when(comandaRepository.findByUuidAndAdega(comandaUuid, adegaUuid))
                .thenReturn(Optional.of(comanda));
        when(comandaRepository.findByUuidAndAdegaForUpdate(comandaUuid, adegaUuid))
                .thenReturn(Optional.of(comanda));
    }

    private void stubProduto(Produto produto) {
        when(produtoRepository.findByUuidAndAdega(produto.uuid, adegaUuid))
                .thenReturn(Optional.of(produto));
    }
}
