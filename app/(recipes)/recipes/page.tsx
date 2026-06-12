import RecipesApp from "./RecipesApp";
import ConfirmProvider from "./components/ConfirmProvider";

// "Mise" — the standalone recipe box. Reachable only by direct URL (/recipes),
// intentionally absent from the portfolio nav and search indexes, matching the
// /train and /program apps.
export default function RecipesPage() {
  return (
    <ConfirmProvider>
      <RecipesApp />
    </ConfirmProvider>
  );
}
