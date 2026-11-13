const mongoose = require("mongoose");
const { DEFAULT_SETTINGS } = require("../utils/settings");

const settingsSchema = new mongoose.Schema(
    {
        backgroundColor: {
            type: String,
            default: DEFAULT_SETTINGS.backgroundColor,
            match: /^#[\da-f]{6}$/i
        },
        showAnswerFeedback: {
            type: Boolean,
            default: DEFAULT_SETTINGS.showAnswerFeedback
        },
        theme: {
            type: String,
            enum: ["light", "dark"],
            default: DEFAULT_SETTINGS.theme
        },
        textSize: {
            type: String,
            enum: ["normal", "large"],
            default: DEFAULT_SETTINGS.textSize
        },
        reduceMotion: {
            type: Boolean,
            default: DEFAULT_SETTINGS.reduceMotion
        },
        soundEffects: {
            type: Boolean,
            default: DEFAULT_SETTINGS.soundEffects
        },
        timerWarnings: {
            type: Boolean,
            default: DEFAULT_SETTINGS.timerWarnings
        },
        timerWarningSeconds: {
            type: Number,
            enum: [5, 10, 15],
            default: DEFAULT_SETTINGS.timerWarningSeconds
        },
        showProgress: {
            type: Boolean,
            default: DEFAULT_SETTINGS.showProgress
        }
    },
    { _id: false }
);

const cookieConsentSchema = new mongoose.Schema(
    {
        essential: {
            type: Boolean,
            default: true
        },
        analytics: {
            type: Boolean,
            default: false
        },
        preferences: {
            type: Boolean,
            default: false
        },
        updatedAt: {
            type: Date,
            default: Date.now
        }
    },
    { _id: false }
);

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
        },

        settings: {
            type: settingsSchema,
            default: undefined
        },

        cookieConsent: {
            type: cookieConsentSchema,
            default: undefined
        }
    },

    {
        timestamps: true
    }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
