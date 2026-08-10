import { FormEvent, SyntheticEvent, useEffect, useMemo, useState } from "react";

import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";

import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";
import { useUser } from "context/user.context";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import {
  Comanda,
  ComandaItem,
  FormaPagamento,
  Produto,
  TipoMedidaVenda,
  comandasApi,
  getApiErrorMessage,
  produtosApi,
} from "services/adega";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const comandaDate = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
});
const comandaShortDate = new Intl.DateTimeFormat("pt-BR");
const paymentDateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});
const paymentMethodLabels: Record<FormaPagamento, string> = {
  DINHEIRO: "Dinheiro",
  PIX: "PIX",
  CARTAO_DEBITO: "Cartão de débito",
  CARTAO_CREDITO: "Cartão de crédito",
  OUTRO: "Outro",
  NAO_INFORMADA: "Não informada",
};
const paymentMethodOptions: FormaPagamento[] = [
  "PIX",
  "DINHEIRO",
  "CARTAO_DEBITO",
  "CARTAO_CREDITO",
  "OUTRO",
];
const normalizeSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();

type ItemDraft = {
  produto: Produto;
  quantidade: number;
  tipoMedida: TipoMedidaVenda;
};
type ComandaEntry = {
  key: string;
  items: ComandaItem[];
  grouped: boolean;
};
type ComandaDayGroup = {
  key: string;
  label: string;
  copyLabel: string;
  subtotal: number;
  entries: ComandaEntry[];
};
type ComandaDisplayItem =
  | { type: "day"; key: string; dayGroup: ComandaDayGroup }
  | { type: "entry"; key: string; entry: ComandaEntry };
type LoadingAction =
  | "open"
  | "add"
  | "update"
  | "partial-payment"
  | "close-paga"
  | "close-fiado"
  | "delete-comanda"
  | `increment-${string}`
  | `delete-${string}`;
type ComandasTab = "ABERTA" | "FIADO";

