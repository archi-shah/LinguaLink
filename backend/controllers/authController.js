const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || 'dummy-client-id');

function buildOtpEmailHTML(otp) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>LinguaLink OTP</title>
</head>
<body style="margin:0;padding:0;background:#0d1117;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;min-height:100vh;">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table width="560" cellpadding="0" cellspacing="0"
          style="background:linear-gradient(135deg,#161b22 0%,#0d1117 100%);
                 border-radius:20px;
                 border:1px solid rgba(76,116,249,0.25);
                 overflow:hidden;
                 box-shadow:0 24px 64px rgba(0,0,0,0.6);">

          <!-- Header gradient band -->
          <tr>
            <td style="background:linear-gradient(135deg,#38BDF8,#4C74F9,#8B5CF6);
                        padding:36px;text-align:center;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="display:inline-block;
                                background:rgba(255,255,255,0.15);
                                border-radius:16px;
                                padding:12px 20px;
                                backdrop-filter:blur(12px);">
                      <span style="font-size:28px;font-weight:900;color:#fff;letter-spacing:-0.03em;">
                        🌐 LinguaLink
                      </span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top:16px;">
                    <span style="font-size:15px;color:rgba(255,255,255,0.85);font-weight:500;">
                      Secure Verification Code
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 48px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#e6edf3;">
                Your One-Time Password
              </p>
              <p style="margin:0 0 32px;font-size:14px;color:#8b949e;line-height:1.6;">
                Use the code below to complete your LinguaLink authentication.
                This code is valid for <strong style="color:#58a6ff;">15 minutes</strong> only.
              </p>

              <!-- OTP Box -->
              <div style="background:linear-gradient(135deg,rgba(76,116,249,0.12),rgba(139,92,246,0.12));
                           border:2px solid rgba(76,116,249,0.4);
                           border-radius:16px;
                           padding:32px;
                           text-align:center;
                           margin-bottom:32px;">
                <div style="letter-spacing:18px;
                             font-size:48px;
                             font-weight:900;
                             color:#fff;
                             font-family:'Courier New',monospace;
                             text-shadow:0 0 20px rgba(76,116,249,0.6);">
                  ${otp}
                </div>
                <p style="margin:16px 0 0;font-size:13px;color:#8b949e;">
                  6-digit verification code
                </p>
              </div>

              <!-- Warning box -->
              <div style="background:rgba(248,81,73,0.08);
                           border:1px solid rgba(248,81,73,0.25);
                           border-radius:10px;
                           padding:16px 20px;
                           margin-bottom:28px;">
                <p style="margin:0;font-size:13px;color:#ffa198;line-height:1.5;">
                  🔐 <strong>Never share this code</strong> with anyone. LinguaLink will
                  never ask you for your OTP via phone, chat, or email.
                </p>
              </div>

              <p style="margin:0;font-size:13px;color:#8b949e;line-height:1.6;">
                If you did not request this code, you can safely ignore this email.
                Your account remains secure.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid rgba(255,255,255,0.06);
                        padding:24px 48px;
                        text-align:center;">
              <p style="margin:0;font-size:12px;color:#484f58;">
                © ${new Date().getFullYear()} LinguaLink — The Global Communication Standard
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

// ─────────────────────────────────────────────────────────
// 📧  SEND EMAIL OTP  (Gmail SMTP via Nodemailer)
// ─────────────────────────────────────────────────────────
async function sendEmailOTP(email, otp) {
  // --- Guard: make sure credentials are actually set ---
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (
    !emailUser || emailUser === 'your_gmail_address@gmail.com' ||
    !emailPass || emailPass === 'your_16char_app_password'
  ) {
    throw new Error('Email Gateway not configured. Please contact administrator.');
  }

  // --- Real Gmail SMTP transport ---
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPass,   // 16-char App Password (not your Gmail password)
    },
  });

  const info = await transporter.sendMail({
    from: `"LinguaLink Security" <${emailUser}>`,
    to: email,
    subject: `${otp} — Your LinguaLink Verification Code`,
    text: `Your LinguaLink OTP is: ${otp}\n\nIt will expire in 15 minutes.\nNever share this code with anyone.`,
    html: buildOtpEmailHTML(otp),
  });

  console.log(`\n[EMAIL] ✅ OTP sent to ${email} | Message ID: ${info.messageId}\n`);
}

