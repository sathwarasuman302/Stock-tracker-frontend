import ProfessionalCandlestickChart from "./ProfessionalCandlestickChart";
import type { Timeframe, Candle } from "../utils/candleAggregation";

interface NseCandlestickChartProps {
	candles: Candle[];
	currentPrice: number | null;
	timeframe: Timeframe;
	onTimeframeChange: (timeframe: Timeframe) => void;
	connectionStatus: "loading" | "live" | "delayed" | "simulated" | "error";
	connectionError: string;
	volumeAvailable: boolean;
	volumeLabel: string;
}

function NseCandlestickChart({
	candles,
	currentPrice,
	timeframe,
	onTimeframeChange,
	connectionStatus,
	connectionError,
	volumeAvailable,
	volumeLabel,
}: NseCandlestickChartProps) {
	const statusMessage = connectionStatus === "live"
		? "Live NIFTY 50 quotes from the configured NSE market-data provider. Candles build from quote updates while this chart is open."
		: connectionStatus === "delayed"
			? "Delayed NIFTY 50 quotes from Yahoo Finance. Candles build from quote updates while this chart is open."
		: connectionStatus === "error" || connectionStatus === "simulated"
			? `Live NIFTY 50 data is unavailable. ${connectionError}`
			: "Connecting to the live NIFTY 50 market-data feed…";

	return (
		<section className="live-candlestick-chart" aria-label="NIFTY 50 live NSE market chart">
			<header className="live-candlestick-chart__header">
				<strong>NIFTY 50</strong>
				<span>{timeframe} · NSE</span>
				<span>Live NSE data</span>
			</header>
			<div className="chart-live-status" role="status">
				{statusMessage}
			</div>
			<ProfessionalCandlestickChart
				candles={candles}
				currentPrice={currentPrice}
				stockSymbol="NIFTY 50"
				stockExchange="NSE"
				timeframe={timeframe}
				onTimeframeChange={onTimeframeChange}
				volumeAvailable={volumeAvailable}
				volumeLabel={volumeLabel}
			/>
		</section>
	);
}

export default NseCandlestickChart;
