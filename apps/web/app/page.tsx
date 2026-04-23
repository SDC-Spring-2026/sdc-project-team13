export default function HomePage() {
  return (
    <main>
      <h1>Cache Web</h1>
      <p>
        This is the separated frontend. The Discord bot runs independently from
        the web app.
      </p>

      <ul>
        <li>
          Bot: <code>yarn dev:bot</code>
        </li>
        <li>
          Web: <code>yarn dev:web</code>
        </li>
        <li>
          Both: <code>yarn dev</code>
        </li>
        <li>
          <a href="/db-inspector">DB inspector</a> (dev: read-only tables for debugging)
        </li>
      </ul>
    </main>
  );
}

