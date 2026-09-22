export default function Loading() {
  return (
    <div
      className="exploration-loading"
      role="status"
      aria-label="Opening exploration workspace"
    >
      <div className="exploration-loading-heading" />
      <div className="exploration-loading-line" />
      <div className="exploration-loading-columns">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
