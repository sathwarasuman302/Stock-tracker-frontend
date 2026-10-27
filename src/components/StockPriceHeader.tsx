interface StockPriceHeaderProps {
	symbol: string;
	exchange?: string;
	price: number;
	change: number;
	changePercent: number;
}

const formatPrice = (value: number, currencySymbol: string) =>
	`${currencySymbol}${value.toLocaleString(currencySymbol === "$" ? "en-US" : "en-IN", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;

function StockPriceHeader({
	symbol,
	exchange = "NSE",
	price,
	change,
	changePercent,
}: StockPriceHeaderProps) {
	const isPositive = change >= 0;
	const currencySymbol = exchange.toUpperCase() === "CRYPTO" ? "$" : "₹";

	return (
		<div className="stock-price-header">
			<div className="stock-price-header__symbol">
				<span className="stock-price-header__name">{symbol}</span>
				<span className="stock-price-header__exchange">· {exchange}</span>
			</div>
			<div className="stock-price-header__price">{formatPrice(price, currencySymbol)}</div>
			<div
				className={`stock-price-header__change ${
					isPositive ? "is-positive" : "is-negative"
				}`}
			>
				{currencySymbol === "$"
					? `${isPositive ? "+" : "-"}$${Math.abs(change).toFixed(2)}`
					: `${isPositive ? "+" : ""}${change.toFixed(2)}`} ({isPositive ? "+" : ""}
				{changePercent.toFixed(2)}%)
			</div>
		</div>
	);
}

export default StockPriceHeader;
