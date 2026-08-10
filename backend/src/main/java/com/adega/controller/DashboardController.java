package com.adega.controller;

import com.adega.dto.DashboardResumoResponse;
import com.adega.service.DashboardService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import java.time.LocalDate;

@Path("/dashboard")
@Produces(MediaType.APPLICATION_JSON)
@RolesAllowed({"GESTOR", "ATENDENTE"})
public class DashboardController {
    @Inject
    DashboardService dashboardService;

    @GET
    @Path("/resumo")
    public DashboardResumoResponse summary(
            @QueryParam("inicio") LocalDate inicio,
            @QueryParam("fim") LocalDate fim
    ) {
        return dashboardService.summary(inicio, fim);
    }
}
