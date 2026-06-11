import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import Styles from "./NotificationContext.module.css";
// Create Context
const NotificationContext = createContext();

// Custom hook to use notifications
export const useNotification = () => useContext(NotificationContext);

// Provider component wrapping your app (e.g. homepage)
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  // Add new notification
  const addNotification = useCallback(({ type='error', text }) => {
    if (!text) return;
    const id = Date.now() + Math.random(); // unique id
    setNotifications((prev) => [...prev, { id, type, text }]);
  }, []);

  // Remove notification by id
  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      <div className={Styles.notificationsContainer}>
        {notifications.map(({ id, type, text }) => (
          <Notification
            key={id}
            id={id}
            type={type}
            text={text}
            onClose={() => removeNotification(id)}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

// Notification component
const Notification = ({ id, type="error", text, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [id, onClose]);

  return (
    <div className={`${Styles.notification} ${type}`}>
      {console.log(type)}
      {text}
      <span className={Styles.closeButton} onClick={onClose}>
        ✕
      </span>
    </div>
  );
};
