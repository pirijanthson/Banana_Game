const jwt = require("jsonwebtoken");
const TokenBlacklist = require("../models/TokenBlacklist");

const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Not authorized. Please log in."
            });
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Token is missing."
            });
        }

        const blacklistedToken = await TokenBlacklist.findOne({
            token
        });

        if (blacklistedToken) {
            return res.status(401).json({
                success: false,
                message: "Token has been logged out. Please log in again."
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = {
            userId: decoded.userId,
            role: decoded.role
        };

        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token. Please log in again."
        });
    }
};

module.exports = { protect };