// ─────────────────────────────────────────────────────────
// 📱  SEND SMS OTP  (Twilio)
// ─────────────────────────────────────────────────────────
async function sendSmsOTP(phone, otp) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_PHONE_NUMBER;

  const twilioConfigured =
    accountSid && accountSid !== 'your_account_sid_here' &&
    authToken && authToken !== 'your_auth_token_here' &&
    fromPhone && fromPhone !== 'your_twilio_number_here';

  if (!twilioConfigured) {
    throw new Error('SMS Gateway not configured. Please contact administrator.');
  }

  // --- Real Twilio send ---
  const twilio = require('twilio');
  const client = twilio(accountSid, authToken);

  // Twilio requires E.164 format (e.g., +91XXXXXXXXXX).
  const cleanPhone = phone.replace(/[\s\-()]/g, '');
  const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : '+' + cleanPhone;

  try {
    const message = await client.messages.create({
      body: `Your LinguaLink verification code is: ${otp}\nValid for 15 minutes. Never share this code.`,
      from: fromPhone,
      to: formattedPhone,
    });
    console.log(`\n[SMS] ✅ OTP sent to ${formattedPhone} | SID: ${message.sid} | Status: ${message.status}\n`);
  } catch (error) {
    console.error(`\n[SMS ERROR] ❌ Failed to send to ${formattedPhone}: ${error.message} (Code: ${error.code})`);
    // Twilio Trial accounts can only message pre-verified numbers.
    // Error code 21608 = unverified number on trial account
    if (error.code === 21608) {
      throw new Error(
        `SMS failed: Your Twilio account is on a TRIAL plan. The number ${formattedPhone} must first be verified at twilio.com/user/account/phone-numbers/verified to receive SMS.`
      );
    }
    throw new Error(`SMS delivery failed: ${error.message}`);
  }
}

// ─────────────────────────────────────────────────────────
// 🔀  SMART DISPATCH — email vs phone
// ─────────────────────────────────────────────────────────
async function dispatchOTP(identifier, otp) {
  const isDev = process.env.NODE_ENV !== 'production';
  try {
    if (identifier.includes('@')) {
      await sendEmailOTP(identifier, otp);
    } else {
      await sendSmsOTP(identifier, otp);
    }
  } catch (err) {
    // In development: if network is unavailable, print OTP to console
    if (isDev && (err.message.includes('ENOTFOUND') || err.message.includes('ECONNREFUSED') || err.message.includes('network') || err.code === 'ENOTFOUND')) {
      console.log('\n' + '═'.repeat(60));
      console.log('📬  DEV MODE — OTP DELIVERY FALLBACK');
      console.log(`    Identifier : ${identifier}`);
      console.log(`    OTP Code   : \x1b[33m\x1b[1m${otp}\x1b[0m`);
      console.log('    (Network unreachable — OTP printed to console only)');
      console.log('═'.repeat(60) + '\n');
      return; // Don't throw in dev mode
    }
    throw err; // In production, still throw
  }
}

// ─────────────────────────────────────────────────────────
// 🔑  GENERATE OTP HELPER
// ─────────────────────────────────────────────────────────
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function normalizeIdentifier(identifier = '') {
  return String(identifier).trim().toLowerCase();
}

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function shouldExposeDevOtp() {
  return !isProduction() && process.env.EXPOSE_DEV_OTP !== 'false';
}

function withDevOtp(payload, otp) {
  // Enforcing strict security: Never expose OTP in the API payload
  return payload;
}

function buildAuthResponseUser(user) {
  return {
    id: user._id,
    name: user.name,
    identifier: user.identifier,
    language: user.language,
    initials: user.initials,
    isVerified: user.isVerified,
    role: user.role, // EXPOSE ROLE HERE
    preferences: user.preferences,
    profilePic: user.profilePic,
    bio: user.bio,
    createdAt: user.createdAt,
    isTwoFactorEnabled: user.isTwoFactorEnabled,
  };
}

async function deliverOTP(identifier, otp) {
  try {
    await dispatchOTP(identifier, otp);
  } catch (err) {
    console.error('[OTP] Delivery failed:', err.message);
    // In production, rethrow. In dev, dispatchOTP already handled the fallback.
    if (process.env.NODE_ENV === 'production') throw err;
  }
}

