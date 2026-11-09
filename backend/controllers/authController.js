const User = require("../models/User");
const TokenBlacklist = require("../models/TokenBlacklist");
const LoginOTP = require("../models/LoginOTP");
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


const generateLoginOTP = () => {
    const otp = crypto.randomInt(100000, 1000000).toString();

    const hashedOTP = crypto
        .createHash("sha256")
        .update(otp)
        .digest("hex");

    return {
        otp,
        hashedOTP
    };
};


const escapeHtml = (value = "") => String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");

const sendLoginOTPEmail = async (user, otp) => {
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
    const emailTemplate = fs.readFileSync(templatePath, "utf8")
        .replace(/{{fullName}}/g, escapeHtml(user.fullName))
        .replace(/{{OTP}}/g, escapeHtml(otp));

    await transporter.sendMail({
        from: `"Banana Quest Security" <${process.env.SMTP_USER}>`,
        to: user.email,
        subject: "Banana Quest - Login Verification Code",
        html: emailTemplate
    });
};

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
                .replace(/{{fullName}}/g, escapeHtml(newUser.fullName))
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
                expiresIn: process.env.JWT_EXPIRES_IN
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
                "../templates/google-login.html"
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

        // Check whether this account uses password login
        if (!user.password) {
            return res.status(400).json({
                success: false,
                message: "This account uses Google login. Please continue with Google."
            });
        }

        // Check account lock
        if (user.lockUntil && user.lockUntil > Date.now()) {
            const remainingTime = Math.ceil(
                (user.lockUntil - Date.now()) / 60000
            );

            return res.status(423).json({
                success: false,
                message: `Account is locked. Please try again in ${remainingTime} minutes.`
            });
        }

        // Reset expired account lock
        if (user.lockUntil && user.lockUntil <= Date.now()) {
            user.failedLoginAttempts = 0;
            user.lockUntil = null;
            await user.save();
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordValid) {
            user.failedLoginAttempts =
                (user.failedLoginAttempts || 0) + 1;

            if (user.failedLoginAttempts >= 3) {
                user.lockUntil = new Date(
                    Date.now() + 30 * 60 * 1000
                );

                await user.save();

                return res.status(423).json({
                    success: false,
                    message: "Too many incorrect login attempts. Your account is locked for 30 minutes."
                });
            }

            await user.save();

            const remainingAttempts =
                3 - user.failedLoginAttempts;

            return res.status(401).json({
                success: false,
                message: `Invalid password. You have ${remainingAttempts} attempt(s) remaining.`
            });
        }

        // Reset failed login attempts after correct password
        user.failedLoginAttempts = 0;
        user.lockUntil = null;
        await user.save();

        // Remove previous OTP challenges for this user
        await LoginOTP.deleteMany({
            userId: user._id
        });

        // Generate a new OTP
        const { otp, hashedOTP } = generateLoginOTP();

        const challengeId = crypto
            .randomBytes(24)
            .toString("hex");

        // Save OTP details in MongoDB
        const otpRecord = await LoginOTP.create({
            userId: user._id,
            challengeId,
            hashedOTP,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
            attempts: 0,
            maxAttempts: 5,
            lastSentAt: new Date()
        });

        // Send OTP email
        try {
            await sendLoginOTPEmail(user, otp);

            console.log("Login OTP email sent successfully");

        } catch (emailError) {
            await LoginOTP.deleteOne({
                _id: otpRecord._id
            });

            console.error(
                "Login OTP email error:",
                emailError.message
            );

            return res.status(500).json({
                success: false,
                message: "Unable to send login OTP. Please try again."
            });
        }

        // Mask email address
        const emailParts = user.email.split("@");
        const maskedEmail =
            emailParts[0].charAt(0) +
            "****@" +
            emailParts[1];

        // Do not return JWT before OTP verification
        return res.status(200).json({
            success: true,
            requiresOtp: true,
            message: "Password verified. OTP sent to your registered email.",
            challengeId,
            expiresIn: 300,
            email: maskedEmail
        });

    } catch (error) {
        console.error("Login error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Login failed. Please try again."
        });
    }
};


