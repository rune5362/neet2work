import { NOTIFICATIONS } from "../data/notifications";
import { HomeFooter } from "../components/HomeFooter";
import { HomeTopNav } from "../components/HomeTopNav";

export function Notifications() {
  const unreadCount = NOTIFICATIONS.filter((notification) => notification.isUnread).length;

  return (
    <main className="notificationsPage">
      <HomeTopNav active="notifications" />

      <section className="notificationsContent">
        <header className="notificationsHeader">
          <span>알림 및 공지사항</span>
          <div>
            <p>확인하지 않은 공지사항과 계정 알림을 한 곳에서 확인할 수 있습니다.</p>
          </div>
          <strong>미확인 {unreadCount}</strong>
        </header>

        <section className="notificationsList" aria-label="알림 및 공지사항 목록">
          {NOTIFICATIONS.map((notification) => (
            <article className={notification.isUnread ? "notificationsItem unread" : "notificationsItem"} key={notification.id}>
              <div className="notificationsItemMarker" aria-hidden="true" />
              <div>
                <span>{notification.category}</span>
                <h2>{notification.title}</h2>
                <p>{notification.summary}</p>
              </div>
              <time>{notification.createdAt}</time>
            </article>
          ))}
        </section>
      </section>

      <HomeFooter />
    </main>
  );
}
