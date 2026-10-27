import { useEffect, useRef, useState } from "react";
import {
	fetchMarketCandles,
	requestMarketAnalysisCommentary,
} from "../services/marketApi";
import { analyzeMarketCandles, type TechnicalMarketAnalysis } from "../services/marketAnalysis";
import type { Timeframe } from "../utils/candleAggregation";

interface AiMarketAnalysisPanelProps {
	stockId: string;
	stockSymbol: string;
	timeframe: Timeframe;
	currency?: "INR" | "USD";
}

type CommentaryState = "idle" | "loading" | "available" | "unavailable" | "skipped";

const ANALYSIS_DELAY_SECONDS = 5;

const waitForAnalysisDelay = (
	signal: AbortSignal,
	onCountdown: (seconds: number) => void
) =>
	new Promise<void>((resolve, reject) => {
		if (signal.aborted) {
			reject(new DOMException("Analysis was cancelled.", "AbortError"));
			return;
		}

		let secondsRemaining = ANALYSIS_DELAY_SECONDS;
		onCountdown(secondsRemaining);
		const finish = () => {
			window.clearInterval(interval);
			signal.removeEventListener("abort", cancel);
		};
		const interval = window.setInterval(() => {
			secondsRemaining -= 1;
			onCountdown(Math.max(secondsRemaining, 0));
			if (secondsRemaining <= 0) {
				finish();
				resolve();
			}
		}, 1000);
		const cancel = () => {
			finish();
			reject(new DOMException("Analysis was cancelled.", "AbortError"));
		};
		signal.addEventListener("abort", cancel, { once: true });
	});

