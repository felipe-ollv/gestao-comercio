import { ReactNode } from "react";

import Home from "layouts/home";
import Login from "layouts/login";
import Comandas from "layouts/comandas";
import Produtos from "layouts/produtos";
import Usuarios from "layouts/usuarios";
import Relatorios from "layouts/relatorios";

import Icon from "@mui/material/Icon";

export type AppRoute = {
  type?: string;
  name?: string;
  key: string;
  icon?: ReactNode;
  route?: string;
  component?: ReactNode;
  collapse?: AppRoute[];
  public?: boolean;
  roles?: string[];
};

const routes: AppRoute[] = [
  // ─── Rota pública ─────────────────────────────────────────────────────────
  {
    type: "route",
    name: "Login",
    key: "login",
    route: "/entrar",
    component: <Login />,
    public: true,
  },

  // ─── Rotas protegidas (sidebar) ───────────────────────────────────────────
  {
    type: "collapse",
    name: "Dashboard",
    key: "dashboard",
    icon: <Icon fontSize="small">home</Icon>,
    route: "/dashboard",
    component: <Home />,
  },
  {
    type: "collapse",
    name: "Comandas",
    key: "comandas",
    icon: <Icon fontSize="small">receipt_long</Icon>,
    route: "/comandas",
    component: <Comandas />,
  },
  {
    type: "collapse",
    name: "Produtos",
    key: "produtos",
    icon: <Icon fontSize="small">local_bar</Icon>,
    route: "/produtos",
    component: <Produtos />,
  },
  {
    type: "collapse",
    name: "Usuários",
    key: "usuarios",
    icon: <Icon fontSize="small">group</Icon>,
    route: "/usuarios",
    component: <Usuarios />,
    roles: ["GESTOR"],
  },
  {
    type: "collapse",
    name: "Relatórios",
    key: "relatorios",
    icon: <Icon fontSize="small">analytics</Icon>,
    route: "/relatorios",
    component: <Relatorios />,
    roles: ["GESTOR"],
  },
];

export default routes;
