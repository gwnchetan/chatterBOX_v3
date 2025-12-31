import React, { useState } from 'react';
import './login.css';
import { useToast } from '../components/Toast';
import BrandLogo from '../components/common/BrandLogo';
import LogoLoader from '../components/common/LogoLoader';
import { useGoogleLogin } from '@react-oauth/google';
import loginIllustration from '../assets/login.png';
import { useNavigate } from 'react-router-dom';

function Login() {
    const navigate = useNavigate();
    const [isRegister, setIsRegister] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        fullname: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const toggleForm = (e) => {
        e.preventDefault();
        setIsRegister(!isRegister);
        setErrors({}); // Clear errors on switch
        setFormData({ username: '', fullname: '', email: '', password: '', confirmPassword: '' });
    };

    // Theme Management
    const [theme, setTheme] = useState('dark');

    React.useEffect(() => {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        setTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
    };

    const handleChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));

        // Clear specific error when user types
        if (errors[id]) {
            setErrors(prev => ({ ...prev, [id]: '' }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        // Email Validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formData.email) {
            newErrors.email = "Email is required";
        } else if (!emailRegex.test(formData.email)) {
            newErrors.email = "Invalid email format";
        }

        // Password Validation
        if (!formData.password) {
            newErrors.password = "Password is required";
        } else if (formData.password.length < 6) {
            newErrors.password = "Password must be at least 6 characters";
        }

        if (isRegister) {
            // Username Validation
            if (!formData.username) {
                newErrors.username = "Username is required";
            } else if (formData.username.length < 3) {
                newErrors.username = "Username must be at least 3 characters";
            }

            // Full Name Validation
            if (!formData.fullname) {
                newErrors.fullname = "Full Name is required";
            }

            // Confirm Password Validation
            if (formData.confirmPassword !== formData.password) {
                newErrors.confirmPassword = "Passwords do not match";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const [isLoading, setIsLoading] = useState(false);
    const { success, error } = useToast();

    const googleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            console.log("Google Popup Success, Token:", tokenResponse);
            try {
                setIsLoading(true);
                const res = await fetch('http://localhost:5000/api/auth/google', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ token: tokenResponse.access_token }),
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.message || 'Google Login Failed');
                }

                success("Google Login Successful!");
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                console.log("Navigating to feed...");
                // Force navigation if react-router is stuck
                navigate('/feed');
                // Backup: window.location.href = '/feed';

            } catch (err) {
                console.error("Google Auth Backend Error:", err);
                error(err.message || "Google Login Failed on Server");
            } finally {
                setIsLoading(false);
            }
        },
        onError: errorResponse => {
            console.error('Google Popup Failed:', errorResponse);
            error("Google Popup Closed or Failed");
        }
    });


    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            error("Please fix the validation errors.");
            return;
        }

        setIsLoading(true);

        const endpoint = isRegister
            ? 'http://localhost:5000/api/auth/register'
            : 'http://localhost:5000/api/auth/login';

        const payload = isRegister
            ? {
                username: formData.username,
                fullname: formData.fullname,
                email: formData.email,
                password: formData.password
            }
            : {
                username: formData.email, // Allow email or username login
                password: formData.password
            };

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle specific backend errors
                throw new Error(data.message || 'Something went wrong');
            }

            // Success
            success(isRegister ? "Registration Successful! Please Login." : "Login Successful!");

            if (!isRegister) {
                // Save token and user data
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                // Here you would typically navigate to the dashboard
                navigate('/feed');
            } else {
                // If registered, maybe switch to login view automatically
                setIsRegister(false);
                setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
            }

        } catch (err) {
            console.error("Auth Error:", err);
            error(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            {/* Theme Toggle Button */}
            <button
                onClick={toggleTheme}
                className="theme-toggle-btn"
            >
                {theme === 'light' ? '🌙' : '☀️'} Switch Theme
            </button>

            <div className="login-wrapper">
                {/* Left Side - Form */}
                <div className={`login-form-section ${isRegister ? 'register-mode' : ''}`}>
                    <div className="brand-header">
                        <BrandLogo size="4rem" />
                        <p className="brand-tagline">Connect globally, chat locally.</p>
                    </div>

                    <div className="form-content" key={isRegister ? "register" : "login"}>
                        <h1 className="login-title">
                            {isRegister ? "Create Account" : "Welcome Back!!"}
                        </h1>

                        <form className="login-form" onSubmit={handleSubmit}>
                            {isRegister && (
                                <>
                                    <div className="input-group">
                                        <label htmlFor="username" className="input-label">Username</label>
                                        <div className="input-wrapper">
                                            <span className="input-icon">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </span>
                                            <input
                                                type="text"
                                                id="username"
                                                placeholder="johndoe"
                                                className="login-input"
                                                value={formData.username}
                                                onChange={handleChange}
                                            />
                                        </div>
                                        {errors.username && <span className="error-message">{errors.username}</span>}
                                    </div>

                                    <div className="input-group">
                                        <label htmlFor="fullname" className="input-label">Full Name</label>
                                        <div className="input-wrapper">
                                            <span className="input-icon">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M17 21V19C17 16.7909 15.2091 15 13 15H5C2.79086 15 1 16.7909 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0065 6.11684 19.0065 7.005C19.0065 7.89315 18.7122 8.75608 18.1676 9.45768C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </span>
                                            <input
                                                type="text"
                                                id="fullname"
                                                placeholder="John Doe"
                                                className="login-input"
                                                value={formData.fullname}
                                                onChange={handleChange}
                                            />
                                        </div>
                                        {errors.fullname && <span className="error-message">{errors.fullname}</span>}
                                    </div>
                                </>
                            )}

                            <div className="input-group">
                                <label htmlFor="email" className="input-label">Email</label>
                                <div className="input-wrapper">
                                    <span className="input-icon">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M4 7.00005L10.2 11.65C11.2667 12.45 12.7333 12.45 13.8 11.65L20 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                        </svg>
                                    </span>
                                    <input
                                        type="email"
                                        id="email"
                                        placeholder="email@gmail.com"
                                        className="login-input"
                                        value={formData.email}
                                        onChange={handleChange}
                                    />
                                </div>
                                {errors.email && <span className="error-message">{errors.email}</span>}
                            </div>

                            <div className="input-group">
                                <label htmlFor="password" className="input-label">Password</label>
                                <div className="input-wrapper">
                                    <span className="input-icon">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M8 11V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </span>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        id="password"
                                        placeholder="Enter your password"
                                        className="login-input"
                                        value={formData.password}
                                        onChange={handleChange}
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={togglePasswordVisibility}
                                    >
                                        {showPassword ? (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                <path d="M1 12C1 12 5 20 12 20C19 20 23 12 23 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        ) : (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20C5 20 1 12 1 12C1 12 2.33 9.4 4.5 7.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                <path d="M1 1L23 23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4C19 4 23 12 23 12C23 12 22.39 13.26 21.4 14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                                {errors.password && <span className="error-message">{errors.password}</span>}
                            </div>

                            {isRegister && (
                                <div className="input-group">
                                    <label htmlFor="confirmPassword" className="input-label">Confirm Password</label>
                                    <div className="input-wrapper">
                                        <span className="input-icon">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </span>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            id="confirmPassword"
                                            placeholder="Confirm your password"
                                            className="login-input"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
                                </div>
                            )}

                            {!isRegister && (
                                <div className="forgot-password-link">
                                    <a href="#">Forgot Password?</a>
                                </div>
                            )}

                            <button type="submit" className="login-button" disabled={isLoading} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                {isLoading ? <div style={{ transform: 'scale(0.5)' }}><LogoLoader size="2rem" text="" /></div> : (isRegister ? "Sign Up" : "Login")}
                            </button>
                        </form>

                        <div className="divider">
                            <span>- or -</span>
                        </div>

                        <div className="social-login">
                            <button className="social-btn google" onClick={() => googleLogin()}>
                                <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                            </button>
                        </div>

                        <div className="signup-link">
                            {isRegister ? "Already have an account?" : "Don't have an account?"}
                            <a href="#" onClick={toggleForm}>
                                {isRegister ? "Sign in" : "Sign up"}
                            </a>
                        </div>
                    </div>
                </div>

                {/* Right Side - Image/Illustration */}
                <div className="login-image-section">
                    <div className="image-bg-shape"></div>

                    {/* Live Interaction Elements */}
                    <div className="chat-bubble bubble-1">
                        <div className="bubble-avatar" style={{ background: '#EF4444' }}>JD</div>
                        <div className="bubble-content">
                            <p className="bubble-name">John Doe</p>
                            <p className="bubble-text">Hey! checking out this new app 🚀</p>
                        </div>
                    </div>

                    <div className="chat-bubble bubble-2">
                        <div className="bubble-avatar" style={{ background: '#3B82F6' }}>AS</div>
                        <div className="bubble-content">
                            <p className="bubble-name">Alice Smith</p>
                            <p className="bubble-text">The UI is so clean! ✨</p>
                        </div>
                    </div>

                    <div className="notification-card">
                        <span className="bell-icon">🔔</span>
                        <div className="notif-text">
                            <p>New Friend Request</p>
                            <span>Just now</span>
                        </div>
                    </div>

                    <img src={loginIllustration} alt="Login Illustration" className="login-illustration" />
                </div>
            </div>
        </div>
    );
}

export default Login;
