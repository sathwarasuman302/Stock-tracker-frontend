import { useContext, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { AuthContext } from "../../contexts/AuthContext";
import {
	createAdminUser,
	deleteAdminUser,
	getAdminInvestorAccounts,
	getAdminUsers,
	type AdminInvestorAccount,
	type AdminRegisteredUser,
} from "../../services/paperTradingService";
import {
	deleteRegisteredUser,
	getRegisteredUsers,
	saveRegisteredUser,
	type RegisteredUser,
	type UserRole,
} from "../../utils/authStorage";

type AdminUserRecord = {
	first_name: string;
	last_name: string;
	email: string;
	role: UserRole;
	avatarUrl?: string;
	createdAt?: number;
	isLocalUser: boolean;
};

const AdminUserAvatar = ({ name, avatarUrl, onOpen }: {
	name: string;
	avatarUrl?: string;
	onOpen: (src: string, name: string) => void;
}) => {
	const [imageFailed, setImageFailed] = useState(false);
	const initials = name.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "?";
	const hasPhoto = Boolean(avatarUrl && !imageFailed);
	return (
		<button
			className={`admin-user-avatar${hasPhoto ? " has-photo" : ""}`}
			type="button"
			aria-label={hasPhoto ? `View ${name}'s profile photo` : `${name} has no profile photo`}
			title={hasPhoto ? "View profile photo" : "No profile photo uploaded"}
			disabled={!hasPhoto}
			onClick={() => hasPhoto && avatarUrl && onOpen(avatarUrl, name)}
		>
			{hasPhoto
				? <img src={avatarUrl} alt="" onError={() => setImageFailed(true)} />
				: initials}
		</button>
	);
};

function AdminUsersPage() {
	const { t } = useTranslation("common");
	const { state } = useContext(AuthContext);
	const [query, setQuery] = useState("");
	const [users, setUsers] = useState<RegisteredUser[]>(() => getRegisteredUsers());
	const [serverUsers, setServerUsers] = useState<AdminRegisteredUser[]>([]);
	const [accounts, setAccounts] = useState<AdminInvestorAccount[]>([]);
	const [databaseError, setDatabaseError] = useState("");
	const [selectedPhoto, setSelectedPhoto] = useState<{ src: string; name: string } | null>(null);
	const legacyUsersMigrationStarted = useRef(false);
	const [deletingEmail, setDeletingEmail] = useState("");
	const [deleteError, setDeleteError] = useState("");
	const [creatingUser, setCreatingUser] = useState(false);
	const [form, setForm] = useState({
		first_name: "",
		last_name: "",
		email: "",
		password: "",
		role: "investor" as UserRole,
	});

	const refresh = () => setUsers(getRegisteredUsers());
	const refreshServerData = async () => {
		try {
			let [nextUsers, nextAccounts] = await Promise.all([
				getAdminUsers(),
				getAdminInvestorAccounts(),
			]);

			if (state.user?.role === "admin" && !legacyUsersMigrationStarted.current) {
				legacyUsersMigrationStarted.current = true;
				const knownEmails = new Set(nextUsers.map((user) => user.email.toLowerCase()));
				const legacyUsers = getRegisteredUsers().filter((user) => {
					const email = user.email.toLowerCase();
					if (knownEmails.has(email)) return false;
					knownEmails.add(email);
					return true;
				});
				const migrationResults = await Promise.allSettled(
					legacyUsers.map((user) =>
						createAdminUser({
							first_name: user.first_name,
							last_name: user.last_name,
							email: user.email,
							password: user.password,
							role: user.role,
							avatarUrl: user.avatarUrl,
						})
					)
				);
				const failedMigrations = migrationResults.flatMap((result, index) =>
					result.status === "rejected"
						? [`${legacyUsers[index].email}: ${result.reason instanceof Error ? result.reason.message : "migration failed"}`]
						: []
				);
				if (failedMigrations.length > 0) {
					setDeleteError(`Some saved accounts could not be copied to the database: ${failedMigrations.join("; ")}`);
				}
				if (legacyUsers.length > 0) {
					[nextUsers, nextAccounts] = await Promise.all([
						getAdminUsers(),
						getAdminInvestorAccounts(),
					]);
				}
			}

			setServerUsers(nextUsers);
			setAccounts(nextAccounts);
			setDatabaseError("");
		} catch (caughtError) {
			setDatabaseError(caughtError instanceof Error ? caughtError.message : "User data could not be refreshed.");
		}
	};

	useEffect(() => {
		void refreshServerData();
		const intervalId = window.setInterval(() => void refreshServerData(), 5000);
		return () => window.clearInterval(intervalId);
	}, []);

	const filtered = useMemo(() => {
		const rows: AdminUserRecord[] = serverUsers.map((user) => ({
			...user,
			isLocalUser: false,
		}));
		const knownAccounts = new Set(rows.map((user) => `${user.role}:${user.email.toLowerCase()}`));
		for (const user of users) {
			const key = `${user.role}:${user.email.toLowerCase()}`;
			if (knownAccounts.has(key)) continue;
			knownAccounts.add(key);
			rows.push({
				first_name: user.first_name,
				last_name: user.last_name,
				email: user.email,
				role: user.role,
				avatarUrl: user.avatarUrl,
				createdAt: user.createdAt,
				isLocalUser: true,
			});
		}
		for (const account of accounts) {
			const key = `${account.role}:${account.email.toLowerCase()}`;
			if (knownAccounts.has(key)) continue;
			knownAccounts.add(key);
			const [firstName = "", ...lastNameParts] = account.name.trim().split(/\s+/);
			rows.push({
				first_name: firstName || account.email.split("@")[0],
				last_name: lastNameParts.join(" "),
				email: account.email,
				role: account.role,
				avatarUrl: account.avatarUrl,
				createdAt: undefined,
				isLocalUser: false,
			});
		}
		const term = query.trim().toLowerCase();
		if (!term) return rows;
		return rows.filter((user) =>
			`${user.first_name} ${user.last_name} ${user.email} ${user.role}`
				.toLowerCase()
				.includes(term)
		);
		}, [query, users, serverUsers, accounts]);

	const accountByEmailAndRole = new Map(
		accounts.map((account) => [`${account.role}:${account.email.toLowerCase()}`, account])
	);
	const formatMoney = (amount: number) =>
		`₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
	const profilePhotoCount = filtered.filter((user) => {
		const account = accountByEmailAndRole.get(`${user.role}:${user.email.toLowerCase()}`);
		return Boolean(user.avatarUrl || account?.avatarUrl);
	}).length;
	const initializedAccountCount = filtered.filter((user) =>
		accountByEmailAndRole.has(`${user.role}:${user.email.toLowerCase()}`)
	).length;
	const dataSource = (isLocalUser: boolean) => {
		if (isLocalUser) return "This browser";
		return "Server";
	};

	const handleCreate = async (event: FormEvent) => {
		event.preventDefault();
		if (!form.email.trim() || !form.password.trim() || !form.first_name.trim() || !form.last_name.trim()) {
			return;
		}
		setCreatingUser(true);
		setDeleteError("");
		try {
			const { user: createdUser } = await createAdminUser({
				first_name: form.first_name.trim(),
				last_name: form.last_name.trim(),
				email: form.email.trim(),
				password: form.password,
				role: form.role,
			});
			setServerUsers((currentUsers) => [
				createdUser,
				...currentUsers.filter(
					(user) =>
						user.email.toLowerCase() !== createdUser.email.toLowerCase() ||
						user.role !== createdUser.role
				),
			]);
			setForm({
				first_name: "",
				last_name: "",
				email: "",
				password: "",
				role: "investor",
			});
			await refreshServerData();
		} catch (caughtError) {
			setDeleteError(caughtError instanceof Error ? caughtError.message : "The user could not be added.");
		} finally {
			setCreatingUser(false);
		}
	};

	const handleRoleChange = (email: string, role: UserRole) => {
		const current = users.find((user) => user.email === email);
		if (!current) return;
		saveRegisteredUser({ ...current, role });
		refresh();
	};

	const handleDelete = async (email: string) => {
		if (email.toLowerCase() === state.user?.email?.toLowerCase()) {
			window.alert(t("adminCannotDeleteSelf"));
			return;
		}
		if (!window.confirm("Delete this user and permanently remove all login, trading, order, position, and transaction data? This cannot be undone.")) return;
		setDeletingEmail(email);
		setDeleteError("");
		try {
			await deleteAdminUser(email);
			deleteRegisteredUser(email);
			refresh();
			await refreshServerData();
		} catch (caughtError) {
			setDeleteError(caughtError instanceof Error ? caughtError.message : "The user and their data could not be deleted.");
		} finally {
			setDeletingEmail("");
		}
	};

	return (
		<section>
			<header className="admin-page-head">
				<div>
					<h1>{t("adminUsers")}</h1>
					<p>{t("adminUsersLead")}</p>
				</div>
				<div className="admin-users-toolbar">
					<label className="admin-search-wrap">
						<span className="sr-only">Search users</span>
						<input
							className="admin-search"
							type="search"
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder={t("adminSearchUsers")}
						/>
					</label>
				</div>
			</header>
			{deleteError && <p role="alert" className="investor-error">{deleteError}</p>}
			{databaseError && <p role="alert" className="admin-data-error">{databaseError}</p>}

			<section className="admin-users-summary" aria-label="User summary">
				<div className="admin-users-summary__metrics">
					<div><strong>{filtered.length}</strong><span>Users listed</span></div>
					<div><strong>{profilePhotoCount}</strong><span>Profile photos</span></div>
					<div><strong>{initializedAccountCount}/{filtered.length}</strong><span>Trading accounts</span></div>
				</div>
			</section>

			<form className="admin-card-form" onSubmit={handleCreate}>
				<h2>{t("adminAddUser")}</h2>
				<div className="admin-form-grid">
					<label>
						<span>{t("firstName")}</span>
						<input
							required
							value={form.first_name}
							onChange={(event) =>
								setForm((prev) => ({ ...prev, first_name: event.target.value }))
							}
						/>
					</label>
					<label>
						<span>{t("lastName")}</span>
						<input
							required
							value={form.last_name}
							onChange={(event) =>
								setForm((prev) => ({ ...prev, last_name: event.target.value }))
							}
						/>
					</label>
					<label>
						<span>{t("email")}</span>
						<input
							type="email"
							required
							value={form.email}
							onChange={(event) =>
								setForm((prev) => ({ ...prev, email: event.target.value }))
							}
						/>
					</label>
					<label>
						<span>{t("password")}</span>
						<input
							type="password"
							required
							minLength={6}
							value={form.password}
							onChange={(event) =>
								setForm((prev) => ({ ...prev, password: event.target.value }))
							}
						/>
					</label>
					<label>
						<span>{t("accountType")}</span>
						<select
							value={form.role}
							onChange={(event) =>
								setForm((prev) => ({
									...prev,
									role: event.target.value as UserRole,
								}))
							}
						>
							<option value="investor">{t("investor")}</option>
							<option value="trader">{t("trader")}</option>
							<option value="admin">{t("admin")}</option>
						</select>
					</label>
				</div>
				<button className="admin-btn" type="submit" disabled={creatingUser}>
					{creatingUser ? "Saving..." : t("adminAddUser")}
				</button>
			</form>

			<div className="admin-table-wrap admin-users-table-wrap">
				<table className="admin-table admin-users-table">
					<thead>
						<tr>
							<th className="admin-users-name-col">{t("adminName")}</th>
							<th>Role</th>
							<th>Data source</th>
							<th>Joined</th>
							<th>Profile photo</th>
							<th>Initial balance</th>
							<th>Available cash</th>
							<th>Open position basis</th>
							<th>Net market value</th>
							<th>Account value</th>
							<th>Realized P&amp;L</th>
							<th>Unrealized P&amp;L</th>
							<th>Total P&amp;L</th>
							<th>Today's P&amp;L</th>
							<th>Open / closed</th>
							<th>Orders</th>
							<th>{t("adminActions")}</th>
						</tr>
					</thead>
					<tbody>
						{filtered.map((user) => (
							<tr key={`${user.role}:${user.email}`}>
								<td className="admin-users-name-col">
									<div className="admin-user-identity">
										<AdminUserAvatar
											key={`${user.role}:${user.email}:${user.avatarUrl ?? ""}`}
											name={`${user.first_name} ${user.last_name}`}
											avatarUrl={user.avatarUrl || accountByEmailAndRole.get(`${user.role}:${user.email.toLowerCase()}`)?.avatarUrl}
											onOpen={(src, name) => setSelectedPhoto({ src, name })}
										/>
										<div><strong>{user.first_name} {user.last_name}</strong><small>{user.email}</small></div>
									</div>
								</td>
								<td>
									{user.isLocalUser ? <select
										value={user.role}
										onChange={(event) =>
											handleRoleChange(
												user.email,
												event.target.value as UserRole
											)
										}
									>
										<option value="investor">{t("investor")}</option>
										<option value="trader">{t("trader")}</option>
										<option value="admin">{t("admin")}</option>
									</select> : <span>{user.role}</span>}
								</td>
								<td><span className={`admin-source-badge${user.isLocalUser ? " is-local" : ""}`}>{dataSource(user.isLocalUser)}</span></td>
								<td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</td>
								<td>
									{user.avatarUrl || accountByEmailAndRole.get(`${user.role}:${user.email.toLowerCase()}`)?.avatarUrl
										? <span className="admin-photo-status is-present">Photo available</span>
										: <span className="admin-photo-status">No photo</span>}
								</td>
								{(() => {
									const account = accountByEmailAndRole.get(`${user.role}:${user.email.toLowerCase()}`);
									return <>
										<td>{account ? formatMoney(account.initialBalance) : "Not initialized"}</td>
										<td>{account ? formatMoney(account.cashBalance) : "Not initialized"}</td>
										<td>{account ? formatMoney(account.totalInvested) : "—"}</td>
										<td>{account ? formatMoney(account.currentValue) : "—"}</td>
										<td>{account ? formatMoney(account.totalAccountValue) : "—"}</td>
										<td>{account ? formatMoney(account.realizedPnl) : "—"}</td>
										<td>{account ? formatMoney(account.unrealizedPnl) : "—"}</td>
										<td>{account ? formatMoney(account.totalPnl) : "—"}</td>
										<td>{account ? formatMoney(account.todayPnl) : "—"}</td>
										<td>{account ? `${account.openPositionCount} / ${account.closedPositionCount}` : "—"}</td>
										<td>{account ? account.orders.length : 0}</td>
									</>;
								})()}
								<td>
									<button
										className="admin-btn admin-btn--danger"
										type="button"
										disabled={deletingEmail.toLowerCase() === user.email.toLowerCase()}
										onClick={() => void handleDelete(user.email)}
									>
										{deletingEmail.toLowerCase() === user.email.toLowerCase() ? "Deleting…" : t("adminDelete")}
									</button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
				{filtered.length === 0 && !databaseError && (
					<div className="admin-users-empty"><strong>No user records found</strong><span>Try changing your search or check the database connection above.</span></div>
				)}
			</div>
			{selectedPhoto && (
				<div className="admin-photo-modal" role="presentation" onClick={() => setSelectedPhoto(null)}>
					<div className="admin-photo-modal__content" role="dialog" aria-modal="true" aria-label={`${selectedPhoto.name} profile photo`} onClick={(event) => event.stopPropagation()}>
						<button className="admin-photo-modal__close" type="button" aria-label="Close photo" onClick={() => setSelectedPhoto(null)}>×</button>
						<img src={selectedPhoto.src} alt={`${selectedPhoto.name} profile`} />
						<strong>{selectedPhoto.name}</strong>
					</div>
				</div>
			)}
		</section>
	);
}

export default AdminUsersPage;
