package com.adega.controller;

import com.adega.dto.AdicionarItemRequest;
import com.adega.dto.AdicionarItensRequest;
import com.adega.dto.AtualizarItemRequest;
import com.adega.dto.ComandaRequest;
import com.adega.dto.ComandaResponse;
import com.adega.dto.ExcluirComandaRequest;
import com.adega.dto.FecharComandaRequest;
import com.adega.dto.PagamentoParcialComandaRequest;
import com.adega.dto.PaginaResponse;
import com.adega.model.StatusComanda;
import com.adega.service.ComandaService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PATCH;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.time.LocalDate;
import java.util.UUID;

@Path("/comandas")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
@RolesAllowed({"GESTOR", "ATENDENTE"})
public class ComandaController {
    @Inject
    ComandaService comandaService;

    @GET
    public PaginaResponse<ComandaResponse> list(
            @QueryParam("status") StatusComanda status,
            @QueryParam("inicio") LocalDate inicio,
            @QueryParam("fim") LocalDate fim,
            @QueryParam("pagina") @DefaultValue("0") int pagina,
            @QueryParam("tamanho") @DefaultValue("100") int tamanho
    ) {
        return comandaService.list(status, inicio, fim, pagina, tamanho);
    }

    @GET
    @Path("/{uuid}")
    public ComandaResponse get(@PathParam("uuid") UUID uuid) {
        return comandaService.get(uuid);
    }

    @POST
    public ComandaResponse open(@Valid ComandaRequest request) {
        return comandaService.open(request);
    }

    @POST
    @Path("/{uuid}/itens")
    public ComandaResponse addItem(@PathParam("uuid") UUID uuid, @Valid AdicionarItemRequest request) {
        return comandaService.addItem(uuid, request);
    }

    @POST
    @Path("/{uuid}/itens/lote")
    public ComandaResponse addItems(@PathParam("uuid") UUID uuid, @Valid AdicionarItensRequest request) {
        return comandaService.addItems(uuid, request);
    }

    @PUT
    @Path("/{uuid}/itens/{itemUuid}")
    public ComandaResponse updateItem(
            @PathParam("uuid") UUID uuid,
            @PathParam("itemUuid") UUID itemUuid,
            @Valid AtualizarItemRequest request
    ) {
        return comandaService.updateItem(uuid, itemUuid, request);
    }

    @DELETE
    @Path("/{uuid}/itens/{itemUuid}")
    public ComandaResponse deleteItem(@PathParam("uuid") UUID uuid, @PathParam("itemUuid") UUID itemUuid) {
        return comandaService.deleteItem(uuid, itemUuid);
    }

    @PATCH
    @Path("/{uuid}/fechar")
    public ComandaResponse close(@PathParam("uuid") UUID uuid, @Valid FecharComandaRequest request) {
        return comandaService.close(uuid, request);
    }

    @PATCH
    @Path("/{uuid}/pagamento-parcial")
    public ComandaResponse payPartial(
            @PathParam("uuid") UUID uuid,
            @Valid PagamentoParcialComandaRequest request
    ) {
        return comandaService.payPartial(uuid, request);
    }

    @DELETE
    @Path("/{uuid}")
    public Response delete(@PathParam("uuid") UUID uuid, @Valid ExcluirComandaRequest request) {
        comandaService.delete(uuid, request);
        return Response.noContent().build();
    }
}
