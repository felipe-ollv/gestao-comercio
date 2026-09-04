import { useState } from "react";
import { useLocation } from "react-router-dom";

import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Toolbar from "@mui/material/Toolbar";

import MDTypography from "components/MDTypography";
import { useUser } from "context/user.context";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/comandas": "Comandas",
  "/produtos": "Produtos",
  "/usuarios": "Usuarios",
  "/relatorios": "Relatórios",
};

function DashboardNavbar() {
  const { pathname } = useLocation();
  const { userData, logout } = useUser();
  const [logoutLoading, setLogoutLoading] = useState(false);

  const handleLogout = () => {
    setLogoutLoading(true);
    window.setTimeout(logout, 0);
  };

  return (
    <AppBar
      position="sticky"
      color="transparent"
      elevation={0}
      sx={{ backdropFilter: "blur(10px)", py: 1 }}
    >
      <Toolbar disableGutters sx={{ justifyContent: "space-between" }}>
        <MDTypography variant="h6" fontWeight="medium">
          {titles[pathname] || "Adega"}
        </MDTypography>
        <Box display="flex" alignItems="center" gap={1.25} minWidth={0}>
          <MDTypography
            variant="button"
            color="text"
            sx={{
              display: { xs: "none", sm: "block" },
              maxWidth: 220,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {userData?.nome || userData?.upn || userData?.sub || ""}
          </MDTypography>
          <Tooltip title="Sair">
            <IconButton
              color="inherit"
              size="small"
              aria-label="Sair"
              disabled={logoutLoading}
              onClick={handleLogout}
            >
              {logoutLoading ? (
                <CircularProgress color="inherit" size={18} />
              ) : (
                <Icon fontSize="small">logout</Icon>
              )}
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default DashboardNavbar;
