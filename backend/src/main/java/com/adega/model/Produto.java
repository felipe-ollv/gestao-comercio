package com.adega.model;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "produto")
public class Produto extends PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "uuid", columnDefinition = "BINARY(16)", nullable = false, unique = true)
    public UUID uuid;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "adega_uuid", referencedColumnName = "uuid", nullable = false)
    public Adega adega;

    @Column(nullable = false, length = 100)
    public String nome;

    @Column(name = "quantidade_estoque_unidades", nullable = false)
    public int quantidadeEstoqueUnidades;

    @Column(name = "alerta_estoque_unidades", nullable = false)
    public int alertaEstoqueUnidades = 12;

    @Column(name = "alerta_estoque_notificado", nullable = false)
    public boolean alertaEstoqueNotificado;

    @Column(name = "alerta_estoque_ciclo", nullable = false)
    public int alertaEstoqueCiclo;

    @Column(name = "unidades_por_caixa", nullable = false)
    public int unidadesPorCaixa = 1;

    @Column(name = "valor_unidade", nullable = false, precision = 10, scale = 2)
    public BigDecimal valorUnidade;

    @Column(name = "valor_caixa", precision = 10, scale = 2)
    public BigDecimal valorCaixa;

    @Column(name = "custo_unidade", precision = 10, scale = 2)
    public BigDecimal custoUnidade;

    @Column(nullable = false)
    public boolean ativo = true;

    @PrePersist
    void prePersist() {
        if (uuid == null) {
            uuid = UUID.randomUUID();
        }
    }
}
