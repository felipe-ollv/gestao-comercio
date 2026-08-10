package com.adega.model;

import com.adega.util.BusinessTime;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "comanda")
public class Comanda extends PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "uuid", columnDefinition = "BINARY(16)", nullable = false, unique = true)
    public UUID uuid;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "adega_uuid", referencedColumnName = "uuid", nullable = false)
    public Adega adega;

    @Column(name = "nome_responsavel", nullable = false, length = 100)
    public String nomeResponsavel;

    @Column(name = "data_abertura", nullable = false)
    public LocalDateTime dataAbertura;

    @Column(name = "data_fechamento")
    public LocalDateTime dataFechamento;

    @Column(name = "data_exclusao")
    public LocalDateTime dataExclusao;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    public StatusComanda status = StatusComanda.ABERTA;

    @Column(name = "valor_pago_parcial", nullable = false, precision = 10, scale = 2)
    public BigDecimal valorPagoParcial = BigDecimal.ZERO;

    @Column(name = "observacao_exclusao", length = 500)
    public String observacaoExclusao;

    @OneToMany(mappedBy = "comanda", cascade = CascadeType.ALL, orphanRemoval = true)
    public List<ComandaItem> itens = new ArrayList<>();

    @OneToMany(mappedBy = "comanda", cascade = CascadeType.ALL)
    @OrderBy("dataPagamento DESC")
    public List<ComandaPagamento> pagamentos = new ArrayList<>();

    @PrePersist
    void prePersist() {
        if (uuid == null) {
            uuid = UUID.randomUUID();
        }
        if (dataAbertura == null) {
            dataAbertura = BusinessTime.now();
        }
        if (valorPagoParcial == null) {
            valorPagoParcial = BigDecimal.ZERO;
        }
    }
}
