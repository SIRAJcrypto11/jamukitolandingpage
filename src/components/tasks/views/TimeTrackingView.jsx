import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Square, Clock, BarChart3, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, formatDuration, intervalToDuration } from 'date-fns';
import { id } from 'date-fns/locale';

import TaskItem from '../TaskItem';

export default function TimeTrackingView({ 
  tasks, 
  workspaces, 
  user, 
  onTaskSelect, 
  onTaskUpdate, 
  onTaskDelete,
  onTaskCreate,
  isLoading 
}) {
  const [activeTimer, setActiveTimer] = useState(null);
  const [timerStartTime, setTimerStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timeEntries, setTimeEntries] = useState([]);

  useEffect(() => {
    let interval;
    if (activeTimer && timerStartTime) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - timerStartTime);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimer, timerStartTime]);

  const startTimer = (taskId) => {
    if (activeTimer) stopTimer();
    
    setActiveTimer(taskId);
    setTimerStartTime(Date.now());
    setElapsedTime(0);
  };

  const pauseTimer = () => {
    if (activeTimer && timerStartTime) {
      // Save the current session
      const entry = {
        id: Date.now(),
        taskId: activeTimer,
        startTime: timerStartTime,
        endTime: Date.now(),
        duration: elapsedTime
      };
      setTimeEntries(prev => [...prev, entry]);
      
      setActiveTimer(null);
      setTimerStartTime(null);
      setElapsedTime(0);
    }
  };

  const stopTimer = () => {
    if (activeTimer && timerStartTime) {
      // Save the session and stop
      const entry = {
        id: Date.now(),
        taskId: activeTimer,
        startTime: timerStartTime,
        endTime: Date.now(),
        duration: elapsedTime
      };
      setTimeEntries(prev => [...prev, entry]);
    }
    
    setActiveTimer(null);
    setTimerStartTime(null);
    setElapsedTime(0);
  };

  const formatTime = (milliseconds) => {
    const duration = intervalToDuration({ start: 0, end: milliseconds });
    return `${String(duration.hours || 0).padStart(2, '0')}:${String(duration.minutes || 0).padStart(2, '0')}:${String(duration.seconds || 0).padStart(2, '0')}`;
  };

  const getTaskTimeToday = (taskId) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return timeEntries
      .filter(entry => 
        entry.taskId === taskId && 
        new Date(entry.startTime).toDateString() === today.toDateString()
      )
      .reduce((total, entry) => total + entry.duration, 0);
  };

  const getTotalTimeToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return timeEntries
      .filter(entry => new Date(entry.startTime).toDateString() === today.toDateString())
      .reduce((total, entry) => total + entry.duration, 0);
  };

  const TaskTimer = ({ task }) => {
    const isActive = activeTimer === task.id;
    const taskTime = getTaskTimeToday(task.id);
    const totalTime = isActive ? taskTime + elapsedTime : taskTime;

    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1 cursor-pointer" onClick={() => onTaskSelect(task)}>
            <h3 className="font-medium text-white truncate">{task.title}</h3>
            <p className="text-sm text-gray-400">
              {workspaces.find(w => w.id === task.workspace_id)?.name}
            </p>
          </div>
          <Badge className={`ml-3 ${isActive ? 'bg-green-600' : 'bg-gray-600'} text-white`}>
            {formatTime(totalTime)}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          {!isActive ? (
            <Button
              onClick={() => startTimer(task.id)}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="w-4 h-4 mr-1" />
              Start
            </Button>
          ) : (
            <>
              <Button
                onClick={pauseTimer}
                size="sm"
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                <Pause className="w-4 h-4 mr-1" />
                Pause
              </Button>
              <Button
                onClick={stopTimer}
                size="sm"
                variant="outline"
                className="border-gray-600 text-gray-300"
              >
                <Square className="w-4 h-4 mr-1" />
                Stop
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6">
        <div className="space-y-6">
          <div className="h-32 bg-gray-700 rounded-lg animate-pulse"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-700 rounded-lg animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const activeTasks = tasks.filter(task => task.status !== 'done');

  return (
    <div className="flex-1 overflow-auto bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Time Tracking</h1>
          <p className="text-gray-400">Track time spent on your tasks</p>
        </div>

        {/* Today's Summary */}
        <div className="bg-gray-800 rounded-xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                {formatTime(getTotalTimeToday())}
              </div>
              <div className="text-sm text-gray-400">Today's Total</div>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <Play className="w-8 h-8 text-white" />
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                {activeTimer ? '1' : '0'}
              </div>
              <div className="text-sm text-gray-400">Active Timers</div>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                {timeEntries.length}
              </div>
              <div className="text-sm text-gray-400">Sessions Today</div>
            </div>
          </div>
        </div>

        {/* Active Timer Display */}
        <AnimatePresence>
          {activeTimer && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-green-900/20 border border-green-700 rounded-xl p-6 mb-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">
                    Timer Active
                  </h3>
                  <p className="text-green-400">
                    {tasks.find(t => t.id === activeTimer)?.title}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-mono font-bold text-green-400">
                    {formatTime(elapsedTime)}
                  </div>
                  <div className="text-sm text-green-300">Running</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Task List with Timers */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white mb-4">Active Tasks</h2>
          {activeTasks.map(task => (
            <TaskTimer key={task.id} task={task} />
          ))}
        </div>

        {/* Empty State */}
        {activeTasks.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No active tasks</h3>
            <p className="text-gray-400">
              Create some tasks to start tracking your time.
            </p>
          </div>
        )}

        {/* Recent Time Entries */}
        {timeEntries.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-semibold text-white mb-4">Recent Sessions</h2>
            <div className="space-y-3">
              {timeEntries.slice(-5).reverse().map(entry => {
                const task = tasks.find(t => t.id === entry.taskId);
                return (
                  <div key={entry.id} className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white">{task?.title || 'Deleted Task'}</div>
                      <div className="text-sm text-gray-400">
                        {format(entry.startTime, 'HH:mm')} - {format(entry.endTime, 'HH:mm')}
                      </div>
                    </div>
                    <Badge className="bg-blue-600 text-white">
                      {formatTime(entry.duration)}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}