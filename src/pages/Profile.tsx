import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { NgoActivity } from '@/lib/supabase-types';
import { toast } from 'sonner';
import { BadgeCheck, MapPin, Plus, Edit2, ImageIcon, Save, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Profile() {
  const { user, profile, refreshProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState('');
  const [orgName, setOrgName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [phone, setPhone] = useState('');
  
  const [activities, setActivities] = useState<NgoActivity[]>([]);
  const [newActivity, setNewActivity] = useState('');
  const [newActivityImage, setNewActivityImage] = useState('');
  const [showActivityForm, setShowActivityForm] = useState(false);
  
  const [saving, setSaving] = useState(false);

  const isNgo = profile?.role === 'ngo';

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (profile) {
      setUsername(profile.username || '');
      setOrgName(profile.organization_name || '');
      setBio(profile.bio || '');
      setLocation(profile.location || '');
      setAvatarUrl(profile.avatar_url || '');
      setPhone(profile.phone || '');
      
      if (isNgo) {
        fetchActivities();
      }
    }
  }, [user, profile, authLoading, navigate, isNgo]);

  const fetchActivities = async () => {
    const { data, error } = await supabase
      .from('ngo_activities')
      .select('*')
      .eq('ngo_id', user!.id)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setActivities(data as NgoActivity[]);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const updates: any = {
        bio: bio.trim() || null,
        location: location.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        phone: phone.trim() || null,
      };

      if (isNgo) {
        updates.organization_name = orgName.trim();
      } else {
        updates.username = username.trim();
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user!.id);

      if (error) throw error;

      toast.success('Profile updated');
      await refreshProfile();
      setEditing(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAddActivity = async () => {
    if (!newActivity.trim()) {
      toast.error('Please enter activity description');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('ngo_activities')
        .insert({
          ngo_id: user!.id,
          description: newActivity.trim(),
          image_url: newActivityImage.trim() || null,
        });

      if (error) throw error;

      toast.success('Activity posted');
      setNewActivity('');
      setNewActivityImage('');
      setShowActivityForm(false);
      fetchActivities();
    } catch (error: any) {
      toast.error(error.message || 'Failed to post activity');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse text-primary">Loading...</div>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container max-w-4xl py-8">
        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <Avatar className="h-24 w-24 ring-4 ring-primary/20">
                <AvatarImage src={editing ? avatarUrl : profile?.avatar_url || undefined} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {isNgo 
                    ? profile?.organization_name?.[0]?.toUpperCase() 
                    : profile?.username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 w-full">
                {editing ? (
                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      {isNgo ? (
                        <div className="space-y-2">
                          <Label>Organization Name</Label>
                          <Input
                            value={orgName}
                            onChange={(e) => setOrgName(e.target.value)}
                          />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label>Username</Label>
                          <Input
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                          />
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label>Location</Label>
                        <Input
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="Your area"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Avatar URL</Label>
                      <Input
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone (optional)</Label>
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+880..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bio</Label>
                      <Textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Tell us about yourself..."
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveProfile} disabled={saving}>
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button variant="outline" onClick={() => setEditing(false)}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="font-display text-2xl font-bold">
                        {isNgo ? profile?.organization_name : profile?.username}
                      </h1>
                      {isNgo && profile?.is_verified && (
                        <Badge className="bg-verified text-white">
                          <BadgeCheck className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground capitalize mb-2">{profile?.role}</p>
                    {profile?.location && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                        <MapPin className="h-4 w-4" />
                        {profile.location}
                      </p>
                    )}
                    {profile?.bio && (
                      <p className="text-sm mt-3">{profile.bio}</p>
                    )}
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => setEditing(true)}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* NGO Activities Section */}
        {isNgo && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-display">My Activities</CardTitle>
                <CardDescription>Share your work and events with the community</CardDescription>
              </div>
              <Button size="sm" onClick={() => setShowActivityForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Post Activity
              </Button>
            </CardHeader>
            <CardContent>
              {showActivityForm && (
                <div className="mb-6 p-4 border rounded-lg bg-muted/30">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={newActivity}
                        onChange={(e) => setNewActivity(e.target.value)}
                        placeholder="Share what your organization has been doing..."
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Image URL (optional)</Label>
                      <Input
                        value={newActivityImage}
                        onChange={(e) => setNewActivityImage(e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleAddActivity} disabled={saving}>
                        {saving ? 'Posting...' : 'Post'}
                      </Button>
                      <Button variant="outline" onClick={() => setShowActivityForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No activities posted yet</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {activities.map((activity) => (
                    <div key={activity.id} className="border-b pb-6 last:border-0">
                      {activity.image_url && (
                        <img
                          src={activity.image_url}
                          alt="Activity"
                          className="w-full max-h-64 object-cover rounded-lg mb-4"
                        />
                      )}
                      <p className="mb-2">{activity.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
