package com.adega.model;

import com.adega.util.BusinessTime;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "comanda_pagamento")
public class ComandaPagamento extends PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "uuid", columnDefinition = "BINARY(16)", nullable = false, unique = true)
    public UUID uuid;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "adega_uuid", referencedColumnName = "uuid", nullable = false)
    public Adega adega;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "comanda_uuid", referencedColumnName = "uuid", nullable = false)
    public Comanda comanda;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_uuid", referencedColumnName = "uuid")
    public Usuario usuario;

    @Column(nullable = false, precision = 10, scale = 2)
    public BigDecimal valor;

    @Enumerated(EnumType.STRING)
    @Column(name = "forma_pagamento", nullable = false, length = 30)
    public FormaPagamento formaPagamento;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    public OrigemPagamento origem;

    @Column(name = "data_pagamento", nullable = false)
    public LocalDateTime dataPagamento;

    @PrePersist
    void prePersist() {
        if (uuid == null) {
            uuid = UUID.randomUUID();
        }
        if (dataPagamento == null) {
            dataPagamento = BusinessTime.now();
        }
    }
}
