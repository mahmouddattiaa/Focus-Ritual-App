const jwt = require('jsonwebtoken');
const User = require('../models/user.model.js');


const generateToken = (userId) => {
    return jwt.sign({ id: userId },
        process.env.JWT_SECRET || 'your_jwt_secret', {
            expiresIn: '1d'
        }
    );
};

exports.register = async(req, res) => {
    try {
        const { email, firstName, lastName, password } = req.body;
        if (!email || !firstName || !lastName || !password) {
            return res.status(400).json({
                success: false,
                message: 'please fill out all the fields'
            });
        }
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'user already exists.'
            });
        }

        const user = await User.create({
            email,
            firstName,
            lastName,
            password
        });

        const token = generateToken(user._id);
        res.status(201).json({
            success: true,
            token,
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName
            }
        });
    } catch (err) {
        console.error('error occured during registration: ', err);
        res.status(500).json({
            success: false,
            message: 'server error',
            error: err.message
        });
    }
};

exports.login = (req, res) => {
    try {
        const user = req.user;
        const token = generateToken(user._id)

        res.status(200).json({
            success: true,
            token,
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName
               
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

exports.getCurrentUser = async(req, res) => {
    try {
        const user = req.user;
        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                profilePicture: user.profilePicture,
                bio: user.bio,
                settings: {
                profileVisibility: user.settings.profileVisibility,
                activityVisibility: user.settings.activityVisibility,
                allowFriendRequests: user.settings.allowFriendRequests,
                showOnlineStatus: user.settings.showOnlineStatus,
                usageAnalytics: user.settings.usageAnalytics,
                crashReports: user.settings.crashReports
                }
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