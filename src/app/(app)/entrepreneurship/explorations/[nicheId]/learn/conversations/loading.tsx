export default function Loading() {
  return (
    <div
      className="conversation-loading"
      role="status"
      aria-label="Opening conversations"
    >
      <aside>
        {[1, 2, 3, 4].map((row) => (
          <span key={row} />
        ))}
      </aside>
      <main>
        <header />
        <div>
          <span />
          <span />
          <span />
        </div>
        <footer />
      </main>
    </div>
  );
}
