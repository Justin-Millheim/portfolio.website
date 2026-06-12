import SallyApp from "./SallyApp";
import ConfirmProvider from "./components/ConfirmProvider";

// Sally the Songbird — reachable only by direct URL (/sally), intentionally
// absent from the portfolio nav and search indexes, matching the other apps.
export default function SallyPage() {
  return (
    <ConfirmProvider>
      <SallyApp />
    </ConfirmProvider>
  );
}
