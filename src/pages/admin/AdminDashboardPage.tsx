import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
	getAdminOverview,
	getAdminInvestorAccounts,
	getAdminOrders,
	getAdminStocks,
	getAdminUsers,
	type AdminOverviewAccount,
} from "../../services/paperTradingService";

function AdminDashboardPage() {
	const { t } = useTranslation("common");
	const [stats, setStats] = useState({
		users: 0,
		investors: 0,
		traders: 0,
		admins: 0,
		stocks: 0,
		orders: 0,
		holdings: 0,
		cash: 0,
		portfolioValue: 0,
		pnl: 0,
	});
	const [overviewUsers, setOverviewUsers] = useState<AdminOverviewAccount[]>([]);
	const [error, setError] = useState("");
	const formatMoney = (amount: number) =>
		`₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

	useEffect(() => {
		let isMounted = true;
		const refresh = async () => {
			try {
				const persistedOverview = await getAdminOverview();
				if (isMounted) {
					if (persistedOverview) {
						setStats(persistedOverview.metrics);
						setOverviewUsers(persistedOverview.accounts);
					} else {
						const [users, accounts, stocks, orders] = await Promise.all([
							getAdminUsers(),
							getAdminInvestorAccounts(),
							getAdminStocks(),
							getAdminOrders(),
						]);
						const accountsByKey = new Map(
							accounts.map((account) => [
								`${account.role}:${account.email.toLowerCase()}`,
								account,
							])
						);
						const usersByKey = new Map<string, AdminOverviewAccount>();
						for (const user of users) {
							const key = `${user.role}:${user.email.toLowerCase()}`;
							const account = accountsByKey.get(key);
							usersByKey.set(key, {
								first_name: user.first_name,
								last_name: user.last_name,
								email: user.email,
								role: user.role,
								cashBalance: account?.cashBalance ?? null,
								currentValue: account?.currentValue ?? null,
								totalPnl: account?.totalPnl ?? null,
								openPositionCount: account?.openPositionCount ?? null,
								orderCount: account?.orders.length ?? null,
							});
						}
						for (const account of accounts) {
							const key = `${account.role}:${account.email.toLowerCase()}`;
							if (usersByKey.has(key)) continue;
							const [first_name = "", ...lastNameParts] = account.name.trim().split(/\s+/);
							usersByKey.set(key, {
								first_name: first_name || account.email.split("@")[0],
								last_name: lastNameParts.join(" "),
								email: account.email,
								role: account.role,
								cashBalance: account.cashBalance,
								currentValue: account.currentValue,
								totalPnl: account.totalPnl,
								openPositionCount: account.openPositionCount,
								orderCount: account.orders.length,
							});
						}
						const rows = [...usersByKey.values()];
						setStats({
							users: rows.length,
							investors: rows.filter((user) => user.role === "investor").length,
							traders: rows.filter((user) => user.role === "trader").length,
							admins: rows.filter((user) => user.role === "admin").length,
							stocks: stocks.length,
							orders: orders.length,
							holdings: accounts.reduce((sum, account) => sum + account.openPositionCount, 0),
							cash: accounts.reduce((sum, account) => sum + account.cashBalance, 0),
							portfolioValue: accounts.reduce((sum, account) => sum + account.currentValue, 0),
							pnl: accounts.reduce((sum, account) => sum + account.totalPnl, 0),
						});
						setOverviewUsers(rows);
					}
					setError("");
				}
			} catch (caughtError) {
				if (isMounted) {
					setError(caughtError instanceof Error ? caughtError.message : "Overview data could not be loaded.");
				}
			}
		};
		void refresh();
		const intervalId = window.setInterval(() => void refresh(), 5000);
		return () => {
			isMounted = false;
			window.clearInterval(intervalId);
		};
	}, []);

	return (
		<section>
			<header className="admin-page-head">
				<div>
					<h1>{t("adminOverview")}</h1>
					<p>{t("adminOverviewLead")}</p>
				</div>
			</header>
			{error && <p role="alert" className="investor-error">{error}</p>}

			<div className="admin-stat-grid">
				<article className="admin-stat">
					<p>{t("adminUsers")}</p>
					<strong>{stats.users}</strong>
					<span>
						{stats.investors} {t("investor")} · {stats.traders} {t("trader")}
					</span>
				</article>
				<article className="admin-stat">
					<p>{t("adminStocks")}</p>
					<strong>{stats.stocks}</strong>
					<span>{t("adminListedSymbols")}</span>
				</article>
				<article className="admin-stat">
					<p>{t("adminOrders")}</p>
					<strong>{stats.orders}</strong>
					<span>
						{stats.holdings} {t("holdings")}
					</span>
				</article>
				<article className="admin-stat">
					<p>{t("admin")}</p>
					<strong>{stats.admins}</strong>
					<span>{t("adminAccounts")}</span>
				</article>
				<article className="admin-stat">
					<p>Trader + investor cash</p>
					<strong>₹{stats.cash.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</strong>
					<span>Sum of member balances</span>
				</article>
				<article className="admin-stat">
					<p>Net holdings exposure</p>
					<strong>₹{stats.portfolioValue.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</strong>
					<span>Long holdings less short liabilities</span>
				</article>
				<article className="admin-stat">
					<p>Member total P&amp;L</p>
					<strong>₹{stats.pnl.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</strong>
					<span>Realized + unrealized</span>
				</article>
			</div>

			<div className="admin-quick-links">
				<NavLink to="/admin/users">{t("adminManageUsers")}</NavLink>
				<NavLink to="/admin/stocks">{t("adminManageStocks")}</NavLink>
				<NavLink to="/admin/orders">{t("adminViewOrders")}</NavLink>
			</div>

			<h2 className="admin-subhead">Account overview</h2>
			<div className="admin-table-wrap">
				<table className="admin-table">
					<thead>
						<tr>
							<th>{t("adminName")}</th>
							<th>{t("email")}</th>
							<th>{t("accountType")}</th>
							<th>Available cash</th>
							<th>Holdings value</th>
							<th>Total P&amp;L</th>
							<th>Open holdings</th>
							<th>Orders</th>
						</tr>
					</thead>
					<tbody>
						{overviewUsers.length === 0 ? (
							<tr><td colSpan={8}>No database accounts found.</td></tr>
						) : overviewUsers.map((user) => (
							<tr key={`${user.role}:${user.email}`}>
								<td>{`${user.first_name} ${user.last_name}`.trim() || "—"}</td>
								<td>{user.email}</td>
								<td>{user.role}</td>
								<td>{user.cashBalance === null ? "—" : formatMoney(user.cashBalance)}</td>
								<td>{user.currentValue === null ? "—" : formatMoney(user.currentValue)}</td>
								<td>{user.totalPnl === null ? "—" : formatMoney(user.totalPnl)}</td>
								<td>{user.openPositionCount ?? "—"}</td>
								<td>{user.orderCount ?? "—"}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

		</section>
	);
}

export default AdminDashboardPage;
