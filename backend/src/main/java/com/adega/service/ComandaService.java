package com.adega.service;

import com.adega.dto.AdicionarItemRequest;
import com.adega.dto.AdicionarItensRequest;
import com.adega.dto.AtualizarItemRequest;
import com.adega.dto.ComandaRequest;
import com.adega.dto.ComandaResponse;
import com.adega.dto.ExcluirComandaRequest;
import com.adega.dto.FecharComandaRequest;
import com.adega.dto.PagamentoParcialComandaRequest;
import com.adega.dto.PaginaResponse;
import com.adega.exception.BusinessException;
import com.adega.exception.ForbiddenOperationException;
import com.adega.model.Adega;
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
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@ApplicationScoped
public class ComandaService {
    @Inject
    ComandaRepository comandaRepository;

    @Inject
    ComandaItemRepository comandaItemRepository;

    @Inject
    ComandaPagamentoRepository comandaPagamentoRepository;

    @Inject
    ProdutoRepository produtoRepository;

    @Inject
    AdegaRepository adegaRepository;

    @Inject
    UsuarioRepository usuarioRepository;

    @Inject
    SecurityService securityService;

    public PaginaResponse<ComandaResponse> list(
            StatusComanda status,
            LocalDate inicio,
            LocalDate fim,
            int pagina,
            int tamanho
    ) {
        int safePage = Math.max(pagina, 0);
        int safeSize = Math.min(Math.max(tamanho, 1), 200);
        if (inicio != null && fim != null && fim.isBefore(inicio)) {
            throw new BusinessException("A data final não pode ser anterior à data inicial.");
        }

        var query = comandaRepository.pageByAdega(
                securityService.currentAdegaUuid(),
                status,
                inicio == null ? null : inicio.atStartOfDay(),
                fim == null ? null : fim.plusDays(1).atStartOfDay(),
                safePage,
                safeSize
        );
        long total = query.count();
        List<ComandaResponse> content = query.list().stream().map(ComandaResponse::from).toList();
        return PaginaResponse.of(content, total, safePage, safeSize);
    }

    public ComandaResponse get(UUID uuid) {
        return ComandaResponse.from(findCurrentAdegaComanda(uuid));
    }

    @Transactional
    public ComandaResponse open(ComandaRequest request) {
        Adega adega = adegaRepository.findByUuid(securityService.currentAdegaUuid())
                .orElseThrow(() -> new BusinessException("Adega não encontrada."));

        Comanda comanda = new Comanda();
        comanda.adega = adega;
        comanda.nomeResponsavel = request.nomeResponsavel().trim();
        comanda.status = StatusComanda.ABERTA;
        comandaRepository.persist(comanda);

        return ComandaResponse.from(comanda);
    }

    @Transactional
    public ComandaResponse addItem(UUID comandaUuid, AdicionarItemRequest request) {
        Comanda comanda = findCurrentAdegaComanda(comandaUuid);
        ensureCanAddItems(comanda);
        PreparedItem preparedItem = prepareItem(request);
        ensureStockAvailable(preparedItem.produto(), preparedItem.pricing().unidadesParaDeduzir());
        persistItem(comanda, preparedItem, null, null, BusinessTime.now());

        return ComandaResponse.from(comanda);
    }

    @Transactional
    public ComandaResponse addItems(UUID comandaUuid, AdicionarItensRequest request) {
        Comanda comanda = findCurrentAdegaComanda(comandaUuid);
        ensureCanAddItems(comanda);

        Set<UUID> produtosUnicos = request.itens().stream()
                .map(AdicionarItemRequest::produtoUuid)
                .collect(Collectors.toSet());
        if (produtosUnicos.size() != request.itens().size()) {
            throw new BusinessException("O mesmo produto não pode aparecer mais de uma vez no combo.");
        }

        List<PreparedItem> preparedItems = request.itens().stream()
                .map(this::prepareItem)
                .toList();
        preparedItems.forEach(preparedItem ->
                ensureStockAvailable(
                        preparedItem.produto(),
                        preparedItem.pricing().unidadesParaDeduzir()
                ));

        UUID grupoUuid = request.itens().size() > 1 ? UUID.randomUUID() : null;
        LocalDateTime dataAdicao = BusinessTime.now();
        for (int index = 0; index < preparedItems.size(); index++) {
            persistItem(
                    comanda,
                    preparedItems.get(index),
                    grupoUuid,
                    grupoUuid == null ? null : index,
                    dataAdicao
            );
        }

        return ComandaResponse.from(comanda);
    }

