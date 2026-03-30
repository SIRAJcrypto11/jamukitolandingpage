import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const NotificationToast = ({ notification, onClose, onAction }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, 8000); // Auto close after 8 seconds

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(), 300); // Wait for animation to complete
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Bell className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBgColor = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800';
      case 'error':
        return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';
      default:
        return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.95 }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30,
            mass: 0.8
          }}
          className="fixed top-4 right-4 z-[100] max-w-md w-full"
        >
          <Card className={`p-4 shadow-xl border-2 ${getBgColor(notification.type)} backdrop-blur-md`}>
            <div className="flex items-start gap-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 400 }}
              >
                {getIcon(notification.type)}
              </motion.div>
              
              <div className="flex-1 min-w-0">
                <motion.h4 
                  className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {notification.title}
                </motion.h4>
                <motion.p 
                  className="text-gray-700 dark:text-gray-300 text-xs leading-relaxed"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {notification.message}
                </motion.p>
                
                {notification.url && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-3"
                  >
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        if (notification.url.startsWith('http')) {
                          window.open(notification.url, '_blank');
                        } else {
                          window.location.href = notification.url;
                        }
                        handleClose();
                      }}
                      className="h-7 text-xs px-3"
                    >
                      Lihat Detail
                    </Button>
                  </motion.div>
                )}
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-6 w-6 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Progress bar */}
            <motion.div
              className="absolute bottom-0 left-0 h-1 bg-blue-500 rounded-bl-lg"
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 8, ease: "linear" }}
            />
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationToast;