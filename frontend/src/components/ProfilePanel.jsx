import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const ProfilePanel = ({ refreshData, currentProfile }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState({
    prn: currentProfile?.prn || '',
    dob: currentProfile?.dob || ''
  });

  // Keep credentials in sync with currentProfile when it changes
  useEffect(() => {
    if (currentProfile) {
      setCredentials({
        prn: currentProfile.prn || '',
        dob: currentProfile.dob || ''
      });
    }
  }, [currentProfile]);

  const handleSaveAndSync = async () => {
    if (!credentials.prn || !credentials.dob) {
      toast.error('Please enter both PRN and DOB');
      return;
    }

    setLoading(true);
    try {
      // 1. Trigger Portal Sync
      toast.info('Syncing with college portal...');
      const syncResponse = await axios.post(`${API_BASE}/portal/dashboard`, {
        prn: credentials.prn,
        dob: credentials.dob
      });

      if (syncResponse.data) {
        const updatedProfile = {
          ...(syncResponse.data.profile || {}),
          prn: credentials.prn,
          dob: credentials.dob
        };
        const updatedSubjects = syncResponse.data.subjects || [];
        localStorage.setItem('eduvault_profile', JSON.stringify(updatedProfile));
        localStorage.setItem('eduvault_subjects', JSON.stringify(updatedSubjects));
        localStorage.setItem('eduvault_last_synced', Date.now().toString());

        toast.success('Profile & Academic data synced successfully!');
        if (refreshData) refreshData(updatedProfile, updatedSubjects);
        setOpen(false);
      }
    } catch (err) {
      console.error('Save/Sync error:', err);
      const msg = err.response?.data?.error || 'Failed to sync with portal. Check credentials.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Avatar className="w-8 h-8 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all border border-outline-variant/20 shadow-sm">
          {currentProfile?.image ? (
            <img src={currentProfile.image} alt="Student" className="object-cover rounded-full w-full h-full" />
          ) : (
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold uppercase">
              {currentProfile?.name ? currentProfile.name.charAt(0) : 'U'}
            </AvatarFallback>
          )}
        </Avatar>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-surface-container border-outline-variant/20">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight">Portal Integration</DialogTitle>
          <p className="text-xs text-on-surface-variant/60 uppercase tracking-widest font-bold">Configure Access Portal</p>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-6 border-y border-outline-variant/10 my-2">
          {/* Read-only synced info */}
          {currentProfile?.name && (
            <div className="flex items-center gap-4 p-4 bg-surface-container-highest/20 rounded border border-outline-variant/10">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                {currentProfile.image ? (
                   <img src={currentProfile.image} alt="Student" className="w-full h-full object-cover rounded-full" />
                ) : (
                   <span className="material-symbols-outlined text-primary">person</span>
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-on-surface truncate">{currentProfile.name}</span>
                <span className="text-[10px] text-on-surface-variant/60 font-bold uppercase tracking-tight truncate">
                  {currentProfile.department} • {currentProfile.semester} ({currentProfile.section || 'A'})
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70 mb-1 flex items-center gap-2">
                <span className="material-symbols-outlined text-xs">pin</span>
                College PRN
              </label>
              <Input 
                value={credentials.prn} 
                onChange={e => setCredentials({...credentials, prn: e.target.value})} 
                placeholder="Enter your PRN"
                className="bg-surface-container-lowest border-outline-variant/15 focus:ring-primary/20"
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70 mb-1 flex items-center gap-2">
                <span className="material-symbols-outlined text-xs">calendar_today</span>
                Date of Birth
              </label>
              <Input 
                value={credentials.dob} 
                onChange={e => setCredentials({...credentials, dob: e.target.value})} 
                placeholder="DD-MM-YYYY"
                className="bg-surface-container-lowest border-outline-variant/15 focus:ring-primary/20"
              />
              <p className="text-[10px] text-on-surface-variant/40 selection:italic">Format: Day-Month-Year (e.g. 15-08-2004)</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[10px] text-on-surface-variant/40">
             <span className="material-symbols-outlined text-xs">security</span>
             <span>Stored Locally</span>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="text-xs font-bold uppercase tracking-widest px-6" onClick={() => setOpen(false)}>Cancel</Button>
            <Button 
                onClick={handleSaveAndSync} 
                disabled={loading}
                className="bg-primary hover:bg-primary-container text-on-primary text-xs font-bold uppercase tracking-widest px-6 shadow-lg shadow-primary/20"
            >
              {loading ? 'Syncing...' : 'Save & Sync'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfilePanel;
