import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PageShell from "../components/PageShell";
import type { StockItem } from "../data/stocks";
import { fetchLiveStocks } from "../services/marketApi";
import { AuthContext } from "../contexts/AuthContext";
import { readStockWatchlist } from "../services/stockWatchlist";

function WatchlistPage() {
	const { t } = useTranslation("common");
	const { state: authState } = useContext(AuthContext);
	const [stocks, setStocks] = useState<StockItem[]>([]);
	const [marketDataError, setMarketDataError] = useState(false);
	const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
	const [watchlistError, setWatchlistError] = useState("");

	useEffect(() => {
		try {
			setFavoriteIds(readStockWatchlist(authState.user?.email));
			setWatchlistError("");
		} catch (error) {
			setFavoriteIds([]);
			setWatchlistError(error instanceof Error ? error.message : "Saved watchlist could not be loaded.");
		}
	}, [authState.user?.email]);

	useEffect(() => {
		let active = true;
		void fetchLiveStocks()
			.then((liveStocks) => {
				if (active) {
					setStocks(liveStocks);
					setMarketDataError(false);
				}
			})
			.catch(() => {
				if (active) {
					setStocks([]);
					setMarketDataError(true);
				}
			});
		return () => {
			active = false;
		};
	}, []);

	const watchlistIds = new Set(favoriteIds);
	const watchlist = stocks.filter((stock) => watchlistIds.has(stock.id));

	return (
		<PageShell title={t("watchlist")} lead={t("watchlistLead")}>
			{marketDataError && (
				<p role="alert">Live market data is unavailable. The watchlist could not be refreshed.</p>
			)}
			{watchlistError && <p role="alert">{watchlistError}</p>}
			<ul className="jp-job-list">
				{watchlist.map((stock) => (
					<li key={stock.id} className="jp-job-row">
						<div className="jp-job-row__main">
							<span className="jp-job-row__title">
								{t(stock.symbolKey)}
							</span>
							<span className="jp-job-row__meta">
								{t(stock.priceKey)} · {t(stock.exchangeKey)}
							</span>
						</div>
						<span className="jp-job-row__type">
							{t("addedToWatchlist")}
						</span>
					</li>
				))}
			</ul>
			{watchlist.length === 0 && !watchlistError && (
				<p>No liked stocks yet. Add stocks from the <Link to="/stocks">stocks page</Link>.</p>
			)}
		</PageShell>
	);
}

export default WatchlistPage;
