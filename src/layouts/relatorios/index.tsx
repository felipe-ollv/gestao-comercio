import { useEffect, useState } from "react";

import Alert from "@mui/material/Alert";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import { RelatorioLucro, getApiErrorMessage, relatoriosApi } from "services/adega";
import {
  BillingPeriod,
  billingPeriodInput,
  formatDateInput,
  getBillingLabel,
  getBillingRange,
  getDefaultBillingValue,
} from "utils/reportPeriod";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const percentage = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const resultColors = {
  sales: "linear-gradient(135deg, #1A73E8 0%, #1557B0 100%)",
  cost: "linear-gradient(135deg, #F59E0B 0%, #B45309 100%)",
  profit: "linear-gradient(135deg, #16A34A 0%, #0F766E 100%)",
  loss: "linear-gradient(135deg, #DC2626 0%, #9F1239 100%)",
  margin: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)",
  coverage: "linear-gradient(135deg, #0891B2 0%, #0E7490 100%)",
};

type ResultTone = keyof typeof resultColors;

function formatPercentage(value?: number | null) {
  return value === null || value === undefined ? "—" : `${percentage.format(value)}%`;
}

function ResultCard({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  tone: ResultTone;
}) {
  return (
    <Card sx={{ height: "100%", background: resultColors[tone], color: "#fff" }}>
      <MDBox p={3}>
        <MDTypography variant="button" fontWeight="medium" sx={{ color: "#fff", opacity: 0.9 }}>
          {label}
        </MDTypography>
        <MDTypography variant="h3" fontWeight="bold" sx={{ color: "#fff" }}>
          {value}
        </MDTypography>
        <MDTypography variant="subtitle3" sx={{ color: "#fff", opacity: 0.9 }}>
          {helper}
        </MDTypography>
      </MDBox>
    </Card>
  );
}

