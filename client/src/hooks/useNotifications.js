import { useState, useEffect } from 'react';

export function useNotifications() {
    const [unreadCount, setUnreadCount] = useState(0);

    // TODO: Implement notification logic
    // This would track unread messages across all conversations

    return {
        unreadCount,
        setUnreadCount
    };
}