    @Transactional
    public ComandaResponse updateItem(UUID comandaUuid, UUID itemUuid, AtualizarItemRequest request) {
        Comanda comanda = findCurrentAdegaComanda(comandaUuid);
        ensureOpen(comanda, "Itens só podem ser editados em comandas abertas.");

        ComandaItem item = findCurrentAdegaComandaItem(comandaUuid, itemUuid);
        Produto produto = produtoRepository.findByUuidAndAdega(request.produtoUuid(), securityService.currentAdegaUuid())
                .filter(candidate -> candidate.ativo)
                .orElseThrow(() -> new BusinessException("Produto não encontrado."));
        if (item.grupoUuid != null && comanda.itens.stream().anyMatch(candidate ->
                !candidate.uuid.equals(item.uuid)
                        && item.grupoUuid.equals(candidate.grupoUuid)
                        && candidate.produto.uuid.equals(request.produtoUuid()))) {
            throw new BusinessException("O mesmo produto não pode aparecer mais de uma vez no combo.");
        }

        ItemPricing pricing = pricingFor(produto, request.quantidade(), request.tipoMedida());
        BigDecimal totalAtualizado = total(comanda)
                .subtract(subtotal(item))
                .add(pricing.valorAplicado().multiply(BigDecimal.valueOf(request.quantidade())));
        ensureTotalCoversPaid(comanda, totalAtualizado);

        item.produto.quantidadeEstoqueUnidades += item.unidadesDeduzidas;
        deductStock(produto, pricing.unidadesParaDeduzir());

        item.produto = produto;
        item.quantidadePedida = request.quantidade();
        item.unidadesDeduzidas = pricing.unidadesParaDeduzir();
        item.tipoMedidaVendida = request.tipoMedida();
        item.valorCobradoUnitario = pricing.valorAplicado();

        return ComandaResponse.from(comanda);
    }

    @Transactional
    public ComandaResponse deleteItem(UUID comandaUuid, UUID itemUuid) {
        Comanda comanda = findCurrentAdegaComanda(comandaUuid);
        ensureOpen(comanda, "Itens só podem ser excluídos em comandas abertas.");

        ComandaItem item = findCurrentAdegaComandaItem(comandaUuid, itemUuid);
        ensureTotalCoversPaid(comanda, total(comanda).subtract(subtotal(item)));

        item.produto.quantidadeEstoqueUnidades += item.unidadesDeduzidas;
        comanda.itens.remove(item);
        comandaItemRepository.delete(item);

        return ComandaResponse.from(comanda);
    }

    @Transactional
    public ComandaResponse close(UUID uuid, FecharComandaRequest request) {
        if (request.status() == StatusComanda.ABERTA) {
            throw new BusinessException("Use PAGA ou FIADO para fechar a comanda.");
        }
        if (request.status() == StatusComanda.EXCLUIDA) {
            throw new BusinessException("Use a ação de exclusão para excluir a comanda.");
        }
        if (request.status() == StatusComanda.FIADO && !securityService.isGestor()) {
            throw new ForbiddenOperationException("Apenas gestores podem fechar comandas como fiado.");
        }

        Comanda comanda = findCurrentAdegaComandaForUpdate(uuid);
        if (request.status() == StatusComanda.FIADO && comanda.status != StatusComanda.ABERTA) {
            throw new BusinessException("Apenas comandas abertas podem ser fechadas como fiado.");
        }
        if (request.status() == StatusComanda.PAGA
                && comanda.status != StatusComanda.ABERTA
                && comanda.status != StatusComanda.FIADO) {
            throw new BusinessException("Comanda já está paga.");
        }

        if (request.status() == StatusComanda.PAGA) {
            BigDecimal saldoRestante = total(comanda).subtract(paidValue(comanda));
            if (saldoRestante.compareTo(BigDecimal.ZERO) < 0) {
                throw new BusinessException("O valor recebido não pode ultrapassar o total da comanda.");
            }
            if (saldoRestante.compareTo(BigDecimal.ZERO) > 0) {
                ensurePaymentMethod(request.formaPagamento());
                recordPayment(comanda, saldoRestante, request.formaPagamento(), OrigemPagamento.FECHAMENTO);
            }
            comanda.valorPagoParcial = total(comanda);
        }
        comanda.status = request.status();
        comanda.dataFechamento = BusinessTime.now();
        return ComandaResponse.from(comanda);
    }

