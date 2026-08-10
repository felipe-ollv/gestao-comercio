import { useMemo } from "react";

import Card from "@mui/material/Card";
import { useTheme } from "@mui/material/styles";
import {
  CategoryScale,
  Chart as ChartJS,
  ChartData,
  ChartOptions,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import { DashboardResumo } from "services/adega";

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Filler);

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });

type RevenueEvolutionChartProps = {
  loading: boolean;
  periodLabel: string;
  receipts: DashboardResumo["evolucaoRecebimentos"];
};

function formatDate(value: string) {
  return shortDate.format(new Date(`${value}T00:00:00`));
}

function RevenueEvolutionChart({ loading, periodLabel, receipts }: RevenueEvolutionChartProps) {
  const theme = useTheme();
  const hasReceipts = receipts.some((receipt) => Number(receipt.total) > 0);

  const chartData = useMemo<ChartData<"line", number[], string>>(
    () => ({
      labels: receipts.map((receipt) => formatDate(receipt.data)),
      datasets: [
        {
          data: receipts.map((receipt) => Number(receipt.total)),
          borderColor: theme.palette.info.main,
          backgroundColor: "rgba(26, 115, 232, 0.12)",
          borderWidth: 2,
          fill: true,
          pointBackgroundColor: theme.palette.info.main,
          pointBorderWidth: 0,
          pointRadius: receipts.length <= 31 ? 3 : 0,
          pointHoverRadius: 5,
          tension: 0.25,
        },
      ],
    }),
    [receipts, theme]
  );

  const chartOptions = useMemo<ChartOptions<"line">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: "index" },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => currency.format(Number(context.raw || 0)),
          },
        },
      },
      scales: {
        x: {
          border: { display: false },
          grid: { display: false },
          ticks: {
            autoSkip: true,
            color: theme.palette.text.secondary,
            maxRotation: 0,
            maxTicksLimit: 10,
            minRotation: 0,
          },
        },
        y: {
          beginAtZero: true,
          border: { display: false },
          grid: { color: theme.palette.divider },
          ticks: {
            color: theme.palette.text.secondary,
            maxTicksLimit: 5,
            callback: (value) => currency.format(Number(value)),
          },
        },
      },
    }),
    [theme]
  );

  return (
    <Card sx={{ height: "100%" }}>
      <MDBox p={3} pb={hasReceipts ? 1 : 3}>
        <MDTypography variant="h6" fontWeight="medium">
          Evolução diária dos recebimentos
        </MDTypography>
        <MDTypography variant="button" color="text">
          {periodLabel}
        </MDTypography>

        {loading && (
          <MDBox mt={3}>
            <MDTypography variant="button" color="text">
              Carregando...
            </MDTypography>
          </MDBox>
        )}

        {!loading && !hasReceipts && (
          <MDBox mt={3}>
            <MDTypography variant="button" color="text">
              Nenhum recebimento no período selecionado.
            </MDTypography>
          </MDBox>
        )}
      </MDBox>

      {!loading && hasReceipts && (
        <MDBox px={{ xs: 1, sm: 3 }} pb={3} height={320}>
          <Line data={chartData} options={chartOptions} />
        </MDBox>
      )}
    </Card>
  );
}

export default RevenueEvolutionChart;
