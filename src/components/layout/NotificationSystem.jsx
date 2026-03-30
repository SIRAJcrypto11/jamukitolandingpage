import React, { useEffect } from 'react';

const NotificationSystem = () => {
  useEffect(() => {
    // Minta izin dari user untuk menampilkan notifikasi
    if ("Notification" in window) {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          // Jika diizinkan, tampilkan notifikasi
          new Notification("Sistem berhasil berjalan!", {
            body: "Ini notifikasi dari aplikasi React.",
            icon: "/logo192.png", // bisa diganti sesuai logo aplikasi
          });
        }
      });
    }
  }, []);

  // Komponen tidak perlu render apapun di UI
  return null;
};

export default NotificationSystem;
