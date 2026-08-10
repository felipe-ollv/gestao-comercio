import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

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
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";
import { useUser } from "context/user.context";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import { DashboardResumo, dashboardApi, getApiErrorMessage } from "services/adega";
import PaymentMethodsChart from "./PaymentMethodsChart";
import RevenueEvolutionChart from "./RevenueEvolutionChart";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const statCardColors = {
  open: "linear-gradient(135deg, #1A73E8 0%, #1557B0 100%)",
  credit: "linear-gradient(135deg, #F59E0B 0%, #B45309 100%)",
  paid: "linear-gradient(135deg, #16A34A 0%, #0F766E 100%)",
  ticket: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)",
  completed: "linear-gradient(135deg, #0891B2 0%, #0E7490 100%)",
  stock: "linear-gradient(135deg, #DC2626 0%, #9F1239 100%)",
};

type StatCardTone = keyof typeof statCardColors;
type BillingPeriod = "day" | "week" | "month" | "year";

const billingPeriodInput: Record<BillingPeriod, { label: string; type: string }> = {
  day: { label: "Dia", type: "date" },
  week: { label: "Semana", type: "week" },
  month: { label: "Mês", type: "month" },
  year: { label: "Ano", type: "number" },
};

const pad = (value: number) => String(value).padStart(2, "0");

function formatDateInput(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatMonthInput(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function formatWeekInput(date = new Date()) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);

  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

  return `${target.getUTCFullYear()}-W${pad(week)}`;
}

function getDefaultBillingValue(period: BillingPeriod) {
  const now = new Date();

  if (period === "day") return formatDateInput(now);
  if (period === "week") return formatWeekInput(now);
  if (period === "month") return formatMonthInput(now);
  return String(now.getFullYear());
}

function getWeekStart(year: number, week: number) {
  const januaryFourth = new Date(year, 0, 4);
  const weekday = januaryFourth.getDay() || 7;
  const monday = new Date(januaryFourth);
  monday.setDate(januaryFourth.getDate() - weekday + 1 + (week - 1) * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getBillingRange(period: BillingPeriod, value: string) {
  let start: Date | null = null;
  let end: Date | null = null;

  if (period === "day") {
    const [year, month, day] = value.split("-").map(Number);
    if (year && month && day) {
      start = new Date(year, month - 1, day, 0, 0, 0, 0);
      end = new Date(year, month - 1, day, 23, 59, 59, 999);
    }
  }

  if (period === "week") {
    const match = value.match(/^(\d{4})-W(\d{2})$/);
    if (match) {
      start = getWeekStart(Number(match[1]), Number(match[2]));
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    }
  }

  if (period === "month") {
    const [year, month] = value.split("-").map(Number);
    if (year && month) {
      start = new Date(year, month - 1, 1, 0, 0, 0, 0);
      end = new Date(year, month, 0, 23, 59, 59, 999);
    }
  }

  if (period === "year") {
    const year = Number(value);
    if (year) {
      start = new Date(year, 0, 1, 0, 0, 0, 0);
      end = new Date(year, 11, 31, 23, 59, 59, 999);
    }
  }

  return { start, end };
}

function getBillingLabel(period: BillingPeriod, value: string) {
  if (period === "day") {
    const [year, month, day] = value.split("-");
    return year && month && day ? `${day}/${month}/${year}` : "Dia";
  }

  if (period === "week") {
    const match = value.match(/^(\d{4})-W(\d{2})$/);
    return match ? `Semana ${match[2]}/${match[1]}` : "Semana";
  }

  if (period === "month") {
    const [year, month] = value.split("-");
    return year && month ? `${month}/${year}` : "Mês";
  }

  return value || "Ano";
}

function getComparisonLabel(comparison: DashboardResumo["comparacaoPeriodoAnterior"]) {
  if (!comparison) return "Comparação indisponível";

  const previousTotal = Number(comparison.totalRecebido || 0);
  const difference = Number(comparison.diferenca || 0);
  const percentage = comparison.variacaoPercentual;

  if (previousTotal === 0 && difference === 0) return "Sem movimento nos dois períodos";
  if (percentage === null || percentage === undefined) return "Sem base no período anterior";

  const formattedPercentage = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
  }).format(Math.abs(Number(percentage)));
  if (Number(percentage) > 0) return `↑ ${formattedPercentage}% vs. período anterior`;
  if (Number(percentage) < 0) return `↓ ${formattedPercentage}% vs. período anterior`;
  return "Sem variação vs. período anterior";
}

