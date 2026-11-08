const mongoose = require("mongoose");

const loginOTPSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        challengeId: {
            type: String,
            required: true,
            unique: true
        },

        hashedOTP: {
            type: String,
            required: true
        },

        expiresAt: {
            type: Date,
            required: true
        },

        attempts: {
            type: Number,
            default: 0
        },

        maxAttempts: {
            type: Number,
            default: 5
        },

        lastSentAt: {
            type: Date,
            default: Date.now
        },

        consumedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

loginOTPSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 }
);

const LoginOTP = mongoose.model("LoginOTP", loginOTPSchema);

module.exports = LoginOTP;
