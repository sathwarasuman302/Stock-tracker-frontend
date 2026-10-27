import { useEffect, useState } from "react";
import PageShell from "../components/PageShell";
import { getInvestorTransactions, type PaperOrder } from "../services/paperTradingService";
import "../assets/css/investor-account.css";

const formatMoney = (value: number) =>
	`₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function InvestorTransactionsPage() {
	const [transactions, setTransactions] = useState<PaperOrder[]>([]);
	const [error, setError] = useState("");

	useEffect(() => {
		let active = true;
		const refresh = async () => {
			try {
				const result = await getInvestorTransactions();
				if (active) { setTransactions(result); setError(""); }
			} catch (caughtError) {
				if (active) setError(caughtError instanceof Error ? caughtError.message : "Transaction history could not be loaded.");
			}
		};
		void refresh();
		const intervalId = window.setInterval(() => void refresh(), 5000);
		return () => { active = false; window.clearInterval(intervalId); };
	}, []);

	return <PageShell title="Transaction History" lead="A complete record of your investor account activity.">
		{error && <p className="investor-error" role="alert">{error}</p>}
		<div className="jp-table-wrap">
			<table className="jp-table"><thead><tr><th>Type</th><th>Stock</th><th>Quantity</th><th>Price</th><th>Total value</th><th>Date &amp; time</th><th>Status</th><th>Realized P&amp;L</th></tr></thead>
				<tbody>{transactions.length === 0 ? <tr><td colSpan={8}>No transactions yet.</td></tr> : transactions.map((transaction) => <tr key={transaction.id}><td className={`jp-side jp-side--${transaction.side.toLowerCase()}`}>{transaction.side}</td><td>{transaction.symbol}</td><td>{transaction.quantity}</td><td>{formatMoney(transaction.price)}</td><td>{formatMoney(transaction.totalValue)}</td><td>{new Date(transaction.timestamp).toLocaleString()}</td><td>{transaction.status}</td><td className={transaction.realizedPnl >= 0 ? "is-positive" : "is-negative"}>{transaction.realizedPnl === 0 ? "—" : formatMoney(transaction.realizedPnl)}</td></tr>)}</tbody>
			</table>
		</div>
	</PageShell>;
}

export default InvestorTransactionsPage;
