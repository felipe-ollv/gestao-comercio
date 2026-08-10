package com.adega.repository;

import com.adega.model.Comanda;
import com.adega.model.StatusComanda;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.panache.common.Page;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class ComandaRepository implements PanacheRepositoryBase<Comanda, Long> {
    public Optional<Comanda> findByUuidAndAdega(UUID uuid, UUID adegaUuid) {
        return find("uuid = ?1 and adega.uuid = ?2", uuid, adegaUuid).firstResultOptional();
    }

    public Optional<Comanda> findByUuidAndAdegaForUpdate(UUID uuid, UUID adegaUuid) {
        return find("uuid = ?1 and adega.uuid = ?2", uuid, adegaUuid)
                .withLock(LockModeType.PESSIMISTIC_WRITE)
                .firstResultOptional();
    }

    public PanacheQuery<Comanda> pageByAdega(
            UUID adegaUuid,
            StatusComanda status,
            LocalDateTime inicio,
            LocalDateTime fimExclusivo,
            int pagina,
            int tamanho
    ) {
        StringBuilder query = new StringBuilder("adega.uuid = :adegaUuid");
        HashMap<String, Object> parameters = new HashMap<>();
        parameters.put("adegaUuid", adegaUuid);

        if (status == null) {
            query.append(" and status <> :excludedStatus");
            parameters.put("excludedStatus", StatusComanda.EXCLUIDA);
        } else {
            query.append(" and status = :status");
            parameters.put("status", status);
        }
        if (inicio != null) {
            query.append(" and dataAbertura >= :inicio");
            parameters.put("inicio", inicio);
        }
        if (fimExclusivo != null) {
            query.append(" and dataAbertura < :fim");
            parameters.put("fim", fimExclusivo);
        }
        query.append(" order by dataAbertura desc");

        return find(query.toString(), parameters).page(Page.of(pagina, tamanho));
    }

    public long countByStatus(UUID adegaUuid, StatusComanda status) {
        return count("adega.uuid = ?1 and status = ?2", adegaUuid, status);
    }

    public long countPaidByPeriod(UUID adegaUuid, LocalDateTime inicio, LocalDateTime fimExclusivo) {
        return count(
                "adega.uuid = ?1 and status = ?2 and dataFechamento >= ?3 and dataFechamento < ?4",
                adegaUuid,
                StatusComanda.PAGA,
                inicio,
                fimExclusivo
        );
    }

    public List<Comanda> listRecentByStatus(UUID adegaUuid, StatusComanda status, int limit) {
        return find("adega.uuid = ?1 and status = ?2 order by dataAbertura desc", adegaUuid, status)
                .page(Page.ofSize(limit))
                .list();
    }

    public BigDecimal totalPendingCredit(UUID adegaUuid) {
        BigDecimal total = getEntityManager().createQuery(
                        "select sum(i.valorCobradoUnitario * i.quantidadePedida) from ComandaItem i "
                                + "where i.comanda.adega.uuid = :adegaUuid and i.comanda.status = :status",
                        BigDecimal.class
                )
                .setParameter("adegaUuid", adegaUuid)
                .setParameter("status", StatusComanda.FIADO)
                .getSingleResult();
        BigDecimal paid = getEntityManager().createQuery(
                        "select sum(c.valorPagoParcial) from Comanda c "
                                + "where c.adega.uuid = :adegaUuid and c.status = :status",
                        BigDecimal.class
                )
                .setParameter("adegaUuid", adegaUuid)
                .setParameter("status", StatusComanda.FIADO)
                .getSingleResult();
        BigDecimal pending = (total == null ? BigDecimal.ZERO : total)
                .subtract(paid == null ? BigDecimal.ZERO : paid);
        return pending.max(BigDecimal.ZERO);
    }
}
