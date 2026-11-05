require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "Public")));

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10
});

// Dashboard summary
app.get("/api/dashboard", async (req, res) => {
  try {
    const [[equipment]] = await pool.query(`
      SELECT COUNT(*) AS total,
      COALESCE(SUM(available_quantity),0) AS available,
      COALESCE(SUM(quantity - available_quantity),0) AS issued
      FROM equipment`);
    const [[damaged]] = await pool.query(
      "SELECT COUNT(*) AS damaged FROM equipment WHERE status='Damaged'");
    const [recent] = await pool.query(`
      SELECT ir.issue_id, e.name AS equipment_name, u.name AS user_name,
      ir.quantity, ir.issue_date, ir.return_date, ir.status
      FROM issue_records ir
      JOIN equipment e ON ir.equipment_id=e.equipment_id
      JOIN users u ON ir.user_id=u.user_id
      ORDER BY ir.issue_id DESC LIMIT 6`);
    res.json({ ...equipment, damaged: damaged.damaged, recent });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Equipment CRUD
app.get("/api/equipment", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM equipment ORDER BY equipment_id DESC");
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/equipment", async (req, res) => {
  const { name, category, quantity, status = "Available" } = req.body;
  const qty = Number(quantity);
  if (!name || !category || !Number.isInteger(qty) || qty < 1)
    return res.status(400).json({ error: "Enter a name, category and valid quantity." });
  try {
    const [result] = await pool.query(
      "INSERT INTO equipment (name, category, quantity, available_quantity, status) VALUES (?, ?, ?, ?, ?)",
      [name, category, qty, qty, status]);
    res.status(201).json({ message: "Equipment added successfully.", equipment_id: result.insertId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/equipment/:id", async (req, res) => {
  const { name, category, quantity, status } = req.body;
  const id = Number(req.params.id);
  const qty = Number(quantity);
  if (!name || !category || !Number.isInteger(qty) || qty < 1)
    return res.status(400).json({ error: "Please enter valid equipment details." });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[old]] = await conn.query("SELECT * FROM equipment WHERE equipment_id=? FOR UPDATE", [id]);
    if (!old) { await conn.rollback(); return res.status(404).json({ error: "Equipment not found." }); }
    const issued = old.quantity - old.available_quantity;
    if (qty < issued) { await conn.rollback(); return res.status(400).json({ error: `At least ${issued} units are currently issued.` }); }
    await conn.query(
      "UPDATE equipment SET name=?, category=?, quantity=?, available_quantity=?, status=? WHERE equipment_id=?",
      [name, category, qty, qty - issued, status || "Available", id]);
    await conn.commit();
    res.json({ message: "Equipment updated successfully." });
  } catch (err) { await conn.rollback(); res.status(500).json({ error: err.message }); }
  finally { conn.release(); }
});

app.delete("/api/equipment/:id", async (req, res) => {
  try {
    const [active] = await pool.query(
      "SELECT issue_id FROM issue_records WHERE equipment_id=? AND status='Issued'", [req.params.id]);
    if (active.length) return res.status(400).json({ error: "Return issued equipment before deleting it." });
    await pool.query("DELETE FROM equipment WHERE equipment_id=?", [req.params.id]);
    res.json({ message: "Equipment deleted." });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Users
app.get("/api/users", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT user_id, name, email, role FROM users ORDER BY user_id DESC");
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post("/api/users", async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !["Student","Faculty","Admin"].includes(role))
    return res.status(400).json({ error: "Complete all user fields." });
  try {
    await pool.query("INSERT INTO users(name,email,password,role) VALUES(?,?,?,?)",
      [name, email, password, role]);
    res.status(201).json({ message: "User added." });
  } catch (err) { res.status(500).json({ error: err.code === "ER_DUP_ENTRY" ? "Email already exists." : err.message }); }
});

// Issue equipment
app.post("/api/issues", async (req, res) => {
  const { equipment_id, user_id, quantity, return_date } = req.body;
  const eqId = Number(equipment_id), userId = Number(user_id), qty = Number(quantity);
  if (!eqId || !userId || !Number.isInteger(qty) || qty < 1)
    return res.status(400).json({ error: "Select equipment, user and a valid quantity." });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[eq]] = await conn.query("SELECT * FROM equipment WHERE equipment_id=? FOR UPDATE", [eqId]);
    const [[user]] = await conn.query("SELECT user_id FROM users WHERE user_id=?", [userId]);
    if (!eq || !user) throw new Error("Selected equipment or user does not exist.");
    if (eq.status === "Damaged" || eq.status === "Unavailable") throw new Error("This equipment cannot be issued.");
    if (eq.available_quantity < qty) throw new Error("Not enough equipment is available.");
    await conn.query(
      "INSERT INTO issue_records(equipment_id,user_id,issue_date,return_date,quantity,status) VALUES(?,?,CURDATE(),?,?, 'Issued')",
      [eqId, userId, return_date || null, qty]);
    await conn.query("UPDATE equipment SET available_quantity=available_quantity-? WHERE equipment_id=?", [qty, eqId]);
    await conn.commit();
    res.status(201).json({ message: "Equipment issued successfully." });
  } catch (err) { await conn.rollback(); res.status(400).json({ error: err.message }); }
  finally { conn.release(); }
});

app.get("/api/issues", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT ir.*, e.name AS equipment_name, u.name AS user_name
      FROM issue_records ir JOIN equipment e ON ir.equipment_id=e.equipment_id
      JOIN users u ON ir.user_id=u.user_id ORDER BY ir.issue_id DESC`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/issues/:id/return", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[issue]] = await conn.query("SELECT * FROM issue_records WHERE issue_id=? FOR UPDATE", [req.params.id]);
    if (!issue) throw new Error("Issue record not found.");
    if (issue.status === "Returned") throw new Error("This item has already been returned.");
    await conn.query("UPDATE issue_records SET status='Returned' WHERE issue_id=?", [req.params.id]);
    await conn.query("UPDATE equipment SET available_quantity=available_quantity+? WHERE equipment_id=?",
      [issue.quantity, issue.equipment_id]);
    await conn.commit();
    res.json({ message: "Equipment returned successfully." });
  } catch (err) { await conn.rollback(); res.status(400).json({ error: err.message }); }
  finally { conn.release(); }
});

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "Public", "index.html")));
const PORT = 3000;
app.listen(PORT, () => console.log(`LabEase running at http://localhost:${PORT}`));