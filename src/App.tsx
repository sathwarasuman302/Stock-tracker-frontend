import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import StocksPage from "./pages/StocksPage";
import MarketsPage from "./pages/MarketsPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import WatchlistPage from "./pages/WatchlistPage";
import EditProfilePage from "./pages/EditProfilePage";
import PortfolioDashboardPage from "./pages/PortfolioDashboardPage";
import AlertsPage from "./pages/AlertsPage";
import NotFoundPage from "./pages/NotFoundPage";
import StockDetailPage from "./pages/StockDetailPage";
import RequireRole from "./components/RequireRole";
import RequireAdmin from "./pages/admin/RequireAdmin";
import OrderHistoryPage from "./pages/OrderHistoryPage";
import InvestorDashboardPage from "./pages/InvestorDashboardPage";
import InvestorTransactionsPage from "./pages/InvestorTransactionsPage";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminStocksPage from "./pages/admin/AdminStocksPage";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage";
import "./assets/css/trading-terminal.css";
import "./assets/css/toast-notification.css";
import "./assets/css/theme.css";
import { ThemeProvider } from "./contexts/ThemeContext";

function App() {
	return (
		<ThemeProvider>
			<Routes>
				<Route path="/login" element={<LoginPage />} />
				<Route path="/register" element={<RegisterPage />} />
				<Route
					path="/admin"
					element={
						<RequireAdmin>
							<AdminLayout />
						</RequireAdmin>
					}
				>
					<Route index element={<AdminDashboardPage />} />
					<Route path="users" element={<AdminUsersPage />} />
					<Route path="stocks" element={<AdminStocksPage />} />
					<Route path="orders" element={<AdminOrdersPage />} />
				</Route>
				<Route element={<Layout />}>
					<Route path="/" element={<HomePage />} />
					<Route path="/stocks" element={<StocksPage />} />
					<Route path="/stocks/:stockId" element={<StockDetailPage />} />
					<Route path="/markets" element={<MarketsPage />} />
					<Route path="/watchlist" element={<WatchlistPage />} />
					<Route path="/edit-profile" element={<EditProfilePage />} />
					<Route
						path="/investor"
						element={
							<RequireRole roles={["investor"]}>
								<InvestorDashboardPage />
							</RequireRole>
						}
					/>
					<Route
						path="/trader"
						element={
							<RequireRole roles={["trader"]}>
								<InvestorDashboardPage />
							</RequireRole>
						}
					/>
					<Route
						path="/investor/transactions"
						element={
							<RequireRole roles={["trader", "investor"]}>
								<InvestorTransactionsPage />
							</RequireRole>
						}
					/>
					<Route
						path="/portfolio/dashboard"
						element={
							<RequireRole roles={["trader", "investor"]}>
								<PortfolioDashboardPage />
							</RequireRole>
						}
					/>
					<Route
						path="/orders"
						element={
							<RequireRole roles={["trader", "investor"]}>
								<OrderHistoryPage />
							</RequireRole>
						}
					/>
					<Route path="/portfolio/alerts" element={<AlertsPage />} />
					<Route
						path="/add-stock"
						element={
							<RequireAdmin>
								<Navigate to="/admin/stocks" replace />
							</RequireAdmin>
						}
					/>
					<Route path="*" element={<NotFoundPage />} />
				</Route>
			</Routes>
		</ThemeProvider>
	);
}

export default App;