    @Transactional
    public ComandaResponse payPartial(UUID uuid, PagamentoParcialComandaRequest request) {
        if (request == null || request.valor() == null || request.valor().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("O valor do pagamento parcial deve ser maior que zero.");
        }

        Comanda comanda = findCurrentAdegaComandaForUpdate(uuid);
        ensureCanPayPartial(comanda);
        ensurePaymentMethod(request.formaPagamento());

        BigDecimal total = total(comanda);
        if (total.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Adicione itens antes de lançar pagamento parcial.");
        }

        BigDecimal valorPagoAtual = paidValue(comanda);
        BigDecimal novoValorPago = valorPagoAtual.add(request.valor());
        if (novoValorPago.compareTo(total) > 0) {
            throw new BusinessException("O pagamento parcial não pode ultrapassar o total da comanda.");
        }

        recordPayment(comanda, request.valor(), request.formaPagamento(), OrigemPagamento.PARCIAL);
        comanda.valorPagoParcial = novoValorPago;
        return ComandaResponse.from(comanda);
    }

    @Transactional
    public void delete(UUID uuid, ExcluirComandaRequest request) {
        if (request == null || request.observacao() == null || request.observacao().trim().isBlank()) {
            throw new BusinessException("Informe o motivo da exclusão da comanda.");
        }

        Comanda comanda = findCurrentAdegaComanda(uuid);
        if (comanda.status == StatusComanda.EXCLUIDA) {
            throw new BusinessException("Comanda já excluída.");
        }
        if (comanda.status == StatusComanda.PAGA) {
            throw new BusinessException("Comandas pagas não podem ser excluídas.");
        }

        for (ComandaItem item : comanda.itens) {
            item.produto.quantidadeEstoqueUnidades += item.unidadesDeduzidas;
        }

        comanda.status = StatusComanda.EXCLUIDA;
        comanda.dataExclusao = BusinessTime.now();
        comanda.observacaoExclusao = request.observacao().trim();
    }

    private Comanda findCurrentAdegaComanda(UUID uuid) {
        return comandaRepository.findByUuidAndAdega(uuid, securityService.currentAdegaUuid())
                .orElseThrow(() -> new BusinessException("Comanda não encontrada."));
    }

    private Comanda findCurrentAdegaComandaForUpdate(UUID uuid) {
        return comandaRepository.findByUuidAndAdegaForUpdate(uuid, securityService.currentAdegaUuid())
                .orElseThrow(() -> new BusinessException("Comanda não encontrada."));
    }

    private ComandaItem findCurrentAdegaComandaItem(UUID comandaUuid, UUID itemUuid) {
        return comandaItemRepository
                .findByUuidAndComandaAndAdega(itemUuid, comandaUuid, securityService.currentAdegaUuid())
                .orElseThrow(() -> new BusinessException("Item da comanda não encontrado."));
    }

    private void ensureOpen(Comanda comanda, String message) {
        if (comanda.status != StatusComanda.ABERTA) {
            throw new BusinessException(message);
        }
    }

    private void ensureCanAddItems(Comanda comanda) {
        if (comanda.status != StatusComanda.ABERTA && comanda.status != StatusComanda.FIADO) {
            throw new BusinessException("Itens só podem ser adicionados em comandas abertas ou no fiado.");
        }
    }

    private void ensureCanPayPartial(Comanda comanda) {
        if (comanda.status != StatusComanda.ABERTA && comanda.status != StatusComanda.FIADO) {
            throw new BusinessException("Pagamentos parciais só podem ser lançados em comandas abertas ou no fiado.");
        }
    }

    private PreparedItem prepareItem(AdicionarItemRequest request) {
        Produto produto = produtoRepository.findByUuidAndAdega(request.produtoUuid(), securityService.currentAdegaUuid())
                .filter(candidate -> candidate.ativo)
                .orElseThrow(() -> new BusinessException("Produto não encontrado."));
        ItemPricing pricing = pricingFor(produto, request.quantidade(), request.tipoMedida());
        return new PreparedItem(request, produto, pricing);
    }

