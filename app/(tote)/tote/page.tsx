import ToteApp from "./ToteApp";
import ConfirmProvider from "./components/ConfirmProvider";

// "Tote" — the standalone lists + recipes + meal-plan app. Reachable only by
// direct URL (/tote), intentionally absent from the portfolio nav and search
// indexes, matching /train, /program, and /recipes.
export default function TotePage() {
  return (
    <ConfirmProvider>
      <ToteApp />
    </ConfirmProvider>
  );
}
