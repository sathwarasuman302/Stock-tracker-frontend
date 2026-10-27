import { getAuthSession, type UserRole } from "../utils/authStorage";
import type { AdminCatalogStock } from "./adminStockCatalog";

export type TradeSide = "BUY" | "SELL";
export type PositionStatus = "OPEN" | "CLOSED";
export type PositionDirection = "LONG" | "SHORT";

export type PaperOrder = {
	id: string;
	positionId: string;
	stockId: string;
	symbol: string;
	side: TradeSide;
	quantity: number;
	price: number;
	totalValue: number;
	timestamp: number;
	status: "FILLED";
	realizedPnl: number;
	clientOrderId?: string;
};

export type PaperPosition = {
	id: string;
	stockId: string;
	symbol: string;
	direction: PositionDirection;
	quantity: number;
	averageBuyPrice: number;
	investedAmount: number;
	realizedPnl: number;
	status: PositionStatus;
	openedAt: number;
	updatedAt: number;
	closedAt: number | null;
	finalSellPrice: number | null;
	currentPrice: number;
	currentValue: number;
	unrealizedPnl: number;
	unrealizedPnlPercent: number;
};

export type PortfolioSnapshot = {
	initialBalance: number;
	cashBalance: number;
	positions: PaperPosition[];
	totalInvested: number;
	currentValue: number;
	unrealizedPnl: number;
	realizedPnl: number;
	totalPnl: number;
	totalPnlPercent: number;
	todayPnl: number;
	openPositionCount: number;
	closedPositionCount: number;
	holdingCount: number;
	totalAccountValue: number;
};

export type InvestorProfile = {
	id: string;
	email: string;
	name: string;
	avatarUrl: string;
} & PortfolioSnapshot;

export type InvestorBalance = {
	initialBalance: number;
	availableCash: number;
	cashBalance: number;
	totalAccountValue: number;
	currency?: "INR" | "USD";
};

export type AdminInvestorAccount = InvestorProfile & {
	role: "investor" | "trader";
	closedPositions: PaperPosition[];
	orders: PaperOrder[];
};

export type AdminRegisteredUser = {
	first_name: string;
	last_name: string;
	email: string;
	role: UserRole;
	avatarUrl?: string;
	createdAt?: number;
};

export type AdminStockQuote = {
	symbol: string;
	exchange: string;
	price: number;
	change: number;
	changePercent: number;
	lastUpdated: number;
	dataSource: "delayed";
	sector: string | null;
	sectorError?: string;
};

export type AdminOrder = PaperOrder & {
	ownerEmail: string;
	ownerRole: UserRole;
};

export type AdminOverviewMetrics = {
	users: number;
	investors: number;
	traders: number;
	admins: number;
	stocks: number;
	orders: number;
	holdings: number;
	cash: number;
	portfolioValue: number;
	pnl: number;
};

export type AdminOverviewAccount = {
	first_name: string;
	last_name: string;
	email: string;
	role: UserRole;
	cashBalance: number | null;
	currentValue: number | null;
	totalPnl: number | null;
	openPositionCount: number | null;
	orderCount: number | null;
};

export type AdminOverview = {
	database: string;
	updatedAt: string;
	metrics: AdminOverviewMetrics;
	accounts: AdminOverviewAccount[];
};

export type TradeExecution = {
	order: PaperOrder;
	position: Omit<
		PaperPosition,
		"currentPrice" | "currentValue" | "unrealizedPnl" | "unrealizedPnlPercent"
	>;
	cashBalance: number;
};

const resolveApiUrl = () => {
	const configured = import.meta.env.VITE_MARKET_API_URL as string | undefined;
	return configured?.trim() ? configured : "/api";
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
	const user = getAuthSession();
	if (!user?.email) {
		throw new Error("Sign in to access your investor account.");
	}
	const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
	const response = await fetch(`${resolveApiUrl()}${path}`, {
		...init,
		headers: {
			"Content-Type": "application/json",
			"X-Investor-Id": user.email,
			"X-Investor-Name": fullName || user.email,
			"X-Investor-Avatar": user.avatarUrl?.startsWith("data:image/") ? "" : user.avatarUrl ?? "",
			"X-Investor-Role": user.role ?? "investor",
			...init?.headers,
		},
	});
	const payload = (await response.json().catch(() => ({}))) as { error?: string };
	if (!response.ok) {
		throw new Error(payload.error ?? "The trading service could not complete the request.");
	}
	return payload as T;
};

