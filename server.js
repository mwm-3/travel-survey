const express  = require('express');
const path     = require('path');
const fs       = require('fs');
const Database = require('better-sqlite3');
const app  = express();
const PORT = process.env.PORT || 3000;
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
const db = new Database(path.join(dataDir, 'survey.db'));
db.exec(`CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  voter_name TEXT NOT NULL UNIQUE,
  dest_ratings TEXT NOT NULL,
  exp_ratings TEXT NOT NULL,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);`);
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.post('/api/submit', (req, res) => {
  const { voterName, destRatings, expRatings } = req.body;
  if (!voterName || !voterName.trim()) return res.status(400).json({ error: 'voterName is required' });
  db.prepare(`INSERT INTO submissions (voter_name, dest_ratings, exp_ratings, submitted_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(voter_name) DO UPDATE SET
      dest_ratings = excluded.dest_ratings,
      exp_ratings  = excluded.exp_ratings,
      submitted_at = CURRENT_TIMESTAMP`
  ).run(voterName.trim(), JSON.stringify(destRatings || {}), JSON.stringify(expRatings || {}));
  res.json({ success: true });
});
app.get('/api/results', (req, res) => {
  const rows = db.prepare('SELECT * FROM submissions ORDER BY submitted_at ASC').all();
  res.json(rows.map(r => ({ voterName: r.voter_name, destRatings: JSON.parse(r.dest_ratings), expRatings: JSON.parse(r.exp_ratings), submittedAt: r.submitted_at })));
});
app.get('/api/voters', (req, res) => {
  const rows = db.prepare('SELECT voter_name, submitted_at FROM submissions ORDER BY submitted_at ASC').all();
  res.json(rows.map(r => ({ voterName: r.voter_name, submittedAt: r.submitted_at })));
});
app.delete('/api/reset', (req, res) => {
  db.prepare('DELETE FROM submissions').run();
  res.json({ success: true });
});
app.listen(PORT, () => console.log(`Travel survey running at http://localhost:${PORT}`));
