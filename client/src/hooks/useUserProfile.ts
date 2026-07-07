import { useQuery } from '@tanstack/react-query';
import axios from '../lib/axios';
import { useAuth } from '../context/AuthContext';

export interface UserProfile {
    _id: string;
    name: string;
    email: string;
    profileImage?: string;
    personalInfo?: any;
    // Add other fields as expected from /api/user/profile
}

export const useUserProfile = () => {
    const { user } = useAuth();
    const userId = user?.id || user?._id || user?.userId;

    return useQuery({
        queryKey: ['userProfile', userId],
        queryFn: async () => {
            if (!userId) return null;
            const response = await axios.get('/api/user/profile', {
                headers: { userid: userId }
            });
            return response.data.success ? response.data.data : null;
        },
        enabled: !!userId,
        placeholderData: user || undefined
    });
};
