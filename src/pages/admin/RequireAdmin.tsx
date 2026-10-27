import { useContext, type ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { AuthContext } from "../../contexts/AuthContext";

function RequireAdmin({ children }: { children: ReactNode }) {
	const { state } = useContext(AuthContext);

	if (!state.isAuthenticated) {
		return (
			<>
				<Navigate to="/login" replace />
				<main className="jp-page" role="status">
					<div className="container">
						<h1>Admin sign-in required</h1>
						<p>Redirecting to login. If you are not redirected, <Link to="/login">sign in</Link> to continue.</p>
					</div>
				</main>
			</>
		);
	}

	if (state.user?.role !== "admin") {
		return (
			<>
				<Navigate to="/" replace />
				<main className="jp-page" role="status">
					<div className="container">
						<h1>Admin access only</h1>
						<p>Your account does not have administrator access. <Link to="/">Return to the home page</Link>.</p>
					</div>
				</main>
			</>
		);
	}

	return children;
}

export default RequireAdmin;