const formatPrice = (price: number | null, currency: "INR" | "USD") =>
	price === null
		? "Insufficient data to calculate levels."
		: new Intl.NumberFormat(currency === "USD" ? "en-US" : "en-IN", {
			style: "currency",
			currency,
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(price);

const formatTimestamp = (timestamp: number | null) =>
	timestamp === null
		? "Timestamp unavailable"
		: new Date(timestamp).toLocaleString("en-IN", {
			dateStyle: "medium",
			timeStyle: "short",
			timeZone: "Asia/Kolkata",
		}) + " IST";

function AnalysisIcon({ kind }: { kind: "trend" | "entry" | "levels" | "risk" }) {
	const paths = {
		trend: <path d="m3 16 5-5 4 3 8-9M15 5h5v5" />,
		entry: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></>,
		levels: <><path d="M4 6h16M4 12h10M4 18h16" /><path d="m16 10 3 2-3 2" /></>,
		risk: <><path d="M12 3 22 20H2L12 3Z" /><path d="M12 9v5m0 3h.01" /></>,
	};
	return (
		<svg className="ai-market-analysis__icon" viewBox="0 0 24 24" aria-hidden="true">
			{paths[kind]}
		</svg>
	);
}

function AiMarketAnalysisPanel({
	stockId,
	stockSymbol,
	timeframe,
	currency = "INR",
}: AiMarketAnalysisPanelProps) {
	const [started, setStarted] = useState(false);
	const [analysis, setAnalysis] = useState<TechnicalMarketAnalysis | null>(null);
	const [commentary, setCommentary] = useState("");
	const [commentaryError, setCommentaryError] = useState("");
	const [commentaryState, setCommentaryState] = useState<CommentaryState>("idle");
	const [loading, setLoading] = useState(false);
	const [countdown, setCountdown] = useState(0);
	const [error, setError] = useState("");
	const requestController = useRef<AbortController | null>(null);

	useEffect(() => {
		requestController.current?.abort();
		setStarted(false);
		setAnalysis(null);
		setCommentary("");
		setCommentaryError("");
		setCommentaryState("idle");
		setLoading(false);
		setCountdown(0);
		setError("");
		return () => requestController.current?.abort();
	}, [stockId, timeframe]);

	const runAnalysis = async () => {
		requestController.current?.abort();
		const controller = new AbortController();
		requestController.current = controller;
		setStarted(true);
		setLoading(true);
		setCountdown(ANALYSIS_DELAY_SECONDS);
		setAnalysis(null);
		setCommentary("");
		setCommentaryError("");
		setCommentaryState("idle");
		setError("");
		try {
			const [candleResponse] = await Promise.all([
				fetchMarketCandles(stockId, timeframe, controller.signal),
				waitForAnalysisDelay(controller.signal, setCountdown),
			]);
			if (controller.signal.aborted) return;
			const result = analyzeMarketCandles(
				candleResponse.candles,
				timeframe,
				`${candleResponse.provider} — delayed data`
			);
			if (controller.signal.aborted) return;
			setAnalysis(result);
			setLoading(false);

			if (result.trend.direction === "Insufficient Data" || result.data.stale) {
				setCommentaryState("skipped");
				return;
			}
			setCommentaryState("loading");
			const context = [
				`Trend: ${result.trend.direction}. ${result.trend.reasons.join(" ")}`,
				`Momentum: ${result.trend.momentum}; RSI 14 ${result.trend.rsi14}.`,
				`Entry setup: ${result.entry.setup}; ${result.entry.confirmation}`,
				`Target ${result.levels.target}; stop-loss ${result.levels.stopLoss}; risk/reward ${result.levels.riskReward}.`,
				`Risk quality: ${result.risk.quality}; ${result.risk.mainRisk}`,
			].join(" ");
			try {
				const generatedCommentary = await requestMarketAnalysisCommentary(
					stockId,
					timeframe,
					context,
					controller.signal
				);
				if (!controller.signal.aborted) {
					setCommentary(generatedCommentary);
					setCommentaryState("available");
				}
			} catch (commentaryRequestError) {
				if (!controller.signal.aborted) {
					setCommentaryError(commentaryRequestError instanceof Error
						? commentaryRequestError.message
						: "AI commentary could not be generated.");
					setCommentaryState("unavailable");
				}
			}
		} catch (requestError) {
			if (!controller.signal.aborted) {
				controller.abort();
				setLoading(false);
				setCountdown(0);
				setError(requestError instanceof Error
					? requestError.message
					: "Market analysis could not be completed.");
			}
		} finally {
			if (!controller.signal.aborted) {
				setLoading(false);
			}
		}
	};

	const cardHeader = (
		title: string,
		kind: "trend" | "entry" | "levels" | "risk",
		status?: string
	) => (
		<header className="ai-market-analysis__card-header">
			<span className="ai-market-analysis__icon-wrap"><AnalysisIcon kind={kind} /></span>
			<h3>{title}</h3>
			{status && <span className={`ai-market-analysis__status-tag ai-market-analysis__status-tag--${status.toLowerCase().replaceAll(" ", "-")}`}>{status}</span>}
		</header>
	);

	return (
		<div className="ai-market-analysis__container">
			{!started && (
				<button
					type="button"
					className="ai-market-analysis__button"
					onClick={() => void runAnalysis()}
				>
					Analyze chart with AI
				</button>
			)}

			{started && (
				<section
					className="ai-market-analysis"
					aria-label={`${stockSymbol} technical market analysis`}
					aria-busy={loading}
				>
					<header className="ai-market-analysis__header">
						<div>
							<h2>{stockSymbol} Market Analysis</h2>
							<p>Technical indicators and levels are rule-based; AI commentary is separate.</p>
						</div>
						<button
							type="button"
							className="ai-market-analysis__button"
							onClick={() => void runAnalysis()}
							disabled={loading}
						>
							{loading
								? countdown > 0
									? `Preparing analysis… ${countdown}s`
									: "Analyzing chart…"
								: "Refresh Analysis"}
						</button>
					</header>

					{error && <p className="ai-market-analysis__error" role="alert">{error}</p>}

					{analysis && (
						<p className="ai-market-analysis__meta">
							<span>Price {formatPrice(analysis.data.currentPrice, currency)}</span>
							<span>{analysis.data.timeframe}</span>
							<span>{analysis.data.source}</span>
							<span>{formatTimestamp(analysis.data.timestamp)}</span>
							<span>{analysis.data.candleCount} candles</span>
							{analysis.data.stale && <strong>Stale data</strong>}
						</p>
					)}
					{analysis?.data.stale && (
						<p className="ai-market-analysis__error" role="status">
							The latest candle is delayed or stale. Historical indicators are shown for context only; no trade setup is provided.
						</p>
					)}

					{loading && (
						<div className="ai-market-analysis__grid" aria-label="Loading analysis">
							<p role="status">
								{countdown > 0
									? `Analyzing chart data in ${countdown} seconds…`
									: "Calculating chart indicators…"}
							</p>
							{(["Market Trend", "Entry Point", "Target & Stop-Loss", "Risk Assessment"] as const).map((title, index) => (
								<article className="ai-market-analysis__card ai-market-analysis__card--skeleton" key={title}>
									{cardHeader(title, (["trend", "entry", "levels", "risk"] as const)[index])}
									<span className="ai-market-analysis__skeleton-line ai-market-analysis__skeleton-line--wide" />
									<span className="ai-market-analysis__skeleton-line" />
									<span className="ai-market-analysis__skeleton-line ai-market-analysis__skeleton-line--short" />
								</article>
							))}
						</div>
					)}

					{analysis && !loading && (
						<div className="ai-market-analysis__grid">
							<article className="ai-market-analysis__card">
								{cardHeader("Market Trend", "trend", analysis.trend.direction)}
								<p><strong>Momentum:</strong> {analysis.trend.momentum}</p>
								<ul>
									{analysis.trend.reasons.map((reason) => <li key={reason}>{reason}</li>)}
								</ul>
								<p><strong>Support:</strong> {formatPrice(analysis.trend.support, currency)}</p>
								<p><strong>Resistance:</strong> {formatPrice(analysis.trend.resistance, currency)}</p>
							</article>

							<article className="ai-market-analysis__card">
								{cardHeader("Entry Point", "entry", analysis.entry.setup)}
								{analysis.entry.zone
									? <p><strong>Watch zone:</strong> {formatPrice(analysis.entry.zone.low, currency)} – {formatPrice(analysis.entry.zone.high, currency)}</p>
									: <p><strong>Entry zone:</strong> Not set; there is no confirmed setup.</p>}
								<p>{analysis.entry.confirmation}</p>
							</article>

							<article className="ai-market-analysis__card">
								{cardHeader("Target & Stop-Loss", "levels")}
								<p><strong>Target:</strong> {analysis.levels.target === null ? "Not set — no confirmed setup." : formatPrice(analysis.levels.target, currency)}</p>
								<p><strong>Stop-loss:</strong> {analysis.levels.stopLoss === null ? "Not set — no confirmed setup." : formatPrice(analysis.levels.stopLoss, currency)}</p>
								<p><strong>Invalidation:</strong> {analysis.levels.invalidation === null ? "Not set — no confirmed setup." : formatPrice(analysis.levels.invalidation, currency)}</p>
								{analysis.levels.riskReward !== null && <p><strong>Risk/reward:</strong> {analysis.levels.riskReward}:1</p>}
								<p>{analysis.levels.explanation}</p>
							</article>

							<article className="ai-market-analysis__card">
								{cardHeader("Risk Assessment", "risk", analysis.risk.quality)}
								<p><strong>Main risk:</strong> {analysis.risk.mainRisk}</p>
								<p><strong>Invalidation:</strong> {analysis.risk.invalidation}</p>
								{analysis.risk.keyRisks.length > 0 && (
									<ul>{analysis.risk.keyRisks.map((risk) => <li key={risk}>{risk}</li>)}</ul>
								)}
							</article>
						</div>
					)}

					{analysis && !loading && (
						<div className="ai-market-analysis__commentary" role="status">
							<strong>AI commentary</strong>
							{commentaryState === "loading" && <span>Checking optional AI commentary…</span>}
							{commentaryState === "available" && <span>{commentary}</span>}
							{commentaryState === "unavailable" && (
								<span>
									{commentaryError || "AI commentary could not be generated."} Technical analysis above is rule-based.
								</span>
							)}
							{commentaryState === "skipped" && (
								<span>
									{analysis.data.stale
										? "Skipped because the latest candle is stale. AI commentary requires fresh market data."
										: "Skipped because the available market data is insufficient."}
								</span>
							)}
						</div>
					)}
					{analysis && (
						<p className="ai-market-analysis__disclaimer">
							Educational technical analysis only; not financial advice. Levels are not guaranteed.
						</p>
					)}
				</section>
			)}
		</div>
	);
}

export default AiMarketAnalysisPanel;
