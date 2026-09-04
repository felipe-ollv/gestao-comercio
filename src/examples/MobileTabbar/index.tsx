import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";

import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Paper from "@mui/material/Paper";

import { useUser } from "context/user.context";
import { AppRoute } from "routes";

type MobileTabbarProps = {
  routes: AppRoute[];
};

const routeLabels: Record<string, string> = {
  dashboard: "Início",
  comandas: "Comandas",
  produtos: "Produtos",
  usuarios: "Usuários",
  relatorios: "Relatórios",
};

function MobileTabbar({ routes }: MobileTabbarProps) {
  const { pathname } = useLocation();
  const { userData } = useUser();

  const groups = Array.isArray(userData?.groups)
    ? userData.groups
    : typeof userData?.groups === "string"
      ? [userData.groups]
      : [];
  const userRole = userData?.perfil || userData?.ts;

  const visibleRoutes = useMemo(
    () =>
      routes.filter((route) => {
        if (route.type !== "collapse" || !route.route) {
          return false;
        }

        return !route.roles?.length || route.roles.includes(userRole) || route.roles.some((role) => groups.includes(role));
      }),
    [groups, routes, userRole]
  );

  return (
    <Paper
      elevation={8}
      sx={{
        display: { xs: "block", lg: "none" },
        position: "fixed",
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 1300,
        borderTop: "1px solid",
        borderColor: "divider",
        pb: "env(safe-area-inset-bottom)",
      }}
    >
      <BottomNavigation
        showLabels
        value={visibleRoutes.some((route) => route.route === pathname) ? pathname : "/dashboard"}
        sx={(theme) => {
          const selectedColor = theme.palette.info.main;

          return {
            height: 68,
            "& .MuiBottomNavigationAction-root": {
              minWidth: 0,
              px: 0.5,
              color: "text.secondary",
            },
            "& .MuiBottomNavigationAction-root.Mui-selected": {
              color: `${selectedColor} !important`,
            },
            "& .MuiBottomNavigationAction-root.Mui-selected .MuiBottomNavigationAction-label": {
              color: `${selectedColor} !important`,
            },
            "& .MuiBottomNavigationAction-root.Mui-selected .MuiSvgIcon-root, & .MuiBottomNavigationAction-root.Mui-selected .material-icons": {
              color: `${selectedColor} !important`,
            },
            "& .MuiBottomNavigationAction-label": {
              fontSize: "0.68rem",
              lineHeight: 1.15,
              letterSpacing: 0,
              whiteSpace: "nowrap",
            },
          };
        }}
      >
        {visibleRoutes.map((route) => (
          <BottomNavigationAction
            key={route.key}
            component={Link}
            to={route.route || "/"}
            value={route.route}
            label={routeLabels[route.key] || route.name}
            icon={route.icon}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}

export default MobileTabbar;
