const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true,
            trim: true
        },

        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            minlength: 3
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        password: {
            type: String,
            required: function () {
                return this.authProvider === "local";
            },
            minlength: 8
        },

        role: {
            type: String,
            enum: ["USER", "ADMIN"],
            default: "USER"
        },

        points: {
            type: Number,
            default: 0
        },

        currentStreak: {
            type: Number,
            default: 0
        },

        resetPasswordToken: {
            type: String,
            default: null
        },

        resetPasswordExpires: {
            type: Date,
            default: null
       },

       failedLoginAttempts: {
            type: Number,
            default: 0
        },
        
        lockUntil: {
            type: Date,
            default: null
        },

        googleId: {
            type: String,
            unique: true,
            sparse: true,
            default: null
        },

        profilePicture: {
            type: String,
            default: null
        },

        authProvider: {
            type: String,
            enum: ["local", "google"],
            default: "local"
        }
    },

    {
        timestamps: true
    }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
