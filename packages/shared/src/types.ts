export interface PrivacySettings {
    profileVisibility: 'Public' | 'Friends Only' | 'Private';
    activityVisibility: 'Public' | 'Friends Only' | 'Private';
    allowFriendRequests: boolean;
    showOnlineStatus: boolean;
    usageAnalytics: boolean;
    crashReports: boolean;
}

export interface UserProfile {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    bio?: string;
    profilePicture?: string;
    settings?: PrivacySettings;
    level?: number;
    xp?: number;
}
