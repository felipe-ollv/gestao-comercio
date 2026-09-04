package com.adega.service;

import com.adega.dto.ProdutoRequest;
import com.adega.dto.ProdutoResponse;
import com.adega.exception.BusinessException;
import com.adega.model.Adega;
import com.adega.model.Produto;
import com.adega.repository.AdegaRepository;
import com.adega.repository.ProdutoRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class ProdutoService {
    @Inject
    ProdutoRepository produtoRepository;

    @Inject
    AdegaRepository adegaRepository;

    @Inject
    SecurityService securityService;

    public List<ProdutoResponse> list() {
        boolean incluirCusto = securityService.isGestor();
        return produtoRepository.listByAdega(securityService.currentAdegaUuid())
                .stream()
                .map(produto -> ProdutoResponse.from(produto, incluirCusto))
                .toList();
    }

    @Transactional
    public ProdutoResponse create(ProdutoRequest request) {
        Adega adega = adegaRepository.findByUuid(securityService.currentAdegaUuid())
                .orElseThrow(() -> new BusinessException("Adega não encontrada."));

        Produto produto = new Produto();
        produto.adega = adega;
        fill(produto, request);
        produtoRepository.persist(produto);

        return ProdutoResponse.from(produto, true);
    }

    @Transactional
    public ProdutoResponse update(UUID uuid, ProdutoRequest request) {
        Produto produto = getByUuid(uuid);
        fill(produto, request);
        return ProdutoResponse.from(produto, true);
    }

    @Transactional
    public void delete(UUID uuid) {
        Produto produto = getByUuid(uuid);
        produto.ativo = false;
    }

    Produto getByUuid(UUID uuid) {
        return produtoRepository.findByUuidAndAdega(uuid, securityService.currentAdegaUuid())
                .filter(produto -> produto.ativo)
                .orElseThrow(() -> new BusinessException("Produto não encontrado."));
    }

    private void fill(Produto produto, ProdutoRequest request) {
        if (request.valorCaixa() != null && request.unidadesPorCaixa() <= 1) {
            throw new BusinessException("Venda por caixa exige mais de uma unidade por caixa.");
        }
        produto.nome = request.nome().trim();
        produto.quantidadeEstoqueUnidades = request.quantidadeEstoqueUnidades();
        produto.alertaEstoqueUnidades = request.alertaEstoqueUnidades();
        produto.unidadesPorCaixa = request.unidadesPorCaixa();
        produto.valorUnidade = request.valorUnidade();
        produto.valorCaixa = request.valorCaixa();
        produto.custoUnidade = request.custoUnidade();
    }
}
