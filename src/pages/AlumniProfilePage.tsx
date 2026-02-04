import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { AlumniProfileHeader } from '@/components/alumni/AlumniProfileHeader';
import { AlumniStatsCard } from '@/components/alumni/AlumniStatsCard';
import { CareerTimeline } from '@/components/alumni/CareerTimeline';
import { SkillsCard } from '@/components/alumni/SkillsCard';
import { HighlightsCard } from '@/components/alumni/HighlightsCard';
import { 
  alumniService, 
  AlumniProfile, 
  demoAlumniProfile,
  CareerEntry,
  Skill 
} from '@/services/alumniService';

export default function AlumniProfilePage() {
  const { user } = useAuth();
  const [alumni, setAlumni] = useState<AlumniProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAlumniData();
  }, [user]);

  const fetchAlumniData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // In demo mode, use demo data
      if (user?.id.startsWith('demo-')) {
        setAlumni({
          ...demoAlumniProfile,
          id: user.id,
          name: user.name,
          email: user.email,
        });
      } else {
        const data = await alumniService.getProfile(user?.id || '');
        setAlumni(data);
      }
    } catch (err) {
      console.error('Failed to fetch alumni data:', err);
      setError('Failed to load profile data');
      // Fallback to demo data
      setAlumni(demoAlumniProfile);
    } finally {
      setLoading(false);
    }
  };

  // Handlers for career entries
  const handleAddCareer = () => {
    // TODO: Open add career dialog
    console.log('Add career');
  };

  const handleEditCareer = (career: CareerEntry) => {
    // TODO: Open edit career dialog
    console.log('Edit career:', career);
  };

  const handleDeleteCareer = async (careerId: string) => {
    if (!alumni) return;
    try {
      await alumniService.deleteCareer(alumni.id, careerId);
      setAlumni({
        ...alumni,
        careers: alumni.careers.filter(c => c.id !== careerId),
      });
    } catch (err) {
      console.error('Failed to delete career:', err);
    }
  };

  // Handlers for skills
  const handleAddSkill = () => {
    // TODO: Open add skill dialog
    console.log('Add skill');
  };

  const handleEditSkill = (skill: Skill) => {
    // TODO: Open edit skill dialog
    console.log('Edit skill:', skill);
  };

  const handleDeleteSkill = async (skillId: string) => {
    if (!alumni) return;
    try {
      await alumniService.deleteSkill(alumni.id, skillId);
      setAlumni({
        ...alumni,
        skills: alumni.skills.filter(s => s.id !== skillId),
      });
    } catch (err) {
      console.error('Failed to delete skill:', err);
    }
  };

  // Handlers for highlights
  const handleAddHighlight = () => {
    // TODO: Open add highlight dialog
    console.log('Add highlight');
  };

  const handleDeleteHighlight = async (highlightId: string) => {
    if (!alumni) return;
    try {
      await alumniService.deleteHighlight(alumni.id, highlightId);
      setAlumni({
        ...alumni,
        highlights: alumni.highlights.filter(h => h.id !== highlightId),
      });
    } catch (err) {
      console.error('Failed to delete highlight:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (error && !alumni) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <h3 className="text-lg font-semibold">Failed to Load Profile</h3>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={fetchAlumniData} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!alumni) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 pb-8"
    >
      {/* Profile Header */}
      <AlumniProfileHeader 
        alumni={alumni} 
        onEdit={() => console.log('Edit profile')}
      />

      {/* Stats */}
      <AlumniStatsCard alumni={alumni} />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Career Timeline - Takes 2 columns on large screens */}
        <div className="lg:col-span-2">
          <CareerTimeline
            careers={alumni.careers}
            onAdd={handleAddCareer}
            onEdit={handleEditCareer}
            onDelete={handleDeleteCareer}
          />
        </div>

        {/* Right Column - Skills & Highlights */}
        <div className="space-y-6">
          <SkillsCard
            skills={alumni.skills}
            onAdd={handleAddSkill}
            onEdit={handleEditSkill}
            onDelete={handleDeleteSkill}
          />

          <HighlightsCard
            highlights={alumni.highlights}
            onAdd={handleAddHighlight}
            onDelete={handleDeleteHighlight}
          />
        </div>
      </div>
    </motion.div>
  );
}
