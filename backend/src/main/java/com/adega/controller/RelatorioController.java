package com.adega.controller;

import com.adega.dto.RelatorioLucroResponse;
import com.adega.service.RelatorioService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import java.time.LocalDate;

@Path("/relatorios")
@Produces(MediaType.APPLICATION_JSON)
@RolesAllowed("GESTOR")
public class RelatorioController {
    @Inject
    RelatorioService relatorioService;

    @GET
    @Path("/lucro")
    public RelatorioLucroResponse profit(
            @QueryParam("inicio") LocalDate inicio,
            @QueryParam("fim") LocalDate fim
    ) {
        return relatorioService.lucro(inicio, fim);
    }
}
