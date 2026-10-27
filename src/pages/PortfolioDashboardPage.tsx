import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import PageShell from "../components/PageShell";
import {
	getPaperOrders,
	getPaperPortfolio,
	type PortfolioSnapshot,
} from "../services/paperTradingService";
import "../assets/css/portfolio-dashboard.css";

const formatMoney = (value: number) =>
	`₹${value.toLocaleString("en-IN", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;

function PortfolioDashboardPage() {
	const { t } = useTranslation("common");
	const [portfolio, setPortfolio] = useState<PortfolioSnapshot | null>(null);
	const [orderCount, setOrderCount] = useState(0);
	const [error, setError] = useState("");

	useEffect(() => {
		let isMounted = true;
		const refresh = async () => {
			try {
				const [nextPortfolio, orders] = await Promise.all([
					getPaperPortfolio(),
					getPaperOrders(),
				]);
				if (isMounted) {
					setPortfolio(nextPortfolio);
					setOrderCount(orders.length);
					setError("");
				}
			} catch (caughtError) {
				if (isMounted) {
					setError(caughtError instanceof Error ? caughtError.message : "Holdings could not be loaded.");
				}
			}
		};
		void refresh();
		const intervalId = window.setInterval(() => void refresh(), 3000);
		return () => {
			isMounted = false;
			window.clearInterval(intervalId);
		};
	}, []);

	const holdings = portfolio?.positions ?? [];
	const summary = [
		{
			label: "Net market value",
			value: formatMoney(portfolio?.currentValue ?? 0),
			detail: "Current value of your holdings",
		},
		{
			label: "Total P&L",
			value: formatMoney(portfolio?.totalPnl ?? 0),
			detail: `${(portfolio?.totalPnlPercent ?? 0).toFixed(2)}% overall return`,
			trend: portfolio?.totalPnl ?? 0,
		},
		{
			label: "Invested amount",
			value: formatMoney(portfolio?.totalInvested ?? 0),
			detail: "Cost basis of open positions",
		},
		{
			label: "Available cash",
			value: formatMoney(portfolio?.cashBalance ?? 0),
			detail: "Ready to invest",
		},
	];

	return (
		<PageShell title={t("holdings")} lead={t("viewPortfolioLead")}>
			<div className="portfolio-dashboard">
				<section className="portfolio-summary" aria-label="Holdings summary">
					{summary.map((item) => (
						<article className="portfolio-summary__card" key={item.label}>
							<span>{item.label}</span>
							<strong className={item.trend === undefined ? "" : item.trend >= 0 ? "portfolio-positive" : "portfolio-negative"}>
								{item.value}
							</strong>
							<small>{item.detail}</small>
						</article>
					))}
				</section>

				<div className="portfolio-overview" aria-label="Additional holdings information">
					<div><span>Open holdings</span><strong>{holdings.length}</strong></div>
					<div><span>Closed positions</span><strong>{portfolio?.closedPositionCount ?? 0}</strong></div>
					<div><span>{t("orderHistory")}</span><strong>{orderCount}</strong></div>
					<div>
						<span>Unrealized P&amp;L</span>
						<strong className={(portfolio?.unrealizedPnl ?? 0) >= 0 ? "portfolio-positive" : "portfolio-negative"}>
							{formatMoney(portfolio?.unrealizedPnl ?? 0)}
						</strong>
					</div>
				</div>

				{error && <p className="portfolio-dashboard__error" role="alert">{error}</p>}

				<section className="portfolio-positions">
					<div className="portfolio-positions__heading">
						<div>
							<span className="portfolio-positions__eyebrow">YOUR INVESTMENTS</span>
							<h2>All holdings <span>{holdings.length}</span></h2>
						</div>
						<p>Live position performance</p>
					</div>
					<div className="jp-table-wrap portfolio-table-wrap">
						<table className="jp-table portfolio-table">
					<thead>
						<tr>
							<th>Stock</th>
							<th>Type</th>
							<th>Qty.</th>
							<th>Avg. price</th>
							<th>Market price</th>
							<th>Invested</th>
							<th>Current value</th>
							<th>Returns</th>
							<th>Trend</th>
						</tr>
					</thead>
					<tbody>
						{holdings.length === 0 ? (
							<tr>
								<td className="portfolio-table__empty" colSpan={9}>
									<strong>No holdings yet</strong>
									<span>Your investments will appear here after your first trade.</span>
								</td>
							</tr>
						) : (
							holdings.map((holding) => (
								<tr key={holding.symbol}>
									<td><strong className="portfolio-table__symbol">{holding.symbol}</strong></td>
									<td><span className={`portfolio-direction portfolio-direction--${holding.direction.toLowerCase()}`}>{holding.direction}</span></td>
									<td>{holding.quantity}</td>
									<td>{formatMoney(holding.averageBuyPrice)}</td>
									<td>{formatMoney(holding.currentPrice)}</td>
									<td>{formatMoney(holding.investedAmount)}</td>
									<td>{formatMoney(holding.currentValue)}</td>
									<td className={holding.unrealizedPnl >= 0 ? "portfolio-positive" : "portfolio-negative"}>
										<strong>{formatMoney(holding.unrealizedPnl)}</strong>
										<small>{holding.unrealizedPnlPercent.toFixed(2)}%</small>
									</td>
									<td>
										<span className={`portfolio-growth portfolio-growth--${holding.unrealizedPnlPercent > 0 ? "positive" : holding.unrealizedPnlPercent < 0 ? "negative" : "neutral"}`}>
											{t(holding.unrealizedPnlPercent > 0 ? "growing" : holding.unrealizedPnlPercent < 0 ? "declining" : "flat")}
										</span>
									</td>
								</tr>
							))
						)}
					</tbody>
						</table>
					</div>
				</section>
			</div>
		</PageShell>
	);
}

export default PortfolioDashboardPage;
