// Screen-reader live region fed by the accessibility context announcements API.
import { useAccessibility } from "../../context/useAccessibility";

export default function LiveAnnouncements() {
  const { liveMessage } = useAccessibility();

  return (
    <div
      aria-live="polite"
      role="status"
      className="sr-only"
      data-testid="accessibility-live-region"
    >
      {liveMessage}
    </div>
  );
}
