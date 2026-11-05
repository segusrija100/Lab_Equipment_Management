CREATE DATABASE IF NOT EXISTS lab_equipment_db;
USE lab_equipment_db;

CREATE TABLE IF NOT EXISTS equipment (
  equipment_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  quantity INT NOT NULL,
  available_quantity INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Available'
);

CREATE TABLE IF NOT EXISTS users (
  user_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL
);

CREATE TABLE IF NOT EXISTS issue_records (
  issue_id INT PRIMARY KEY AUTO_INCREMENT,
  equipment_id INT NOT NULL,
  user_id INT NOT NULL,
  issue_date DATE NOT NULL,
  return_date DATE NULL,
  quantity INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Issued',
  CONSTRAINT fk_issue_equipment FOREIGN KEY (equipment_id) REFERENCES equipment(equipment_id),
  CONSTRAINT fk_issue_user FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Run these sample INSERT statements only once on a fresh database.
INSERT INTO equipment (name, category, quantity, available_quantity, status) VALUES
('Arduino Uno','Microcontroller',20,20,'Available'),
('Digital Multimeter','Electrical',15,15,'Available'),
('Raspberry Pi','Computer Hardware',10,10,'Available'),
('Temperature Sensor','Sensors',25,25,'Available'),
('Projector','Display Equipment',5,5,'Available'),
('Robotics Kit','Robotics',12,12,'Available');

INSERT INTO users (name,email,password,role) VALUES
('Srija','srija@example.com','demo-placeholder','Admin'),
('Rahul','rahul@example.com','demo-placeholder','Student'),
('Priya','priya@example.com','demo-placeholder','Faculty');

SHOW TABLES;
SELECT * FROM equipment;
SELECT * FROM users;
SELECT * FROM issue_records;