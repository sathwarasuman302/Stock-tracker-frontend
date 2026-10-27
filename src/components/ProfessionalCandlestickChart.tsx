import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type PointerEvent as ReactPointerEvent,
} from "react";
import {
	type Candle,
	type Timeframe,
	CHART_TIMEFRAMES,
	getVolumeCandles,
	getPriceRange,
	getOHLC,
} from "../utils/candleAggregation";
import { useTheme } from "../contexts/ThemeContext";

interface ProfessionalCandlestickChartProps {
	candles: Candle[];
	currentPrice: number | null;
	stockSymbol: string;
	stockExchange: string;
	timeframe: Timeframe;
	onTimeframeChange: (timeframe: Timeframe) => void;
	volumeAvailable: boolean;
	volumeLabel: string;
	volumeUnavailableMessage?: string;
	onOHLCUpdate?: (ohlc: Candle | null) => void;
}

const CHART_CONFIG = {
	PRICE_HEIGHT: 360,
	VOLUME_HEIGHT: 96,
	TOP_PADDING: 20,
	BOTTOM_PADDING: 20,
	SIDE_PADDING: 60,
	RIGHT_LABEL_WIDTH: 64,
};

const CHART_PALETTES = {
	light: {
		background: "#fafbfc",
		grid: "#e8ecf1",
		muted: "#7a8494",
		up: "#18a957",
		down: "#e14a4a",
		current: "#0a5fad",
		crosshair: "#122033",
	},
	dark: {
		background: "#111923",
		grid: "#273442",
		muted: "#8998aa",
		up: "#22c98b",
		down: "#f06472",
		current: "#66aaff",
		crosshair: "#d9e2ef",
	},
	crypto: {
		background: "#0c121a",
		grid: "#253140",
		muted: "#8491a3",
		up: "#22c98b",
		down: "#f06472",
		current: "#59a7ff",
		crosshair: "#d9e2ef",
	},
} as const;

const DEFAULT_VISIBLE_CANDLES = 90;

const clamp = (value: number, min: number, max: number) =>
	Math.min(Math.max(value, min), max);

const formatTimeLabel = (timestamp: number) => {
	const date = new Date(timestamp);
	return date.toLocaleString("en-IN", {
		weekday: "short",
		day: "numeric",
		month: "short",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});
};

