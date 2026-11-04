const User = require("../models/User");
const TokenBlacklist = require("../models/TokenBlacklist");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

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

// Update User Profile
const updateUserProfile = async (req, res) => {
  try {
    const { fullName, username, profilePicture } = req.body;

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    let profileChanged = false;

    // Validate and update full name
    if (fullName !== undefined) {
      if (typeof fullName !== "string" || !fullName.trim()) {
        return res.status(400).json({
          success: false,
          message: "Full name cannot be empty."
        });
      }

      const newFullName = fullName.trim();

      if (newFullName !== user.fullName) {
        user.fullName = newFullName;
        profileChanged = true;
      }
    }

    // Validate and update username
    if (username !== undefined) {
      if (
        typeof username !== "string" ||
        username.trim().length < 3
      ) {
        return res.status(400).json({
          success: false,
          message: "Username must contain at least 3 characters."
        });
      }

      const normalizedUsername = username.trim().toLowerCase();

      const existingUser = await User.findOne({
        username: normalizedUsername,
        _id: { $ne: user._id }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Username is already taken."
        });
      }

      if (normalizedUsername !== user.username) {
        user.username = normalizedUsername;
        profileChanged = true;
      }
    }

    // Validate and update profile picture
    if (profilePicture !== undefined) {
      if (
        typeof profilePicture !== "string" ||
        profilePicture.trim().length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid profile picture."
        });
      }

      const newProfilePicture = profilePicture.trim();

      if (newProfilePicture !== user.profilePicture) {
        user.profilePicture = newProfilePicture;
        profileChanged = true;
      }
    }

    // Check whether any profile information changed
    if (!profileChanged) {
      return res.status(200).json({
        success: true,
        message: "No profile changes detected.",
        user: {
          id: user._id,
          fullName: user.fullName,
          username: user.username,
          email: user.email,
          profilePicture: user.profilePicture
        }
      });
    }

    // Save updated profile
    await user.save();

    // Send profile update notification email
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

      console.log("Profile update notification email sent successfully.");

    } catch (emailError) {
      console.error(
        "Profile update email error:",
        emailError.message
      );
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture
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

module.exports = {
  updateUserProfile,
  changePassword
};

