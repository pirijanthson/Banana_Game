const User = require("../models/User");
const TokenBlacklist = require("../models/TokenBlacklist");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { OAuth2Client } = require("google-auth-library");
const path = require("path");
const fs = require("fs");

const googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID
);

const escapeHtml = (value = "") => String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");

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

        try {
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT,
                secure: Number(process.env.SMTP_PORT) === 465,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });

            const registerHtml = fs.readFileSync(
                path.join(__dirname, "../templates/welcome.html"),
                "utf8"
            );

            const welcomeHtml = registerHtml
                .replace(/{{fullName}}/g, escapeHtml(newUser.fullName || "there"))
                .replace(/{{frontendUrl}}/g, escapeHtml(process.env.FRONTEND_URL))

            await transporter.sendMail({
                from: process.env.SMTP_USER,
                to: newUser.email,
                subject: "Welcome to Banana Quest!",
                html: welcomeHtml
            });

            console.log("Welcome email sent successfully:", newUser.email);

        } catch (error) {
            console.error("Email sending error:", error.message);
        }

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

const googleLogin = async (req, res) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({
                success: false,
                message: "Google ID token is required"
            });
        }

        // Verify Google ID token
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();

        if (!payload || !payload.email || !payload.email_verified) {
            return res.status(401).json({
                success: false,
                message: "Google account email is not verified"
            });
        }

        const {
            sub: googleId,
            email,
            name,
            picture
        } = payload;

        // Find existing Google account
        let user = await User.findOne({ googleId });

        // Find existing account using verified email
        if (!user) {
            user = await User.findOne({
                email: email.toLowerCase()
            });

            if (user) {
                // Link verified Google account to existing user
                user.googleId = googleId;
                user.profilePicture = picture || null;
                await user.save();
            }
        }

        // Create new user if account does not exist
        if (!user) {
            const baseUsername = email
                .split("@")[0]
                .replace(/[^a-zA-Z0-9_]/g, "")
                .slice(0, 15) || "googleuser";

            let username = baseUsername;
            let counter = 1;

            while (await User.findOne({ username })) {
                username = `${baseUsername}${counter}`;
                counter++;
            }

            user = await User.create({
                fullName: name || baseUsername,
                username,
                email: email.toLowerCase(),
                googleId,
                profilePicture: picture || null,
                authProvider: "google",
                role: "USER",
                points: 0,
                currentStreak: 0
            });
        }

        // Generate Banana Quest JWT
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

        // Send login notification email
        try {
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: Number(process.env.SMTP_PORT),
                secure: Number(process.env.SMTP_PORT) === 465,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });

            const templatePath = path.join(
                __dirname,
                "../templates/login-notification.html"
            );

            let emailTemplate = fs.readFileSync(
                templatePath,
                "utf8"
            );

            emailTemplate = emailTemplate
                .replace(/{{fullName}}/g, escapeHtml(user.fullName))

            await transporter.sendMail({
                from: `"Banana Quest Security" <${process.env.SMTP_USER}>`,
                to: user.email,
                subject: "Banana Quest - Login Notification",
                html: emailTemplate
            });

        } catch (emailError) {
            console.error(
                "Google login notification error:",
                emailError.message
            );
        }

        return res.status(200).json({
            success: true,
            message: "Google login successful",
            token,
            user: {
                id: user._id,
                fullName: user.fullName,
                username: user.username,
                email: user.email,
                role: user.role,
                points: user.points,
                currentStreak: user.currentStreak,
                profilePicture: user.profilePicture
            }
        });

    } catch (error) {
        console.error("Google login error:", error.message);

        return res.status(401).json({
            success: false,
            message: "Google authentication failed"
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

        const normalizedLogin = login.trim();

        const user = await User.findOne({
            $or: [
                { email: normalizedLogin.toLowerCase() },
                { username: normalizedLogin }
            ]
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid username/email or password"
            });
        }

        if (user.lockUntil && user.lockUntil > Date.now()) {
            const remainingTime = Math.ceil((user.lockUntil - Date.now()) / 60000);
            return res.status(423).json({
                success: false,
                message: `Account is locked. Please try again in ${remainingTime} minutes.`
            });
        }

        if (user.lockUntil && user.lockUntil <= Date.now()) {
            user.failedLoginAttempts = 0;
            user.lockUntil = null;
            await user.save();
        }

        const isPasswordValid = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordValid) {
            user.failedLoginAttempts += 1;

            if (user.failedLoginAttempts >= 3) {
                user.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
                await user.save();

                return res.status(423).json({
                    success: false,
                    message: "Too many incorrect login attempts. Your account is locked for 30 minutes."
                });
            }

            await user.save();

            const remainingAttempts = 3 - user.failedLoginAttempts;

            return res.status(401).json({
                success: false,
                message: `Invalid password. You have ${remainingAttempts} attempt(s) remaining.`
            });
        }

        user.failedLoginAttempts = 0;
        user.lockUntil = null;
        await user.save();

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

        try {
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: Number(process.env.SMTP_PORT),
                secure: Number(process.env.SMTP_PORT) === 465,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });

            const loginHtml = path.join(
                __dirname,
                "../templates/login.html"
            );

            let emaillogin = fs.readFileSync(loginHtml, "utf8");

            emaillogin = emaillogin
                .replace(/{{fullName}}/g, escapeHtml(user.fullName));

            await transporter.sendMail({
                from: `"Banana Quest Security" <${process.env.SMTP_USER}>`,
                to: user.email,
                subject: "Banana Quest - Login Notification",
                html: emaillogin
            });

            console.log("Login notification email sent successfully");

        } catch (emailError) {
            console.error(
                "Login notification email error:",
                emailError.message
            );
        }

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


