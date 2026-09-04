import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

import Alert from "@mui/material/Alert";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";

import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";
import { useUser } from "context/user.context";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import { Produto, getApiErrorMessage, produtosApi } from "services/adega";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const percentage = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const calculateMargin = (saleValue: number, costValue: number) =>
  saleValue > 0 ? ((saleValue - costValue) / saleValue) * 100 : null;

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");

const emptyForm = {
  nome: "",
  quantidadeEstoqueUnidades: 0,
  alertaEstoqueUnidades: 12,
  unidadesPorCaixa: 1,
  valorUnidade: 0,
  valorCaixa: "",
  custoUnidade: "",
};

function Produtos() {
  const { isGestor } = useUser();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Produto | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingUuid, setDeletingUuid] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const actionLoading = saving || Boolean(deletingUuid);
  const filteredProdutos = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm.trim());

    if (!normalizedSearch) {
      return produtos;
    }

    return produtos.filter((produto) => normalizeText(produto.nome).includes(normalizedSearch));
  }, [produtos, searchTerm]);

  const visibleProdutos = useMemo(
    () => filteredProdutos.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredProdutos, page, rowsPerPage]
  );

  const loadProdutos = async () => {
    setError("");
    try {
      setProdutos(await produtosApi.list());
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    }
  };

  useEffect(() => {
    loadProdutos();
  }, []);

  useEffect(() => {
    if (page > 0 && page * rowsPerPage >= filteredProdutos.length) {
      setPage(Math.max(0, Math.ceil(filteredProdutos.length / rowsPerPage) - 1));
    }
  }, [filteredProdutos.length, page, rowsPerPage]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (produto: Produto) => {
    setEditing(produto);
    setForm({
      nome: produto.nome,
      quantidadeEstoqueUnidades: produto.quantidadeEstoqueUnidades,
      alertaEstoqueUnidades: produto.alertaEstoqueUnidades,
      unidadesPorCaixa: produto.unidadesPorCaixa,
      valorUnidade: produto.valorUnidade,
      valorCaixa: produto.valorCaixa ?? "",
      custoUnidade: produto.custoUnidade ?? "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      nome: form.nome,
      quantidadeEstoqueUnidades: Number(form.quantidadeEstoqueUnidades),
      alertaEstoqueUnidades: Number(form.alertaEstoqueUnidades),
      unidadesPorCaixa: Number(form.unidadesPorCaixa),
      valorUnidade: Number(form.valorUnidade),
      valorCaixa: form.valorCaixa === "" ? null : Number(form.valorCaixa),
      custoUnidade: form.custoUnidade === "" ? null : Number(form.custoUnidade),
    };

    try {
      if (editing) {
        await produtosApi.update(editing.uuid, payload);
      } else {
        await produtosApi.create(payload);
      }
      setDialogOpen(false);
      await loadProdutos();
    } catch (submitError) {
      setError(getApiErrorMessage(submitError));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (produto: Produto) => {
    setError("");
    setDeletingUuid(produto.uuid);
    try {
      await produtosApi.delete(produto.uuid);
      await loadProdutos();
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError));
    } finally {
      setDeletingUuid(null);
    }
  };

  const handleChangeRowsPerPage = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setRowsPerPage(Number(event.target.value));
    setPage(0);
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        <MDBox
          mb={3}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          gap={2}
          flexWrap="wrap"
        >
          <MDBox>
            <MDTypography variant="h4" fontWeight="medium">
              Produtos
            </MDTypography>
            <MDTypography variant="button" color="text">
              Estoque controlado por unidades, com venda opcional por caixa.
            </MDTypography>
          </MDBox>
          <MDBox display="flex" alignItems="center" gap={2} flexWrap="wrap" justifyContent="flex-end">
            {isGestor && (
                <MDButton
                    variant="gradient"
                    color="info"
                    disabled={actionLoading}
                    onClick={openCreate}
                >
                  Novo produto
                </MDButton>
            )}
            <TextField
              label="Filtrar por nome"
              size="medium"
              value={searchTerm}
              onChange={handleSearchChange}
              sx={{ width: { xs: "100%", sm: 260 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Icon fontSize="small">search</Icon>
                  </InputAdornment>
                ),
              }}
            />
          </MDBox>
        </MDBox>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Card>
          <TableContainer>
            <Table>
              <TableHead sx={{ display: "table-header-group" }}>
                <TableRow>
                  <TableCell>Produto</TableCell>
                  <TableCell>Estoque</TableCell>
                  <TableCell>Alerta estoque</TableCell>
                  <TableCell>Un./caixa</TableCell>
                  <TableCell>Valor unidade</TableCell>
                  <TableCell>Valor caixa</TableCell>
                  {isGestor && <TableCell>Custo un.</TableCell>}
                  {isGestor && <TableCell>Rentabilidade</TableCell>}
                  {isGestor && <TableCell align="right">Ações</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleProdutos.map((produto) => {
                  const isLowStock =
                    produto.quantidadeEstoqueUnidades <= produto.alertaEstoqueUnidades;
                  const hasCost = produto.custoUnidade !== null && produto.custoUnidade !== undefined;
                  const unitCost = Number(produto.custoUnidade || 0);
                  const unitSaleValue = Number(produto.valorUnidade || 0);
                  const boxSaleValue = Number(produto.valorCaixa || 0);
                  const boxCost = unitCost * produto.unidadesPorCaixa;
                  const unitMargin = hasCost ? calculateMargin(unitSaleValue, unitCost) : null;
                  const boxMargin = hasCost && produto.valorCaixa
                    ? calculateMargin(boxSaleValue, boxCost)
                    : null;

                  return (
                    <TableRow
                      key={produto.uuid}
                      sx={
                        isLowStock
                          ? {
                              bgcolor: "#fff7ed",
                              "&:hover": {
                                bgcolor: "#ffedd5",
                              },
                            }
                          : undefined
                      }
                    >
                      <TableCell>
                        <MDBox display="flex" alignItems="center" gap={1} flexWrap="wrap">
                          {produto.nome}
                          {isLowStock && (
                            <Chip
                              label="Estoque baixo"
                              size="small"
                              color="warning"
                              sx={{ fontWeight: 700 }}
                            />
                          )}
                        </MDBox>
                      </TableCell>
                      <TableCell>
                        <MDTypography
                          variant="button"
                          fontWeight={isLowStock ? "bold" : "regular"}
                          color={isLowStock ? "warning" : "text"}
                        >
                          {produto.quantidadeEstoqueUnidades}
                        </MDTypography>
                      </TableCell>
                      <TableCell>{produto.alertaEstoqueUnidades}</TableCell>
                      <TableCell>{produto.unidadesPorCaixa}</TableCell>
                      <TableCell>{currency.format(Number(produto.valorUnidade))}</TableCell>
                      <TableCell>
                        {produto.valorCaixa ? currency.format(Number(produto.valorCaixa)) : "-"}
                      </TableCell>
                      {isGestor && (
                        <TableCell>
                          {hasCost ? (
                            currency.format(unitCost)
                          ) : (
                            <Chip label="Custo pendente" size="small" color="warning" />
                          )}
                        </TableCell>
                      )}
                      {isGestor && (
                        <TableCell>
                          {hasCost ? (
                            <MDBox display="flex" flexDirection="column">
                              <MDTypography variant="button" color="text">
                                Unidade: {currency.format(unitSaleValue - unitCost)} ({percentage.format(unitMargin || 0)}%)
                              </MDTypography>
                              {produto.valorCaixa && (
                                <MDTypography variant="caption" color="text">
                                  Caixa: {currency.format(boxSaleValue - boxCost)} ({percentage.format(boxMargin || 0)}%)
                                </MDTypography>
                              )}
                            </MDBox>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      )}
                      {isGestor && (
                        <TableCell align="right">
                          <Tooltip title="Editar">
                            <IconButton
                              color="info"
                              disabled={actionLoading}
                              onClick={() => openEdit(produto)}
                            >
                              <Icon>edit</Icon>
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Excluir">
                            <IconButton
                              color="error"
                              disabled={actionLoading}
                              onClick={() => handleDelete(produto)}
                            >
                              {deletingUuid === produto.uuid ? (
                                <CircularProgress color="inherit" size={20} />
                              ) : (
                                <Icon>delete</Icon>
                              )}
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
                {visibleProdutos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isGestor ? 9 : 6}>
                      {produtos.length === 0
                        ? "Nenhum produto cadastrado."
                        : "Nenhum produto encontrado para o filtro informado."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={filteredProdutos.length}
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
            labelRowsPerPage="Itens por página"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
            onPageChange={(_, nextPage) => setPage(nextPage)}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Card>
      </MDBox>

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth="sm" fullWidth>
        <MDBox component="form" onSubmit={handleSubmit}>
          <DialogTitle>{editing ? "Editar produto" : "Novo produto"}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} mt={0.5}>
              <Grid item xs={12}>
                <TextField
                  label="Nome"
                  required
                  fullWidth
                  value={form.nome}
                  onChange={(event) => setForm({ ...form, nome: event.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Estoque em unidades"
                  type="number"
                  required
                  fullWidth
                  inputProps={{ min: 0 }}
                  value={form.quantidadeEstoqueUnidades}
                  onChange={(event) =>
                    setForm({ ...form, quantidadeEstoqueUnidades: event.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Alerta estoque"
                  type="number"
                  required
                  fullWidth
                  helperText="Alerta quando o estoque for igual ou menor que este valor."
                  inputProps={{ min: 0 }}
                  value={form.alertaEstoqueUnidades}
                  onChange={(event) =>
                    setForm({ ...form, alertaEstoqueUnidades: event.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Unidades por caixa"
                  type="number"
                  required
                  fullWidth
                  inputProps={{ min: 1 }}
                  value={form.unidadesPorCaixa}
                  onChange={(event) => setForm({ ...form, unidadesPorCaixa: event.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Valor unidade"
                  type="number"
                  required
                  fullWidth
                  inputProps={{ min: 0.01, step: 0.01 }}
                  value={form.valorUnidade}
                  onChange={(event) => setForm({ ...form, valorUnidade: event.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Valor caixa"
                  type="number"
                  fullWidth
                  inputProps={{ min: 0.01, step: 0.01 }}
                  value={form.valorCaixa}
                  onChange={(event) => setForm({ ...form, valorCaixa: event.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Custo por unidade"
                  type="number"
                  fullWidth
                  helperText="Quanto você paga por uma unidade mantida no estoque."
                  inputProps={{ min: 0.01, step: 0.01 }}
                  value={form.custoUnidade}
                  onChange={(event) => setForm({ ...form, custoUnidade: event.target.value })}
                />
              </Grid>
              {form.custoUnidade !== "" && Number(form.custoUnidade) > 0 && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    Custo da unidade: {currency.format(
                      Number(form.custoUnidade) * Number(form.unidadesPorCaixa || 1)
                    )}. Lucro por unidade: {currency.format(
                      Number(form.valorUnidade || 0) - Number(form.custoUnidade)
                    )} ({percentage.format(
                      calculateMargin(
                        Number(form.valorUnidade || 0),
                        Number(form.custoUnidade)
                      ) || 0
                    )}%)
                    {form.valorCaixa !== "" && (
                      <>. Lucro por caixa: {currency.format(
                        Number(form.valorCaixa) -
                          Number(form.custoUnidade) * Number(form.unidadesPorCaixa || 1)
                      )} ({percentage.format(
                        calculateMargin(
                          Number(form.valorCaixa),
                          Number(form.custoUnidade) * Number(form.unidadesPorCaixa || 1)
                        ) || 0
                      )}%)</>
                    )}
                  </Alert>
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <MDButton variant="text" color="secondary" disabled={saving} onClick={() => setDialogOpen(false)}>
              Cancelar
            </MDButton>
            <MDButton type="submit" variant="gradient" color="info" loading={saving} loadingText="Salvando...">
              Salvar
            </MDButton>
          </DialogActions>
        </MDBox>
      </Dialog>
      <Footer />
    </DashboardLayout>
  );
}

export default Produtos;