// ═══════════════════════════════════════════════════════════
//  CONTROLLER METHODS
// ═══════════════════════════════════════════════════════════

// POST /api/auth/register
exports.registerUser = async (req, res) => {
  try {
    const { name, password, language } = req.body;
    const identifier = normalizeIdentifier(req.body.identifier);

    if (!name?.trim() || !identifier || !password) {
      return res.status(400).json({ message: 'Name, identifier, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    // Check for existing verified user
    const existing = await User.findOne({ identifier });
    if (existing) {
      if (existing.isVerified) {
        return res.status(400).json({ message: 'An account already exists with this email or phone number.' });
      }
      // Unverified leftover — clean it up so the user can re-register
      await User.deleteOne({ _id: existing._id });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);

    const newUser = new User({
      name: name.trim(),
      identifier,
      password: hashedPassword,
      language: language || 'en',
      initials: name.trim().substring(0, 2).toUpperCase(),
      isVerified: false,
      otp,
      otpExpiry,
    });

    await newUser.save();

    // For email: fire-and-forget (fast). For phone: await so we can catch SMS errors.
    if (identifier.includes('@')) {
      dispatchOTP(identifier, otp).catch(err => console.error('[dispatchOTP email error]:', err.message));
    } else {
      try {
        await dispatchOTP(identifier, otp);
      } catch (smsErr) {
        // In production: SMS failed — delete the partially-created user and report clearly
        if (process.env.NODE_ENV === 'production') {
          await newUser.deleteOne();
          return res.status(400).json({ message: smsErr.message });
        }
        // In development: just log, let registration proceed
        console.error('[SMS] Delivery failed in dev mode:', smsErr.message);
      }
    }

    return res.status(201).json(withDevOtp({
      message: 'Registration started. Please verify the OTP sent to your email or phone.',
      requireOtp: true,
    }, otp));
  } catch (err) {
    console.error('[registerUser] Error:', err);
    // If it's a known SMS or SMTP error, pass the message directly to the frontend
    const message = err.message.includes('SMS') || err.message.includes('SMTP')
      ? err.message
      : 'Server error during registration.';
    return res.status(500).json({ message, error: err.message });
  }
};

// --- LOGIC BLOCK: LOGIN ---
// POST /api/auth/login
// This function runs when a user tries to log in. 
// 1. It checks if the email/phone exists.
// 2. It compares the given password with the encrypted one in the database using bcrypt.
// 3. If correct, it generates a secure "ticket" (JWT token) for the user to stay logged in.
exports.loginUser = async (req, res) => {
  try {
    const { password } = req.body;
    const identifier = normalizeIdentifier(req.body.identifier);

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Identifier and password are required.' });
    }

    let user = await User.findOne({ identifier });

    // Developer magic fallback: if the default admin is locked out or doesn't exist, seamlessly create/verify them
    if (!user && identifier === 'as.archishah@gmail.com') {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      user = new User({
        name: 'Archi Shah',
        identifier: 'as.archishah@gmail.com',
        password: hashedPassword,
        initials: 'AS',
        role: 'admin',
        isVerified: true
      });
      await user.save();
    } else if (user && identifier === 'as.archishah@gmail.com' && user.role !== 'admin') {
      // Forcefully upgrade the owner to admin if they registered as a normal user
      user.role = 'admin';
      await user.save();
    }

    if (!user) {
      return res.status(404).json({ message: 'No account found with that email or phone.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect password. Please try again.' });
    }

    if (!user.isTwoFactorEnabled) {
      // Direct login if 2FA is off
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '30d' });
      return res.status(200).json({
        message: 'Credentials verified.',
        requireOtp: false,
        user: buildAuthResponseUser(user),
        token
      });
    }

    // Generate fresh OTP for 2FA step
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);
    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Fire and forget dispatchOTP to ensure the frontend gets an instant response instead of waiting for SMTP
    dispatchOTP(identifier, otp).catch(err => console.error('[dispatchOTP background error]:', err.message));

    return res.status(200).json(withDevOtp({
      message: 'Credentials verified. Please enter the OTP sent to your email or phone.',
      requireOtp: true,
    }, otp));
  } catch (err) {
    console.error('[loginUser] Error:', err);
    return res.status(500).json({ message: 'Server error during login.', error: err.message });
  }
};

