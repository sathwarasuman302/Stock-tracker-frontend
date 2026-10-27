import { useContext, useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { StockItem } from "../data/stocks";
import { fetchLiveStocks } from "../services/marketApi";
import { AuthContext } from "../contexts/AuthContext";

const formatPrice = (value: number, exchange: string) =>
	`${exchange.toUpperCase() === "CRYPTO" ? "$" : "₹"}${value.toLocaleString(
		exchange.toUpperCase() === "CRYPTO" ? "en-US" : "en-IN",
		{
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
		}
	)}`;

const formatChange = (value: number) =>
	`${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

function HomePage() {
	const { t } = useTranslation("common");
	const { state } = useContext(AuthContext);
	const isAdmin = state.isAuthenticated && state.user?.role === "admin";
	const [stocks, setStocks] = useState<StockItem[]>([]);
	const [marketDataError, setMarketDataError] = useState(false);

	useEffect(() => {
		let isMounted = true;

		const loadStocks = async () => {
			try {
				const liveStocks = await fetchLiveStocks();
				if (isMounted) {
					setMarketDataError(false);
					setStocks(liveStocks);
				}
			} catch {
				if (isMounted) {
					setMarketDataError(true);
					setStocks([]);
				}
			}
		};

		loadStocks();
		const timer = window.setInterval(loadStocks, 5000);

		return () => {
			isMounted = false;
			window.clearInterval(timer);
		};
	}, []);

	return (
		<main className="jp-home">
			<section className="jp-hero" aria-label="Stock Tracker">
				<div className="jp-hero__media" aria-hidden="true">
					<img
						src="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=2000&q=80"
						alt=""
						className="jp-hero__image"
					/>
					<div className="jp-hero__veil" />
				</div>

				<div className="container jp-hero__content">
					<p className="jp-hero__brand">Stock Tracker</p>
					<h1 className="jp-hero__title">
						{t("homeHeroTitle")}
					</h1>
					<p className="jp-hero__lead">
						{t("homeHeroLead")}
					</p>
					<div className="jp-hero__actions">
						<NavLink className="jp-btn jp-btn--primary" to="/stocks">
							{t("browseStocks")}
						</NavLink>
						{isAdmin ? (
							<NavLink className="jp-btn jp-btn--ghost" to="/admin/stocks">
								{t("addStock")}
							</NavLink>
						) : null}
					</div>
				</div>
			</section>

			<section className="jp-section jp-featured">
				<div className="container">
					<header className="jp-section__intro">
						<h2>{t("featuredStocksTitle")}</h2>
						<p>{t("featuredStocksLead")}</p>
					</header>
					{marketDataError && (
						<p role="alert">Live market data is unavailable. Prices shown are placeholders, not live data.</p>
					)}

					<ul className="jp-job-list">
						{stocks.map((stock) => (
							<li key={stock.id}>
								<NavLink className="jp-job-row" to={`/stocks/${stock.id}`}>
									<div className="jp-job-row__main">
										<span className="jp-job-row__title">
											{t(stock.symbolKey)}
										</span>
										<span className="jp-job-row__meta">
											{formatPrice(stock.price, t(stock.exchangeKey))} · {t(stock.exchangeKey)} · {t(stock.sectorKey)}
										</span>
									</div>
									<span className="jp-job-row__type">
										{formatChange(stock.changePercent)}
									</span>
								</NavLink>
							</li>
						))}
					</ul>

					<div className="jp-section__footer">
						<NavLink className="jp-text-link" to="/stocks">
							{t("viewAllStocks")}
						</NavLink>
					</div>
				</div>
			</section>

			<section className="jp-section jp-investors">
				<div className="container jp-investors__inner">
					<div>
						<h2>{t("investorsTitle")}</h2>
						<p>{t("investorsLead")}</p>
					</div>
					<NavLink className="jp-btn jp-btn--primary" to="/register">
						{t("startTracking")}
					</NavLink>
				</div>
			</section>
		</main>
	);
}

export default HomePage;
