import { useMemo } from "react";

import Card from "@mui/material/Card";
import { useTheme } from "@mui/material/styles";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  ChartData,
  ChartOptions,
  LinearScale,
  Plugin,
  Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import { DashboardResumo, FormaPagamento } from "services/adega";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const paymentMethodConfig: Record<FormaPagamento, { label: string; color: string }> = {
  PIX: { label: "PIX", color: "#1A73E8" },
  DINHEIRO: { label: "Dinheiro", color: "#16A34A" },
  CARTAO_DEBITO: { label: "Débito", color: "#06B6D4" },
  CARTAO_CREDITO: { label: "Crédito", color: "#7C3AED" },
  OUTRO: { label: "Outro", color: "#64748B" },
  NAO_INFORMADA: { label: "Não informado", color: "#F59E0B" },
};

const paymentMethodOrder: FormaPagamento[] = [
  "PIX",
  "DINHEIRO",
  "CARTAO_DEBITO",
  "CARTAO_CREDITO",
  "OUTRO",
  "NAO_INFORMADA",
];

type PaymentMethodsChartProps = {
  loading: boolean;
  periodLabel: string;
  receipts: DashboardResumo["recebimentosPorForma"];
};

function PaymentMethodsChart({ loading, periodLabel, receipts }: PaymentMethodsChartProps) {
  const theme = useTheme();
  const payments = useMemo(
    () =>
      receipts
        .map((receipt) => ({
          ...receipt,
          total: Number(receipt.total),
          ...paymentMethodConfig[receipt.formaPagamento],
        }))
        .filter((receipt) => receipt.total > 0)
        .sort(
          (first, second) =>
            paymentMethodOrder.indexOf(first.formaPagamento) -
            paymentMethodOrder.indexOf(second.formaPagamento)
        ),
    [receipts]
  );

  const chartData = useMemo<ChartData<"bar", number[], string>>(
    () => ({
      labels: payments.map((payment) => payment.label),
      datasets: [
        {
          data: payments.map((payment) => payment.total),
          backgroundColor: payments.map((payment) => payment.color),
          borderRadius: 6,
          borderSkipped: "bottom",
          barPercentage: 0.7,
          categoryPercentage: 0.8,
          maxBarThickness: 52,
        },
      ],
    }),
    [payments]
  );

  const chartOptions = useMemo<ChartOptions<"bar">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 32, right: 12, left: 12 } },
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
            autoSkip: false,
            color: theme.palette.text.primary,
            maxRotation: 0,
            minRotation: 0,
            callback: function callback(value) {
              const label = this.getLabelForValue(Number(value));
              return label === "Não informado" ? ["Não", "informado"] : label;
            },
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

  const valueLabelsPlugin = useMemo<Plugin<"bar">>(
    () => ({
      id: "paymentValueLabels",
      afterDatasetsDraw: (chart) => {
        const dataset = chart.data.datasets[0];
        const metadata = chart.getDatasetMeta(0);
        const context = chart.ctx;

        context.save();
        context.fillStyle = theme.palette.text.primary;
        context.font = "500 11px Roboto, Helvetica, Arial, sans-serif";
        context.textAlign = "center";
        context.textBaseline = "bottom";

        metadata.data.forEach((bar, index) => {
          const position = bar.tooltipPosition();
          const value = Number(dataset.data[index] || 0);
          context.fillText(currency.format(value), position.x, position.y - 8);
        });

        context.restore();
      },
    }),
    [theme]
  );

  return (
    <Card>
      <MDBox p={3} pb={payments.length > 0 ? 1 : 3}>
        <MDTypography variant="h6" fontWeight="medium">
          Recebimentos por forma de pagamento
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

        {!loading && payments.length === 0 && (
          <MDBox mt={3}>
            <MDTypography variant="button" color="text">
              Nenhum recebimento no período selecionado.
            </MDTypography>
          </MDBox>
        )}
      </MDBox>

      {!loading && payments.length > 0 && (
        <MDBox px={{ xs: 1, sm: 3 }} pb={3} height={320}>
          <Bar data={chartData} options={chartOptions} plugins={[valueLabelsPlugin]} />
        </MDBox>
      )}
    </Card>
  );
}

export default PaymentMethodsChart;
