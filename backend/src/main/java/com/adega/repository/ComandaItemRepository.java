package com.adega.repository;

import com.adega.model.ComandaItem;
import com.adega.model.StatusComanda;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class ComandaItemRepository implements PanacheRepositoryBase<ComandaItem, Long> {
    public Optional<ComandaItem> findByUuidAndComandaAndAdega(UUID uuid, UUID comandaUuid, UUID adegaUuid) {
        return find("uuid = ?1 and comanda.uuid = ?2 and comanda.adega.uuid = ?3", uuid, comandaUuid, adegaUuid)
                .firstResultOptional();
    }

    public List<ProdutoVenda> listTopSellingProducts(
            UUID adegaUuid,
            LocalDateTime inicio,
            LocalDateTime fimExclusivo,
            int limit
    ) {
        List<Object[]> rows = getEntityManager().createQuery(
                        "select i.produto.uuid, i.produto.nome, sum(i.unidadesDeduzidas), "
                                + "sum(i.valorCobradoUnitario * i.quantidadePedida) "
                                + "from ComandaItem i "
                                + "where i.comanda.adega.uuid = :adegaUuid "
                                + "and i.comanda.status = :status "
                                + "and i.comanda.dataFechamento >= :inicio "
                                + "and i.comanda.dataFechamento < :fim "
                                + "group by i.produto.uuid, i.produto.nome "
                                + "order by sum(i.unidadesDeduzidas) desc, i.produto.nome",
                        Object[].class
                )
                .setParameter("adegaUuid", adegaUuid)
                .setParameter("status", StatusComanda.PAGA)
                .setParameter("inicio", inicio)
                .setParameter("fim", fimExclusivo)
                .setMaxResults(limit)
                .getResultList();

        return rows.stream()
                .map(row -> new ProdutoVenda(
                        (UUID) row[0],
                        (String) row[1],
                        ((Number) row[2]).longValue(),
                        (BigDecimal) row[3]
                ))
                .toList();
    }

    public List<ProdutoRentabilidade> listProfitabilityByPeriod(
            UUID adegaUuid,
            LocalDateTime inicio,
            LocalDateTime fimExclusivo
    ) {
        List<Object[]> rows = getEntityManager().createQuery(
                        "select i.produto.uuid, i.produto.nome, sum(i.unidadesDeduzidas), "
                                + "sum(i.valorCobradoUnitario * i.quantidadePedida), "
                                + "sum(case when i.custoUnitarioEstoque is not null "
                                + "then i.valorCobradoUnitario * i.quantidadePedida else 0 end), "
                                + "sum(case when i.custoUnitarioEstoque is not null "
                                + "then i.custoUnitarioEstoque * i.unidadesDeduzidas else 0 end), "
                                + "sum(case when i.custoUnitarioEstoque is null "
                                + "then i.valorCobradoUnitario * i.quantidadePedida else 0 end) "
                                + "from ComandaItem i "
                                + "where i.comanda.adega.uuid = :adegaUuid "
                                + "and i.comanda.status = :status "
                                + "and i.comanda.dataFechamento >= :inicio "
                                + "and i.comanda.dataFechamento < :fim "
                                + "group by i.produto.uuid, i.produto.nome "
                                + "order by sum(i.valorCobradoUnitario * i.quantidadePedida) desc, i.produto.nome",
                        Object[].class
                )
                .setParameter("adegaUuid", adegaUuid)
                .setParameter("status", StatusComanda.PAGA)
                .setParameter("inicio", inicio)
                .setParameter("fim", fimExclusivo)
                .getResultList();

        return rows.stream()
                .map(row -> new ProdutoRentabilidade(
                        (UUID) row[0],
                        (String) row[1],
                        ((Number) row[2]).longValue(),
                        (BigDecimal) row[3],
                        (BigDecimal) row[4],
                        (BigDecimal) row[5],
                        (BigDecimal) row[6]
                ))
                .toList();
    }

    public record ProdutoVenda(
            UUID produtoUuid,
            String produtoNome,
            long unidadesVendidas,
            BigDecimal valorVendido
    ) {
    }

    public record ProdutoRentabilidade(
            UUID produtoUuid,
            String produtoNome,
            long unidadesVendidas,
            BigDecimal valorVendido,
            BigDecimal valorVendidoComCusto,
            BigDecimal custoProdutosVendidos,
            BigDecimal valorVendidoSemCusto
    ) {
    }
}
