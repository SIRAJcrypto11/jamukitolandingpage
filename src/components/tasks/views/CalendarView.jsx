import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isSameMonth } from 'date-fns';
import { id } from 'date-fns/locale';

export default function CalendarView({ 
  tasks, 
  workspaces, 
  user, 
  onTaskSelect, 
  onTaskUpdate, 
  onTaskDelete,
  onTaskCreate,
  isLoading 
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectedCalendars, setConnectedCalendars] = useState({
    google: false,
    outlook: false,
    icloud: false
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getTasksForDay = (date) => {
    return tasks.filter(task => {
      if (!task.due_date) return false;
      return isSameDay(new Date(task.due_date), date);
    });
  };

  const handleCalendarConnect = (provider) => {
    // Simulate calendar connection
    setConnectedCalendars(prev => ({
      ...prev,
      [provider]: true
    }));
    
    // In real implementation, this would handle OAuth flows
    console.log(`Connecting to ${provider} calendar...`);
  };

  const CalendarConnectModal = () => (
    <AnimatePresence>
      {showConnectModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setShowConnectModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gray-800 rounded-2xl p-8 max-w-md w-full mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl font-bold">SEP<br/>17</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Connect your calendar</h2>
              <p className="text-gray-400">Please approve all permissions to connect your calendar</p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3 text-green-400 text-sm">
                <Check className="w-4 h-4" />
                Connect your Google or Outlook calendars
              </div>
              <div className="flex items-center gap-3 text-green-400 text-sm">
                <Check className="w-4 h-4" />
                Schedule your personal and workspace tasks
              </div>
              <div className="flex items-center gap-3 text-green-400 text-sm">
                <Check className="w-4 h-4" />
                Easily create, edit and delete events
              </div>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={() => handleCalendarConnect('google')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={connectedCalendars.google}
              >
                {connectedCalendars.google ? 'Google Calendar Connected' : 'Connect Google Calendar'}
              </Button>
              <Button 
                onClick={() => handleCalendarConnect('outlook')}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                disabled={connectedCalendars.outlook}
              >
                {connectedCalendars.outlook ? 'Outlook Calendar Connected' : 'Connect Outlook Calendar'}
              </Button>
              <Button 
                onClick={() => handleCalendarConnect('icloud')}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white"
                disabled={connectedCalendars.icloud}
              >
                {connectedCalendars.icloud ? 'iCloud Calendar Connected' : 'Connect iCloud Calendar'}
              </Button>
            </div>

            <Button
              onClick={() => setShowConnectModal(false)}
              variant="ghost"
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (isLoading) {
    return (
      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="h-8 bg-gray-700 rounded w-48 mb-6 animate-pulse"></div>
          <div className="grid grid-cols-7 gap-4">
            {[...Array(35)].map((_, i) => (
              <div key={i} className="aspect-square bg-gray-700 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-auto bg-gray-900 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-white">
                {format(currentDate, 'MMMM yyyy', { locale: id })}
              </h1>
              <Button
                onClick={() => setShowConnectModal(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Connect
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                className="text-white border-gray-600"
              >
                ‹
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentDate(new Date())}
                className="text-white border-gray-600"
              >
                Today
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                className="text-white border-gray-600"
              >
                ›
              </Button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="bg-gray-800 rounded-xl p-6">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-4 mb-4">
              {['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'].map(day => (
                <div key={day} className="text-center text-gray-400 font-medium text-sm py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-4">
              {days.map((day, index) => {
                const dayTasks = getTasksForDay(day);
                const isCurrentDay = isToday(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                
                return (
                  <motion.div
                    key={index}
                    className={`min-h-32 p-3 rounded-lg border transition-colors cursor-pointer ${
                      isCurrentDay 
                        ? 'bg-blue-600 border-blue-500 text-white' 
                        : isCurrentMonth 
                          ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' 
                          : 'bg-gray-800 border-gray-700 text-gray-500'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium ${
                        isCurrentDay ? 'text-white' : isCurrentMonth ? 'text-white' : 'text-gray-500'
                      }`}>
                        {format(day, 'd')}
                      </span>
                      {dayTasks.length > 0 && (
                        <Badge className="text-xs bg-blue-500 text-white">
                          {dayTasks.length}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      {dayTasks.slice(0, 3).map(task => (
                        <div
                          key={task.id}
                          className="text-xs p-1 bg-blue-500 text-white rounded truncate cursor-pointer hover:bg-blue-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            onTaskSelect(task);
                          }}
                        >
                          {task.title}
                        </div>
                      ))}
                      {dayTasks.length > 3 && (
                        <div className="text-xs text-gray-400 text-center">
                          +{dayTasks.length - 3} more
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Connected Calendars Info */}
          {Object.values(connectedCalendars).some(Boolean) && (
            <div className="mt-6 p-4 bg-gray-800 rounded-lg">
              <h3 className="text-white font-medium mb-3">Connected Calendars:</h3>
              <div className="flex gap-3">
                {connectedCalendars.google && (
                  <Badge className="bg-blue-600 text-white">Google Calendar</Badge>
                )}
                {connectedCalendars.outlook && (
                  <Badge className="bg-blue-500 text-white">Outlook Calendar</Badge>
                )}
                {connectedCalendars.icloud && (
                  <Badge className="bg-gray-600 text-white">iCloud Calendar</Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <CalendarConnectModal />
    </>
  );
}