export const getPaperPortfolio = (): Promise<PortfolioSnapshot> =>
	request<PortfolioSnapshot>("/portfolio");

export const getInvestorProfile = (): Promise<InvestorProfile> =>
	request<InvestorProfile>("/investor/profile");

export const getInvestorBalance = (): Promise<InvestorBalance> =>
	request<InvestorBalance>("/investor/balance");

export const getPaperOrders = (): Promise<PaperOrder[]> =>
	request<PaperOrder[]>("/orders");

export const getPaperPositions = (status?: PositionStatus): Promise<PaperPosition[]> =>
	request<PaperPosition[]>(`/positions${status ? `?status=${status}` : ""}`);

export const getCryptoPaperBalance = (): Promise<InvestorBalance> =>
	request<InvestorBalance>("/crypto/balance");

export const getCryptoPaperPositions = (status?: PositionStatus): Promise<PaperPosition[]> =>
	request<PaperPosition[]>(`/crypto/positions${status ? `?status=${status}` : ""}`);

export const getInvestorTransactions = (): Promise<PaperOrder[]> =>
	request<PaperOrder[]>("/transactions");

export const getAdminInvestorAccounts = (): Promise<AdminInvestorAccount[]> =>
	request<AdminInvestorAccount[]>("/admin/investors");

export const getAdminOrders = (): Promise<AdminOrder[]> =>
	request<AdminOrder[]>("/admin/orders");

export const getAdminOverview = (): Promise<AdminOverview | null> =>
	request<AdminOverview | null>("/admin/overview");

export const getAdminStocks = (): Promise<AdminCatalogStock[]> =>
	request<AdminCatalogStock[]>("/admin/stocks");

export const getAdminStockQuote = (symbol: string, exchange: string): Promise<AdminStockQuote> =>
	request<AdminStockQuote>("/admin/stocks/quote", {
		method: "POST",
		body: JSON.stringify({ symbol, exchange }),
	});

export const getAdminUsers = (): Promise<AdminRegisteredUser[]> =>
	request<AdminRegisteredUser[]>("/admin/users");

export const createAdminUser = (user: {
	first_name: string;
	last_name: string;
	email: string;
	password: string;
	role: "investor" | "trader" | "admin";
	avatarUrl?: string;
}): Promise<{ user: AdminRegisteredUser }> =>
	request<{ user: AdminRegisteredUser }>("/admin/users", {
		method: "POST",
		body: JSON.stringify(user),
	});

export const deleteAdminUser = (email: string): Promise<{
	email: string;
	deletedAuthUsers: number;
	deletedTradingAccounts: number;
}> => request(`/admin/users/${encodeURIComponent(email)}`, { method: "DELETE" });

export const saveAdminStock = (stock: AdminCatalogStock): Promise<AdminCatalogStock> =>
	request<AdminCatalogStock>(`/admin/stocks/${encodeURIComponent(stock.id)}`, {
		method: "PUT",
		body: JSON.stringify(stock),
	});

export const deleteAdminStock = (id: string): Promise<{ id: string; deleted: boolean }> =>
	request(`/admin/stocks/${encodeURIComponent(id)}`, { method: "DELETE" });

export const placePaperOrder = (
	stockId: string,
	action: "buy" | "sell",
	quantity: number,
	stock?: { symbol: string; exchange: string; basePrice: number }
): Promise<TradeExecution> =>
	request<TradeExecution>(`/orders/${action}`, {
		method: "POST",
		body: JSON.stringify({
			stockId,
			quantity,
			...(stock ?? {}),
			clientOrderId: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
		}),
	});

export const placeCryptoPaperOrder = (
	action: "buy" | "sell",
	quantity: number,
	stock: { stockId: string; symbol: string }
): Promise<TradeExecution> =>
	request<TradeExecution>(`/crypto/orders/${action}`, {
		method: "POST",
		body: JSON.stringify({
			stockId: stock.stockId,
			symbol: stock.symbol,
			quantity,
			clientOrderId: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
		}),
	});
