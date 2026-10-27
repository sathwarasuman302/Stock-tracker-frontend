import { useContext, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";
import { AuthContext } from "../contexts/AuthContext";
import { updateProfileAvatar } from "../services/authApi";
import {
	getInvestorProfile,
	getPaperOrders,
	type InvestorProfile,
	type PaperOrder,
} from "../services/paperTradingService";
import { createProfileImageDataUrl } from "../utils/profileImage";
import "../assets/css/investor-account.css";

const formatMoney = (value: number) =>
	`₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function InvestorDashboardPage() {
	const { state, authDispatch, ActionTypes } = useContext(AuthContext);
	const [profile, setProfile] = useState<InvestorProfile | null>(null);
	const [orders, setOrders] = useState<PaperOrder[]>([]);
	const [error, setError] = useState("");
	const [avatarError, setAvatarError] = useState("");
	const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
	const avatarInput = useRef<HTMLInputElement>(null);
	const isTrader = state.user?.role === "trader";
	const accountLabel = isTrader ? "TRADER ACCOUNT" : "INVESTOR ACCOUNT";
	const dashboardTitle = isTrader ? "Trader Dashboard" : "Investor Dashboard";
	const displayName = `${state.user?.first_name ?? ""} ${state.user?.last_name ?? ""}`.trim() || state.user?.email || (isTrader ? "Trader" : "Investor");

	useEffect(() => {
		let active = true;
		const refresh = async () => {
			try {
				const [nextProfile, nextOrders] = await Promise.all([getInvestorProfile(), getPaperOrders()]);
				if (active) {
					setProfile(nextProfile);
					setOrders(nextOrders.slice(0, 5));
					if (state.user && nextProfile.avatarUrl !== state.user.avatarUrl) {
						authDispatch({
							type: ActionTypes.LOGIN,
							payload: { user: { ...state.user, avatarUrl: nextProfile.avatarUrl } },
						});
					}
					setError("");
				}
			} catch (caughtError) {
				if (active) setError(caughtError instanceof Error ? caughtError.message : `${isTrader ? "Trader" : "Investor"} account could not be loaded.`);
			}
		};
		void refresh();
		const intervalId = window.setInterval(() => void refresh(), 3000);
		return () => {
			active = false;
			window.clearInterval(intervalId);
		};
	}, [isTrader, state.user?.avatarUrl, state.user?.email]);

	const handleAvatarChange = async (file?: File) => {
		if (!file) return;
		setIsUpdatingAvatar(true);
		setAvatarError("");
		try {
			const avatarUrl = await createProfileImageDataUrl(file);
			const user = await updateProfileAvatar(avatarUrl);
			authDispatch({ type: ActionTypes.LOGIN, payload: { user } });
			setProfile((current) => current ? { ...current, avatarUrl: user.avatarUrl ?? "" } : current);
		} catch (caughtError) {
			setAvatarError(caughtError instanceof Error ? caughtError.message : "The profile photo could not be updated.");
		} finally {
			setIsUpdatingAvatar(false);
		}
	};

	const handleRemoveAvatar = async () => {
		setIsUpdatingAvatar(true);
		setAvatarError("");
		try {
			const user = await updateProfileAvatar("");
			authDispatch({ type: ActionTypes.LOGIN, payload: { user } });
			setProfile((current) => current ? { ...current, avatarUrl: "" } : current);
		} catch (caughtError) {
			setAvatarError(caughtError instanceof Error ? caughtError.message : "The profile photo could not be removed.");
		} finally {
			setIsUpdatingAvatar(false);
		}
	};

	const cards = [
		{ label: "Net market value", value: formatMoney(profile?.currentValue ?? 0), detail: "Long holdings less short liabilities" },
		{ label: "Available cash", value: formatMoney(profile?.cashBalance ?? 0), detail: "Ready to invest", id: "balance" },
		{ label: "Open position basis", value: formatMoney(profile?.totalInvested ?? 0), detail: "Entry basis of long and short positions" },
		{ label: "Total P&L", value: formatMoney(profile?.totalPnl ?? 0), detail: `${(profile?.totalPnlPercent ?? 0).toFixed(2)}% return` , positive: (profile?.totalPnl ?? 0) >= 0 },
		{ label: "Today's P&L", value: formatMoney(profile?.todayPnl ?? 0), detail: "Against seeded market reference", positive: (profile?.todayPnl ?? 0) >= 0 },
		{ label: "Open positions", value: String(profile?.openPositionCount ?? 0), detail: `${profile?.closedPositionCount ?? 0} closed positions` },
	];

	return (
		<PageShell title={dashboardTitle} lead="Your account, cash balance, and live holdings at a glance.">
			<section className="investor-welcome">
				<div className="investor-welcome__profile">
					<button
						className="investor-avatar"
						type="button"
						aria-label={profile?.avatarUrl || state.user?.avatarUrl ? "Change profile photo" : "Add profile photo"}
						onClick={() => avatarInput.current?.click()}
						disabled={isUpdatingAvatar}
					>
						{profile?.avatarUrl || state.user?.avatarUrl
							? <img src={profile?.avatarUrl || state.user?.avatarUrl} alt="" />
							: displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
					</button>
					<input
						ref={avatarInput}
						className="investor-avatar__input"
						type="file"
						accept="image/jpeg,image/png,image/webp"
						aria-label="Upload a profile photo"
						onChange={(event) => {
							const file = event.target.files?.[0];
							event.target.value = "";
							void handleAvatarChange(file);
						}}
					/>
					<button
						className="investor-avatar__action"
						type="button"
						onClick={() => avatarInput.current?.click()}
						disabled={isUpdatingAvatar}
					>
						{isUpdatingAvatar ? "Saving photo…" : profile?.avatarUrl || state.user?.avatarUrl ? "Change photo" : "Add photo"}
					</button>
					{(profile?.avatarUrl || state.user?.avatarUrl) && (
						<button
							className="investor-avatar__remove"
							type="button"
							onClick={() => void handleRemoveAvatar()}
							disabled={isUpdatingAvatar}
						>
							Remove
						</button>
					)}
				</div>
				<div><span className="investor-eyebrow">{accountLabel}</span><h2>Welcome, {displayName}</h2><p>{state.user?.email}</p></div>
				<div className="investor-welcome__links"><Link to="/portfolio/dashboard">Holdings</Link><Link to="/orders">Order history</Link></div>
			</section>
			{error && <p className="investor-error" role="alert">{error}</p>}
			{avatarError && <p className="investor-error" role="alert">{avatarError}</p>}
			<section className="investor-card-grid" aria-label="Account summary">
				{cards.map((card) => <article className="investor-metric" id={card.id} key={card.label}>
					<span>{card.label}</span><strong className={card.positive === undefined ? "" : card.positive ? "is-positive" : "is-negative"}>{card.value}</strong><small>{card.detail}</small>
				</article>)}
			</section>
			<section className="investor-section">
				<div className="investor-section__heading"><div><span className="investor-eyebrow">YOUR INVESTMENTS</span><h2>Open positions</h2></div><Link to="/portfolio/dashboard">All holdings →</Link></div>
				<div className="jp-table-wrap">
					<table className="jp-table">
						<thead><tr><th>Stock</th><th>Direction</th><th>Quantity</th><th>Avg. entry</th><th>Current</th><th>Net market value</th><th>Unrealized P&amp;L</th></tr></thead>
						<tbody>{(profile?.positions ?? []).length === 0 ? <tr><td colSpan={7}>No open positions yet. Explore stocks to place your first paper trade.</td></tr> : profile?.positions.map((position) => <tr key={position.id}><td>{position.symbol}</td><td>{position.direction}</td><td>{position.quantity}</td><td>{formatMoney(position.averageBuyPrice)}</td><td>{formatMoney(position.currentPrice)}</td><td>{formatMoney(position.currentValue)}</td><td className={position.unrealizedPnl >= 0 ? "is-positive" : "is-negative"}>{formatMoney(position.unrealizedPnl)} ({position.unrealizedPnlPercent.toFixed(2)}%)</td></tr>)}</tbody>
					</table>
				</div>
			</section>
			<section className="investor-section">
				<div className="investor-section__heading"><div><span className="investor-eyebrow">ACTIVITY</span><h2>Recent orders</h2></div><Link to="/orders">All orders →</Link></div>
				<div className="jp-table-wrap">
					<table className="jp-table"><thead><tr><th>Side</th><th>Stock</th><th>Quantity</th><th>Price</th><th>Total value</th><th>Date &amp; time</th></tr></thead>
						<tbody>{orders.length === 0 ? <tr><td colSpan={6}>Your completed orders will appear here.</td></tr> : orders.map((order) => <tr key={order.id}><td className={`jp-side jp-side--${order.side.toLowerCase()}`}>{order.side}</td><td>{order.symbol}</td><td>{order.quantity}</td><td>{formatMoney(order.price)}</td><td>{formatMoney(order.totalValue)}</td><td>{new Date(order.timestamp).toLocaleString()}</td></tr>)}</tbody>
					</table>
				</div>
			</section>
		</PageShell>
	);
}

export default InvestorDashboardPage;
