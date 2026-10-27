import { useContext, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import PageShell from "../components/PageShell";
import { AuthContext } from "../contexts/AuthContext";

function EditProfilePage() {
	const { t } = useTranslation("common");
	const { state, authDispatch, ActionTypes } = useContext(AuthContext);
	const [firstName, setFirstName] = useState(
		state.user?.first_name ?? ""
	);
	const [lastName, setLastName] = useState(state.user?.last_name ?? "");
	const email = state.user?.email ?? "";

	const handleSubmit = (event: FormEvent) => {
		event.preventDefault();

		authDispatch({
			type: ActionTypes.LOGIN,
			payload: {
				user: {
					...state.user,
					first_name: firstName,
					last_name: lastName,
					email,
				},
			},
		});
	};

	return (
		<PageShell title={t("editProfile")} lead={t("editProfileLead")}>
			<form className="jp-form jp-form--narrow" onSubmit={handleSubmit}>
				<label className="jp-field">
					<span>{t("firstName")}</span>
					<input
						type="text"
						value={firstName}
						onChange={(e) => setFirstName(e.target.value)}
					/>
				</label>
				<label className="jp-field">
					<span>{t("lastName")}</span>
					<input
						type="text"
						value={lastName}
						onChange={(e) => setLastName(e.target.value)}
					/>
				</label>
				<label className="jp-field">
					<span>{t("email")}</span>
					<input
						type="email"
						value={email}
						readOnly
					/>
				</label>
				<button className="jp-btn jp-btn--primary" type="submit">
					{t("saveChanges")}
				</button>
			</form>
		</PageShell>
	);
}

export default EditProfilePage;