function Comandas() {
  const { isGestor } = useUser();
  const [comandasAbertas, setComandasAbertas] = useState<Comanda[]>([]);
  const [comandasFiado, setComandasFiado] = useState<Comanda[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [selectedUuid, setSelectedUuid] = useState("");
  const [comandasTab, setComandasTab] = useState<ComandasTab>("ABERTA");
  const [filtroAbertas, setFiltroAbertas] = useState("");
  const [filtroFiado, setFiltroFiado] = useState("");
  const [novoResponsavel, setNovoResponsavel] = useState("");
  const [itemDrafts, setItemDrafts] = useState<ItemDraft[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [editingItem, setEditingItem] = useState<ComandaItem | null>(null);
  const [editProdutoUuid, setEditProdutoUuid] = useState("");
  const [editQuantidade, setEditQuantidade] = useState(1);
  const [editTipoMedida, setEditTipoMedida] =
    useState<TipoMedidaVenda>("UNIDADE");
  const [partialPaymentDialog, setPartialPaymentDialog] = useState(false);
  const [partialPaymentValue, setPartialPaymentValue] = useState("");
  const [partialPaymentMethod, setPartialPaymentMethod] =
    useState<FormaPagamento>("PIX");
  const [closingDialog, setClosingDialog] = useState(false);
  const [closingPaymentMethod, setClosingPaymentMethod] =
    useState<FormaPagamento>("PIX");
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteObservation, setDeleteObservation] = useState("");
  const [error, setError] = useState("");
  const [copiedComanda, setCopiedComanda] = useState(false);
  const [loadingAction, setLoadingAction] = useState<LoadingAction | null>(
    null
  );

  const selectedComanda = useMemo(() => {
    const comandasDaAba =
      comandasTab === "ABERTA" ? comandasAbertas : comandasFiado;
    return (
      comandasDaAba.find((comanda) => comanda.uuid === selectedUuid) ||
      comandasDaAba[0]
    );
  }, [comandasAbertas, comandasFiado, comandasTab, selectedUuid]);

  const comandasAbertasFiltradas = useMemo(() => {
    const filtro = normalizeSearch(filtroAbertas);
    if (!filtro) return comandasAbertas;

    return comandasAbertas.filter((comanda) =>
      normalizeSearch(comanda.nomeResponsavel).includes(filtro)
    );
  }, [comandasAbertas, filtroAbertas]);

  const comandasFiadoFiltradas = useMemo(() => {
    const filtro = normalizeSearch(filtroFiado);
    if (!filtro) return comandasFiado;

    return comandasFiado.filter((comanda) =>
      normalizeSearch(comanda.nomeResponsavel).includes(filtro)
    );
  }, [comandasFiado, filtroFiado]);

  const selectedEditProduto = produtos.find(
    (produto) => produto.uuid === editProdutoUuid
  );
  const selectedDraftProducts = itemDrafts.map((draft) => draft.produto);
  const actionLoading = Boolean(loadingAction);

  const comandaDayGroups = useMemo<ComandaDayGroup[]>(() => {
    if (!selectedComanda) return [];

    const itemsByDate = new Map<string, ComandaItem[]>();
    selectedComanda.itens.forEach((item) => {
      const dateKey = (item.dataAdicao || selectedComanda.dataAbertura).slice(
        0,
        10
      );
      const items = itemsByDate.get(dateKey) || [];
      items.push(item);
      itemsByDate.set(dateKey, items);
    });

    return [...itemsByDate.entries()]
      .sort(([firstDate], [secondDate]) => secondDate.localeCompare(firstDate))
      .map(([dateKey, dayItems]) => {
        const entries: ComandaEntry[] = [];
        const groupedEntries = new Map<string, ComandaEntry>();

        [...dayItems]
          .sort((first, second) =>
            (first.dataAdicao || "").localeCompare(second.dataAdicao || "")
          )
          .forEach((item) => {
            if (!item.grupoUuid) {
              entries.push({ key: item.uuid, items: [item], grouped: false });
              return;
            }

            const existing = groupedEntries.get(item.grupoUuid);
            if (existing) {
              existing.items.push(item);
              return;
            }

            const entry = {
              key: item.grupoUuid,
              items: [item],
              grouped: true,
            };
            groupedEntries.set(item.grupoUuid, entry);
            entries.push(entry);
          });

        const normalizedEntries = entries.map((entry) => {
          const items = [...entry.items].sort(
            (first, second) =>
              Number(first.ordemGrupo ?? 0) - Number(second.ordemGrupo ?? 0)
          );
          return {
            ...entry,
            items,
            grouped: entry.grouped && items.length > 1,
          };
        });
        const date = new Date(`${dateKey}T12:00:00`);
        const label = comandaDate.format(date);

        return {
          key: dateKey,
          label: label.charAt(0).toLocaleUpperCase("pt-BR") + label.slice(1),
          copyLabel: comandaShortDate.format(date),
          subtotal: dayItems.reduce(
            (total, item) => total + Number(item.subtotal),
            0
          ),
          entries: normalizedEntries,
        };
      });
  }, [selectedComanda]);

  const comandaDisplayItems = useMemo<ComandaDisplayItem[]>(
    () =>
      comandaDayGroups.flatMap((dayGroup) => [
        { type: "day", key: `day-${dayGroup.key}`, dayGroup },
        ...dayGroup.entries.map((entry) => ({
          type: "entry" as const,
          key: `entry-${entry.key}`,
          entry,
        })),
      ]),
    [comandaDayGroups]
  );

  const editProdutoOptions = useMemo(() => {
    if (!editingItem?.grupoUuid || !selectedComanda) return produtos;

    const produtosDoMesmoGrupo = new Set(
      selectedComanda.itens
        .filter(
          (item) =>
            item.grupoUuid === editingItem.grupoUuid &&
            item.uuid !== editingItem.uuid
        )
        .map((item) => item.produtoUuid)
    );
    return produtos.filter(
      (produto) => !produtosDoMesmoGrupo.has(produto.uuid)
    );
  }, [editingItem, produtos, selectedComanda]);

  const updateComandaState = (updated: Comanda) => {
    setComandasAbertas((current) =>
      updated.status === "ABERTA"
        ? current.map((comanda) =>
            comanda.uuid === updated.uuid ? updated : comanda
          )
        : current.filter((comanda) => comanda.uuid !== updated.uuid)
    );
    setComandasFiado((current) =>
      updated.status === "FIADO"
        ? current.map((comanda) =>
            comanda.uuid === updated.uuid ? updated : comanda
          )
        : current.filter((comanda) => comanda.uuid !== updated.uuid)
    );
  };

  const loadData = async () => {
    setError("");
    try {
      const [abertasData, fiadoData, produtosData] = await Promise.all([
        comandasApi.list("ABERTA", { tamanho: 200 }),
        comandasApi.list("FIADO", { tamanho: 200 }),
        produtosApi.list(),
      ]);
      setComandasAbertas(abertasData);
      setComandasFiado(fiadoData);
      setProdutos(produtosData);
      if (!selectedUuid && abertasData[0]) {
        setSelectedUuid(abertasData[0].uuid);
      } else if (!selectedUuid && fiadoData[0]) {
        setComandasTab("FIADO");
        setSelectedUuid(fiadoData[0].uuid);
      }
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenComanda = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!novoResponsavel.trim()) return;

    setLoadingAction("open");
    setError("");
    try {
      const comanda = await comandasApi.open(novoResponsavel);
      setComandasAbertas((current) => [comanda, ...current]);
      setSelectedUuid(comanda.uuid);
      setComandasTab("ABERTA");
      setNovoResponsavel("");
    } catch (openError) {
      setError(getApiErrorMessage(openError));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleAddItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedComanda || itemDrafts.length === 0) return;

    setLoadingAction("add");
    setError("");
    try {
      const updated = await comandasApi.addItems(
        selectedComanda.uuid,
        itemDrafts.map((draft) => ({
          produtoUuid: draft.produto.uuid,
          quantidade: Number(draft.quantidade),
          tipoMedida: draft.tipoMedida,
        }))
      );
      updateComandaState(updated);
      setItemDrafts([]);
      setProdutos(await produtosApi.list());
    } catch (addError) {
      setError(getApiErrorMessage(addError));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSelectedProducts = (selectedProducts: Produto[]) => {
    setItemDrafts((current) =>
      selectedProducts.map(
        (produto) =>
          current.find((draft) => draft.produto.uuid === produto.uuid) || {
            produto,
            quantidade: 1,
            tipoMedida: "UNIDADE",
          }
      )
    );
  };

  const updateItemDraft = (
    produtoUuid: string,
    changes: Partial<Pick<ItemDraft, "quantidade" | "tipoMedida">>
  ) => {
    setItemDrafts((current) =>
      current.map((draft) =>
        draft.produto.uuid === produtoUuid ? { ...draft, ...changes } : draft
      )
    );
  };

  const toggleGroup = (grupoUuid: string) => {
    setExpandedGroups((current) =>
      current.includes(grupoUuid)
        ? current.filter((uuid) => uuid !== grupoUuid)
        : [...current, grupoUuid]
    );
  };

  const handleCopyComanda = async () => {
    if (!selectedComanda || !selectedIsFiado) return;

    const formatItem = (item: ComandaItem, prefix: string) => {
      const medida =
        item.tipoMedida === "CAIXA"
          ? item.quantidadePedida === 1
            ? "caixa"
            : "caixas"
          : item.quantidadePedida === 1
          ? "unidade"
          : "unidades";
      return `${prefix}${item.produtoNome}: ${
        item.quantidadePedida
      } ${medida} × ${currency.format(
        Number(item.valorUnitario)
      )} = ${currency.format(Number(item.subtotal))}`;
    };

    const lines = [
      `Comanda: ${selectedComanda.nomeResponsavel}`,
      "",
      "Lançamentos:",
    ];
    comandaDayGroups.forEach((dayGroup) => {
      lines.push("", `Data: ${dayGroup.copyLabel}`);
      dayGroup.entries.forEach((entry) => {
        if (entry.grouped) {
          lines.push(
            `- Combo: ${entry.items
              .map((item) => item.produtoNome)
              .join(" + ")}`
          );
          entry.items.forEach((item) => lines.push(formatItem(item, "  - ")));
        } else {
          lines.push(formatItem(entry.items[0], "- "));
        }
      });
      lines.push(`Subtotal do dia: ${currency.format(dayGroup.subtotal)}`);
    });
    const total = Number(selectedComanda.total || 0);
    const valorPago = Number(selectedComanda.valorPagoParcial || 0);
    const saldoPendente = Number(
      selectedComanda.saldoPendente ?? total - valorPago
    );

    lines.push("", `Total da comanda: ${currency.format(total)}`);
    if (valorPago > 0) {
      lines.push(
        `Valor pago: ${currency.format(valorPago)}`,
        `Saldo restante: ${currency.format(saldoPendente)}`
      );
    }

    try {
      const text = lines.join("\n");
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        const copied = document.execCommand("copy");
        textArea.remove();
        if (!copied) throw new Error("Copy command failed");
      }
      setCopiedComanda(true);
      window.setTimeout(() => setCopiedComanda(false), 2000);
    } catch {
      setError("Não foi possível copiar o texto da comanda.");
    }
  };

  const openEditItem = (item: ComandaItem) => {
    setEditingItem(item);
    setEditProdutoUuid(item.produtoUuid);
    setEditQuantidade(item.quantidadePedida);
    setEditTipoMedida(item.tipoMedida);
  };

  const closeEditItem = () => {
    setEditingItem(null);
    setEditProdutoUuid("");
    setEditQuantidade(1);
    setEditTipoMedida("UNIDADE");
  };

  const handleUpdateItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedComanda || !editingItem || !editProdutoUuid) return;

    setLoadingAction("update");
    setError("");
    try {
      const updated = await comandasApi.updateItem(
        selectedComanda.uuid,
        editingItem.uuid,
        {
          produtoUuid: editProdutoUuid,
          quantidade: Number(editQuantidade),
          tipoMedida: editTipoMedida,
        }
      );
      updateComandaState(updated);
      closeEditItem();
      setProdutos(await produtosApi.list());
    } catch (updateError) {
      setError(getApiErrorMessage(updateError));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDeleteItem = async (item: ComandaItem) => {
    if (!selectedComanda) return;

    setLoadingAction(`delete-${item.uuid}`);
    setError("");
    try {
      const updated = await comandasApi.deleteItem(
        selectedComanda.uuid,
        item.uuid
      );
      updateComandaState(updated);
      closeEditItem();
      setProdutos(await produtosApi.list());
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleIncrementItem = async (item: ComandaItem) => {
    if (!selectedComanda) return;

    setLoadingAction(`increment-${item.uuid}`);
    setError("");
    try {
      const updated = await comandasApi.updateItem(
        selectedComanda.uuid,
        item.uuid,
        {
          produtoUuid: item.produtoUuid,
          quantidade: Number(item.quantidadePedida) + 1,
          tipoMedida: item.tipoMedida,
        }
      );
      updateComandaState(updated);
      setProdutos(await produtosApi.list());
    } catch (incrementError) {
      setError(getApiErrorMessage(incrementError));
    } finally {
      setLoadingAction(null);
    }
  };

  const handlePartialPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedComanda) return;

    const valor = Number(partialPaymentValue);
    if (!valor || valor <= 0) return;

    setLoadingAction("partial-payment");
    setError("");
    try {
      const updated = await comandasApi.payPartial(
        selectedComanda.uuid,
        valor,
        partialPaymentMethod
      );
      updateComandaState(updated);
      setPartialPaymentDialog(false);
      setPartialPaymentValue("");
      setPartialPaymentMethod("PIX");
    } catch (paymentError) {
      setError(getApiErrorMessage(paymentError));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCloseComanda = async (status: "PAGA" | "FIADO") => {
    if (!selectedComanda) return;

    setLoadingAction(status === "PAGA" ? "close-paga" : "close-fiado");
    setError("");
    try {
      const updated = await comandasApi.close(
        selectedComanda.uuid,
        status,
        status === "PAGA" && selectedBalanceValue > 0
          ? closingPaymentMethod
          : undefined
      );
      const nextAbertas = comandasAbertas.filter(
        (comanda) => comanda.uuid !== selectedComanda.uuid
      );
      const fiadoSemComandaAtual = comandasFiado.filter(
        (comanda) => comanda.uuid !== selectedComanda.uuid
      );
      const nextFiado =
        status === "FIADO"
          ? [updated, ...fiadoSemComandaAtual]
          : fiadoSemComandaAtual;

      setComandasAbertas(nextAbertas);
      setComandasFiado(nextFiado);
      setSelectedUuid(
        status === "FIADO"
          ? updated.uuid
          : selectedIsFiado
          ? nextFiado[0]?.uuid || ""
          : nextAbertas[0]?.uuid || ""
      );
      if (status === "FIADO") setComandasTab("FIADO");
      setClosingDialog(false);
      setClosingPaymentMethod("PIX");
    } catch (closeError) {
      setError(getApiErrorMessage(closeError));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDeleteComanda = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedComanda || !deleteObservation.trim()) return;

    setLoadingAction("delete-comanda");
    setError("");
    try {
      await comandasApi.delete(selectedComanda.uuid, deleteObservation);
      const nextAbertas = comandasAbertas.filter(
        (comanda) => comanda.uuid !== selectedComanda.uuid
      );
      const nextFiado = comandasFiado.filter(
        (comanda) => comanda.uuid !== selectedComanda.uuid
      );
      setComandasAbertas(nextAbertas);
      setComandasFiado(nextFiado);
      setSelectedUuid(
        comandasTab === "ABERTA"
          ? nextAbertas[0]?.uuid || ""
          : nextFiado[0]?.uuid || ""
      );
      setDeleteDialog(false);
      setDeleteObservation("");
      setProdutos(await produtosApi.list());
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleTabChange = (_: SyntheticEvent, nextTab: ComandasTab) => {
    setComandasTab(nextTab);

    const comandasDaAba =
      nextTab === "ABERTA" ? comandasAbertas : comandasFiado;
    if (
      !comandasDaAba.some((comanda) => comanda.uuid === selectedComanda?.uuid)
    ) {
      setSelectedUuid(comandasDaAba[0]?.uuid || "");
    }
  };

  const draftsValidos = itemDrafts.every(
    (draft) =>
      draft.quantidade > 0 &&
      (draft.tipoMedida === "UNIDADE" || Boolean(draft.produto.valorCaixa))
  );
  const editMedidaDisponivel =
    editTipoMedida === "UNIDADE" || Boolean(selectedEditProduto?.valorCaixa);
  const selectedIsFiado = selectedComanda?.status === "FIADO";
  const selectedPaidValue = Number(selectedComanda?.valorPagoParcial || 0);
  const selectedBalanceValue = Number(
    selectedComanda?.saldoPendente ??
      Number(selectedComanda?.total || 0) - selectedPaidValue
  );
  const partialPaymentNumber = Number(partialPaymentValue);
  const totalPreview = itemDrafts.reduce((total, draft) => {
    const valor =
      draft.tipoMedida === "CAIXA"
        ? draft.produto.valorCaixa
        : draft.produto.valorUnidade;
    return total + Number(draft.quantidade) * Number(valor || 0);
  }, 0);
  const editTotalPreview =
    selectedEditProduto && editMedidaDisponivel
      ? Number(editQuantidade) *
        Number(
          editTipoMedida === "CAIXA"
            ? selectedEditProduto.valorCaixa
            : selectedEditProduto.valorUnidade
        )
      : 0;

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} lg={4}>
            <Card>
              <MDBox p={3}>
                <MDTypography variant="h5" fontWeight="medium" mb={2}>
                  Abrir comanda
                </MDTypography>
                <MDBox
                  component="form"
                  onSubmit={handleOpenComanda}
                  display="flex"
                  gap={1.5}
                >
                  <TextField
                    label="Responsável"
                    required
                    fullWidth
                    value={novoResponsavel}
                    onChange={(event) => setNovoResponsavel(event.target.value)}
                  />
                  <MDButton
                    type="submit"
                    variant="gradient"
                    color="info"
                    disabled={actionLoading && loadingAction !== "open"}
                    loading={loadingAction === "open"}
                    loadingText="Abrindo..."
                  >
                    Abrir
                  </MDButton>
                </MDBox>
              </MDBox>
            </Card>

            <MDBox mt={3}>
              <Card sx={{ borderRadius: 0, boxShadow: "none" }}>
                <Tabs
                  value={comandasTab}
                  onChange={handleTabChange}
                  variant="fullWidth"
                  aria-label="Visualização das comandas"
                  sx={{
                    minHeight: 54,
                    p: 0,
                    bgcolor: "transparent",
                    borderRadius: 0,
                    borderBottom: "1px solid #e5e7eb",
                    "& .MuiTabs-flexContainer": { height: 54 },
                    "& .MuiTabs-indicator": {
                      height: 3,
                      borderRadius: 0,
                      bgcolor: "info.main",
                      boxShadow: "none",
                    },
                  }}
                >
                  <Tab
                    id="comandas-tab-abertas"
                    aria-controls="comandas-panel-abertas"
                    value="ABERTA"
                    label="Abertas"
                    sx={{
                      minHeight: 54,
                      borderRadius: 0,
                      fontSize: "1rem",
                      fontWeight: 600,
                    }}
                  />
                  <Tab
                    id="comandas-tab-fiado"
                    aria-controls="comandas-panel-fiado"
                    value="FIADO"
                    label="Fiado"
                    sx={{
                      minHeight: 54,
                      borderRadius: 0,
                      fontSize: "1rem",
                      fontWeight: 600,
                    }}
                  />
                </Tabs>
              </Card>
            </MDBox>

            <MDBox
              id="comandas-panel-abertas"
              role="tabpanel"
              aria-labelledby="comandas-tab-abertas"
              mt={3}
              display={comandasTab === "ABERTA" ? "block" : "none"}
            >
              <Card>
                <MDBox p={3}>
                  <MDTypography
                    variant="h6"
                    fontWeight="medium"
                    mb={2}
                    display="none"
                  >
                    Comandas abertas
                  </MDTypography>
                  <TextField
                    label="Buscar comanda"
                    placeholder="Nome do responsável"
                    size="small"
                    fullWidth
                    value={filtroAbertas}
                    onChange={(event) => setFiltroAbertas(event.target.value)}
                    inputProps={{ "aria-label": "Buscar nas comandas abertas" }}
                    sx={{ mb: 2 }}
                  />
                  <MDBox display="flex" flexDirection="column" gap={1}>
                    {comandasAbertasFiltradas.map((comanda) => (
                      <MDButton
                        key={comanda.uuid}
                        variant={
                          selectedComanda?.uuid === comanda.uuid
                            ? "contained"
                            : "outlined"
                        }
                        color="info"
                        fullWidth
                        onClick={() => setSelectedUuid(comanda.uuid)}
                        sx={{
                          minHeight: 48,
                          justifyContent: "center",
                          bgcolor:
                            selectedComanda?.uuid === comanda.uuid
                              ? "info.main"
                              : "white",
                          borderColor:
                            selectedComanda?.uuid === comanda.uuid
                              ? "info.main"
                              : "#e5e7eb",
                          color:
                            selectedComanda?.uuid === comanda.uuid
                              ? "#ffffff !important"
                              : "#344767",
                          boxShadow:
                            selectedComanda?.uuid === comanda.uuid ? 2 : "none",
                          "&, & span, & p": {
                            color:
                              selectedComanda?.uuid === comanda.uuid
                                ? "#ffffff !important"
                                : "#344767 !important",
                          },
                          "&:hover": {
                            bgcolor:
                              selectedComanda?.uuid === comanda.uuid
                                ? "info.dark"
                                : "#f8fafc",
                            borderColor:
                              selectedComanda?.uuid === comanda.uuid
                                ? "info.dark"
                                : "#cbd5e1",
                          },
                        }}
                      >
                        <MDBox>
                          <MDTypography
                            variant="caption"
                            fontWeight="medium"
                            display="block"
                          >
                            {comanda.nomeResponsavel} -{" "}
                            {currency.format(Number(comanda.total || 0))}
                          </MDTypography>
                          {/*{Number(comanda.valorPagoParcial || 0) > 0 && (*/}
                          {/*  <MDTypography variant="caption" display="block">*/}
                          {/*    Pago {currency.format(Number(comanda.valorPagoParcial || 0))} | Restante{" "}*/}
                          {/*    {currency.format(Number(comanda.saldoPendente || 0))}*/}
                          {/*  </MDTypography>*/}
                          {/*)}*/}
                        </MDBox>
                      </MDButton>
                    ))}
                    {comandasAbertas.length === 0 && (
                      <MDTypography variant="button" color="text">
                        Nenhuma comanda aberta.
                      </MDTypography>
                    )}
                    {comandasAbertas.length > 0 &&
                      comandasAbertasFiltradas.length === 0 && (
                        <MDTypography variant="button" color="text">
                          Nenhuma comanda encontrada.
                        </MDTypography>
                      )}
                  </MDBox>
                </MDBox>
              </Card>
            </MDBox>

            <MDBox
              id="comandas-panel-fiado"
              role="tabpanel"
              aria-labelledby="comandas-tab-fiado"
              mt={3}
              display={comandasTab === "FIADO" ? "block" : "none"}
            >
              <Card>
                <MDBox p={3}>
                  <MDTypography
                    variant="h6"
                    fontWeight="medium"
                    mb={2}
                    display="none"
                  >
                    Comandas no fiado
                  </MDTypography>
                  <TextField
                    label="Buscar comanda"
                    placeholder="Nome do responsável"
                    size="small"
                    fullWidth
                    value={filtroFiado}
                    onChange={(event) => setFiltroFiado(event.target.value)}
                    inputProps={{
                      "aria-label": "Buscar nas comandas no fiado",
                    }}
                    sx={{ mb: 2 }}
                  />
                  <MDBox display="flex" flexDirection="column" gap={1}>
                    {comandasFiadoFiltradas.map((comanda) => (
                      <MDButton
                        key={comanda.uuid}
                        variant={
                          selectedComanda?.uuid === comanda.uuid
                            ? "contained"
                            : "outlined"
                        }
                        color="warning"
                        fullWidth
                        onClick={() => setSelectedUuid(comanda.uuid)}
                        sx={{
                          minHeight: 48,
                          justifyContent: "center",
                          bgcolor:
                            selectedComanda?.uuid === comanda.uuid
                              ? "#f59e0b"
                              : "white",
                          borderColor:
                            selectedComanda?.uuid === comanda.uuid
                              ? "#f59e0b"
                              : "#e5e7eb",
                          color:
                            selectedComanda?.uuid === comanda.uuid
                              ? "#ffffff !important"
                              : "#344767",
                          boxShadow:
                            selectedComanda?.uuid === comanda.uuid ? 2 : "none",
                          "&, & span, & p": {
                            color:
                              selectedComanda?.uuid === comanda.uuid
                                ? "#ffffff !important"
                                : "#344767 !important",
                          },
                          "&:hover": {
                            bgcolor:
                              selectedComanda?.uuid === comanda.uuid
                                ? "#d97706"
                                : "#f8fafc",
                            borderColor:
                              selectedComanda?.uuid === comanda.uuid
                                ? "#d97706"
                                : "#cbd5e1",
                          },
                        }}
                      >
                        <MDBox>
                          <MDTypography
                            variant="caption"
                            fontWeight="medium"
                            display="block"
                          >
                            {comanda.nomeResponsavel} -{" "}
                            {currency.format(Number(comanda.total || 0))}
                          </MDTypography>
                          {/*{Number(comanda.valorPagoParcial || 0) > 0 && (*/}
                          {/*  <MDTypography variant="caption" display="block">*/}
                          {/*    Pago {currency.format(Number(comanda.valorPagoParcial || 0))} | Restante{" "}*/}
                          {/*    {currency.format(Number(comanda.saldoPendente || 0))}*/}
                          {/*  </MDTypography>*/}
                          {/*)}*/}
                        </MDBox>
                      </MDButton>
                    ))}
                    {comandasFiado.length === 0 && (
                      <MDTypography variant="button" color="text">
                        Nenhuma comanda no fiado.
                      </MDTypography>
                    )}
                    {comandasFiado.length > 0 &&
                      comandasFiadoFiltradas.length === 0 && (
                        <MDTypography variant="button" color="text">
                          Nenhuma comanda encontrada.
                        </MDTypography>
                      )}
                  </MDBox>
                </MDBox>
              </Card>
            </MDBox>
          </Grid>

          <Grid item xs={12} lg={8}>
            <Card>
              <MDBox p={3}>
                <MDBox
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  gap={2}
                  mb={2}
                >
                  <MDBox>
                    <MDTypography variant="h5" fontWeight="medium">
                      {selectedComanda?.nomeResponsavel ||
                        "Selecione uma comanda"}
                    </MDTypography>
                    {selectedComanda && (
                      <Chip
                        size="small"
                        color={selectedIsFiado ? "warning" : "info"}
                        label={selectedIsFiado ? "Fiado" : "Aberta"}
                      />
                    )}
                  </MDBox>
                  {selectedComanda && (
                    <MDBox
                      display="flex"
                      gap={1}
                      flexWrap="wrap"
                      justifyContent="flex-end"
                    >
                      <MDButton
                        variant="outlined"
                        color="success"
                        disabled={actionLoading || selectedBalanceValue <= 0}
                        onClick={() => {
                          setPartialPaymentValue("");
                          setPartialPaymentDialog(true);
                        }}
                      >
                        Baixa parcial
                      </MDButton>
                      {selectedIsFiado && (
                        <MDButton
                          variant="outlined"
                          color="success"
                          disabled={actionLoading}
                          onClick={handleCopyComanda}
                        >
                          <Icon fontSize="small">
                            {copiedComanda ? "check" : "content_copy"}
                          </Icon>
                          &nbsp;{copiedComanda ? "Copiada" : "Copiar comanda"}
                        </MDButton>
                      )}
                      <MDButton
                        variant="gradient"
                        color="success"
                        disabled={actionLoading}
                        onClick={() => setClosingDialog(true)}
                      >
                        {selectedIsFiado ? "Marcar como paga" : "Fechar"}
                      </MDButton>
                      {/*<MDButton*/}
                      {/*  variant="outlined"*/}
                      {/*  color="error"*/}
                      {/*  disabled={actionLoading}*/}
                      {/*  onClick={() => {*/}
                      {/*    setDeleteObservation("");*/}
                      {/*    setDeleteDialog(true);*/}
                      {/*  }}*/}
                      {/*>*/}
                      {/*  Excluir*/}
                      {/*</MDButton>*/}
                    </MDBox>
                  )}
                </MDBox>

                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}

                {selectedComanda && (
                  <>
                    <MDBox component="form" onSubmit={handleAddItem} mb={3}>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12}>
                          <Autocomplete
                            multiple
                            openOnFocus
                            disableCloseOnSelect
                            options={produtos}
                            value={selectedDraftProducts}
                            getOptionLabel={(produto) =>
                              `${produto.nome} (${produto.quantidadeEstoqueUnidades} un.)`
                            }
                            isOptionEqualToValue={(option, value) =>
                              option.uuid === value.uuid
                            }
                            noOptionsText="Nenhum produto encontrado"
                            onChange={(_, selectedProducts) =>
                              handleSelectedProducts(selectedProducts)
                            }
                            renderTags={(selectedProducts, getTagProps) =>
                              selectedProducts.map((produto, index) => {
                                const { key, ...chipProps } = getTagProps({
                                  index,
                                });
                                return (
                                  <MDBox
                                    key={key}
                                    component="span"
                                    display="inline-flex"
                                    alignItems="center"
                                  >
                                    <Chip
                                      {...chipProps}
                                      label={produto.nome}
                                      size="small"
                                    />
                                    {index < selectedProducts.length - 1 && (
                                      <MDTypography
                                        component="span"
                                        variant="button"
                                        fontWeight="bold"
                                        mx={0.5}
                                      >
                                        +
                                      </MDTypography>
                                    )}
                                  </MDBox>
                                );
                              })
                            }
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="Produtos"
                                placeholder={
                                  itemDrafts.length === 0
                                    ? "Selecione um ou mais produtos"
                                    : ""
                                }
                                fullWidth
                              />
                            )}
                          />
                        </Grid>

                        {itemDrafts.map((draft) => (
                          <Grid item xs={12} key={draft.produto.uuid}>
                            <MDBox
                              p={1.5}
                              borderRadius="lg"
                              sx={{
                                border: "1px solid #e5e7eb",
                                bgcolor: "#f8fafc",
                              }}
                            >
                              <Grid container spacing={1.5} alignItems="center">
                                <Grid item xs={12} md={4}>
                                  <MDTypography
                                    variant="button"
                                    fontWeight="medium"
                                  >
                                    {draft.produto.nome}
                                  </MDTypography>
                                  <MDTypography
                                    variant="caption"
                                    color="text"
                                    display="block"
                                  >
                                    {draft.produto.quantidadeEstoqueUnidades}{" "}
                                    un. em estoque
                                  </MDTypography>
                                </Grid>
                                <Grid item xs={12} sm={4} md={2}>
                                  <TextField
                                    label="Qtd."
                                    type="number"
                                    required
                                    fullWidth
                                    inputProps={{ min: 1 }}
                                    value={draft.quantidade}
                                    onChange={(event) =>
                                      updateItemDraft(draft.produto.uuid, {
                                        quantidade: Number(event.target.value),
                                      })
                                    }
                                  />
                                </Grid>
                                <Grid item xs={12} sm={8} md={6}>
                                  <ToggleButtonGroup
                                    color="info"
                                    exclusive
                                    fullWidth
                                    value={draft.tipoMedida}
                                    onChange={(_, value) =>
                                      value &&
                                      updateItemDraft(draft.produto.uuid, {
                                        tipoMedida: value,
                                      })
                                    }
                                  >
                                    <ToggleButton value="UNIDADE">
                                      Unidade{" "}
                                      {currency.format(
                                        Number(draft.produto.valorUnidade)
                                      )}
                                    </ToggleButton>
                                    <ToggleButton
                                      value="CAIXA"
                                      disabled={!draft.produto.valorCaixa}
                                    >
                                      Caixa{" "}
                                      {draft.produto.valorCaixa
                                        ? currency.format(
                                            Number(draft.produto.valorCaixa)
                                          )
                                        : ""}
                                    </ToggleButton>
                                  </ToggleButtonGroup>
                                </Grid>
                              </Grid>
                            </MDBox>
                          </Grid>
                        ))}

                        <Grid item xs={12}>
                          <MDBox
                            display="flex"
                            justifyContent="space-between"
                            alignItems="center"
                            gap={2}
                            flexWrap="wrap"
                          >
                            <MDTypography variant="button" color="text">
                              Prévia: {currency.format(totalPreview)}
                            </MDTypography>
                            <MDButton
                              type="submit"
                              variant="gradient"
                              color="info"
                              disabled={
                                itemDrafts.length === 0 ||
                                !draftsValidos ||
                                (actionLoading && loadingAction !== "add")
                              }
                              loading={loadingAction === "add"}
                              loadingText="Adicionando..."
                            >
                              Adicionar
                            </MDButton>
                          </MDBox>
                        </Grid>
                      </Grid>
                    </MDBox>

                    <MDBox display="flex" flexDirection="column" gap={1.5}>
                      {comandaDisplayItems.map((displayItem) => {
                        if (displayItem.type === "day") {
                          const { dayGroup } = displayItem;
                          return (
                            <MDBox
                              key={displayItem.key}
                              display="flex"
                              justifyContent="space-between"
                              alignItems="center"
                              gap={2}
                              mt={1}
                              px={0.5}
                            >
                              <MDBox display="flex" alignItems="center" gap={1}>
                                <Icon color="info" fontSize="small">
                                  calendar_today
                                </Icon>
                                <MDTypography
                                  variant="button"
                                  fontWeight="bold"
                                >
                                  {dayGroup.label}
                                </MDTypography>
                              </MDBox>
                              <MDTypography
                                variant="caption"
                                color="text"
                                fontWeight="medium"
                              >
                                Subtotal: {currency.format(dayGroup.subtotal)}
                              </MDTypography>
                            </MDBox>
                          );
                        }

                        const { entry } = displayItem;
                        if (!entry.grouped) {
                          const item = entry.items[0];
                          return (
                            <MDBox
                              key={entry.key}
                              display="flex"
                              justifyContent="space-between"
                              alignItems="center"
                              p={2}
                              borderRadius="lg"
                              sx={{ border: "1px solid #e5e7eb" }}
                            >
                              <MDBox>
                                <MDTypography
                                  variant="button"
                                  fontWeight="medium"
                                >
                                  {item.produtoNome}
                                </MDTypography>
                                <MDTypography
                                  variant="caption"
                                  color="text"
                                  display="block"
                                >
                                  {item.quantidadePedida}{" "}
                                  {item.tipoMedida.toLowerCase()} -{" "}
                                  {item.unidadesDeduzidas} un. baixadas
                                </MDTypography>
                              </MDBox>
                              <MDBox display="flex" alignItems="center" gap={1}>
                                <MDTypography
                                  variant="button"
                                  fontWeight="medium"
                                >
                                  {currency.format(Number(item.subtotal))}
                                </MDTypography>
                                {!selectedIsFiado && (
                                  <MDBox display="flex" alignItems="center">
                                    <Tooltip title="Editar item">
                                      <IconButton
                                        color="info"
                                        size="small"
                                        disabled={actionLoading}
                                        onClick={() => openEditItem(item)}
                                      >
                                        <Icon fontSize="small">edit</Icon>
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip
                                      title={`Adicionar 1 ${
                                        item.tipoMedida === "CAIXA"
                                          ? "caixa"
                                          : "unidade"
                                      }`}
                                    >
                                      <IconButton
                                        color="success"
                                        size="small"
                                        disabled={actionLoading}
                                        aria-label={`Adicionar 1 ${
                                          item.tipoMedida === "CAIXA"
                                            ? "caixa"
                                            : "unidade"
                                        } de ${item.produtoNome}`}
                                        onClick={() =>
                                          handleIncrementItem(item)
                                        }
                                      >
                                        {loadingAction ===
                                        `increment-${item.uuid}` ? (
                                          <CircularProgress
                                            color="inherit"
                                            size={18}
                                          />
                                        ) : (
                                          <Icon fontSize="small">add</Icon>
                                        )}
                                      </IconButton>
                                    </Tooltip>
                                  </MDBox>
                                )}
                              </MDBox>
                            </MDBox>
                          );
                        }

                        const expanded = expandedGroups.includes(entry.key);
                        const subtotal = entry.items.reduce(
                          (total, item) => total + Number(item.subtotal),
                          0
                        );
                        return (
                          <MDBox
                            key={entry.key}
                            borderRadius="lg"
                            sx={{
                              border: "1px solid #dbeafe",
                              overflow: "hidden",
                            }}
                          >
                            <MDBox
                              display="flex"
                              justifyContent="space-between"
                              alignItems="center"
                              gap={2}
                              p={2}
                              sx={{ bgcolor: "#eff6ff" }}
                            >
                              <MDBox
                                display="flex"
                                alignItems="center"
                                minWidth={0}
                              >
                                <Tooltip
                                  title={
                                    expanded
                                      ? "Recolher combo"
                                      : "Ver componentes"
                                  }
                                >
                                  <IconButton
                                    color="info"
                                    size="small"
                                    onClick={() => toggleGroup(entry.key)}
                                    sx={{ mr: 1 }}
                                  >
                                    <Icon fontSize="small">
                                      {expanded ? "expand_less" : "expand_more"}
                                    </Icon>
                                  </IconButton>
                                </Tooltip>
                                <MDBox minWidth={0}>
                                  <MDTypography
                                    variant="button"
                                    fontWeight="bold"
                                  >
                                    {entry.items
                                      .map((item) => item.produtoNome)
                                      .join(" + ")}
                                  </MDTypography>
                                  <MDTypography
                                    variant="caption"
                                    color="text"
                                    display="block"
                                  >
                                    Combo com {entry.items.length} componentes
                                  </MDTypography>
                                </MDBox>
                              </MDBox>
                              <MDTypography variant="button" fontWeight="bold">
                                {currency.format(subtotal)}
                              </MDTypography>
                            </MDBox>
                            <Collapse
                              in={expanded}
                              timeout="auto"
                              unmountOnExit
                            >
                              <Divider />
                              <MDBox px={2}>
                                {entry.items.map((item, index) => (
                                  <MDBox
                                    key={item.uuid}
                                    display="flex"
                                    justifyContent="space-between"
                                    alignItems="center"
                                    gap={2}
                                    py={1.5}
                                    sx={{
                                      borderBottom:
                                        index < entry.items.length - 1
                                          ? "1px solid #e5e7eb"
                                          : "none",
                                    }}
                                  >
                                    <MDBox>
                                      <MDTypography
                                        variant="button"
                                        fontWeight="medium"
                                      >
                                        {item.produtoNome}
                                      </MDTypography>
                                      <MDTypography
                                        variant="caption"
                                        color="text"
                                        display="block"
                                      >
                                        {item.quantidadePedida}{" "}
                                        {item.tipoMedida.toLowerCase()} -{" "}
                                        {item.unidadesDeduzidas} un. baixadas
                                      </MDTypography>
                                    </MDBox>
                                    <MDBox
                                      display="flex"
                                      alignItems="center"
                                      gap={1}
                                    >
                                      <MDTypography
                                        variant="button"
                                        fontWeight="medium"
                                      >
                                        {currency.format(Number(item.subtotal))}
                                      </MDTypography>
                                      {!selectedIsFiado && (
                                        <MDBox
                                          display="flex"
                                          alignItems="center"
                                        >
                                          <Tooltip title="Editar componente">
                                            <IconButton
                                              color="info"
                                              size="small"
                                              disabled={actionLoading}
                                              onClick={() => openEditItem(item)}
                                            >
                                              <Icon fontSize="small">edit</Icon>
                                            </IconButton>
                                          </Tooltip>
                                          <Tooltip
                                            title={`Adicionar 1 ${
                                              item.tipoMedida === "CAIXA"
                                                ? "caixa"
                                                : "unidade"
                                            }`}
                                          >
                                            <IconButton
                                              color="success"
                                              size="small"
                                              disabled={actionLoading}
                                              aria-label={`Adicionar 1 ${
                                                item.tipoMedida === "CAIXA"
                                                  ? "caixa"
                                                  : "unidade"
                                              } de ${item.produtoNome}`}
                                              onClick={() =>
                                                handleIncrementItem(item)
                                              }
                                            >
                                              {loadingAction ===
                                              `increment-${item.uuid}` ? (
                                                <CircularProgress
                                                  color="inherit"
                                                  size={18}
                                                />
                                              ) : (
                                                <Icon fontSize="small">
                                                  add
                                                </Icon>
                                              )}
                                            </IconButton>
                                          </Tooltip>
                                        </MDBox>
                                      )}
                                    </MDBox>
                                  </MDBox>
                                ))}
                              </MDBox>
                            </Collapse>
                          </MDBox>
                        );
                      })}
                      {selectedComanda.itens.length === 0 && (
                        <MDTypography variant="button" color="text">
                          Nenhum item adicionado.
                        </MDTypography>
                      )}
                    </MDBox>

                    <MDBox
                      mt={3}
                      p={2}
                      borderRadius="lg"
                      sx={{
                        border:
                          selectedPaidValue > 0
                            ? "1px solid #22c55e"
                            : "1px solid #e5e7eb",
                        bgcolor: selectedPaidValue > 0 ? "#ecfdf5" : "#f8fafc",
                      }}
                    >
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                          <MDTypography
                            variant="caption"
                            color="text"
                            display="block"
                          >
                            Total
                          </MDTypography>
                          <MDTypography variant="h6" fontWeight="bold">
                            {currency.format(
                              Number(selectedComanda.total || 0)
                            )}
                          </MDTypography>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <MDTypography
                            variant="caption"
                            color="text"
                            display="block"
                          >
                            Pago parcial
                          </MDTypography>
                          <MDTypography
                            variant="h6"
                            fontWeight="bold"
                            sx={{ color: "#16a34a" }}
                          >
                            {currency.format(selectedPaidValue)}
                          </MDTypography>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <MDTypography
                            variant="caption"
                            color="text"
                            display="block"
                          >
                            Restante
                          </MDTypography>
                          <MDTypography variant="h6" fontWeight="bold">
                            {currency.format(selectedBalanceValue)}
                          </MDTypography>
                        </Grid>
                      </Grid>
                      {(selectedComanda.pagamentos || []).length > 0 && (
                        <MDBox mt={2} pt={2} sx={{ borderTop: "1px solid #d1fae5" }}>
                          <MDTypography variant="button" fontWeight="bold" display="block" mb={1}>
                            Histórico de recebimentos
                          </MDTypography>
                          {(selectedComanda.pagamentos || []).map((pagamento) => (
                            <MDBox
                              key={pagamento.uuid}
                              display="flex"
                              justifyContent="space-between"
                              alignItems={{ xs: "flex-start", sm: "center" }}
                              gap={1}
                              py={0.75}
                              flexDirection={{ xs: "column", sm: "row" }}
                            >
                              <MDBox>
                                <MDTypography variant="button" fontWeight="medium" display="block">
                                  {paymentMethodLabels[pagamento.formaPagamento]}
                                </MDTypography>
                                <MDTypography variant="caption" color="text" display="block">
                                  {paymentDateTime.format(new Date(pagamento.dataPagamento))} ·{" "}
                                  {pagamento.usuarioNome}
                                </MDTypography>
                              </MDBox>
                              <MDTypography variant="button" fontWeight="bold" sx={{ color: "#16a34a" }}>
                                {currency.format(Number(pagamento.valor))}
                              </MDTypography>
                            </MDBox>
                          ))}
                        </MDBox>
                      )}
                    </MDBox>
                  </>
                )}
              </MDBox>
            </Card>
          </Grid>
        </Grid>
      </MDBox>

      <Dialog
        open={partialPaymentDialog}
        onClose={() => !actionLoading && setPartialPaymentDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <MDBox component="form" onSubmit={handlePartialPayment}>
          <DialogTitle>Baixa parcial</DialogTitle>
          <DialogContent>
            <MDBox mb={2}>
              <MDTypography variant="button" color="text" display="block">
                Total: {currency.format(Number(selectedComanda?.total || 0))}
              </MDTypography>
              <MDTypography variant="button" color="text" display="block">
                Já pago: {currency.format(selectedPaidValue)}
              </MDTypography>
              <MDTypography variant="button" fontWeight="bold" display="block">
                Restante: {currency.format(selectedBalanceValue)}
              </MDTypography>
            </MDBox>
            <TextField
              label="Valor pago"
              type="number"
              required
              fullWidth
              inputProps={{ min: 0.01, max: selectedBalanceValue, step: 0.01 }}
              value={partialPaymentValue}
              onChange={(event) => setPartialPaymentValue(event.target.value)}
              error={partialPaymentNumber > selectedBalanceValue}
              helperText={
                partialPaymentNumber > selectedBalanceValue
                  ? "O valor não pode ultrapassar o saldo restante."
                  : ""
              }
            />
            <TextField
              select
              label="Forma de pagamento"
              required
              fullWidth
              value={partialPaymentMethod}
              onChange={(event) =>
                setPartialPaymentMethod(event.target.value as FormaPagamento)
              }
              sx={{ mt: 2 }}
            >
              {paymentMethodOptions.map((method) => (
                <MenuItem key={method} value={method}>
                  {paymentMethodLabels[method]}
                </MenuItem>
              ))}
            </TextField>
          </DialogContent>
          <DialogActions>
            <MDButton
              variant="text"
              color="secondary"
              disabled={actionLoading}
              onClick={() => setPartialPaymentDialog(false)}
            >
              Cancelar
            </MDButton>
            <MDButton
              type="submit"
              variant="gradient"
              color="success"
              disabled={
                !partialPaymentNumber ||
                partialPaymentNumber <= 0 ||
                partialPaymentNumber > selectedBalanceValue ||
                (actionLoading && loadingAction !== "partial-payment")
              }
              loading={loadingAction === "partial-payment"}
              loadingText="Salvando..."
            >
              Confirmar
            </MDButton>
          </DialogActions>
        </MDBox>
      </Dialog>

      <Dialog
        open={deleteDialog}
        onClose={() => !actionLoading && setDeleteDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <MDBox component="form" onSubmit={handleDeleteComanda}>
          <DialogTitle>Excluir comanda</DialogTitle>
          <DialogContent>
            <MDBox mb={2}>
              <MDTypography variant="button" color="text" display="block">
                {selectedComanda?.nomeResponsavel}
              </MDTypography>
              <MDTypography variant="button" color="text" display="block">
                Total: {currency.format(Number(selectedComanda?.total || 0))}
              </MDTypography>
              {selectedPaidValue > 0 && (
                <MDTypography
                  variant="button"
                  display="block"
                  sx={{ color: "#16a34a" }}
                >
                  Pago parcial: {currency.format(selectedPaidValue)}
                </MDTypography>
              )}
            </MDBox>
            <TextField
              label="Motivo da exclusão"
              required
              fullWidth
              multiline
              minRows={3}
              inputProps={{ maxLength: 500 }}
              value={deleteObservation}
              onChange={(event) => setDeleteObservation(event.target.value)}
              helperText={`${deleteObservation.length}/500`}
            />
          </DialogContent>
          <DialogActions>
            <MDButton
              variant="text"
              color="secondary"
              disabled={actionLoading}
              onClick={() => setDeleteDialog(false)}
            >
              Cancelar
            </MDButton>
            <MDButton
              type="submit"
              variant="gradient"
              color="error"
              disabled={
                !deleteObservation.trim() ||
                (actionLoading && loadingAction !== "delete-comanda")
              }
              loading={loadingAction === "delete-comanda"}
              loadingText="Excluindo..."
            >
              Excluir
            </MDButton>
          </DialogActions>
        </MDBox>
      </Dialog>

      <Dialog
        open={closingDialog}
        onClose={() => !actionLoading && setClosingDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {selectedIsFiado ? "Receber fiado" : "Fechar comanda"}
        </DialogTitle>
        <DialogContent>
          <MDTypography variant="button" color="text" display="block">
            Total: {currency.format(Number(selectedComanda?.total || 0))}
          </MDTypography>
          <MDTypography variant="button" color="text" display="block">
            Pago parcial: {currency.format(selectedPaidValue)}
          </MDTypography>
          <MDTypography variant="button" fontWeight="bold" display="block">
            Restante: {currency.format(selectedBalanceValue)}
          </MDTypography>
          {selectedBalanceValue > 0 && (
            <TextField
              select
              label="Forma de pagamento"
              required
              fullWidth
              value={closingPaymentMethod}
              onChange={(event) =>
                setClosingPaymentMethod(event.target.value as FormaPagamento)
              }
              sx={{ mt: 2 }}
            >
              {paymentMethodOptions.map((method) => (
                <MenuItem key={method} value={method}>
                  {paymentMethodLabels[method]}
                </MenuItem>
              ))}
            </TextField>
          )}
        </DialogContent>
        <DialogActions>
          <MDButton
            variant="text"
            color="secondary"
            disabled={actionLoading}
            onClick={() => setClosingDialog(false)}
          >
            Cancelar
          </MDButton>
          {isGestor && !selectedIsFiado && (
            <MDButton
              variant="contained"
              color="warning"
              disabled={actionLoading && loadingAction !== "close-fiado"}
              loading={loadingAction === "close-fiado"}
              loadingText="Salvando..."
              onClick={() => handleCloseComanda("FIADO")}
              sx={{
                minWidth: 96,
                bgcolor: "#f59e0b",
                color: "#ffffff !important",
                boxShadow: 2,
                "&:hover": {
                  bgcolor: "#d97706",
                },
                "&.Mui-disabled": {
                  bgcolor: "#f3f4f6",
                  color: "#9ca3af !important",
                },
              }}
            >
              Fiado
            </MDButton>
          )}
          <MDButton
            variant="gradient"
            color="success"
            disabled={actionLoading && loadingAction !== "close-paga"}
            loading={loadingAction === "close-paga"}
            loadingText="Salvando..."
            onClick={() => handleCloseComanda("PAGA")}
            sx={{ minWidth: 96 }}
          >
            Paga
          </MDButton>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(editingItem)}
        onClose={() => !actionLoading && closeEditItem()}
        maxWidth="sm"
        fullWidth
      >
        <MDBox component="form" onSubmit={handleUpdateItem}>
          <DialogTitle>Editar item</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} mt={0.5}>
              <Grid item xs={12}>
                <Autocomplete
                  openOnFocus
                  options={editProdutoOptions}
                  value={selectedEditProduto || null}
                  getOptionLabel={(produto) =>
                    `${produto.nome} (${produto.quantidadeEstoqueUnidades} un.)`
                  }
                  isOptionEqualToValue={(option, value) =>
                    option.uuid === value.uuid
                  }
                  noOptionsText="Nenhum produto encontrado"
                  onChange={(_, produto) =>
                    setEditProdutoUuid(produto?.uuid || "")
                  }
                  renderInput={(params) => (
                    <TextField {...params} label="Produto" required fullWidth />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Qtd."
                  type="number"
                  required
                  fullWidth
                  inputProps={{ min: 1 }}
                  value={editQuantidade}
                  onChange={(event) =>
                    setEditQuantidade(Number(event.target.value))
                  }
                />
              </Grid>
              <Grid item xs={12} sm={8}>
                <ToggleButtonGroup
                  color="info"
                  exclusive
                  fullWidth
                  value={editTipoMedida}
                  onChange={(_, value) => value && setEditTipoMedida(value)}
                >
                  <ToggleButton value="UNIDADE">
                    Unidade{" "}
                    {selectedEditProduto
                      ? currency.format(
                          Number(selectedEditProduto.valorUnidade)
                        )
                      : ""}
                  </ToggleButton>
                  <ToggleButton
                    value="CAIXA"
                    disabled={!selectedEditProduto?.valorCaixa}
                  >
                    Caixa{" "}
                    {selectedEditProduto?.valorCaixa
                      ? currency.format(Number(selectedEditProduto.valorCaixa))
                      : ""}
                  </ToggleButton>
                </ToggleButtonGroup>
              </Grid>
              <Grid item xs={12}>
                <MDTypography variant="button" color="text">
                  Prévia: {currency.format(editTotalPreview)}
                </MDTypography>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ justifyContent: "space-between" }}>
            <MDButton
              type="button"
              variant="outlined"
              color="error"
              disabled={actionLoading || !editingItem}
              loading={Boolean(
                editingItem && loadingAction === `delete-${editingItem.uuid}`
              )}
              loadingText="Excluindo..."
              onClick={() => editingItem && handleDeleteItem(editingItem)}
            >
              Excluir item
            </MDButton>
            <MDBox display="flex" gap={1}>
              <MDButton
                type="button"
                variant="text"
                color="secondary"
                disabled={actionLoading}
                onClick={closeEditItem}
              >
                Cancelar
              </MDButton>
              <MDButton
                type="submit"
                variant="gradient"
                color="info"
                disabled={
                  !editProdutoUuid ||
                  !editMedidaDisponivel ||
                  (actionLoading && loadingAction !== "update")
                }
                loading={loadingAction === "update"}
                loadingText="Salvando..."
              >
                Salvar
              </MDButton>
            </MDBox>
          </DialogActions>
        </MDBox>
      </Dialog>
      <Footer />
    </DashboardLayout>
  );
}

export default Comandas;
