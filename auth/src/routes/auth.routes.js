import { Router } from "express";
import User from "../models/user.model.js";
import passport from "passport";
import { sendAuthNotification } from "../config/mq.js";
import jwt from "jsonwebtoken";

const router = Router();


router.get('/google', passport.authenticate('google', {
    session: false,
    scope: ['profile', 'email']
}));

router.get('/google/callback', passport.authenticate('google', {
    session: false,
    failureRedirect: '/'
}), async (req, res) => {
    console.log('--- /api/auth/google/callback request received ---');
    console.log('Host header:', req.headers.host);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    try {
        const { id, displayName, emails, photos } = req.user;
        let user = await User.findOne({ googleId: id });


        if (!user) {
            user = new User({
                googleId: id,
                email: emails[0].value,
                name: displayName,
                avatar: photos[0].value
            });
            await user.save();
        }

        await sendAuthNotification({
            userId: user._id,
            action: 'google_login',
            timestamp: new Date(),
            email: emails[ 0 ].value
        });

        // Generate JWT token — valid for 30 days
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

        // Set token in cookie — 30 days in ms
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        };
        console.log('Setting cookie "token" with options:', cookieOptions);
        res.cookie('token', token, cookieOptions);
        console.log('Redirecting to http://localhost:5173');
        res.redirect('http://localhost:5173'); // Redirect to your frontend after successful login
    } catch (err) {
        console.error('Error during Google authentication:', err);
        res.redirect('/'); // Redirect to your frontend on error
    }
});

// Get current logged in user profile
router.get('/me', async (req, res) => {
    console.log('--- /api/auth/me request received ---');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('Cookies:', req.cookies);
    try {
        const token = req.cookies?.token;
        if (!token) {
            console.log('No token found in cookies');
            return res.status(200).json({ isAuthenticated: false, user: null });
        }

        console.log('Token found:', token.substring(0, 15) + '...');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Decoded token:', decoded);
        const user = await User.findById(decoded.id).select('-googleId');

        if (!user) {
            console.log('User not found in database for id:', decoded.id);
            return res.status(200).json({ isAuthenticated: false, user: null });
        }

        // Rolling refresh: reissue a fresh 30-day token on every /me call
        // so active users are never forcibly logged out
        const freshToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
        res.cookie('token', freshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });

        console.log('User authenticated successfully:', user.email);
        return res.status(200).json({ isAuthenticated: true, user });
    } catch (err) {
        console.error('Error verifying token/user in /me:', err.message);
        return res.status(200).json({ isAuthenticated: false, user: null });

    }
});

// Logout user and clear cookie
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    return res.status(200).json({ success: true, message: 'Logged out successfully' });
});

export default router;