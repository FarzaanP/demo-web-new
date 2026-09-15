// Shared loading indicator so every page shows a consistent state while
// its Firestore listener is still resolving, instead of a blank screen
// or ad-hoc "Loading..." strings scattered across pages.
export default function LoadingSpinner({ label = 'Loading...' }) {
  return (
    <div className="empty-state" role="status" aria-live="polite">
      {label}
    </div>
  );
}
