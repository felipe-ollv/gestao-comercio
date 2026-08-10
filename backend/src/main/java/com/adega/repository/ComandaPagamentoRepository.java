package com.adega.repository;

import com.adega.model.ComandaPagamento;
import com.adega.model.FormaPagamento;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@ApplicationScoped
public class ComandaPagamentoRepository implements PanacheRepositoryBase<ComandaPagamento, Long> {
    public BigDecimal totalByPeriod(UUID adegaUuid, LocalDateTime inicio, LocalDateTime fimExclusivo) {
        BigDecimal total = getEntityManager().createQuery(
                        "select sum(p.valor) from ComandaPagamento p "
                                + "where p.adega.uuid = :adegaUuid "
                                + "and p.dataPagamento >= :inicio and p.dataPagamento < :fim",
                        BigDecimal.class
                )
                .setParameter("adegaUuid", adegaUuid)
                .setParameter("inicio", inicio)
                .setParameter("fim", fimExclusivo)
                .getSingleResult();
        return total == null ? BigDecimal.ZERO : total;
    }

    public Map<FormaPagamento, BigDecimal> totalsByPaymentMethod(
            UUID adegaUuid,
            LocalDateTime inicio,
            LocalDateTime fimExclusivo
    ) {
        List<Object[]> rows = getEntityManager().createQuery(
                        "select p.formaPagamento, sum(p.valor) from ComandaPagamento p "
                                + "where p.adega.uuid = :adegaUuid "
                                + "and p.dataPagamento >= :inicio and p.dataPagamento < :fim "
                                + "group by p.formaPagamento order by p.formaPagamento",
                        Object[].class
                )
                .setParameter("adegaUuid", adegaUuid)
                .setParameter("inicio", inicio)
                .setParameter("fim", fimExclusivo)
                .getResultList();

        Map<FormaPagamento, BigDecimal> result = new LinkedHashMap<>();
        rows.forEach(row -> result.put((FormaPagamento) row[0], (BigDecimal) row[1]));
        return result;
    }

    public long countDistinctCommandsByPeriod(
            UUID adegaUuid,
            LocalDateTime inicio,
            LocalDateTime fimExclusivo
    ) {
        return getEntityManager().createQuery(
                        "select count(distinct p.comanda.uuid) from ComandaPagamento p "
                                + "where p.adega.uuid = :adegaUuid "
                                + "and p.dataPagamento >= :inicio and p.dataPagamento < :fim",
                        Long.class
                )
                .setParameter("adegaUuid", adegaUuid)
                .setParameter("inicio", inicio)
                .setParameter("fim", fimExclusivo)
                .getSingleResult();
    }

    public Map<LocalDate, BigDecimal> totalsByDay(
            UUID adegaUuid,
            LocalDateTime inicio,
            LocalDateTime fimExclusivo
    ) {
        List<Object[]> rows = getEntityManager().createQuery(
                        "select function('date', p.dataPagamento), sum(p.valor) "
                                + "from ComandaPagamento p "
                                + "where p.adega.uuid = :adegaUuid "
                                + "and p.dataPagamento >= :inicio and p.dataPagamento < :fim "
                                + "group by function('date', p.dataPagamento) "
                                + "order by function('date', p.dataPagamento)",
                        Object[].class
                )
                .setParameter("adegaUuid", adegaUuid)
                .setParameter("inicio", inicio)
                .setParameter("fim", fimExclusivo)
                .getResultList();

        Map<LocalDate, BigDecimal> result = new LinkedHashMap<>();
        rows.forEach(row -> result.put(toLocalDate(row[0]), (BigDecimal) row[1]));
        return result;
    }

    private LocalDate toLocalDate(Object value) {
        if (value instanceof LocalDate localDate) {
            return localDate;
        }
        if (value instanceof Date date) {
            return date.toLocalDate();
        }
        return LocalDate.parse(value.toString());
    }
}
