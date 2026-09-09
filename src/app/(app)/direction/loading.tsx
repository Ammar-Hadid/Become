export default function DirectionLoading() {
  return (
    <div
      className="page-shell direction-shell direction-loading"
      aria-busy="true"
      aria-label="Loading direction"
    >
      <div className="direction-loading-title" />
      <div className="direction-loading-nav" />
      <div className="direction-loading-poster" />
    </div>
  );
}
