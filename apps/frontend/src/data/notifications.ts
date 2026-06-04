import type { NotificationItem } from "../types/notifications";

export const NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notice-service-update-2026-05",
    category: "공지",
    title: "AI 분석 결과 화면이 개선되었습니다",
    summary: "직무 적합도와 보완 문장 제안이 더 읽기 쉬운 구조로 정리됩니다.",
    createdAt: "2026.05.27 09:00",
    isUnread: true
  },
  {
    id: "alert-document-review-ready",
    category: "알림",
    title: "보관함 문서 검토가 필요합니다",
    summary: "최근 저장한 자기소개서에 AI 개선안이 2건 도착했습니다.",
    createdAt: "2026.05.26 18:20",
    isUnread: true
  },
  {
    id: "notice-maintenance-window",
    category: "공지",
    title: "서비스 점검 안내",
    summary: "5월 29일 새벽 2시부터 30분 동안 일부 기능이 일시 중단될 수 있습니다.",
    createdAt: "2026.05.25 14:30",
    isUnread: false
  }
];

export const UNREAD_NOTIFICATIONS = NOTIFICATIONS.filter((notification) => notification.isUnread);
