export default function Loading() {
  return (
    <div
      className="editor-loading"
      role="status"
      aria-label="Opening interview guide editor"
    >
      <aside />
      <main>
        <header />
        {[1, 2, 3].map((row) => (
          <span key={row} />
        ))}
      </main>
    </div>
  );
}
