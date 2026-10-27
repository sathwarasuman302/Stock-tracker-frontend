import type { ReactNode } from "react";

type PageShellProps = {
	title: string;
	lead?: string;
	children?: ReactNode;
};

function PageShell({ title, lead, children }: PageShellProps) {
	return (
		<main className="jp-page">
			<div className="container">
				<header className="jp-page__intro">
					<h1>{title}</h1>
					{lead ? <p>{lead}</p> : null}
				</header>
				{children}
			</div>
		</main>
	);
}

export default PageShell;
