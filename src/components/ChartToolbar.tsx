interface ChartToolbarProps {
	onBuy?: () => void;
	onSell?: () => void;
	onUndo?: () => void;
	onRedo?: () => void;
	onIndicators?: () => void;
	tradingDisabled?: boolean;
}

function ChartToolbar({
	onBuy,
	onSell,
	onUndo,
	onRedo,
	onIndicators,
	tradingDisabled = false,
}: ChartToolbarProps) {
	return (
		<div className="chart-toolbar">
			<div className="chart-toolbar-left">
				<button
					className="chart-toolbar-btn chart-toolbar-btn--icon"
					title="Add"
				>
					➕
				</button>
				<button
					className="chart-toolbar-btn chart-toolbar-btn--icon"
					title="Indicators"
					onClick={onIndicators}
				>
					◌
				</button>
				<button
					className="chart-toolbar-btn chart-toolbar-btn--icon"
					title="Undo"
					onClick={onUndo}
				>
					↶
				</button>
				<button
					className="chart-toolbar-btn chart-toolbar-btn--icon"
					title="Redo"
					onClick={onRedo}
				>
					↷
				</button>
			</div>

			<div className="chart-toolbar-right">
				<button
					className="chart-toolbar-btn chart-toolbar-btn--buy"
					onClick={onBuy}
					disabled={tradingDisabled}
				>
					Buy
				</button>
				<button
					className="chart-toolbar-btn chart-toolbar-btn--sell"
					onClick={onSell}
					disabled={tradingDisabled}
				>
					Sell
				</button>
			</div>
		</div>
	);
}

export default ChartToolbar;
