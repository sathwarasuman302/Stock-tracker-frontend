import { useContext, useState, type FormEvent } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthContext } from "../contexts/AuthContext";
import Header from "../components/Header";
import AuthLayout from "../components/AuthLayout";
import { signInWithGoogle } from "../utils/googleAuth";
import { findRegisteredUser } from "../utils/authStorage";
import { loginAccount } from "../services/authApi";
import { getInvestorProfile } from "../services/paperTradingService";

function GoogleIcon() {
	return (
		<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
			<path
				fill="#4285F4"
				d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
			/>
			<path
				fill="#34A853"
				d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
			/>
			<path
				fill="#FBBC05"
				d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
			/>
			<path
				fill="#EA4335"
				d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
			/>
		</svg>
	);
}

function LoginPage() {
	const { t } = useTranslation("common");
	const location = useLocation();
	const navigate = useNavigate();
	const { authDispatch, ActionTypes } = useContext(AuthContext);
	const registeredEmail = (location.state as { registeredEmail?: string } | null)?.registeredEmail;
	const [email, setEmail] = useState(registeredEmail ?? "");
	const [password, setPassword] = useState("");
	const [step, setStep] = useState<"email" | "password">("email");
	const [error, setError] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const completeLogin = async () => {
		setError("");
		setIsSubmitting(true);
		try {
			const legacyUser = findRegisteredUser(email.trim(), password);
			const registeredUser = legacyUser?.role === "admin"
				? legacyUser
				: await loginAccount(email.trim(), password).catch((caughtError) => {
					if (legacyUser && !(caughtError instanceof Error && caughtError.message === "This account has been deleted.")) return legacyUser;
					throw caughtError;
				});

			authDispatch({
				type: ActionTypes.LOGIN,
				payload: {
					user: {
						email: registeredUser.email,
						first_name: registeredUser.first_name,
						last_name: registeredUser.last_name,
						role: registeredUser.role,
					},
				},
			});
			if (registeredUser.role !== "admin") void getInvestorProfile().catch(() => undefined);
			navigate(registeredUser.role === "admin" ? "/admin" : "/", {
				replace: true,
			});
		} catch (caughtError) {
			setError(caughtError instanceof Error ? caughtError.message : "Email or password is incorrect.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleGoogle = async () => {
		await signInWithGoogle(({ email, first_name, last_name }) => {
			authDispatch({
				type: ActionTypes.LOGIN,
				payload: {
					user: {
						email,
						first_name,
						last_name,
						role: "investor",
					},
				},
			});
			void getInvestorProfile().catch(() => undefined);
			navigate("/", { replace: true });
		});
	};

	const handleContinue = (event: FormEvent) => {
		event.preventDefault();
		if (step === "email") {
			if (!email.trim()) {
				return;
			}
			setStep("password");
			return;
		}
		if (!password.trim()) {
			return;
		}
		void completeLogin();
	};

	return (
		<>
			<Header />
			<AuthLayout
				title={t("welcomeToApp")}
				footer={
					<p className="gw-auth__switch">
						{t("noAccount")}{" "}
						<NavLink to="/register">{t("createAccount")}</NavLink>
					</p>
				}
			>
				<button
					type="button"
					className="gw-auth__google-btn"
					onClick={handleGoogle}
				>
					<GoogleIcon />
					{t("continueWithGoogle")}
				</button>
				{registeredEmail && <p className="gw-auth__feedback gw-auth__feedback--success">Account created. Please sign in to continue.</p>}
				{error && <p className="gw-auth__feedback gw-auth__feedback--error" role="alert">{error}</p>}

				<div className="gw-auth__divider">
					<span>{t("or")}</span>
				</div>

				<form className="gw-auth__form" onSubmit={handleContinue}>
					<label className="gw-auth__field">
						<span>{t("yourEmailAddress")}</span>
						<input
							type="email"
							name="email"
							autoComplete="email"
							required
							value={email}
							onChange={(e) => { setEmail(e.target.value); setError(""); }}
							placeholder="you@email.com"
						/>
					</label>

					{step === "password" && (
						<label className="gw-auth__field">
							<span>{t("password")}</span>
							<input
								type="password"
								name="password"
								autoComplete="current-password"
								required
								minLength={6}
								value={password}
								onChange={(e) => { setPassword(e.target.value); setError(""); }}
							/>
						</label>
					)}

					<button className="gw-auth__continue-btn" type="submit" disabled={isSubmitting}>
						{isSubmitting ? "Signing in…" : t("continue")}
					</button>
				</form>
			</AuthLayout>
		</>
	);
}

export default LoginPage;
