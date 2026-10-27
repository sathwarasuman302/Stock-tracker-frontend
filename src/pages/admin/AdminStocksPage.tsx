import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { featuredStocks } from "../../data/stocks";
import { fetchLiveStocks } from "../../services/marketApi";
import {
	deleteAdminStock,
	getAdminStockQuote,
	getAdminStocks,
	saveAdminStock,
	type AdminStockQuote,
} from "../../services/paperTradingService";
import {
	deleteAdminCoreStock,
	deleteAdminCatalogStock,
	saveAdminCoreStock,
	saveAdminCatalogStock,
	type AdminCatalogStock,
} from "../../services/adminStockCatalog";

type StockRow = AdminCatalogStock & {
	type: "Core" | "Custom";
	livePrice?: number;
	liveChangePercent?: number;
	dataSource?: "simulated" | "provider" | "delayed" | "fallback";
	lastUpdated?: number | null;
};

function AdminStocksPage() {
	const { t } = useTranslation("common");
	const [stocks, setStocks] = useState<StockRow[]>([]);
	const [editingStock, setEditingStock] = useState<StockRow | null>(null);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState("");
	const [marketDataError, setMarketDataError] = useState("");
	const [marketQuote, setMarketQuote] = useState<AdminStockQuote | null>(null);
	const [quoteLoading, setQuoteLoading] = useState(false);
	const [quoteError, setQuoteError] = useState("");
	const [form, setForm] = useState({
		symbol: "",
		exchange: "NSE",
		sector: "",
	});

	const refresh = async () => {
		const liveQuotesRequest: Promise<
			{ quotes: Awaited<ReturnType<typeof fetchLiveStocks>> } | { error: string }
		> = fetchLiveStocks().then(
			(quotes) => ({ quotes }),
			(error: unknown) => ({
				error: error instanceof Error ? error.message : "Live market data is unavailable.",
			})
		);
		const nextStocks = await getAdminStocks();
		setStocks(nextStocks.map((stock) => ({
			...stock,
			type: stock.id.startsWith("admin-") ? "Custom" : "Core",
		})));

		const quoteResult = await liveQuotesRequest;
		if ("error" in quoteResult) {
			setMarketDataError(quoteResult.error);
			return;
		}
		setMarketDataError("");
		const liveQuotes = quoteResult.quotes;
		const quoteById = new Map(liveQuotes.map((quote) => [quote.id, quote]));
		setStocks(nextStocks.map((stock) => {
			const quote = quoteById.get(stock.id);
			return {
			...stock,
			type: stock.id.startsWith("admin-") ? "Custom" : "Core",
			livePrice: quote?.price,
			liveChangePercent: quote?.changePercent,
			dataSource: quote?.dataSource,
			lastUpdated: quote?.lastUpdated,
			};
		}));
	};

	useEffect(() => {
		let active = true;
		const loadStocks = async () => {
			try {
				if (active) await refresh();
			} catch (error) {
				if (active) setSaveError(error instanceof Error ? error.message : "Unable to load stocks.");
			}
		};
		void loadStocks();
		const interval = window.setInterval(() => void loadStocks(), 60_000);
		return () => {
			active = false;
			window.clearInterval(interval);
		};
	}, []);

	useEffect(() => {
		const symbol = form.symbol.trim().toUpperCase();
		const exchange = form.exchange.trim().toUpperCase();
		setMarketQuote(null);
		setQuoteError("");
		if (!symbol) {
			setQuoteLoading(false);
			return;
		}
		if (!["NSE", "BSE"].includes(exchange)) {
			setQuoteLoading(false);
			setQuoteError("Select NSE or BSE to fetch a Yahoo Finance quote.");
			return;
		}

		let active = true;
		setQuoteLoading(true);
		const timeout = window.setTimeout(() => {
			void getAdminStockQuote(symbol, exchange)
				.then((quote) => {
					if (active) setMarketQuote(quote);
				})
				.catch((error: unknown) => {
					if (active) {
						setQuoteError(error instanceof Error ? error.message : "A Yahoo Finance quote could not be fetched.");
					}
				})
				.finally(() => {
					if (active) setQuoteLoading(false);
				});
		}, 450);
		return () => {
			active = false;
			window.clearTimeout(timeout);
		};
	}, [form.symbol, form.exchange]);

	const handleSubmit = async (event: FormEvent) => {
		event.preventDefault();
		if (
			!marketQuote ||
			marketQuote.symbol !== form.symbol.trim().toUpperCase() ||
			marketQuote.exchange !== form.exchange.trim().toUpperCase()
		) return;
		const stock = {
			id: editingStock?.id ?? `admin-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`,
			symbol: form.symbol,
			exchange: form.exchange,
			sector: form.sector.trim() || marketQuote.sector || "General",
			price: marketQuote.price,
			changePercent: marketQuote.changePercent,
		};
		setSaving(true);
		setSaveError("");
		try {
			const savedStock = await saveAdminStock(stock);
			if (editingStock?.type === "Core") {
				saveAdminCoreStock(stock);
			} else {
				saveAdminCatalogStock(stock);
			}
			setStocks((currentStocks) => [
				{ ...savedStock, type: savedStock.id.startsWith("admin-") ? "Custom" : "Core" },
				...currentStocks.filter((entry) => entry.id !== savedStock.id),
			]);
			setEditingStock(null);
			setForm({ symbol: "", exchange: "NSE", sector: "" });
			await refresh();
		} catch (error) {
			setSaveError(error instanceof Error ? error.message : "Unable to save stock changes.");
		} finally {
			setSaving(false);
		}
	};

	const handleEdit = (stock: StockRow) => {
		setEditingStock(stock);
		setForm({
			symbol: stock.symbol,
			exchange: stock.exchange,
			sector: stock.sector,
		});
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	const handleCancelEdit = () => {
		setEditingStock(null);
		setForm({ symbol: "", exchange: "NSE", sector: "" });
	};

	const handleDelete = async (stock: StockRow) => {
		if (!window.confirm(`Delete ${stock.symbol} from the listed stocks?`)) return;
		setSaving(true);
		setSaveError("");
		try {
			await deleteAdminStock(stock.id);
			if (stock.type === "Core") {
				deleteAdminCoreStock(stock.id);
			} else {
				deleteAdminCatalogStock(stock.id);
			}
			setStocks((currentStocks) => currentStocks.filter((entry) => entry.id !== stock.id));
			if (editingStock?.id === stock.id) handleCancelEdit();
			await refresh();
		} catch (error) {
			setSaveError(error instanceof Error ? error.message : "Unable to delete stock.");
		} finally {
			setSaving(false);
		}
	};

	return (
		<section>
			<header className="admin-page-head">
				<div>
					<h1>{t("adminStocks")}</h1>
					<p>{t("adminStocksLead")}</p>
				</div>
			</header>

			<form className="admin-card-form" onSubmit={handleSubmit}>
				<h2>{editingStock ? `Edit ${editingStock.symbol}` : t("adminAddStock")}</h2>
				<div className="admin-form-grid">
					<label>
						<span>{t("stockSymbol")}</span>
						<input
							required
							placeholder="WIPRO"
							value={form.symbol}
							onChange={(event) =>
								setForm((prev) => ({ ...prev, symbol: event.target.value }))
							}
						/>
					</label>
					<label>
						<span>{t("stockExchange")}</span>
						<input
							required
							value={form.exchange}
							onChange={(event) =>
								setForm((prev) => ({ ...prev, exchange: event.target.value }))
							}
						/>
					</label>
					<label>
						<span>{t("adminSector")}</span>
						<input
							placeholder="Technology"
							value={form.sector || marketQuote?.sector || ""}
							onChange={(event) =>
								setForm((prev) => ({ ...prev, sector: event.target.value }))
							}
						/>
					</label>
					<label>
						<span>Reference price (Yahoo Finance)</span>
						<input readOnly value={marketQuote ? `₹${marketQuote.price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : quoteLoading ? "Fetching market quote…" : ""} placeholder="Enter a symbol to fetch" />
					</label>
					<label>
						<span>Reference change (today)</span>
						<input readOnly value={marketQuote ? `${marketQuote.changePercent >= 0 ? "+" : ""}${marketQuote.changePercent.toFixed(2)}%` : quoteLoading ? "Fetching market quote…" : ""} placeholder="Fetched from market data" />
					</label>
				</div>
				<p className="admin-market-caption">Enter a supported NSE or BSE symbol. The market price and today’s reference change are fetched automatically from Yahoo Finance and cannot be entered manually.</p>
				{marketQuote?.sector && !form.sector && (
					<p className="admin-market-quote-status">Sector fetched from Yahoo Finance: {marketQuote.sector}</p>
				)}
				{marketQuote && !marketQuote.sector && !marketQuote.sectorError && (
					<p className="admin-market-caption">Yahoo Finance did not provide a sector for this symbol. Enter one manually if known.</p>
				)}
				{marketQuote && (
					<p className="admin-market-quote-status">
						Yahoo Finance · delayed quote · updated {new Date(marketQuote.lastUpdated).toLocaleString()}
					</p>
				)}
				{quoteError && <p className="admin-market-error" role="alert">{quoteError}</p>}
				{saveError && <p role="alert">{saveError}</p>}
				<div className="admin-form-actions">
					<button className="admin-btn" type="submit" disabled={saving || quoteLoading || !marketQuote}>
						{saving ? "Saving..." : quoteLoading ? "Getting market quote…" : editingStock ? "Save changes" : t("adminAddStock")}
					</button>
					{editingStock && (
						<button className="admin-btn admin-btn--secondary" type="button" onClick={handleCancelEdit}>
							Cancel
						</button>
					)}
				</div>
			</form>

			<h2 className="admin-subhead">All stocks <small>({stocks.filter((stock) => stock.type === "Core").length} core · {stocks.filter((stock) => stock.type === "Custom").length} custom)</small></h2>
			<p className="admin-market-caption">Prices use the same delayed market feed as the Stocks page and refresh every minute. Simulated and saved-estimate values are labeled.</p>
			<div className="admin-table-wrap">
				<table className="admin-table">
					<thead>
						<tr>
							<th>{t("stockSymbol")}</th>
							<th>{t("stockExchange")}</th>
							<th>{t("adminSector")}</th>
							<th>Live price</th>
							<th>Day change</th>
							<th>Market data</th>
							<th>Updated</th>
							<th>Type</th>
							<th>{t("adminActions")}</th>
						</tr>
					</thead>
					<tbody>
						{stocks.map((stock) => (
							<tr key={`${stock.type}:${stock.id}`}>
								<td>{stock.symbol}</td>
								<td>{stock.exchange}</td>
								<td>
									{stock.sector === "General"
										? (() => {
											const coreStock = featuredStocks.find((entry) => entry.id === stock.id);
											return coreStock ? t(coreStock.sectorKey) : stock.sector;
										})()
										: stock.sector}
								</td>
								<td>{stock.livePrice === undefined
									? "Unavailable"
									: `₹${stock.livePrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</td>
								<td className={stock.liveChangePercent === undefined ? "" : stock.liveChangePercent >= 0 ? "admin-market-positive" : "admin-market-negative"}>
									{stock.liveChangePercent === undefined
										? "—"
										: `${stock.liveChangePercent >= 0 ? "+" : ""}${stock.liveChangePercent.toFixed(2)}%`}
								</td>
								<td><span className={`admin-market-source${stock.dataSource === "simulated" || stock.dataSource === "fallback" ? " is-simulated" : ""}`}>
									{stock.dataSource === "delayed"
										? "Yahoo Finance · delayed"
										: stock.dataSource === "provider"
											? "Market provider"
											: stock.dataSource === "simulated"
												? "Simulated"
												: stock.dataSource === "fallback"
													? "Saved estimate"
													: "Unavailable"}
								</span></td>
								<td>{stock.lastUpdated ? new Date(stock.lastUpdated).toLocaleTimeString() : "—"}</td>
								<td>{stock.type}</td>
								<td className="admin-table__actions">
									<button className="admin-btn admin-btn--secondary" type="button" disabled={saving} onClick={() => handleEdit(stock)}>
										Edit
									</button>
									<button className="admin-btn admin-btn--danger" type="button" disabled={saving} onClick={() => void handleDelete(stock)}>
										{t("adminDelete")}
									</button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			{marketDataError && <p className="admin-market-error" role="alert">{marketDataError}</p>}
		</section>
	);
}

export default AdminStocksPage;
