const User = require("../models/User");
const TokenBlacklist = require("../models/TokenBlacklist");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const {
  normalizeSettings,
  validateSettings
} = require("../utils/settings");

// Multer storage configuration for avatar uploads
const avatarStorage = multer.memoryStorage();

const avatarUpload = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed."), false);
    }
  }
});

// Email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Escape HTML characters in user-provided names
const escapeHtml = (value) => {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      "fullName username email role points currentStreak profilePicture authProvider createdAt updatedAt"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    return res.status(200).json({
      success: true,
      message: "User profile retrieved successfully.",
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        role: user.role,
        points: user.points || 0,
        currentStreak: user.currentStreak || 0,
        profilePicture: user.profilePicture || null,
        authProvider: user.authProvider,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error("Get User Profile Error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load your profile."
    });
  }
};

const getUserSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    return res.status(200).json({
      success: true,
      settings: normalizeSettings(user.settings),
      hasSavedSettings: Boolean(user.settings)
    });
  } catch (error) {
    console.error("Get User Settings Error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load your settings."
    });
  }
};

const updateUserSettings = async (req, res) => {
  try {
    const settings = req.body && req.body.settings;
    const validationError = validateSettings(settings);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError
      });
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    const currentSettings = user.settings
      ? user.settings.toObject()
      : {};
    user.settings = normalizeSettings({ ...currentSettings, ...settings });
    await user.save();

    return res.status(200).json({
      success: true,
      settings: normalizeSettings(user.settings)
    });
  } catch (error) {
    console.error("Update User Settings Error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to save your settings."
    });
  }
};

// Update User Profile
const updateUserProfile = async (req, res) => {
  try {
    const { fullName, username, profilePicture } = req.body || {};

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    let profileChanged = false;

    if (fullName !== undefined) {
      if (typeof fullName !== "string" || !fullName.trim()) {
        return res.status(400).json({
          success: false,
          message: "Full name cannot be empty."
        });
      }

      const nextFullName = fullName.trim();
      if (nextFullName !== user.fullName) {
        user.fullName = nextFullName;
        profileChanged = true;
      }
    }

    if (username !== undefined) {
      if (typeof username !== "string" || username.trim().length < 3) {
        return res.status(400).json({
          success: false,
          message: "Username must contain at least 3 characters."
        });
      }

      const nextUsername = username.trim().toLowerCase();
      const existingUser = await User.findOne({
        username: nextUsername,
        _id: { $ne: user._id }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Username is already taken."
        });
      }

      if (nextUsername !== user.username) {
        user.username = nextUsername;
        profileChanged = true;
      }
    }

    if (profilePicture !== undefined) {
      const nextProfilePicture =
        typeof profilePicture === "string" && profilePicture.trim().length > 0
          ? profilePicture.trim()
          : null;

      if (nextProfilePicture !== user.profilePicture) {
        user.profilePicture = nextProfilePicture;
        profileChanged = true;
      }
    }

    if (!profileChanged) {
      return res.status(200).json({
        success: true,
        message: "No profile changes detected.",
        user: {
          id: user._id,
          fullName: user.fullName,
          username: user.username,
          email: user.email,
          profilePicture: user.profilePicture,
          points: user.points || 0,
          currentStreak: user.currentStreak || 0,
          authProvider: user.authProvider
        }
      });
    }

    await user.save();

    try {
      const templatePath = path.join(
        __dirname,
        "../templates/profile-update-notification.html"
      );

      let emailTemplate = fs.readFileSync(templatePath, "utf8");
      emailTemplate = emailTemplate.replace(
        /{{fullName}}/g,
        escapeHtml(user.fullName)
      );

      await transporter.sendMail({
        from: `"Banana Quest" <${process.env.SMTP_USER}>`,
        to: user.email,
        subject: "Banana Quest - Profile Updated Successfully",
        html: emailTemplate
      });
    } catch (emailError) {
      console.error("Profile update email error:", emailError.message);
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        points: user.points || 0,
        currentStreak: user.currentStreak || 0,
        authProvider: user.authProvider
      }
    });
  } catch (error) {
    console.error("Update Profile Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};


const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All password fields are required."
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must contain at least 8 characters."
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirm password do not match."
      });
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: "This account does not have a password. Use your Google account to sign in."
      });
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect."
      });
    }

    const isSamePassword = await bcrypt.compare(
      newPassword,
      user.password
    );

    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from your current password."
      });
    }

    user.password = await bcrypt.hash(newPassword, 12);

    
    // Send password change notification email
    try {
      const templatePath = path.join(
        __dirname,
        "../templates/password-change-notification.html"
      );

      let emailTemplate = fs.readFileSync(templatePath, "utf8");

      emailTemplate = emailTemplate.replace(
        /{{fullName}}/g,
        escapeHtml(user.fullName)
      );

      await transporter.sendMail({
        from: `"Banana Quest" <${process.env.SMTP_USER}>`,
        to: user.email,
        subject: "Banana Quest - Password Changed Successfully",
        html: emailTemplate
      });

      console.log("Password change notification email sent successfully.");

    } catch (emailError) {
      console.error(
        "Password change email error:",
        emailError.message
      );
    }

    await user.save();
    
    // Automatically log out the user after changing the password
    await TokenBlacklist.create({
        token: req.token,
        expiresAt: req.tokenExpiresAt
    });

    return res.status(200).json({
      success: true,
      message: "Password changed successfully."
    });

  } catch (error) {
    console.error("Change Password Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

const uploadAvatar = [
  avatarUpload.single("avatar"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No image file provided."
        });
      }

      const user = await User.findById(req.user.userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found."
        });
      }

      // Convert image to base64 data URL
      const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

      user.profilePicture = base64Image;
      await user.save();

      return res.status(200).json({
        success: true,
        message: "Profile picture updated.",
        user: {
          id: user._id,
          fullName: user.fullName,
          username: user.username,
          email: user.email,
          profilePicture: user.profilePicture
        }
      });

    } catch (error) {
      console.error("Upload Avatar Error:", error);

      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: "Image must be smaller than 2MB."
          });
        }
      }

      return res.status(500).json({
        success: false,
        message: "Unable to upload avatar."
      });
    }
  }
];

const getCookieConsent = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    const consent = user.cookieConsent || {
      essential: true,
      analytics: false,
      preferences: false
    };

    return res.status(200).json({
      success: true,
      cookieConsent: consent
    });

  } catch (error) {
    console.error("Get Cookie Consent Error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load cookie preferences."
    });
  }
};

const updateCookieConsent = async (req, res) => {
  try {
    const { analytics, preferences } = req.body;

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    const currentConsent = user.cookieConsent || {
      essential: true,
      analytics: false,
      preferences: false
    };

    user.cookieConsent = {
      essential: true, // Always true, cannot be disabled
      analytics: Boolean(analytics),
      preferences: Boolean(preferences),
      updatedAt: new Date()
    };

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Cookie preferences saved.",
      cookieConsent: user.cookieConsent
    });

  } catch (error) {
    console.error("Update Cookie Consent Error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to save cookie preferences."
    });
  }
};

module.exports = {
  getUserProfile,
  getUserSettings,
  updateUserSettings,
  updateUserProfile,
  changePassword,
  uploadAvatar: uploadAvatar,
  getCookieConsent,
  updateCookieConsent
};
