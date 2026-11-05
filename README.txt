LABEASE - COLLEGE LAB EQUIPMENT MANAGEMENT SYSTEM

FOLDER STRUCTURE
Lab_Equipment_Management/
|-- app.js
|-- package.json
|-- Public/
|   |-- index.html
|   |-- dashboard.html
|   |-- equipment.html
|   |-- addEquipment.html
|   |-- request.html
|   |-- issueRecords.html
|   |-- return.html
|   |-- users.html
|   |-- login.html
|   |-- about.html
|   |-- style.css
|   `-- page.js
`-- database/
    `-- lab_equipment_db.sql

SETUP
1. Run database/lab_equipment_db.sql in MySQL Workbench.
2. In app.js, replace YOUR_MYSQL_PASSWORD with your MySQL root password.
3. Open a terminal in this folder and run: npm install
4. Start the server using: npm start
5. Open http://localhost:3000

PAGES
- index.html: Landing page
- dashboard.html: Live summary and recent activity
- equipment.html: Search, filter, edit and delete inventory
- addEquipment.html: Add equipment
- request.html: Issue/request equipment to a registered user
- issueRecords.html: View issue history
- return.html: Mark issued equipment as returned
- users.html: Add and view users
- login.html: Demo navigation screen (not real authentication)
- about.html: Project information

IMPORTANT
The login page is a demonstration only; it does not authenticate users.
Demo passwords in the SQL file are placeholders. For real deployment, use password
hashing, login sessions, authorization, validation and production security.
