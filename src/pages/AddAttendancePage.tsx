import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCheck, Check, X, Search, Loader2, AlertCircle, Send, BookOpen, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { studentService, type Student } from '@/services/studentService';
import { attendanceService, type AttendanceCreateData } from '@/services/attendanceService';
import { routineService, type ClassRoutine } from '@/services/routineService';
import { getErrorMessage } from '@/lib/api';

// Today's day name
const getDayName = (): string => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date().getDay()];
};

// Format time
const formatTime = (time: string) => {
  const [h, m] = time.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
};

interface StudentWithAttendance extends Student {
  present: boolean;
}

export default function AddAttendancePage() {
  const today = new Date().toISOString().split('T')[0];
  const dayName = getDayName();

  const [students, setStudents] = useState<StudentWithAttendance[]>([]);
  const [todayRoutines, setTodayRoutines] = useState<ClassRoutine[]>([]);
  const [selectedRoutine, setSelectedRoutine] = useState<ClassRoutine | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // API state
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingRoutines, setLoadingRoutines] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch students and today's routine on mount
  useEffect(() => {
    fetchStudents();
    fetchTodayRoutines();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoadingStudents(true);
      const response = await studentService.getStudents({
        status: 'active',
        page_size: 100,
        ordering: 'currentRollNumber',
      });
      setStudents(response.results.map(s => ({ ...s, present: true })));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchTodayRoutines = async () => {
    try {
      setLoadingRoutines(true);
      const response = await routineService.getMyRoutine({});
      // Filter to today's classes
      const todayClasses = response.routines.filter(
        r => r.day_of_week === dayName && r.is_active
      );
      // Sort by start_time
      todayClasses.sort((a, b) => a.start_time.localeCompare(b.start_time));
      setTodayRoutines(todayClasses);
    } catch (err) {
      console.error('Failed to load routines:', err);
      // Non-blocking — captain can still proceed
    } finally {
      setLoadingRoutines(false);
    }
  };

  const toggleAttendance = (studentId: string) => {
    setStudents(prev =>
      prev.map(s => (s.id === studentId ? { ...s, present: !s.present } : s))
    );
  };

  const markAllPresent = () => setStudents(prev => prev.map(s => ({ ...s, present: true })));
  const markAllAbsent = () => setStudents(prev => prev.map(s => ({ ...s, present: false })));

  const handleSubmit = async () => {
    if (!selectedRoutine) {
      toast.error('Please select a subject from today\'s routine');
      return;
    }

    try {
      setSaving(true);
      const records: AttendanceCreateData[] = students.map(student => ({
        student: student.id,
        subjectCode: selectedRoutine.subject_code,
        subjectName: selectedRoutine.subject_name,
        semester: selectedRoutine.semester,
        date: today,
        isPresent: student.present,
      }));

      await attendanceService.bulkMarkAttendance(records);

      const presentCount = students.filter(s => s.present).length;
      toast.success('Attendance submitted!', {
        description: `${presentCount}/${students.length} present for ${selectedRoutine.subject_name}. Sent to ${selectedRoutine.teacher?.fullNameEnglish || 'teacher'}.`,
      });

      // Reset
      setSelectedRoutine(null);
      markAllPresent();
    } catch (err) {
      toast.error('Failed to submit', { description: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = useMemo(
    () =>
      students.filter(
        s =>
          s.fullNameEnglish.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.currentRollNumber.includes(searchQuery)
      ),
    [students, searchQuery]
  );

  const presentCount = students.filter(s => s.present).length;
  const absentCount = students.length - presentCount;
  const loading = loadingStudents || loadingRoutines;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading class data...</p>
        </div>
      </div>
    );
  }

  if (error && students.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="glass-card p-8 max-w-md text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <h3 className="text-lg font-semibold">Error Loading Data</h3>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => { fetchStudents(); fetchTodayRoutines(); }} variant="hero">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-display font-bold flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
                <UserCheck className="w-4.5 h-4.5 text-primary-foreground" />
              </div>
              Take Attendance
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {dayName}, {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <Button
            variant="hero"
            size="lg"
            onClick={handleSubmit}
            disabled={saving || !selectedRoutine || students.length === 0}
            className="w-full sm:w-auto"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
            ) : (
              <><Send className="w-4 h-4" /> Submit to Teacher</>
            )}
          </Button>
        </div>
      </motion.div>

      {/* Step 1: Select Subject from Today's Routine */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-xl p-4 md:p-5"
      >
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          Step 1 — Select Today's Class
        </h2>

        {todayRoutines.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="font-medium">No classes scheduled for {dayName}</p>
            <p className="text-sm mt-1">Check back on a class day</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {todayRoutines.map((routine) => {
              const isSelected = selectedRoutine?.id === routine.id;
              return (
                <motion.button
                  key={routine.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedRoutine(isSelected ? null : routine)}
                  className={`relative text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border hover:border-primary/40 hover:bg-secondary/50'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                  <p className="font-semibold text-sm leading-tight">{routine.subject_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{routine.subject_code}</p>
                  <div className="flex items-center gap-3 mt-2.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(routine.start_time)} – {formatTime(routine.end_time)}
                    </span>
                    {routine.class_type && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        routine.class_type === 'Lab' ? 'bg-accent/10 text-accent-foreground' : 'bg-secondary text-secondary-foreground'
                      }`}>
                        {routine.class_type}
                      </span>
                    )}
                  </div>
                  {routine.teacher && (
                    <p className="text-xs text-muted-foreground mt-2 truncate">
                      → {routine.teacher.fullNameEnglish}
                    </p>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Step 2: Mark Attendance */}
      <AnimatePresence>
        {selectedRoutine && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 overflow-hidden"
          >
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="glass-card p-3 rounded-xl text-center">
                <Users className="w-5 h-5 mx-auto text-primary mb-1" />
                <p className="text-xl font-bold">{students.length}</p>
                <p className="text-[11px] text-muted-foreground">Total</p>
              </div>
              <div className="glass-card p-3 rounded-xl text-center">
                <Check className="w-5 h-5 mx-auto text-green-500 mb-1" />
                <p className="text-xl font-bold text-green-500">{presentCount}</p>
                <p className="text-[11px] text-muted-foreground">Present</p>
              </div>
              <div className="glass-card p-3 rounded-xl text-center">
                <X className="w-5 h-5 mx-auto text-destructive mb-1" />
                <p className="text-xl font-bold text-destructive">{absentCount}</p>
                <p className="text-[11px] text-muted-foreground">Absent</p>
              </div>
            </div>

            {/* Search & Bulk Actions */}
            <div className="glass-card rounded-xl p-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                Step 2 — Mark Attendance
              </h2>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or roll..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={markAllPresent} className="flex-1 sm:flex-none">
                    <Check className="w-3.5 h-3.5 mr-1" /> All Present
                  </Button>
                  <Button variant="outline" size="sm" onClick={markAllAbsent} className="flex-1 sm:flex-none">
                    <X className="w-3.5 h-3.5 mr-1" /> All Absent
                  </Button>
                </div>
              </div>
            </div>

            {/* Student List */}
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="divide-y divide-border">
                {filteredStudents.map((student, index) => (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(index * 0.02, 0.5) }}
                    onClick={() => toggleAttendance(student.id)}
                    className={`flex items-center justify-between p-3.5 cursor-pointer transition-colors active:bg-secondary/70 ${
                      student.present ? 'hover:bg-green-500/5' : 'hover:bg-destructive/5'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        student.present
                          ? 'bg-green-500/10 text-green-600'
                          : 'bg-destructive/10 text-destructive'
                      }`}>
                        {student.currentRollNumber}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{student.fullNameEnglish}</p>
                        <p className="text-xs text-muted-foreground">Roll: {student.currentRollNumber}</p>
                      </div>
                    </div>

                    <div className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      student.present
                        ? 'bg-green-500/10 text-green-600'
                        : 'bg-destructive/10 text-destructive'
                    }`}>
                      {student.present ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">{student.present ? 'Present' : 'Absent'}</span>
                    </div>
                  </motion.div>
                ))}

                {filteredStudents.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>No students found</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
