import TrainApp from "./TrainApp";
import ConfirmProvider from "./components/ConfirmProvider";

// The standalone workout companion. Reachable only by direct URL (/train) —
// intentionally absent from the portfolio nav and search indexes.
export default function TrainPage() {
  return (
    <ConfirmProvider>
      <TrainApp />
    </ConfirmProvider>
  );
}
