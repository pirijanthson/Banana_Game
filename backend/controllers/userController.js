const User = require("../models/User");
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

module.exports = {
  updateUserProfile
};
