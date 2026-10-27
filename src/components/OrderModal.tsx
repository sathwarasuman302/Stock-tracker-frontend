import { useEffect, useState } from "react";

interface OrderModalProps {
	isOpen: boolean;
	action: "buy" | "sell";
	symbol: string;
	currentPrice: number;
	availableCash?: number;
	maxQuantity?: number;
	positionDirection?: "LONG" | "SHORT";
	defaultQuantity?: number;
	isClosingPosition?: boolean;
	currency?: "INR" | "USD";
	fractionalQuantity?: boolean;
	onConfirm: (quantity: number) => Promise<void>;
	onCancel: () => void;
}

const formatPrice = (value: number, currency: "INR" | "USD") =>
	new Intl.NumberFormat(currency === "USD" ? "en-US" : "en-IN", {
		style: "currency",
		currency,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value);

function OrderModal({
	isOpen,
	action,
	symbol,
	currentPrice,
	availableCash,
	maxQuantity,
	positionDirection,
	defaultQuantity,
	isClosingPosition = false,
	currency = "INR",
	fractionalQuantity = false,
	onConfirm,
	onCancel,
}: OrderModalProps) {
	const [quantity, setQuantity] = useState(10);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		if (isOpen) {
			setQuantity(defaultQuantity ?? 10);
			setError("");
		}
	}, [isOpen, action, symbol, maxQuantity, defaultQuantity]);

	if (!isOpen) return null;

	const estimatedValue = quantity * currentPrice;
	const isBuy = action === "buy";
	const quantityValid = fractionalQuantity
		? Number.isFinite(quantity) && quantity > 0 && Number(quantity.toFixed(8)) === quantity
		: Number.isSafeInteger(quantity) && quantity > 0;
	const isValidQuantity = quantityValid &&
		(!isClosingPosition || quantity <= (maxQuantity ?? 0));
	const exceedsBalance = isBuy && availableCash !== undefined && estimatedValue > availableCash;
	const actionLabel = isClosingPosition
		? "CLOSE POSITION"
		: isBuy
			? positionDirection === "SHORT" ? "BUY TO COVER" : "BUY"
			: positionDirection === "LONG" ? "SELL" : "SELL SHORT";
	const actionHint = isClosingPosition
		? `This will close your ${positionDirection?.toLowerCase() ?? "open"} position.`
		: isBuy
			? positionDirection === "SHORT"
				? "This buys shares to cover your short; any extra quantity opens a long position."
				: "This buys shares and opens or adds to a long position."
			: positionDirection === "LONG"
				? "This sells your long shares; any extra quantity opens a short position."
				: "This opens or adds to a short position.";
	const handleConfirm = async () => {
		if (!isValidQuantity) return;
		setIsSubmitting(true);
		setError("");
		try {
			await onConfirm(quantity);
		} catch (caughtError) {
			setError(caughtError instanceof Error ? caughtError.message : "Order could not be completed.");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="order-modal-overlay" onClick={onCancel}>
			<div
				className={`order-modal ${isBuy ? "order-modal--buy" : "order-modal--sell"}`}
				onClick={(e) => e.stopPropagation()}
				role="dialog"
				aria-modal="true"
				aria-labelledby="order-modal-title"
			>
				<h2 id="order-modal-title" className="order-modal__title">
					{actionLabel} {symbol}
				</h2>

				<p className="order-modal__price">
					Current Price: {formatPrice(currentPrice, currency)} · Paper order
				</p>

				<label className="order-modal__label" htmlFor="order-quantity">
					{fractionalQuantity ? "BTC quantity" : "Quantity"}
				</label>
				<input
					id="order-quantity"
					type="number"
					min={1}
					step={fractionalQuantity ? "0.00000001" : 1}
					max={isClosingPosition ? maxQuantity : undefined}
					readOnly={isClosingPosition}
					className="order-modal__input"
					value={quantity}
					onChange={(e) => {
						const parsed = Number(e.target.value);
						setQuantity(Number.isFinite(parsed) ? parsed : 0);
					}}
				/>
				<p className="order-modal__estimate">{actionHint}</p>
				{!isValidQuantity && <p className="order-modal__error">{fractionalQuantity ? "Enter a positive BTC quantity with up to 8 decimal places" : "Enter a positive whole quantity"}{isClosingPosition ? ` up to ${maxQuantity ?? 0}` : ""}.</p>}

				<p className="order-modal__estimate">
					Estimated Value: {formatPrice(estimatedValue, currency)}
				</p>
				{isBuy && availableCash !== undefined && <p className="order-modal__estimate">Available {currency} paper balance: {formatPrice(availableCash, currency)}</p>}
				{exceedsBalance && <p className="order-modal__error">Insufficient available cash for this order.</p>}
				{error && <p role="alert" className="order-modal__error">{error}</p>}

				<div className="order-modal__actions">
					<button
						type="button"
						className="order-modal__btn order-modal__btn--cancel"
						onClick={onCancel}
					>
						Cancel
					</button>
					<button
						type="button"
						className={`order-modal__btn ${
							isBuy
								? "order-modal__btn--confirm-buy"
								: "order-modal__btn--confirm-sell"
						}`}
						onClick={() => void handleConfirm()}
						disabled={isSubmitting || !isValidQuantity || exceedsBalance}
					>
						{isSubmitting ? "Submitting…" : actionLabel}
					</button>
				</div>
			</div>
		</div>
	);
}

export default OrderModal;