function StatCard({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: string | number;
  helper: string;
  tone: StatCardTone;
}) {
  return (
    <Card
      sx={{
        height: "100%",
        background: statCardColors[tone],
        color: "#fff",
      }}
    >
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

function Home() {
  const { isGestor, userData } = useUser();
  const [summary, setSummary] = useState<DashboardResumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("day");
  const [billingValue, setBillingValue] = useState(getDefaultBillingValue("day"));
  const adegaNome = userData?.adegaNome || "da adega";

  useEffect(() => {
    const fetchData = async () => {
      const range = getBillingRange(billingPeriod, billingValue);
      if (!range.start || !range.end) return;

      setLoading(true);
      setError("");
      try {
        const data = await dashboardApi.summary(
          formatDateInput(range.start),
          formatDateInput(range.end)
        );
        setSummary(data);
      } catch (fetchError) {
        setError(getApiErrorMessage(fetchError));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [billingPeriod, billingValue]);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        <MDBox mb={3} display="flex" justifyContent="space-between" alignItems="center" gap={2}>
          <MDBox>
            <MDTypography variant="h4" fontWeight="medium">
              Dashboard
            </MDTypography>
            <MDTypography variant="button" color="text">
              Visão operacional {adegaNome}.
            </MDTypography>
          </MDBox>
          <MDButton component={Link} to="/comandas" variant="gradient" color="info">
            Abrir comanda
          </MDButton>
        </MDBox>

        {error && (
          <MDBox mb={2}>
            <Chip color="error" label={error} />
          </MDBox>
        )}

        {isGestor && (
          <MDBox
            mb={3}
            display="flex"
            justifyContent="flex-end"
            alignItems="center"
            gap={2}
            flexDirection={{ xs: "column", sm: "row" }}
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
                  minWidth: { xs: 0, sm: 96 },
                  px: { xs: 1.5, sm: 2.5 },
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
        )}

        <Grid container spacing={3}>
          {isGestor && (
            <Grid item xs={12} sm={6} lg={4} xl={2}>
              <StatCard
                label="Faturado"
                value={currency.format(Number(summary?.totalRecebido || 0))}
                helper={getComparisonLabel(summary?.comparacaoPeriodoAnterior)}
                tone="paid"
              />
            </Grid>
          )}
          {isGestor && (
            <Grid item xs={12} sm={6} lg={4} xl={2}>
              <StatCard
                label="Ticket médio"
                value={currency.format(Number(summary?.ticketMedio || 0))}
                helper={getBillingLabel(billingPeriod, billingValue)}
                tone="ticket"
              />
            </Grid>
          )}
          {isGestor && (
            <Grid item xs={12} sm={6} lg={4} xl={2}>
              <StatCard
                label="Comandas pagas"
                value={summary?.quantidadeComandasPagas || 0}
                helper={getBillingLabel(billingPeriod, billingValue)}
                tone="completed"
              />
            </Grid>
          )}
          <Grid item xs={12} sm={6} lg={4} xl={isGestor ? 2 : 4}>
            <StatCard
              label="Comandas abertas"
              value={summary?.quantidadeComandasAbertas || 0}
              helper="Em atendimento"
              tone="open"
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={4} xl={isGestor ? 2 : 4}>
            <StatCard
              label="Fiado"
              value={summary?.quantidadeComandasFiado || 0}
              helper={`A receber: ${currency.format(Number(summary?.valorPendenteFiado || 0))}`}
              tone="credit"
            />
          </Grid>

          <Grid item xs={12} sm={6} lg={4} xl={isGestor ? 2 : 4}>
              <StatCard
                label="Baixo estoque"
                value={summary?.quantidadeProdutosBaixoEstoque || 0}
                helper="Conforme alerta de cada produto"
                tone="stock"
              />
          </Grid>

          <Grid item xs={12} lg={7}>
            <Card>
              <MDBox p={3}>
                <MDTypography variant="h6" fontWeight="medium">
                  Comandas abertas recentes
                </MDTypography>
              </MDBox>
              <TableContainer>
                <Table>
                  <TableHead sx={{ display: "table-header-group" }}>
                    <TableRow>
                      <TableCell>Responsável</TableCell>
                      <TableCell>Itens</TableCell>
                      <TableCell>Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading && (
                      <TableRow>
                        <TableCell colSpan={3}>Carregando...</TableCell>
                      </TableRow>
                    )}
                    {!loading &&
                      (summary?.comandasAbertas || []).map((comanda) => (
                        <TableRow key={comanda.uuid}>
                          <TableCell>{comanda.nomeResponsavel}</TableCell>
                          <TableCell>{comanda.quantidadeItens}</TableCell>
                          <TableCell>{currency.format(Number(comanda.total || 0))}</TableCell>
                        </TableRow>
                      ))}
                    {!loading && (summary?.comandasAbertas.length || 0) === 0 && (
                      <TableRow>
                        <TableCell colSpan={3}>Nenhuma comanda aberta.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </Grid>

          <Grid item xs={12} lg={5}>
            <Card>
              <MDBox p={3}>
                <MDTypography variant="h6" fontWeight="medium">
                  Produtos com baixo estoque
                </MDTypography>
              </MDBox>
              <TableContainer>
                <Table>
                  <TableHead sx={{ display: "table-header-group" }}>
                    <TableRow>
                      <TableCell>Produto</TableCell>
                      <TableCell>Unidades</TableCell>
                      <TableCell>Alerta</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(summary?.produtosBaixoEstoque || []).map((produto) => (
                      <TableRow key={produto.uuid}>
                        <TableCell>{produto.nome}</TableCell>
                        <TableCell>{produto.quantidadeEstoqueUnidades}</TableCell>
                        <TableCell>{produto.alertaEstoqueUnidades}</TableCell>
                      </TableRow>
                    ))}
                    {!loading && (summary?.produtosBaixoEstoque.length || 0) === 0 && (
                      <TableRow>
                        <TableCell colSpan={3}>Estoque sem alertas.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </Grid>

          {isGestor && (
            <Grid item xs={12}>
              <PaymentMethodsChart
                loading={loading}
                periodLabel={getBillingLabel(billingPeriod, billingValue)}
                receipts={summary?.recebimentosPorForma || []}
              />
            </Grid>
          )}

          {isGestor && (
            <Grid item xs={12} lg={7}>
              <RevenueEvolutionChart
                loading={loading}
                periodLabel={getBillingLabel(billingPeriod, billingValue)}
                receipts={summary?.evolucaoRecebimentos || []}
              />
            </Grid>
          )}

          {isGestor && (
            <Grid item xs={12} lg={5}>
              <Card sx={{ height: "100%" }}>
                <MDBox p={3}>
                  <MDTypography variant="h6" fontWeight="medium">
                    Produtos mais vendidos
                  </MDTypography>
                  <MDTypography variant="button" color="text">
                    {getBillingLabel(billingPeriod, billingValue)}
                  </MDTypography>
                </MDBox>
                <TableContainer>
                  <Table>
                    <TableHead sx={{ display: "table-header-group" }}>
                      <TableRow>
                        <TableCell>Produto</TableCell>
                        <TableCell>Unidades</TableCell>
                        <TableCell>Valor</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(summary?.produtosMaisVendidos || []).map((produto) => (
                        <TableRow key={produto.produtoUuid}>
                          <TableCell>{produto.produtoNome}</TableCell>
                          <TableCell>{produto.unidadesVendidas}</TableCell>
                          <TableCell>{currency.format(Number(produto.valorVendido || 0))}</TableCell>
                        </TableRow>
                      ))}
                      {!loading && (summary?.produtosMaisVendidos.length || 0) === 0 && (
                        <TableRow>
                          <TableCell colSpan={3}>Nenhum produto vendido no período.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>
            </Grid>
          )}
        </Grid>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default Home;
