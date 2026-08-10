package com.adega.repository;

import com.adega.model.Produto;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import io.quarkus.panache.common.Page;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class ProdutoRepository implements PanacheRepositoryBase<Produto, Long> {
    public Optional<Produto> findByUuidAndAdega(UUID uuid, UUID adegaUuid) {
        return find("uuid = ?1 and adega.uuid = ?2", uuid, adegaUuid).firstResultOptional();
    }

    public List<Produto> listByAdega(UUID adegaUuid) {
        return list("adega.uuid = ?1 and ativo = true order by nome", adegaUuid);
    }

    public List<Produto> listActive() {
        return list("ativo = true order by adega.id, nome");
    }

    public long countLowStock(UUID adegaUuid) {
        return count(
                "adega.uuid = ?1 and ativo = true and quantidadeEstoqueUnidades <= alertaEstoqueUnidades",
                adegaUuid
        );
    }

    public List<Produto> listLowStock(UUID adegaUuid, int limit) {
        return find(
                "adega.uuid = ?1 and ativo = true "
                        + "and quantidadeEstoqueUnidades <= alertaEstoqueUnidades "
                        + "order by quantidadeEstoqueUnidades, nome",
                adegaUuid
        ).page(Page.ofSize(limit)).list();
    }
}
