interface MarketIndex {
	id: string;
	nameKey: string;
	value: number;
	change: number;
	changePercent: number;
}

const MARKET_INDICES: MarketIndex[] = [
	{
		id: "nifty",
		nameKey: "NIFTY",
		value: 24154.9,
		change: -132.75,
		changePercent: -0.55,
	},
	{
		id: "sensex",
		nameKey: "SENSEX",
		value: 77235.46,
		change: -492.7,
		changePercent: -0.63,
	},
	{
		id: "banknifty",
		nameKey: "BANKNIFTY",
		value: 57262.4,
		change: -235.4,
		changePercent: -0.41,
	},
	{
		id: "bankex",
		nameKey: "BANKEX",
		value: 64884.26,
		change: -352.93,
		changePercent: -0.54,
	},
];

const formatPrice = (value: number) =>
	value.toLocaleString("en-IN", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});

function MarketTicker() {
	return (
		<div className="market-ticker">
			<div className="market-ticker__inner">
				{MARKET_INDICES.map((index) => {
					const isPositive = index.change >= 0;
					return (
						<div
							key={index.id}
							className="market-ticker__item"
						>
							<span className="market-ticker__label">
								{index.nameKey}
							</span>
							<span className="market-ticker__value">
								{formatPrice(index.value)}
							</span>
							<span
								className={`market-ticker__change ${
									isPositive ? "is-positive" : "is-negative"
								}`}
							>
								{isPositive ? "+" : ""}
								{index.change.toFixed(2)}
								{" "}
								<span className="market-ticker__percent">
									({isPositive ? "+" : ""}
									{index.changePercent.toFixed(2)}%)
								</span>
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}

export default MarketTicker;
