const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const registerUser = async (req, res) => {
    try {
        const {
            fullName,
            username,
            email,
            password,
            confirmPassword
        } = req.body;

        if (!fullName || !username || !email || !password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        if (username.trim().length < 3) {
            return res.status(400).json({
                success: false,
                message: "Username must contain at least 3 characters"
            });
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(email.trim())) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least 8 characters"
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Passwords do not match"
            });
        }

        const existingUser = await User.findOne({
            $or: [
                { email: email.trim().toLowerCase() },
                { username: username.trim() }
            ]
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email or username already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const newUser = await User.create({
            fullName: fullName.trim(),
            username: username.trim(),
            email: email.trim().toLowerCase(),
            password: hashedPassword
        });

        return res.status(201).json({
            success: true,
            message: "Account created successfully",
            user: {
                id: newUser._id,
                fullName: newUser.fullName,
                username: newUser.username,
                email: newUser.email,
                points: newUser.points,
                currentStreak: newUser.currentStreak
            }
        });

    } catch (error) {
        console.error("Registration error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Registration failed. Please try again."
        });
    }
};


const loginUser = async (req, res) => {
    try {
        const { login, password } = req.body;

        if (!login || !password) {
            return res.status(400).json({
                success: false,
                message: "Username/email and password are required"
            });
        }

        const user = await User.findOne({
            $or: [
                { email: login.trim().toLowerCase() },
                { username: login.trim() }
            ]
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid username/email or password"
            });
        }

        const isPasswordValid = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid username/email or password"
            });
        }

        const token = jwt.sign(
            {
                userId: user._id.toString(),
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN || "1d"
            }
        );

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user._id,
                fullName: user.fullName,
                username: user.username,
                email: user.email,
                role: user.role,
                points: user.points,
                currentStreak: user.currentStreak
            }
        });

    } catch (error) {
        console.error("Login error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Login failed. Please try again."
        });
    }
};


module.exports = {
    registerUser,
    loginUser
};
