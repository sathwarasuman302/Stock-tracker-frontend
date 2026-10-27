import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import PageShell from "../components/PageShell";
import {
	getPaperOrders,
	getPaperPositions,
	type PaperOrder,
	type PaperPosition,
} from "../services/paperTradingService";

const formatMoney = (value: number) =>
	`₹${value.toLocaleString("en-IN", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;

function OrderHistoryPage() {
	const { t } = useTranslation("common");
	const [orders, setOrders] = useState<PaperOrder[]>([]);
	const [closedPositions, setClosedPositions] = useState<PaperPosition[]>([]);
	const [error, setError] = useState("");

	useEffect(() => {
		let isMounted = true;
		const refresh = async () => {
			try {
				const [nextOrders, positions] = await Promise.all([
					getPaperOrders(),
					getPaperPositions("CLOSED"),
				]);
				if (isMounted) {
					setOrders(nextOrders);
					setClosedPositions(positions);
					setError("");
				}
			} catch (caughtError) {
				if (isMounted) {
					setError(caughtError instanceof Error ? caughtError.message : "Orders could not be loaded.");
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
		<PageShell title={t("orderHistory")} lead={t("orderHistoryLead")}>
			{error && <p role="alert">{error}</p>}
			<h2>Closed Positions</h2>
			<div className="jp-table-wrap">
				<table className="jp-table">
					<thead>
						<tr>
							<th>{t("stockSymbol")}</th>
							<th>Direction</th>
							<th>Status</th>
							<th>Closed At</th>
							<th>Final Exit Price</th>
							<th>Realized P&amp;L</th>
						</tr>
					</thead>
					<tbody>
						{closedPositions.length === 0 ? (
							<tr><td colSpan={6}>No closed positions yet.</td></tr>
						) : closedPositions.map((position) => (
							<tr key={position.id}>
								<td>{position.symbol}</td>
								<td>{position.direction}</td>
								<td><span className="position-status position-status--closed">{position.status}</span></td>
								<td>{position.closedAt ? new Date(position.closedAt).toLocaleString() : "—"}</td>
								<td>{formatMoney(position.finalSellPrice ?? 0)}</td>
								<td>{formatMoney(position.realizedPnl)}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<h2>All Orders</h2>
			<div className="jp-table-wrap">
				<table className="jp-table">
					<thead>
						<tr>
							<th>{t("stockSymbol")}</th>
							<th>{t("adminSide")}</th>
							<th>{t("adminQuantity")}</th>
							<th>{t("adminPrice")}</th>
							<th>Total Value</th>
							<th>{t("adminTime")}</th>
							<th>Status</th>
							<th>Realized P&amp;L</th>
						</tr>
					</thead>
					<tbody>
						{orders.length === 0 ? (
							<tr>
								<td colSpan={8}>{t("adminNoOrders")}</td>
							</tr>
						) : (
							orders.map((order) => (
								<tr key={order.id}>
									<td>{order.symbol}</td>
									<td className={`jp-side jp-side--${order.side.toLowerCase()}`}>
										{order.side}
									</td>
									<td>{order.quantity}</td>
									<td>{formatMoney(order.price)}</td>
									<td>{formatMoney(order.totalValue)}</td>
									<td>{new Date(order.timestamp).toLocaleString()}</td>
									<td>{order.status}</td>
									<td>{formatMoney(order.realizedPnl)}</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</PageShell>
	);
}

export default OrderHistoryPage;
