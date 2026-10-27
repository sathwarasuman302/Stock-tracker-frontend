import { useContext } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthContext } from "../../contexts/AuthContext";
import ThemeToggle from "../../components/ThemeToggle";
import "../../assets/css/admin-panel.css";

function AdminLayout() {
	const { t } = useTranslation("common");
	const navigate = useNavigate();
	const { state, authDispatch, ActionTypes } = useContext(AuthContext);
	const name =
		`${state.user?.first_name ?? ""} ${state.user?.last_name ?? ""}`.trim() ||
		state.user?.email ||
		t("admin");

	const handleLogout = () => {
		authDispatch({ type: ActionTypes.LOGOUT, payload: {} });
		navigate("/login", { replace: true });
	};

	return (
		<div className="admin-shell">
			<aside className="admin-sidebar">
				<NavLink className="admin-sidebar__brand" to="/admin">
					<img src="/Favicon.png" alt="" />
					<span>{t("adminPanel")}</span>
				</NavLink>
				<nav className="admin-sidebar__nav" aria-label={t("adminPanel")}>
					<NavLink to="/admin" end>
						{t("adminOverview")}
					</NavLink>
					<NavLink to="/admin/users">{t("adminUsers")}</NavLink>
					<NavLink to="/admin/stocks">{t("adminStocks")}</NavLink>
					<NavLink to="/admin/orders">{t("adminOrders")}</NavLink>
				</nav>
				<div className="admin-sidebar__footer">
					<NavLink to="/">{t("viewSite")}</NavLink>
					<button type="button" onClick={handleLogout}>
						{t("logOut")}
					</button>
				</div>
			</aside>
			<div className="admin-main">
				<header className="admin-topbar">
					<p className="admin-topbar__role">{t("admin")}</p>
					<p className="admin-topbar__user">{name}</p>
					<ThemeToggle />
				</header>
				<div className="admin-content">
					<Outlet />
				</div>
			</div>
		</div>
	);
}

export default AdminLayout;
