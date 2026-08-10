package com.adega.dto;

import java.util.List;

public record PaginaResponse<T>(
        List<T> conteudo,
        long totalElementos,
        int pagina,
        int tamanho,
        int totalPaginas
) {
    public static <T> PaginaResponse<T> of(List<T> content, long total, int page, int size) {
        int totalPages = total == 0 ? 0 : (int) Math.ceil((double) total / size);
        return new PaginaResponse<>(content, total, page, size, totalPages);
    }
}
