import {
	useContext,
	useEffect,
	useState,
	type FC,
} from "react";
import {
	NavLink,
	useLocation,
	useNavigate,
} from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import ThemeToggle from "./ThemeToggle";
import "../assets/css/site-chrome.css";

const Header: FC = () => {
	const { t } = useTranslation("common");
	const navigate = useNavigate();
	const location = useLocation();
	const authContext = useContext(AuthContext);
	const { isAuthenticated, user } = authContext.state;
	const isAdmin = isAuthenticated && user?.role === "admin";
	const isTrader = isAuthenticated && user?.role === "trader";
	const isInvestor = isAuthenticated && user?.role === "investor";
	const isMember = isTrader || isInvestor;
	const accountProfilePath = isTrader ? "/trader" : "/investor";
	const accountProfileLabel = isTrader ? "Trader Profile" : "Investor Profile";

	const [scrolled, setScrolled] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);
	const [openDropdown, setOpenDropdown] = useState<string | null>(null);

	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 8);
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	useEffect(() => {
		setMenuOpen(false);
		setOpenDropdown(null);
	}, [location.pathname]);

	const handleLogout = () => {
		authContext.authDispatch({
			type: authContext.ActionTypes.LOGOUT,
			payload: {},
		});
		setMenuOpen(false);
		setOpenDropdown(null);
		navigate("/", { replace: true });
	};

	const getFullName = () => {
		if (!user) return t("account");
		const name = `${user.first_name || ""} ${user.last_name || ""}`.trim();
		return name || user.email || t("account");
	};

	const closeMenu = () => {
		setMenuOpen(false);
		setOpenDropdown(null);
	};

	const toggleDropdown = (key: string) => {
		setOpenDropdown((previous) => (previous === key ? null : key));
	};

	return (
		<header className="jp-header">
			<nav
				className={`jp-nav${scrolled ? " is-scrolled" : ""}`}
				aria-label="Main navigation"
			>
				<div className="container jp-nav__inner">
					<NavLink className="jp-brand" to="/" onClick={closeMenu}>
						<img
							className="jp-brand__mark"
							src="/Favicon.png"
							alt=""
							aria-hidden="true"
						/>
						<span className="jp-brand__text">Stock Tracker</span>
					</NavLink>

					<button
						type="button"
						className="jp-nav__toggle"
						aria-expanded={menuOpen}
						aria-controls="jp-main-menu"
						aria-label="Toggle navigation"
						onClick={() => setMenuOpen((open) => !open)}
					>
						<span className="jp-nav__toggle-bars" aria-hidden="true">
							<span />
							<span />
							<span />
						</span>
					</button>

					<ul
						id="jp-main-menu"
						className={`jp-nav__menu${menuOpen ? " is-open" : ""}`}
					>
						<li>
							<NavLink className="jp-nav__link" to="/" end onClick={closeMenu}>
								{t("home")}
							</NavLink>
						</li>

						<li>
							<NavLink className="jp-nav__link" to="/stocks" onClick={closeMenu}>
								{t("stocks")}
							</NavLink>
						</li>

						{!isMember && (
							<li>
								<NavLink className="jp-nav__link" to="/markets" onClick={closeMenu}>
									{t("markets")}
								</NavLink>
							</li>
						)}

						{!isAuthenticated && (
							<li
								className={
									openDropdown === "signin" ? "is-open" : ""
								}
							>
								<button
									type="button"
									className="jp-nav__link"
									aria-expanded={openDropdown === "signin"}
									onClick={() => toggleDropdown("signin")}
								>
									{t("signIn")}
								</button>
								<ul className="jp-nav__dropdown">
									<li>
										<NavLink to="/login" onClick={closeMenu}>
											{t("login")}
										</NavLink>
									</li>
									<li>
										<NavLink to="/register" onClick={closeMenu}>
											{t("registration")}
										</NavLink>
									</li>
								</ul>
							</li>
						)}

						{isAdmin && (
							<>
								<li>
									<NavLink
										className="jp-nav__cta"
										to="/admin/stocks"
										onClick={closeMenu}
									>
										{t("addStock")}
									</NavLink>
								</li>
								<li>
									<NavLink
										className="jp-nav__link"
										to="/admin"
										onClick={closeMenu}
									>
										{t("adminPanel")}
									</NavLink>
								</li>
								<li
									className={
										openDropdown === "account" ? "is-open" : ""
									}
								>
									<button
										type="button"
										className="jp-nav__link jp-nav__user"
										aria-expanded={openDropdown === "account"}
										onClick={() => toggleDropdown("account")}
									>
										<span className="jp-nav__user-avatar" aria-hidden="true">
											{user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : getFullName().slice(0, 1).toUpperCase()}
										</span>
										{getFullName()}
									</button>
									<ul className="jp-nav__dropdown">
										<li>
											<NavLink to="/edit-profile" onClick={closeMenu}>
												{t("editProfile")}
											</NavLink>
										</li>
										<li>
											<button type="button" onClick={handleLogout}>
												{t("logOut")}
											</button>
										</li>
									</ul>
								</li>
							</>
						)}

						{isMember && (
							<>
								{isTrader && (
									<li>
										<NavLink
											className="jp-nav__link"
											to="/portfolio/dashboard"
											onClick={closeMenu}
										>
											{t("viewPortfolio")}
										</NavLink>
									</li>
								)}
								<li>
									<NavLink
										className="jp-nav__link"
										to="/orders"
										onClick={closeMenu}
									>
										{t("orderHistory")}
									</NavLink>
								</li>
								<li>
									<NavLink
										className="jp-nav__link"
										to="/markets"
										onClick={closeMenu}
									>
										{t("marketStatus")}
									</NavLink>
								</li>
								<li
									className={
										openDropdown === "account" ? "is-open" : ""
									}
								>
									<button
										type="button"
										className="jp-nav__link jp-nav__user"
										aria-expanded={openDropdown === "account"}
										onClick={() => toggleDropdown("account")}
									>
										<span className="jp-nav__user-avatar" aria-hidden="true">
											{user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : getFullName().slice(0, 1).toUpperCase()}
										</span>
										{getFullName()}
									</button>
									<ul className="jp-nav__dropdown">
										<li><NavLink to={accountProfilePath} onClick={closeMenu}>{accountProfileLabel}</NavLink></li>
										<li><NavLink to="/portfolio/dashboard" onClick={closeMenu}>{t("holdings")}</NavLink></li>
										<li><NavLink to="/orders" onClick={closeMenu}>Orders</NavLink></li>
										<li><NavLink to="/investor/transactions" onClick={closeMenu}>Transaction History</NavLink></li>
										<li>
											<NavLink to="/edit-profile" onClick={closeMenu}>
												Settings
											</NavLink>
										</li>
										<li>
											<button type="button" onClick={handleLogout}>
												{t("logOut")}
											</button>
										</li>
									</ul>
								</li>
							</>
						)}

					</ul>
					<ThemeToggle className="jp-nav__theme-toggle" />
				</div>
			</nav>
		</header>
	);
};

export default Header;