// POST /api/auth/send-otp  (resend scenario)
exports.sendOTP = async (req, res) => {
  try {
    const identifier = normalizeIdentifier(req.body.identifier);

    if (!identifier) {
      return res.status(400).json({ message: 'Identifier is required.' });
    }

    const user = await User.findOne({ identifier });
    if (!user) {
      return res.status(404).json({ message: 'No account found with that email or phone.' });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);
    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    dispatchOTP(identifier, otp).catch(err => console.error('[dispatchOTP background error]:', err.message));

    return res.status(200).json(withDevOtp({ message: 'A new OTP has been sent successfully.' }, otp));
  } catch (err) {
    console.error('[sendOTP] Error:', err);
    return res.status(500).json({ message: 'Server error while resending OTP.', error: err.message });
  }
};

// POST /api/auth/verify-otp
exports.verifyOTP = async (req, res) => {
  try {
    const identifier = normalizeIdentifier(req.body.identifier);
    const otp = String(req.body.otp || '').trim();

    if (!identifier || !otp) {
      return res.status(400).json({ message: 'Identifier and OTP are required.' });
    }

    const user = await User.findOne({ identifier });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Validate OTP existence, match, and expiry
    if (!user.otp) {
      return res.status(400).json({ message: 'No OTP found. Please request a new one.' });
    }
    if (user.otp !== otp) {
      return res.status(400).json({ message: 'Incorrect OTP. Please check and try again.' });
    }
    if (user.otpExpiry < new Date()) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    // All good — mark as verified and clear OTP fields
    user.otp = undefined;
    user.otpExpiry = undefined;
    user.isVerified = true;
    await user.save();

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '30d' }
    );

    const safeUser = buildAuthResponseUser(user);

    return res.status(200).json({
      message: 'Verification successful! Welcome to LinguaLink.',
      user: safeUser,
      token,
    });
  } catch (err) {
    console.error('[verifyOTP] Error:', err);
    return res.status(500).json({ message: 'Server error during OTP verification.', error: err.message });
  }
};

// POST /api/auth/google
exports.googleAuth = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'Google token is required.' });
    }

    // Fetch user profile from Google using the access token
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user profile from Google. Invalid or expired token.');
    }

    const payload = await response.json();
    const { email, name, picture } = payload;


    // Check if user exists
    let user = await User.findOne({ identifier: email });

    if (!user) {
      // Create new user if they don't exist
      const generatedPassword = Math.random().toString(36).slice(-10) + 'A1!'; // Secure random password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(generatedPassword, salt);

      user = new User({
        name: name,
        identifier: email,
        password: hashedPassword,
        language: 'en', // Default
        initials: name.substring(0, 2).toUpperCase(),
        isVerified: true, // Auto-verified via Google
        profilePic: picture,
      });
      await user.save();
    } else if (!user.isVerified) {
      // If user exists but isn't verified, verify them now
      user.isVerified = true;
      if (picture && !user.profilePic) user.profilePic = picture;
      await user.save();
    }

    // Generate our own JWT
    const authToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '30d' }
    );

    const safeUser = buildAuthResponseUser(user);

    return res.status(200).json({
      message: 'Google login successful!',
      user: safeUser,
      token: authToken,
    });
  } catch (err) {
    console.error('[googleAuth] Error:', err);
    return res.status(500).json({ message: 'Google authentication failed.', error: err.message });
  }
};

// GET /api/auth/me  (returns currently authenticated user)
exports.getMe = async (req, res) => {
  try {
    return res.status(200).json(buildAuthResponseUser(req.user));
  } catch (err) {
    console.error('[getMe] Error:', err);
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

// POST /api/auth/logout
exports.logoutUser = async (req, res) => {
  return res.status(200).json({ message: 'Logged out successfully.' });
};

// PATCH /api/auth/profile  (requires auth middleware)
exports.updateProfile = async (req, res) => {
  try {
    const { name, bio, profilePic, language } = req.body;
    const updates = {};
    if (name) { updates.name = name.trim(); updates.initials = name.trim().substring(0, 2).toUpperCase(); }
    if (bio !== undefined) updates.bio = bio;
    if (profilePic) updates.profilePic = profilePic;
    if (language) updates.language = language;

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true })
      .select('-password -otp -otpExpiry');

    const io = req.app.get('io');
    if (io) {
      io.emit('user_profile_updated', user);
    }

    return res.status(200).json({ message: 'Profile updated.', user });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update profile.', error: err.message });
  }
};

