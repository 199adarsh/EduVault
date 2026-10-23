import React, { useState } from 'react';
import axios from 'axios';
import { Loader2, AlertCircle, GraduationCap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PortalWidget = () => {
  const [prn, setPrn] = useState('');
  const [dob, setDob] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFetch = async (e) => {
    e.preventDefault();
    if (!prn || !dob) {
      setError('Please enter both PRN and DOB.');
      return;
    }
    
    setLoading(true);
    setError('');
    setData(null);

    try {
      const apiBase = import.meta.env.VITE_API_BASE || '/api';
      const response = await axios.post(`${apiBase}/portal/dashboard`, {
        prn: prn,
        dob: dob
      });
      setData(response.data);
    } catch (err) {
      if (err.response && err.response.status === 401) {
        setError('Invalid credentials. Please check your PRN and DOB.');
      } else {
        setError('Failed to fetch data from portal. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full bg-card shadow-sm border-border">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-md">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold">DKTE Portal Sync</CardTitle>
            <CardDescription className="text-xs">Your real-time CIE and Attendance</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6">
        {!data && (
          <form onSubmit={handleFetch} className="space-y-4 max-w-sm mx-auto">
             <div className="space-y-2">
               <Label htmlFor="prn" className="text-sm font-medium">PRN Number</Label>
               <Input 
                 id="prn" 
                 placeholder="e.g. 23XX000" 
                 value={prn} 
                 onChange={(e) => setPrn(e.target.value)} 
               />
             </div>
             <div className="space-y-2">
               <Label htmlFor="dob" className="text-sm font-medium">Date of Birth</Label>
               <Input 
                 id="dob" 
                 placeholder="DD-MM-YYYY or YYYY-MM-DD" 
                 value={dob} 
                 onChange={(e) => setDob(e.target.value)} 
               />
               <p className="text-xs text-muted-foreground mt-1">This is used as your portal password.</p>
             </div>
             
             {error && (
               <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-2 rounded">
                 <AlertCircle className="h-4 w-4" />
                 <span>{error}</span>
               </div>
             )}
             
             <Button type="submit" className="w-full font-semibold" disabled={loading}>
               {loading ? (
                 <>
                   <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Fetching Portal Data...
                 </>
               ) : (
                 'Sync Portal Data'
               )}
             </Button>
          </form>
        )}

        {data && (
          <div className="space-y-6">
             <div className="flex flex-col md:flex-row gap-6 items-start">
               {/* Profile Card */}
               {data.profile && (
                 <div className="w-full md:w-80 flex-shrink-0 bg-muted/30 p-5 rounded-lg border border-border shadow-sm flex flex-col items-center text-center">
                   <div className="relative mb-4 group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-secondary/50 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                      {data.profile.image ? (
                        <img 
                          src={data.profile.image} 
                          alt={data.profile.name} 
                          className="relative h-24 w-24 rounded-full object-cover border-4 border-background shadow-md"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "https://api.dicebear.com/7.x/avataaars/svg?seed=" + data.profile.name;
                          }}
                        />
                      ) : (
                        <div className="relative h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center border-4 border-background shadow-md">
                          <GraduationCap className="h-10 w-10 text-primary" />
                        </div>
                      )}
                   </div>
                   
                   <h2 className="text-xl font-bold tracking-tight">{data.profile.name || "Student Name"}</h2>
                   <p className="text-sm font-semibold text-primary/80 mb-3">{data.profile.rollNo || "PRN Not Found"}</p>
                   
                   <div className="w-full space-y-2 mt-2 pt-4 border-t border-border/50 text-left">
                     <div className="flex justify-between items-center text-xs">
                       <span className="text-muted-foreground font-medium uppercase">Dept</span>
                       <span className="font-bold">{data.profile.department || "N/A"}</span>
                     </div>
                     <div className="flex justify-between items-center text-xs">
                       <span className="text-muted-foreground font-medium uppercase">Semester</span>
                       <span className="font-bold">{data.profile.semester || "N/A"}</span>
                     </div>
                     <div className="flex justify-between items-center text-xs">
                       <span className="text-muted-foreground font-medium uppercase">Section</span>
                       <span className="font-bold">{data.profile.section || "N/A"}</span>
                     </div>
                     {data.profile.abcId && (
                       <div className="flex justify-between items-center text-[10px] mt-2 p-1.5 bg-background rounded border border-border/50">
                         <span className="text-muted-foreground font-bold uppercase">ABC ID</span>
                         <span className="font-mono">{data.profile.abcId}</span>
                       </div>
                     )}
                   </div>
                   
                   <Button variant="ghost" size="sm" className="w-full mt-4 text-xs font-semibold" onClick={() => setData(null)}>
                     Switch Profile
                   </Button>
                 </div>
               )}

               {/* Subjects List */}
               <div className="flex-grow space-y-4">
                 <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold tracking-tight text-muted-foreground uppercase">Academic Overview</h3>
                 </div>
                 
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                   {data.subjects && data.subjects.map((subject, idx) => (
                     <div key={idx} className="bg-muted/30 p-4 rounded-lg border border-border/50 hover:bg-muted/50 transition-all hover:shadow-md relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 font-bold text-4xl transform translate-x-2 -translate-y-2 select-none group-hover:scale-110 transition-transform">
                           {subject.code}
                        </div>
                        <div className="mb-3 pr-6">
                            <span className="text-[9px] font-bold px-2 py-0.5 bg-primary/20 text-primary rounded-full uppercase tracking-wider">{subject.code}</span>
                            <h4 className="font-bold text-sm mt-1.5 line-clamp-2 leading-tight" title={subject.name}>{subject.name}</h4>
                        </div>
                        
                        <div className="flex items-end justify-between mt-3">
                          <div>
                            <div className="text-[10px] text-muted-foreground font-bold mb-0.5 uppercase tracking-wide">Attendance</div>
                            <div className="flex items-baseline gap-1">
                              <span className={`text-xl font-black ${subject.attendance >= 75 ? 'text-green-500' : 'text-destructive'}`}>
                                {subject.attendance}%
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] text-muted-foreground font-bold mb-0.5 uppercase tracking-wide">CIE</div>
                            <div className="text-xl font-black text-primary">
                              {subject.cie}
                            </div>
                          </div>
                        </div>
                        
                        {/* Tiny progress bar for attendance */}
                        <div className="w-full h-1 bg-background rounded-full mt-3 overflow-hidden">
                          <div 
                            className={`h-full ${subject.attendance >= 75 ? 'bg-green-500' : 'bg-destructive'}`} 
                            style={{ width: `${Math.min(subject.attendance, 100)}%` }}
                          ></div>
                        </div>
                     </div>
                   ))}
                   
                   {(!data.subjects || data.subjects.length === 0) && (
                     <div className="col-span-full border border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center text-muted-foreground text-sm">
                       <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                       <p>No subjects could be parsed.</p>
                     </div>
                   )}
                 </div>
               </div>
             </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PortalWidget;
