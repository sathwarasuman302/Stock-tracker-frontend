import {
	type Timeframe,
	CHART_TIMEFRAMES,
} from "../utils/candleAggregation";

interface LiveTradingViewChartProps {
	stockSymbol: string;
	stockExchange: string;
	tradingViewSymbol: string;
	timeframe: Timeframe;
	onTimeframeChange: (timeframe: Timeframe) => void;
	supportedTimeframes?: Timeframe[];
}

const TRADINGVIEW_INTERVALS: Record<Timeframe, string> = {
	"1m": "1",
	"5m": "5",
	"15m": "15",
	"30m": "30",
	"1H": "60",
	"4H": "240",
	"1D": "D",
	"1W": "W",
	"1M": "M",
};

function LiveTradingViewChart({
	stockSymbol,
	stockExchange,
	tradingViewSymbol,
	timeframe,
	onTimeframeChange,
	supportedTimeframes = CHART_TIMEFRAMES,
}: LiveTradingViewChartProps) {
	const chartUrl = new URL("https://www.tradingview.com/widgetembed/");
	chartUrl.search = new URLSearchParams({
		symbol: tradingViewSymbol,
		interval: TRADINGVIEW_INTERVALS[timeframe],
		timezone: "Asia/Kolkata",
		theme: "light",
		style: "1",
		locale: "en",
		allow_symbol_change: "0",
		withdateranges: "1",
		support_host: "https://www.tradingview.com",
	}).toString();

	return (
		<section className="live-candlestick-chart" aria-label={`${stockSymbol} live market chart`}>
			<header className="live-candlestick-chart__header">
				<strong>{stockSymbol}</strong>
				<span>{timeframe} · {stockExchange}</span>
				<span>TradingView</span>
			</header>
			<iframe
				key={`${tradingViewSymbol}-${timeframe}`}
				className="live-candlestick-chart__canvas"
				src={chartUrl.toString()}
				title={`${stockSymbol} ${timeframe} TradingView chart`}
				loading="lazy"
				referrerPolicy="origin"
			/>
			<div className="candlestick-chart-timeframes" aria-label="Chart timeframe">
				{supportedTimeframes.map((option) => (
					<button
						key={option}
						type="button"
						className={`timeframe-btn ${timeframe === option ? "is-active" : ""}`}
						aria-pressed={timeframe === option}
						onClick={() => onTimeframeChange(option)}
					>
						{option}
					</button>
				))}
			</div>
		</section>
	);
}

export default LiveTradingViewChart;