function Relatorios() {
  const [report, setReport] = useState<RelatorioLucro | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("day");
  const [billingValue, setBillingValue] = useState(getDefaultBillingValue("day"));

  useEffect(() => {
    const fetchReport = async () => {
      const range = getBillingRange(billingPeriod, billingValue);
      if (!range.start || !range.end) return;

      setLoading(true);
      setError("");
      try {
        setReport(
          await relatoriosApi.profit(
            formatDateInput(range.start),
            formatDateInput(range.end)
          )
        );
      } catch (fetchError) {
        setError(getApiErrorMessage(fetchError));
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [billingPeriod, billingValue]);

  const periodLabel = getBillingLabel(billingPeriod, billingValue);
  const grossProfit = Number(report?.lucroBruto || 0);
  const hasMissingCosts = Number(report?.valorVendidoSemCusto || 0) > 0;

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
          flexDirection={{ xs: "column", sm: "row" }}
        >
          <MDBox alignSelf={{ xs: "stretch", sm: "auto" }}>
            <MDTypography variant="h4" fontWeight="medium">
              Relatórios
            </MDTypography>
            <MDTypography variant="button" color="text">
              Rentabilidade das vendas pagas.
            </MDTypography>
          </MDBox>
          <MDBox
            display="flex"
            alignItems="center"
            gap={2}
            flexDirection={{ xs: "column", sm: "row" }}
            width={{ xs: "100%", sm: "auto" }}
          >
            <ToggleButtonGroup
              color="info"
              exclusive
              value={billingPeriod}
              onChange={(_, value: BillingPeriod | null) => {
                if (!value) return;
                setBillingPeriod(value);
                setBillingValue(getDefaultBillingValue(value));
              }}
              sx={{
                bgcolor: "white",
                boxShadow: 1,
                width: { xs: "100%", sm: "auto" },
                "& .MuiToggleButton-root": {
                  flex: { xs: 1, sm: "initial" },
                  minWidth: { xs: 0, sm: 84 },
                  px: { xs: 1, sm: 2 },
                  textTransform: "none",
                },
              }}
            >
              <ToggleButton value="day">Dia</ToggleButton>
              <ToggleButton value="week">Semana</ToggleButton>
              <ToggleButton value="month">Mês</ToggleButton>
              <ToggleButton value="year">Ano</ToggleButton>
            </ToggleButtonGroup>
            <TextField
              label={billingPeriodInput[billingPeriod].label}
              type={billingPeriodInput[billingPeriod].type}
              value={billingValue}
              onChange={(event) => setBillingValue(event.target.value)}
              inputProps={
                billingPeriod === "year"
                  ? { min: 2000, max: new Date().getFullYear() + 1, step: 1 }
                  : undefined
              }
              sx={{ width: { xs: "100%", sm: 180 }, bgcolor: "white" }}
            />
          </MDBox>
        </MDBox>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={6} lg={4}>
            <ResultCard
              label="Vendas pagas"
              value={currency.format(Number(report?.valorVendido || 0))}
              helper={periodLabel}
              tone="sales"
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={4}>
            <ResultCard
              label="Custo dos produtos"
              value={currency.format(Number(report?.custoProdutosVendidos || 0))}
              helper="Somente vendas com custo cadastrado"
              tone="cost"
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={4}>
            <ResultCard
              label="Lucro bruto"
              value={currency.format(grossProfit)}
              helper="Vendas cobertas menos custo"
              tone={grossProfit < 0 ? "loss" : "profit"}
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={6}>
            <ResultCard
              label="Margem bruta"
              value={formatPercentage(report?.margemBrutaPercentual)}
              helper="Calculada sobre vendas com custo"
              tone="margin"
            />
          </Grid>
          <Grid item xs={12} lg={6}>
            <ResultCard
              label="Cobertura de custos"
              value={formatPercentage(report?.coberturaCustoPercentual)}
              helper="Percentual das vendas com custo conhecido"
              tone="coverage"
            />
          </Grid>
        </Grid>

        {hasMissingCosts && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {currency.format(Number(report?.valorVendidoSemCusto || 0))} em vendas não entrou no
            cálculo do lucro porque os itens estavam sem custo cadastrado.
          </Alert>
        )}

        <Card>
          <MDBox p={3}>
            <MDTypography variant="h6" fontWeight="medium">
              Rentabilidade por produto
            </MDTypography>
            <MDTypography variant="button" color="text">
              {periodLabel}
            </MDTypography>
          </MDBox>
          <TableContainer>
            <Table sx={{ minWidth: 920 }}>
              <TableHead sx={{ display: "table-header-group" }}>
                <TableRow>
                  <TableCell>Produto</TableCell>
                  <TableCell>Unidades</TableCell>
                  <TableCell>Vendas</TableCell>
                  <TableCell>Custo</TableCell>
                  <TableCell>Lucro bruto</TableCell>
                  <TableCell>Margem</TableCell>
                  <TableCell>Cobertura</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={7}>Carregando...</TableCell>
                  </TableRow>
                )}
                {!loading &&
                  (report?.produtos || []).map((product) => {
                    const hasCoveredSales = Number(product.valorVendidoComCusto || 0) > 0;
                    const incomplete = Number(product.valorVendidoSemCusto || 0) > 0;
                    const productProfit = Number(product.lucroBruto || 0);

                    return (
                      <TableRow key={product.produtoUuid}>
                        <TableCell>
                          <MDBox display="flex" alignItems="center" gap={1} flexWrap="wrap">
                            {product.produtoNome}
                            {incomplete && (
                              <Chip label="Custo incompleto" size="small" color="warning" />
                            )}
                          </MDBox>
                        </TableCell>
                        <TableCell>{product.unidadesVendidas}</TableCell>
                        <TableCell>{currency.format(Number(product.valorVendido || 0))}</TableCell>
                        <TableCell>
                          {hasCoveredSales
                            ? currency.format(Number(product.custoProdutosVendidos || 0))
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <MDTypography
                            variant="button"
                            fontWeight="medium"
                            color={productProfit < 0 ? "error" : "success"}
                          >
                            {hasCoveredSales ? currency.format(productProfit) : "—"}
                          </MDTypography>
                        </TableCell>
                        <TableCell>
                          {hasCoveredSales ? formatPercentage(product.margemBrutaPercentual) : "—"}
                        </TableCell>
                        <TableCell>{formatPercentage(product.coberturaCustoPercentual)}</TableCell>
                      </TableRow>
                    );
                  })}
                {!loading && (report?.produtos.length || 0) === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>Nenhuma venda paga no período.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default Relatorios;