const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId)
            .select(
                "fullName username email role points currentStreak profilePicture authProvider createdAt updatedAt"
            );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "User profile retrieved successfully",
            user
        });

    } catch (error) {
        console.error("Profile error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve user profile"
        });
    }
};


const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Validate email
        if (!email || !email.trim()) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        // Find user by email
        const user = await User.findOne({
            email: email.trim().toLowerCase()
        });

        // Use the same response whether the account exists or not
        if (!user) {
            return res.status(200).json({
                success: true,
                message: "If the account exists, a reset link will be sent."
            });
        }

        // Generate a secure random token
        const resetToken = crypto.randomBytes(32).toString("hex");

        // Store only the hashed token in MongoDB
        user.resetPasswordToken = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");

        // Token expires in 15 minutes
        user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;

        await user.save();

        // Configure email transporter
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            secure: Number(process.env.SMTP_PORT) === 465,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        // Generate password reset link
        const resetLink =
            `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

        // Read external HTML email template
        const emailTemplate = fs.readFileSync(
            path.join(__dirname, "../templates/email.html"),
            "utf8"
        );

        // Replace HTML placeholders
        const emailHtml = emailTemplate
            .replace(/{{fullName}}/g, escapeHtml(user.fullName || "there"))
            .replace(/{{resetLink}}/g, escapeHtml(resetLink))
            .replace(/{{currentYear}}/g, String(new Date().getFullYear()));

        // Send password reset email
        await transporter.sendMail({
            from: `"Banana Quest" <${process.env.SMTP_USER}>`,
            to: user.email,
            subject: "Banana Quest - Password Reset Request",
            html: emailHtml
        });

        return res.status(200).json({
            success: true,
            message: "If the account exists, a reset link will be sent."
        });

    } catch (error) {
        console.error("Forgot password error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to process password reset request"
        });
    }
};


const resetPassword = async (req, res) => {
    try {
        const tokenFromBody = req.body?.token;
        const token = tokenFromBody || req.params?.token;
        const { password, confirmPassword } = req.body;

        if (!token || !password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
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

        // Hash the received token
        const hashedToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        // Find account with a valid, unexpired reset token
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired reset link"
            });
        }

        // Hash and update the new password
        user.password = await bcrypt.hash(password, 12);

        // Clear reset token so it cannot be reused
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Password reset successfully. Please login."
        });

    } catch (error) {
        console.error("Reset password error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to reset password"
        });
    }
};


const logoutUser = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authorization token is missing."
            });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.decode(token);

        if (!decoded || !decoded.exp) {
            return res.status(401).json({
                success: false,
                message: "Invalid token provided."
            });
        }

        await TokenBlacklist.create({
            token,
            expiresAt: decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 60 * 60 * 1000)
        });

        return res.status(200).json({
            success: true,
            message: "Logout successful"
        });

    } catch (error) {
        console.error("Logout error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error during logout"
        });
    }
};

    

module.exports = {
    registerUser,
    loginUser,
    getUserProfile,
    forgotPassword,
    resetPassword,
    logoutUser,
    googleLogin   
};