const verifyLoginOTP = async (req, res) => {
    try {
        const { challengeId, otp } = req.body;

        if (!challengeId || !otp) {
            return res.status(400).json({
                success: false,
                message: "Challenge ID and OTP are required"
            });
        }

        if (!/^\d{6}$/.test(String(otp))) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid 6-digit OTP"
            });
        }

        const otpRecord = await LoginOTP.findOne({
            challengeId
        });

        if (!otpRecord) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP challenge"
            });
        }

        // Check OTP expiration
        if (otpRecord.expiresAt <= new Date()) {
            await LoginOTP.deleteOne({
                _id: otpRecord._id
            });

            return res.status(400).json({
                success: false,
                message: "OTP has expired. Please request a new OTP."
            });
        }

        // Check maximum OTP attempts
        if (otpRecord.attempts >= otpRecord.maxAttempts) {
            await LoginOTP.deleteOne({
                _id: otpRecord._id
            });

            return res.status(429).json({
                success: false,
                message: "Maximum OTP attempts exceeded. Please log in again."
            });
        }

        // Hash the entered OTP
        const enteredHashedOTP = crypto
            .createHash("sha256")
            .update(String(otp))
            .digest("hex");

        const isOTPValid = crypto.timingSafeEqual(
            Buffer.from(enteredHashedOTP, "hex"),
            Buffer.from(otpRecord.hashedOTP, "hex")
        );

        // Handle incorrect OTP
        if (!isOTPValid) {
            otpRecord.attempts += 1;

            const remainingAttempts =
                otpRecord.maxAttempts - otpRecord.attempts;

            if (otpRecord.attempts >= otpRecord.maxAttempts) {
                await otpRecord.deleteOne();

                return res.status(429).json({
                    success: false,
                    message: "Maximum OTP attempts exceeded. Please log in again."
                });
            }

            await otpRecord.save();

            return res.status(401).json({
                success: false,
                message: `Incorrect OTP. You have ${remainingAttempts} attempt(s) remaining.`
            });
        }

        // Find the user
        const user = await User.findById(otpRecord.userId);

        if (!user) {
            await otpRecord.deleteOne();

            return res.status(404).json({
                success: false,
                message: "User account not found"
            });
        }

        // Delete OTP after successful verification (one-time use)
        await LoginOTP.deleteOne({
            _id: otpRecord._id
        });

        // Generate JWT only after OTP verification
        const token = jwt.sign(
            {
                userId: user._id.toString(),
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN
            }
        );

        return res.status(200).json({
            success: true,
            message: "OTP verified successfully. Login successful.",
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
        console.error("OTP verification error:", error.message);

        return res.status(500).json({
            success: false,
            message: "OTP verification failed. Please try again."
        });
    }
};


const resendLoginOTP = async (req, res) => {
    try {
        const { challengeId } = req.body;

        if (!challengeId) {
            return res.status(400).json({
                success: false,
                message: "Challenge ID is required"
            });
        }

        const otpRecord = await LoginOTP.findOne({
            challengeId
        });

        if (!otpRecord) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP challenge. Please log in again."
            });
        }

        // Check whether the maximum attempts have been reached
        if (otpRecord.attempts >= otpRecord.maxAttempts) {
            await LoginOTP.deleteOne({
                _id: otpRecord._id
            });

            return res.status(429).json({
                success: false,
                message: "Maximum OTP attempts exceeded. Please log in again."
            });
        }

        // Check the 60-second resend cooldown
        const timeSinceLastSent =
            Date.now() - new Date(otpRecord.lastSentAt).getTime();

        const cooldownTime = 60 * 1000;

        if (timeSinceLastSent < cooldownTime) {
            const remainingSeconds = Math.ceil(
                (cooldownTime - timeSinceLastSent) / 1000
            );

            return res.status(429).json({
                success: false,
                message: `Please wait ${remainingSeconds} seconds before requesting another OTP.`
            });
        }

        // Find the user
        const user = await User.findById(otpRecord.userId);

        if (!user) {
            await LoginOTP.deleteOne({
                _id: otpRecord._id
            });

            return res.status(404).json({
                success: false,
                message: "User account not found"
            });
        }

        // Generate a new OTP
        const { otp, hashedOTP } = generateLoginOTP();

        // Send the new OTP email
        await sendLoginOTPEmail(user, otp);

        // Update the existing OTP record
        otpRecord.hashedOTP = hashedOTP;
        otpRecord.expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        otpRecord.attempts = 0;
        otpRecord.lastSentAt = new Date();

        await otpRecord.save();

        console.log("New login OTP email sent successfully");

        return res.status(200).json({
            success: true,
            message: "A new OTP has been sent to your registered email.",
            challengeId,
            expiresIn: 300
        });

    } catch (error) {
        console.error("Resend OTP error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to resend OTP. Please try again."
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
            .replace(/{{fullName}}/g, escapeHtml(user.fullName))
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
    verifyLoginOTP,
    resendLoginOTP,
    getUserProfile,
    forgotPassword,
    resetPassword,
    logoutUser,
    googleLogin   
};