// PATCH /api/auth/preferences  (requires auth middleware)
exports.updatePreferences = async (req, res) => {
  try {
    const { darkMode, autoTranslate, notifications, readReceipts } = req.body;
    const prefs = {};
    if (darkMode !== undefined) prefs['preferences.darkMode'] = darkMode;
    if (autoTranslate !== undefined) prefs['preferences.autoTranslate'] = autoTranslate;
    if (notifications !== undefined) prefs['preferences.notifications'] = notifications;
    if (readReceipts !== undefined) prefs['preferences.readReceipts'] = readReceipts;

    await User.findByIdAndUpdate(req.user._id, { $set: prefs });
    return res.status(200).json({ message: 'Preferences updated.' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update preferences.', error: err.message });
  }
};

// POST /api/auth/forgot-password  — Step 1: send OTP to account
exports.forgotPassword = async (req, res) => {
  try {
    const identifier = normalizeIdentifier(req.body.identifier);
    if (!identifier) {
      return res.status(400).json({ message: 'Email or phone number is required.' });
    }
    const user = await User.findOne({ identifier });
    if (!user) {
      // Security: don't reveal whether account exists
      return res.status(200).json({ message: 'If an account exists, a reset code has been sent.', requireOtp: true });
    }
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);
    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();
    await deliverOTP(identifier, otp);
    console.log(`[forgotPassword] Reset OTP sent to ${identifier}`);
    return res.status(200).json({ message: 'If an account exists, a reset code has been sent.', requireOtp: true });
  } catch (err) {
    console.error('[forgotPassword] Error:', err);
    return res.status(500).json({ message: 'Server error. Please try again.', error: err.message });
  }
};

// POST /api/auth/reset-password  — Step 2: verify OTP + set new password
exports.resetPassword = async (req, res) => {
  try {
    const identifier = normalizeIdentifier(req.body.identifier);
    const otp = String(req.body.otp || '').trim();
    const newPassword = req.body.newPassword;
    if (!identifier || !otp || !newPassword) {
      return res.status(400).json({ message: 'Identifier, OTP and new password are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }
    const user = await User.findOne({ identifier });
    if (!user) return res.status(404).json({ message: 'Account not found.' });
    if (!user.otp) return res.status(400).json({ message: 'No reset code found. Please request a new one.' });
    if (user.otp !== otp) return res.status(400).json({ message: 'Incorrect code. Please try again.' });
    if (user.otpExpiry < new Date()) return res.status(400).json({ message: 'Code expired. Please request a new one.' });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.otp = undefined;
    user.otpExpiry = undefined;
    user.isVerified = true;
    await user.save();
    return res.status(200).json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (err) {
    console.error('[resetPassword] Error:', err);
    return res.status(500).json({ message: 'Server error. Please try again.', error: err.message });
  }
};

// POST /api/auth/2fa/enable (requires auth middleware)
exports.enable2fa = async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.user._id);

    if (!user.otp) return res.status(400).json({ message: 'No OTP requested.' });
    if (user.otp !== code) return res.status(400).json({ message: 'Incorrect verification code.' });
    if (user.otpExpiry < new Date()) return res.status(400).json({ message: 'Verification code expired.' });

    user.isTwoFactorEnabled = true;
    user.twoFactorSecret = undefined; // clear out old app secret if any
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();
    return res.status(200).json({ message: 'Two-Factor Authentication enabled successfully.' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to enable 2FA.', error: err.message });
  }
};

// POST /api/auth/2fa/disable (requires auth middleware)
exports.disable2fa = async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.user._id);

    if (!user.isTwoFactorEnabled) {
      return res.status(400).json({ message: '2FA is not enabled.' });
    }

    if (!user.otp) return res.status(400).json({ message: 'No verification code requested.' });
    if (user.otp !== code) return res.status(400).json({ message: 'Incorrect verification code.' });
    if (user.otpExpiry < new Date()) return res.status(400).json({ message: 'Verification code expired.' });

    user.isTwoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();
    return res.status(200).json({ message: 'Two-Factor Authentication disabled successfully.' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to disable 2FA.', error: err.message });
  }
};
