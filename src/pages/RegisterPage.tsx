import { useContext, useState, type FormEvent } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthContext, type User } from "../contexts/AuthContext";
import Header from "../components/Header";
import AuthLayout from "../components/AuthLayout";
import { signInWithGoogle } from "../utils/googleAuth";
import { registerAccount } from "../services/authApi";
import { getInvestorProfile } from "../services/paperTradingService";
import { createProfileImageDataUrl } from "../utils/profileImage";

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

function RegisterPage() {
	const { t } = useTranslation("common");
	const navigate = useNavigate();
	const { authDispatch, ActionTypes } = useContext(AuthContext);
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [avatarUrl, setAvatarUrl] = useState("");
	const [isPreparingPhoto, setIsPreparingPhoto] = useState(false);
	const [role, setRole] = useState<"investor" | "trader">("investor");
	const [step, setStep] = useState<"email" | "details">("email");
	const [error, setError] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const completeRegister = async () => {
		setError("");
		setIsSubmitting(true);
		try {
			const registeredUser = await registerAccount({
				first_name: firstName.trim(),
				last_name: lastName.trim(),
				email: email.trim().toLowerCase(),
				password,
				role,
				...(avatarUrl ? { avatarUrl } : {}),
			});
			authDispatch({ type: ActionTypes.LOGOUT, payload: {} });
			navigate("/login", {
				replace: true,
				state: { registeredEmail: registeredUser.email },
			});
		} catch (caughtError) {
			setError(caughtError instanceof Error ? caughtError.message : "Your account could not be created.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleGoogle = async () => {
		await signInWithGoogle(({ email, first_name, last_name, role }) => {
			const user: User = {
				first_name,
				last_name,
				email,
				role: role ?? "investor",
			};

			authDispatch({
				type: ActionTypes.LOGIN,
				payload: { user },
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
			setStep("details");
			return;
		}
		if (!firstName.trim() || !lastName.trim() || !password.trim()) {
			return;
		}
		void completeRegister();
	};

	const handleProfileImage = async (file?: File) => {
		if (!file) return;
		setError("");
		setIsPreparingPhoto(true);
		try {
			setAvatarUrl(await createProfileImageDataUrl(file));
		} catch (caughtError) {
			setError(caughtError instanceof Error ? caughtError.message : "The profile photo could not be processed.");
		} finally {
			setIsPreparingPhoto(false);
		}
	};

	return (
		<>
			<Header />
			<AuthLayout
				title={t("createYourAccount")}
				footer={
					<p className="gw-auth__switch">
						{t("haveAccount")} {" "}
						<NavLink to="/login">{t("login")}</NavLink>
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
							onChange={(e) => setEmail(e.target.value)}
							placeholder="you@email.com"
						/>
					</label>

					{step === "details" && (
						<>
							<div className="gw-auth__row">
								<label className="gw-auth__field">
									<span>{t("firstName")}</span>
									<input
										type="text"
										name="firstName"
										autoComplete="given-name"
										required
										value={firstName}
										onChange={(e) =>
											setFirstName(e.target.value)
										}
									/>
								</label>
								<label className="gw-auth__field">
									<span>{t("lastName")}</span>
									<input
										type="text"
										name="lastName"
										autoComplete="family-name"
										required
										value={lastName}
										onChange={(e) =>
											setLastName(e.target.value)
										}
									/>
								</label>
							</div>

							<label className="gw-auth__field">
								<span>{t("password")}</span>
								<input
									type="password"
									name="password"
									autoComplete="new-password"
									required
									minLength={6}
									value={password}
									onChange={(e) =>
										setPassword(e.target.value)
									}
								/>
							</label>

							<div className="gw-auth__profile-photo">
								<div className="gw-auth__profile-photo-preview" aria-hidden="true">
									{avatarUrl
										? <img src={avatarUrl} alt="" />
										: <span>{firstName.trim().slice(0, 1).toUpperCase() || "?"}</span>}
								</div>
								<label className="gw-auth__field gw-auth__profile-photo-field">
									<span>Profile photo (optional)</span>
									<input
										type="file"
										name="profilePhoto"
										accept="image/jpeg,image/png,image/webp"
										aria-describedby="profile-photo-hint"
										onChange={(event) => {
											const file = event.target.files?.[0];
											event.target.value = "";
											void handleProfileImage(file);
										}}
									/>
									<small id="profile-photo-hint">JPG, PNG, or WebP. Photo is resized before upload.</small>
								</label>
								{avatarUrl && (
									<button
										className="gw-auth__profile-photo-remove"
										type="button"
										onClick={() => setAvatarUrl("")}
									>
										Remove photo
									</button>
								)}
							</div>

							<label className="gw-auth__field">
								<span>{t("accountType")}</span>
								<select
									name="role"
									value={role}
									onChange={(e) =>
										setRole(
											e.target.value as "investor" | "trader"
										)
									}
								>
									<option value="investor">
										{t("investor")}
									</option>
									<option value="trader">{t("trader")}</option>
								</select>
							</label>
						</>
					)}

					<button className="gw-auth__continue-btn" type="submit" disabled={isSubmitting || isPreparingPhoto}>
						{isPreparingPhoto ? "Preparing photo…" : isSubmitting ? "Creating account…" : t("continue")}
					</button>
				</form>
			</AuthLayout>
		</>
	);
}

export default RegisterPage;
