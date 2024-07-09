import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createPool } from 'mysql2/promise';
import nodemailer from 'nodemailer';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({
    origin: ['http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

const pool = createPool({
    connectionLimit: 10,
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
});

app.get("/users-n/:username", async (req, res) => {
    const username = req.params.username;
    const query = "SELECT * FROM user WHERE username = ?";
    try {
        const [results] = await pool.query(query, [username]);
        if ((results as any[]).length === 0) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        res.json((results as any[])[0]);
    } catch (error) {
        console.error("Error fetching user: ", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.post("/register", async (req, res) => {
    const { uuid, username, password, email, phone_number, bio, role } = req.body;
    const query =
        "INSERT INTO user (UUID, username, password, email, phone_number, bio, role) VALUES (?, ?, ?, ?, ?, ?, ?)";
    try {
        await pool.query(query, [uuid, username, password, email, phone_number, bio, role]);
        res.json({ message: "User registered successfully" });
    } catch (error) {
        console.error("Error inserting user: ", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.put("/users-u/:uuid", async (req, res) => {
    const uuid = req.params.uuid;
    const { username, password, email, phone_number, bio, role } = req.body;
    const query =
        "UPDATE user SET username = ?, password = ?, email = ?, phone_number = ?, bio = ?, role = ? WHERE UUID = ?";
    try {
        const [results] = await pool.query(query, [username, password, email, phone_number, bio, role, uuid]);
        if ((results as any).affectedRows === 0) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        const updatedQuery = "SELECT * FROM user WHERE UUID = ?";
        const [updatedResults] = await pool.query(updatedQuery, [uuid]);
        res.json((updatedResults as any[])[0]);
    } catch (error) {
        console.error("Error updating user: ", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const query = `SELECT * FROM user WHERE username = ? AND password = ?`;
    try {
        const [results] = await pool.query(query, [username, password]);
        if ((results as any[]).length === 0) {
            res.status(401).json({ error: "Invalid username or password" });
            return;
        }
        res.json({ message: "User logged in successfully", user: (results as any[])[0] });
    } catch (error) {
        console.error("Error logging in: ", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

const transporter = nodemailer.createTransport({
    host: 'outlook.office365.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
    tls: {
        ciphers: 'SSLv3'
    },
});

app.post("/send-verification-code", async (req, res) => {
    const { email, vcode } = req.body;

    const mailOptions = {
        from: '"幻云科技" <' + process.env.EMAIL_USER + '>',
        to: email,
        subject: "欢迎注册幻云科技 - 验证码",
        html: `
      <div style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #333333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="font-size: 24px; margin-bottom: 20px;">欢迎注册幻云科技!</h1>
        <p style="margin-bottom: 20px;">感谢你注册幻云科技,下面是你的验证码:</p>
        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 2px; margin-bottom: 20px;">
          ${vcode}
        </div>
        <p style="margin-bottom: 20px;">请将此验证码输入到注册页面以完成注册过程。如果你没有注册幻云科技,请忽略此邮件。</p>
        <p style="margin-bottom: 0;">感谢你选择幻云科技!</p>
      </div>
    `,
    };

    try {
        let info = await transporter.sendMail(mailOptions);
        console.log("Message sent: %s", info.messageId);
        res.json({ message: "Verification code sent successfully" });
    } catch (error) {
        console.error("Error sending email: ", error);
        res.status(500).json({ error: "Failed to send verification code" });
    }
});

export default app;