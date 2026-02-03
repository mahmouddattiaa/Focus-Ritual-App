const authService = require('../services/auth.service');
const User = require('../models/user.model.js'); // Still needed for some direct queries or middleware attachment
const nodemailer = require('nodemailer');
const crypto = require('crypto');

exports.register = async (req, res) => {
    try {
        const { email, firstName, lastName, password } = req.body;
        if (!email || !firstName || !lastName || !password) {
            return res.status(400).json({
                success: false,
                message: 'please fill out all the fields'
            });
        }

        const user = await authService.registerUser({ email, firstName, lastName, password });
        const token = authService.generateToken(user._id);
        const profilePictureUrl = await authService.getProfilePictureDownloadUrl(user.profilePicture);

        res.status(201).json({
            success: true,
            token,
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                profilePicture: profilePictureUrl,
                bio: user.bio,
                settings: user.settings
            }
        });
    } catch (err) {
        console.error('error occured during registration: ', err);
        const status = err.message === 'User already exists' ? 400 : 500;
        res.status(status).json({
            success: false,
            message: err.message || 'server error',
            error: err.message
        });
    }
};

exports.login = async (req, res) => {
    try {
        const user = req.user;
        const { rememberMe } = req.body;
        
        const { token, refreshToken, profilePictureUrl } = await authService.loginUser(user);

        if (rememberMe) {
            user.refreshToken = refreshToken;
            await user.save();
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'strict',
                maxAge: 30 * 24 * 60 * 60 * 1000
            });
        }
        
        res.status(200).json({
            success: true,
            token,
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                profilePicture: profilePictureUrl,
                bio: user.bio,
                settings: user.settings
            }
        });
    } catch (err) {
        console.log('login error: ', err);
        res.status(500).json({
            success: false,
            message: 'server error',
            error: err.message
        });
    }
};

exports.getCurrentUser = async (req, res) => {
    try {
        const user = req.user;
        const profilePictureUrl = await authService.getProfilePictureDownloadUrl(user.profilePicture);

        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                profilePicture: profilePictureUrl,
                bio: user.bio,
                settings: user.settings
            }
        });
    } catch (err) {
        console.log("error fetching user info due to: ", err);
        res.status(500).json({
            success: false,
            message: 'server error',
            error: err.message
        });
    }
};

exports.refresh = async (req, res) => {
    try {
        const { refreshToken } = req.cookies;
        
        const { token, newRefreshToken, user, profilePictureUrl } = await authService.refreshUserToken(refreshToken);

        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000
        });

        res.status(200).json({
            success: true,
            token,
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                profilePicture: profilePictureUrl,
                bio: user.bio,
                settings: user.settings
            }
        });
    } catch (err) {
        console.log("error refreshing token due to: ", err);
        const status = (err.message === 'No refresh token' || err.message === 'Invalid refresh token') ? 401 : 500;
        res.status(status).json({
            success: false,
            message: err.message || 'server error',
            error: err.message
        });
    }
};

exports.logout = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { refreshToken } = req.cookies;
        if (refreshToken) {
            await User.updateOne({ refreshToken }, { $unset: { refreshToken: "" } });
        }
        res.clearCookie('refreshToken');
        res.status(200).json({
            message: 'logged out successfully!'
        });
    } catch (err) {
        console.log("error logging out due to: ", err);
        res.status(500).json({
            success: false,
            message: 'server error',
            error: err.message
        });
    }
};

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'No user with that email' });


    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();


    const resetUrl = `http://localhost:5173/reset-password?token=${token}`;
    const transporter = nodemailer.createTransport({

        service: 'Gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
    await transporter.sendMail({
        to: user.email,
        subject: 'Password Reset',
        html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link will expire in 1 hour.</p>`
    });

    res.json({ message: 'Password reset email sent' });
};

exports.resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;
    const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
    });
    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

    user.password = newPassword;
    user.refreshToken = undefined;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password has been reset' });
};

