export default function CompletePage() {
  return (
    <main className="shell">
      <section className="panel hero">
        <p className="eyebrow">Finished</p>
        <h1 className="title">The study session is complete.</h1>
        <p className="lead">
          All questionnaire answers and video responses have been saved to MongoDB for this participant
          session.
        </p>
        <p className="muted">
          The session keeps a markdown-style report in the database, and batch progress only advances when a
          full survey is completed.
        </p>
      </section>
    </main>
  );
}
