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
@Table(name = "comanda_item")
public class ComandaItem extends PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "uuid", columnDefinition = "BINARY(16)", nullable = false, unique = true)
    public UUID uuid;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "comanda_uuid", referencedColumnName = "uuid", nullable = false)
    public Comanda comanda;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "produto_uuid", referencedColumnName = "uuid", nullable = false)
    public Produto produto;

    @Column(name = "quantidade_pedida", nullable = false)
    public int quantidadePedida;

    @Column(name = "unidades_deduzidas", nullable = false)
    public int unidadesDeduzidas;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_medida_vendida", nullable = false, length = 20)
    public TipoMedidaVenda tipoMedidaVendida;

    @Column(name = "valor_cobrado_unitario", nullable = false, precision = 10, scale = 2)
    public BigDecimal valorCobradoUnitario;

    @Column(name = "custo_unitario_estoque", precision = 10, scale = 2)
    public BigDecimal custoUnitarioEstoque;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "grupo_uuid", columnDefinition = "BINARY(16)")
    public UUID grupoUuid;

    @Column(name = "ordem_grupo")
    public Integer ordemGrupo;

    @Column(name = "data_adicao", nullable = false)
    public LocalDateTime dataAdicao;

    @PrePersist
    void prePersist() {
        if (uuid == null) {
            uuid = UUID.randomUUID();
        }
        if (dataAdicao == null) {
            dataAdicao = BusinessTime.now();
        }
    }
}