function ProfessionalCandlestickChart({
	candles,
	currentPrice,
	stockSymbol,
	stockExchange,
	timeframe,
	onTimeframeChange,
	volumeAvailable,
	volumeLabel,
	volumeUnavailableMessage = "Volume data unavailable from this market feed",
	onOHLCUpdate,
}: ProfessionalCandlestickChartProps) {
	const svgRef = useRef<SVGSVGElement | null>(null);
	const containerRef = useRef<HTMLDivElement | null>(null);
	const { theme } = useTheme();

	const isCrypto = stockExchange.toUpperCase() === "CRYPTO";
	const palette = theme === "dark"
		? isCrypto ? CHART_PALETTES.crypto : CHART_PALETTES.dark
		: CHART_PALETTES.light;
	const formatChartPrice = (price: number) =>
		`${isCrypto ? "$" : ""}${price.toLocaleString("en-US", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		})}`;
	const [zoom, setZoom] = useState(1);
	const [pan, setPan] = useState(0);
	const [hoveredCandleIndex, setHoveredCandleIndex] = useState<number | null>(null);
	const [crosshairY, setCrosshairY] = useState<number | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const dragStartXRef = useRef<number | null>(null);
	const dragStartPanRef = useRef(0);
	const [containerWidth, setContainerWidth] = useState(1000);

	const volumeCandles = useMemo(() => getVolumeCandles(candles), [candles]);

	const hoveredOHLC = useMemo(
		() => (hoveredCandleIndex !== null ? getOHLC(candles, hoveredCandleIndex) : null),
		[candles, hoveredCandleIndex]
	);

	useEffect(() => {
		onOHLCUpdate?.(hoveredOHLC);
	}, [hoveredOHLC, onOHLCUpdate]);

	useEffect(() => {
		const handleResize = () => {
			if (containerRef.current) {
				setContainerWidth(Math.max(320, containerRef.current.clientWidth));
			}
		};
		handleResize();
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	useEffect(() => {
		const nextVisibleCount = Math.max(
			12,
			Math.min(candles.length, Math.round(DEFAULT_VISIBLE_CANDLES / zoom))
		);
		const nextMaxPan = Math.max(0, candles.length - nextVisibleCount);
		setPan((previousPan) => Math.min(Math.max(previousPan, 0), nextMaxPan));
		if (candles.length > 0) {
			setPan(nextMaxPan);
		}
	}, [candles.length, stockSymbol, timeframe, zoom]);

	const visibleCandleCount = Math.max(
		12,
		Math.min(candles.length, Math.round(DEFAULT_VISIBLE_CANDLES / zoom))
	);
	const maxPan = Math.max(0, candles.length - visibleCandleCount);
	const safePan = clamp(pan, 0, maxPan);
	const visibleCandles = candles.slice(safePan, safePan + visibleCandleCount);
	const visibleVolumeCandles = volumeCandles.slice(
		safePan,
		safePan + visibleCandleCount
	);
	const priceRange = useMemo(() => {
		if (currentPrice === null) return getPriceRange(visibleCandles);
		const currentPriceCandle: Candle = {
			time: Date.now(),
			open: currentPrice,
			high: currentPrice,
			low: currentPrice,
			close: currentPrice,
			volume: 0,
		};
		return getPriceRange([...visibleCandles, currentPriceCandle]);
	}, [visibleCandles, currentPrice]);

	const chartHeight =
		CHART_CONFIG.PRICE_HEIGHT -
		CHART_CONFIG.TOP_PADDING -
		CHART_CONFIG.BOTTOM_PADDING;
	const plotWidth =
		containerWidth - CHART_CONFIG.SIDE_PADDING - CHART_CONFIG.RIGHT_LABEL_WIDTH;
	const range = Math.max(priceRange.max - priceRange.min, 1);

	const yScale = (price: number) => {
		const normalized = (price - priceRange.min) / range;
		return CHART_CONFIG.TOP_PADDING + (1 - normalized) * chartHeight;
	};

	const stepX = plotWidth / Math.max(visibleCandles.length, 1);
	const xScale = (index: number) =>
		CHART_CONFIG.SIDE_PADDING + index * stepX + stepX / 2;

	const crosshairPrice =
		crosshairY !== null
			? priceRange.min +
				(1 - (crosshairY - CHART_CONFIG.TOP_PADDING) / chartHeight) * range
			: null;

	const chartMarkup = useMemo(() => {
		if (!visibleCandles.length) {
			return (
				<text
					x={CHART_CONFIG.SIDE_PADDING + plotWidth / 2}
					y={CHART_CONFIG.PRICE_HEIGHT / 2}
					textAnchor="middle"
					fill={palette.muted}
					fontSize="13"
				>
					Waiting for market price data…
				</text>
			);
		}

		const candleWidth = clamp((plotWidth / visibleCandles.length) * 0.65, 2, 20);

		const candleElements = visibleCandles.map((candle, index) => {
			const x = xScale(index);
			const isUp = candle.close > candle.open;
			const isDown = candle.close < candle.open;
			const bodyTop = Math.min(yScale(candle.open), yScale(candle.close));
			const bodyBottom = Math.max(yScale(candle.open), yScale(candle.close));
			const bodyHeight = Math.max(1, bodyBottom - bodyTop);
			const candleColor = isUp ? palette.up : isDown ? palette.down : palette.muted;

			return (
				<g key={`candle-${candle.time}`}>
					<line
						x1={x}
						x2={x}
						y1={yScale(candle.high)}
						y2={yScale(candle.low)}
						stroke={candleColor}
						strokeWidth="1"
					/>
					<rect
						x={x - candleWidth / 2}
						y={bodyTop}
						width={candleWidth}
						height={bodyHeight}
						rx="1"
						fill={candleColor}
					/>
				</g>
			);
		});

		const gridLines = [];
		for (let i = 0; i <= 5; i++) {
			const price =
				priceRange.min + ((priceRange.max - priceRange.min) / 5) * i;
			const y = yScale(price);
			gridLines.push(
				<line
					key={`grid-${i}`}
					x1={CHART_CONFIG.SIDE_PADDING}
					x2={CHART_CONFIG.SIDE_PADDING + plotWidth}
					y1={y}
					y2={y}
					stroke={palette.grid}
					strokeWidth="0.5"
				/>
			);
		}

		const currentY = currentPrice === null ? null : yScale(currentPrice);
		const hoveredLocalIndex =
			hoveredCandleIndex !== null ? hoveredCandleIndex - safePan : null;
		const crosshairX =
			hoveredLocalIndex !== null
				? xScale(clamp(hoveredLocalIndex, 0, visibleCandles.length - 1))
				: null;

		return (
			<>
				{gridLines}
				{candleElements}

				{/* Crosshair */}
				{crosshairX !== null && (
					<>
						<line
							x1={crosshairX}
							x2={crosshairX}
							y1={0}
							y2={chartHeight}
							stroke={palette.crosshair}
							strokeWidth="1"
							strokeDasharray="4 4"
							opacity="0.45"
						/>
						{hoveredOHLC && (
							<rect
								x={crosshairX - 52}
								y={CHART_CONFIG.PRICE_HEIGHT - 12}
								width={104}
								height={18}
								rx={3}
								fill={palette.crosshair}
							/>
						)}
						{hoveredOHLC && (
							<text
								x={crosshairX}
								y={CHART_CONFIG.PRICE_HEIGHT - 1}
								textAnchor="middle"
								fill={isCrypto ? "#0c121a" : "#ffffff"}
								fontSize="10"
							>
								{formatTimeLabel(hoveredOHLC.time)}
							</text>
						)}
					</>
				)}
				{crosshairY !== null && (
					<line
						x1={CHART_CONFIG.SIDE_PADDING}
						x2={CHART_CONFIG.SIDE_PADDING + plotWidth}
						y1={crosshairY}
						y2={crosshairY}
						stroke={palette.crosshair}
						strokeWidth="1"
						strokeDasharray="4 4"
						opacity="0.45"
					/>
				)}

				{/* Current price line */}
				{currentY !== null && (
					<line
						x1={CHART_CONFIG.SIDE_PADDING}
						x2={CHART_CONFIG.SIDE_PADDING + plotWidth}
						y1={currentY}
						y2={currentY}
						stroke={palette.current}
						strokeWidth="1"
						opacity="0.55"
						strokeDasharray={isCrypto ? "5 4" : undefined}
					/>
				)}
				{isCrypto && currentY !== null && (
					<circle
						cx={CHART_CONFIG.SIDE_PADDING + plotWidth}
						cy={currentY}
						r="3.5"
						fill={palette.current}
						stroke={palette.background}
						strokeWidth="2"
					/>
				)}
			</>
		);
	}, [
		visibleCandles,
		plotWidth,
		priceRange,
		hoveredCandleIndex,
		safePan,
		hoveredOHLC,
		currentPrice,
		crosshairY,
		chartHeight,
		palette,
		isCrypto,
	]);

	const volumeBarHeight = CHART_CONFIG.VOLUME_HEIGHT - 30;
	const maxVolume = Math.max(...visibleVolumeCandles.map((candle) => candle.volume), 1);
	const hasVisibleVolume =
		volumeAvailable && visibleVolumeCandles.some((candle) => candle.volume > 0);
	const candleWidth = clamp((plotWidth / Math.max(visibleCandles.length, 1)) * 0.65, 2, 20);
	const volumeMarkup = visibleVolumeCandles.map((volumeCandle, index) => {
		const x = xScale(index);
		const height = (volumeBarHeight * volumeCandle.volume) / maxVolume;
		const color = volumeCandle.isUp
			? isCrypto ? "rgba(34, 201, 139, 0.65)" : "rgba(24, 169, 87, 0.55)"
			: volumeCandle.isDown
				? isCrypto ? "rgba(240, 100, 114, 0.65)" : "rgba(225, 74, 74, 0.55)"
				: isCrypto ? "rgba(132, 145, 163, 0.4)" : "rgba(122, 132, 148, 0.45)";
		return (
			<rect
				key={`volume-${visibleCandles[index]?.time ?? safePan + index}`}
				x={x - candleWidth / 2}
				y={CHART_CONFIG.VOLUME_HEIGHT - 8 - height}
				width={candleWidth}
				height={height}
				fill={color}
			/>
		);
	});

	const handleWheel = useCallback((event: WheelEvent) => {
		event.preventDefault();
		if (candles.length === 0) return;

		const nextZoom = clamp(zoom * (event.deltaY < 0 ? 1.12 : 0.89), 0.5, 8);
		const nextVisibleCount = Math.max(
			12,
			Math.min(candles.length, Math.round(DEFAULT_VISIBLE_CANDLES / nextZoom))
		);
		const nextMaxPan = Math.max(0, candles.length - nextVisibleCount);
		setZoom(nextZoom);
		setPan(Math.min(safePan, nextMaxPan));
	}, [candles.length, zoom, safePan]);

	useEffect(() => {
		const svg = svgRef.current;
		if (!svg) return;

		svg.addEventListener("wheel", handleWheel, { passive: false });
		return () => svg.removeEventListener("wheel", handleWheel);
	}, [handleWheel]);

	const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
		setIsDragging(true);
		dragStartXRef.current = event.clientX;
		dragStartPanRef.current = safePan;
		svgRef.current?.setPointerCapture(event.pointerId);
	};

	const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
		if (!svgRef.current) return;

		const rect = svgRef.current.getBoundingClientRect();
		const relativeX = clamp(
			(event.clientX - rect.left - CHART_CONFIG.SIDE_PADDING) / plotWidth,
			0,
			1
		);
		const relativeY = clamp(
			(event.clientY - rect.top - CHART_CONFIG.TOP_PADDING) / chartHeight,
			0,
			1
		);

		setCrosshairY(CHART_CONFIG.TOP_PADDING + relativeY * chartHeight);

		if (isDragging && dragStartXRef.current !== null) {
			const deltaX = event.clientX - dragStartXRef.current;
			const deltaCandlesPan = -(deltaX / stepX);
			setPan(
				clamp(
					dragStartPanRef.current + Math.round(deltaCandlesPan),
					0,
					maxPan
				)
			);
		}

		const hoveredIndex = Math.min(
			visibleCandles.length - 1,
			Math.max(0, Math.floor(relativeX * visibleCandles.length))
		);
		setHoveredCandleIndex(safePan + hoveredIndex);
	};

	const handlePointerUp = () => {
		setIsDragging(false);
		dragStartXRef.current = null;
	};

	const currentPriceY = currentPrice === null ? null : yScale(currentPrice);
	const displayedOHLC =
		hoveredOHLC ?? candles[candles.length - 1] ?? null;

	return (
		<div className={`candlestick-chart-container${isCrypto ? " candlestick-chart-container--crypto" : ""}`} ref={containerRef}>
			<div className="candlestick-chart-header">
				<div className="candlestick-chart-info">
					<span className="chart-symbol">{stockSymbol}</span>
					<span className="chart-exchange">· {timeframe} · {stockExchange}</span>
					{displayedOHLC && (
						<>
							<span className="chart-ohlc">O {formatChartPrice(displayedOHLC.open)}</span>
							<span className="chart-ohlc">H {formatChartPrice(displayedOHLC.high)}</span>
							<span className="chart-ohlc">L {formatChartPrice(displayedOHLC.low)}</span>
							<span className="chart-ohlc">C {formatChartPrice(displayedOHLC.close)}</span>
						</>
					)}
				</div>
			</div>

			<div className="candlestick-chart-wrapper">
				<div className="candlestick-price-area">
				<svg
					ref={svgRef}
					viewBox={`0 0 ${containerWidth} ${CHART_CONFIG.PRICE_HEIGHT}`}
					className="candlestick-chart"
					aria-label={`${stockSymbol} ${timeframe} candlestick chart`}
					onPointerDown={handlePointerDown}
					onPointerMove={handlePointerMove}
					onPointerUp={handlePointerUp}
					onPointerLeave={() => {
						handlePointerUp();
						setCrosshairY(null);
						setHoveredCandleIndex(null);
					}}
					onPointerCancel={handlePointerUp}
					style={{ cursor: isDragging ? "grabbing" : "crosshair" }}
				>
					<rect width={containerWidth} height={CHART_CONFIG.PRICE_HEIGHT} fill={palette.background} />
					{chartMarkup}
				</svg>

				{/* Price scale on the right */}
				{candles.length > 0 && (
					<div className="chart-price-labels">
						{Array.from({ length: 6 }).map((_, i) => {
							const price =
								priceRange.min +
								((priceRange.max - priceRange.min) / 5) * i;
							const y = yScale(price);
							return (
								<div
									key={`label-${i}`}
									className="chart-price-label"
									style={{ top: `${y}px` }}
								>
									{formatChartPrice(price)}
								</div>
							);
						})}
						{currentPrice !== null && currentPriceY !== null && (
							<div
								className="chart-price-label chart-price-label--current"
								style={{ top: `${currentPriceY}px` }}
							>
								{formatChartPrice(currentPrice)}
							</div>
						)}
						{crosshairPrice !== null && (
							<div
								className="chart-price-label chart-price-label--crosshair"
								style={{ top: `${crosshairY ?? 0}px` }}
							>
								{formatChartPrice(crosshairPrice)}
							</div>
						)}
					</div>
				)}
				</div>

				<div className="candlestick-volume-panel">
							<span className="candlestick-volume-title">{volumeLabel}</span>
					<svg
						viewBox={`0 0 ${containerWidth} ${CHART_CONFIG.VOLUME_HEIGHT}`}
						className="candlestick-volume-chart"
						aria-label={`${stockSymbol} volume by candle`}
					>
						<line
							x1={CHART_CONFIG.SIDE_PADDING}
							x2={CHART_CONFIG.SIDE_PADDING + plotWidth}
							y1={CHART_CONFIG.VOLUME_HEIGHT - 7}
							y2={CHART_CONFIG.VOLUME_HEIGHT - 7}
							stroke={palette.grid}
							strokeWidth="1"
						/>
						{volumeMarkup}
						{!hasVisibleVolume && (
							<text
								x={CHART_CONFIG.SIDE_PADDING + plotWidth / 2}
								y={CHART_CONFIG.VOLUME_HEIGHT / 2 + 8}
								textAnchor="middle"
								fill={palette.muted}
								fontSize="11"
							>
								{volumeUnavailableMessage}
							</text>
						)}
					</svg>
				</div>
			</div>

			<div className="candlestick-chart-timeframes">
				{CHART_TIMEFRAMES.map((tf) => (
					<button
						key={tf}
						type="button"
						className={`timeframe-btn ${timeframe === tf ? "is-active" : ""}`}
						onClick={() => onTimeframeChange(tf)}
					>
						{tf}
					</button>
				))}
			</div>
		</div>
	);
}

export default ProfessionalCandlestickChart;