    private void persistItem(
            Comanda comanda,
            PreparedItem preparedItem,
            UUID grupoUuid,
            Integer ordemGrupo,
            LocalDateTime dataAdicao
    ) {
        AdicionarItemRequest request = preparedItem.request();
        Produto produto = preparedItem.produto();
        ItemPricing pricing = preparedItem.pricing();
        deductStock(produto, pricing.unidadesParaDeduzir());

        ComandaItem item = new ComandaItem();
        item.comanda = comanda;
        item.produto = produto;
        item.quantidadePedida = request.quantidade();
        item.unidadesDeduzidas = pricing.unidadesParaDeduzir();
        item.tipoMedidaVendida = request.tipoMedida();
        item.valorCobradoUnitario = pricing.valorAplicado();
        item.grupoUuid = grupoUuid;
        item.ordemGrupo = ordemGrupo;
        item.dataAdicao = dataAdicao;
        comandaItemRepository.persist(item);
        comanda.itens.add(item);
    }

    private void ensureTotalCoversPaid(Comanda comanda, BigDecimal total) {
        if (total.compareTo(paidValue(comanda)) < 0) {
            throw new BusinessException("O total da comanda não pode ficar menor que o valor já pago.");
        }
    }

    private BigDecimal total(Comanda comanda) {
        return comanda.itens.stream()
                .map(this::subtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal subtotal(ComandaItem item) {
        return item.valorCobradoUnitario.multiply(BigDecimal.valueOf(item.quantidadePedida));
    }

    private BigDecimal paidValue(Comanda comanda) {
        return comanda.valorPagoParcial == null ? BigDecimal.ZERO : comanda.valorPagoParcial;
    }

    private void ensurePaymentMethod(FormaPagamento formaPagamento) {
        if (formaPagamento == null || formaPagamento == FormaPagamento.NAO_INFORMADA) {
            throw new BusinessException("Informe a forma de pagamento.");
        }
    }

    private void recordPayment(
            Comanda comanda,
            BigDecimal valor,
            FormaPagamento formaPagamento,
            OrigemPagamento origem
    ) {
        Usuario usuario = usuarioRepository.findByUuidAndAdega(
                        securityService.currentUsuarioUuid(),
                        securityService.currentAdegaUuid()
                )
                .orElseThrow(() -> new BusinessException("Usuário responsável pelo recebimento não encontrado."));

        ComandaPagamento pagamento = new ComandaPagamento();
        pagamento.adega = comanda.adega;
        pagamento.comanda = comanda;
        pagamento.usuario = usuario;
        pagamento.valor = valor;
        pagamento.formaPagamento = formaPagamento;
        pagamento.origem = origem;
        pagamento.dataPagamento = BusinessTime.now();
        comandaPagamentoRepository.persist(pagamento);
        comanda.pagamentos.add(0, pagamento);
    }

    private ItemPricing pricingFor(Produto produto, int quantidade, TipoMedidaVenda tipoMedida) {
        int unidadesParaDeduzir = quantidade;
        BigDecimal valorAplicado = produto.valorUnidade;

        if (tipoMedida == TipoMedidaVenda.CAIXA) {
            if (produto.valorCaixa == null) {
                throw new BusinessException("Produto não configurado para venda por caixa.");
            }
            unidadesParaDeduzir = quantidade * produto.unidadesPorCaixa;
            valorAplicado = produto.valorCaixa;
        }

        return new ItemPricing(unidadesParaDeduzir, valorAplicado);
    }

    private void deductStock(Produto produto, int unidadesParaDeduzir) {
        ensureStockAvailable(produto, unidadesParaDeduzir);
        produto.quantidadeEstoqueUnidades -= unidadesParaDeduzir;
    }

    private void ensureStockAvailable(Produto produto, int unidadesParaDeduzir) {
        if (produto.quantidadeEstoqueUnidades < unidadesParaDeduzir) {
            throw new BusinessException("Estoque insuficiente para o produto: " + produto.nome);
        }
    }

    private record PreparedItem(AdicionarItemRequest request, Produto produto, ItemPricing pricing) {
    }

    private record ItemPricing(int unidadesParaDeduzir, BigDecimal valorAplicado) {
    }
}
