import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	getAdminOrders,
	getAdminInvestorAccounts,
	type AdminInvestorAccount,
	type AdminOrder,
} from "../../services/paperTradingService";

function AdminOrdersPage() {
	const { t } = useTranslation("common");
	const [accounts, setAccounts] = useState<AdminInvestorAccount[]>([]);
	const [orders, setOrders] = useState<AdminOrder[]>([]);
	const [error, setError] = useState("");

	useEffect(() => {
		let isMounted = true;
		const refresh = async () => {
			try {
				const [nextAccounts, nextOrders] = await Promise.all([
					getAdminInvestorAccounts(),
					getAdminOrders(),
				]);
				if (isMounted) {
					setAccounts(nextAccounts);
					setOrders(nextOrders);
					setError("");
				}
			} catch (caughtError) {
				if (isMounted) {
					setError(caughtError instanceof Error ? caughtError.message : "Order data could not be loaded.");
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

	const holdings = accounts.flatMap((account) => account.positions.map((position) => ({
		...position,
		ownerName: account.name,
		ownerEmail: account.email,
		ownerRole: account.role,
	})));
	const closedPositions = accounts.flatMap((account) => account.closedPositions.map((position) => ({
		...position,
		ownerName: account.name,
		ownerEmail: account.email,
		ownerRole: account.role,
	})));
	const accountByEmail = new Map(accounts.map((account) => [
		`${account.role}:${account.email.toLowerCase()}`,
		account,
	]));
	const sortedOrders = [...orders].sort((a, b) => b.timestamp - a.timestamp);
	const formatMoney = (amount: number) => `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

	return (
		<section>
			<header className="admin-page-head">
				<div>
					<h1>{t("adminOrders")}</h1>
					<p>{t("adminOrdersLead")}</p>
				</div>
			</header>
			{error && <p role="alert" className="investor-error">{error}</p>}

			<h2 className="admin-subhead">{t("holdings")}</h2>
			<div className="admin-table-wrap">
				<table className="admin-table">
					<thead>
						<tr>
							<th>Account</th>
							<th>Role</th>
							<th>{t("stockSymbol")}</th>
							<th>Direction</th>
							<th>{t("adminQuantity")}</th>
							<th>Average entry</th>
							<th>Current price</th>
							<th>Current value</th>
							<th>Unrealized P&amp;L</th>
						</tr>
					</thead>
					<tbody>
						{holdings.length === 0 ? (
							<tr>
								<td colSpan={9}>{t("adminNoHoldings")}</td>
							</tr>
						) : (
							holdings.map((holding) => (
								<tr key={`${holding.ownerRole}:${holding.ownerEmail}:${holding.id}`}>
									<td>{holding.ownerName}<br /><small>{holding.ownerEmail}</small></td>
									<td>{holding.ownerRole}</td>
									<td>{holding.symbol}</td>
									<td>{holding.direction}</td>
									<td>{holding.quantity}</td>
									<td>{formatMoney(holding.averageBuyPrice)}</td>
									<td>{formatMoney(holding.currentPrice)}</td>
									<td>{formatMoney(holding.currentValue)}</td>
									<td>{formatMoney(holding.unrealizedPnl)}</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>

			<h2 className="admin-subhead">Closed positions</h2>
			<div className="admin-table-wrap">
				<table className="admin-table">
					<thead><tr><th>Account</th><th>Role</th><th>Stock</th><th>Direction</th><th>Closed at</th><th>Final exit price</th><th>Realized P&amp;L</th></tr></thead>
					<tbody>{closedPositions.length === 0 ? <tr><td colSpan={7}>No closed positions yet.</td></tr> : closedPositions.map((position) => <tr key={`${position.ownerRole}:${position.ownerEmail}:${position.id}`}><td>{position.ownerName}<br /><small>{position.ownerEmail}</small></td><td>{position.ownerRole}</td><td>{position.symbol}</td><td>{position.direction}</td><td>{position.closedAt ? new Date(position.closedAt).toLocaleString() : "—"}</td><td>{formatMoney(position.finalSellPrice ?? 0)}</td><td>{formatMoney(position.realizedPnl)}</td></tr>)}</tbody>
				</table>
			</div>

			<h2 className="admin-subhead">{t("adminRecentOrders")}</h2>
			<div className="admin-table-wrap">
				<table className="admin-table">
					<thead>
						<tr>
							<th>Account</th>
							<th>Role</th>
							<th>{t("stockSymbol")}</th>
							<th>{t("adminSide")}</th>
							<th>{t("adminQuantity")}</th>
							<th>{t("adminPrice")}</th>
							<th>Total value</th>
							<th>{t("adminTime")}</th>
							<th>Status</th>
							<th>Realized P&amp;L</th>
						</tr>
					</thead>
					<tbody>
						{sortedOrders.length === 0 ? (
							<tr>
								<td colSpan={10}>{t("adminNoOrders")}</td>
							</tr>
						) : (
							sortedOrders.map((order) => {
								const account = accountByEmail.get(`${order.ownerRole}:${order.ownerEmail.toLowerCase()}`);
								return (
									<tr key={order.id}>
										<td>{account?.name || order.ownerEmail || "Legacy account"}<br /><small>{order.ownerEmail}</small></td>
										<td>{order.ownerRole}</td>
										<td>{order.symbol}</td>
										<td className={`admin-side admin-side--${order.side.toLowerCase()}`}>
											{order.side}
										</td>
										<td>{order.quantity}</td>
										<td>{formatMoney(order.price)}</td>
										<td>{formatMoney(order.totalValue)}</td>
										<td>{new Date(order.timestamp).toLocaleString()}</td>
										<td>{order.status}</td>
										<td>{order.realizedPnl === 0 ? "—" : formatMoney(order.realizedPnl)}</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>
		</section>
	);
}

export default AdminOrdersPage;
