import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { socketService } from '../services/socket.service';
import { clearStoredAuth } from '../utils/authStorage';

const useLogout = (redirectTo = '/') => {
    const navigate = useNavigate();

    return useCallback(() => {
        clearStoredAuth();
        socketService.clearAuthSession();
        navigate(redirectTo);
    }, [navigate, redirectTo]);
};

export default useLogout;
