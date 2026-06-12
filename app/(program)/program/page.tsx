import ProgramApp from "./ProgramApp";
import ConfirmProvider from "./components/ConfirmProvider";

// "The Block." Reachable only by direct URL (/program) — intentionally absent
// from the portfolio nav and search indexes, and installable to the home screen
// as a PWA. The deterministic program engine serves the right Day × Week; the
// generative /train app is its sibling.
export default function ProgramPage() {
  return (
    <ConfirmProvider>
      <ProgramApp />
    </ConfirmProvider>
  );
}
