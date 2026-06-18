import React from 'react';
import { Navigate } from 'react-router-dom';
import { getAuthSession } from '../../utils/authStorage';

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated } = getAuthSession();

    if (!isAuthenticated) {
        // Redirect to login if not authenticated
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;
