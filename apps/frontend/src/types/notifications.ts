export type NotificationItem = {
  id: string;
  category: "공지" | "알림";
  title: string;
  summary: string;
  createdAt: string;
  isUnread: boolean;
};
