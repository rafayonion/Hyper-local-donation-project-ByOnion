import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CATEGORIES, ListingCategory } from '@/lib/supabase-types';
import { toast } from 'sonner';
import { HandHeart, MapPin, AlertTriangle, ArrowLeft } from 'lucide-react';

export default function EditRequest() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [title, setTitle] = useState('');
  const [itemName, setItemName] = useState('');
  const [quantityNeeded, setQuantityNeeded] = useState(1);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ListingCategory>('other');
  const [location, setLocation] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (id && user) {
      fetchRequest();
    }
  }, [id, user]);

  const fetchRequest = async () => {
    const { data, error } = await supabase
      .from('ngo_requests')
      .select('*')
      .eq('id', id)
      .eq('ngo_id', user!.id)
      .maybeSingle();

    if (error || !data) {
      toast.error('Request not found');
      navigate('/my-listings');
      return;
    }

    setTitle(data.title);
    setItemName(data.item_name);
    setQuantityNeeded(data.quantity_needed);
    setDescription(data.description || '');
    setCategory(data.category || 'other');
    setLocation(data.location || '');
    setIsUrgent(data.is_urgent || false);
    setFetching(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !id) return;

    if (profile?.role !== 'ngo') {
      toast.error('Only NGOs can edit requests');
      return;
    }

    if (!title.trim() || !itemName.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('ngo_requests')
        .update({
          title: title.trim(),
          item_name: itemName.trim(),
          quantity_needed: quantityNeeded,
          description: description.trim() || null,
          category,
          location: location.trim() || null,
          is_urgent: isUrgent,
        })
        .eq('id', id)
        .eq('ngo_id', user.id);

      if (error) throw error;

      toast.success('Request updated successfully!');
      navigate('/my-listings');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update request');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-primary">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container max-w-2xl py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card className="border-request/20">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-request-light">
                <HandHeart className="h-6 w-6 text-request" />
              </div>
              <div>
                <CardTitle className="font-display text-2xl">Edit Request</CardTitle>
                <CardDescription>Update your item request details</CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Request Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Blankets for Winter Camp"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="item-name">Item Name *</Label>
                  <Input
                    id="item-name"
                    placeholder="e.g., Blankets"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity Needed *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min={1}
                    value={quantityNeeded}
                    onChange={(e) => setQuantityNeeded(parseInt(e.target.value) || 1)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe why you need these items, the event, etc."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={(v) => setCategory(v as ListingCategory)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.icon} {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="location"
                      placeholder="Pickup or delivery area"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-urgent-light border border-urgent/20">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-urgent" />
                  <div>
                    <Label htmlFor="urgent" className="font-medium">Mark as Urgent</Label>
                    <p className="text-sm text-muted-foreground">Highlights this request for immediate attention</p>
                  </div>
                </div>
                <Switch
                  id="urgent"
                  checked={isUrgent}
                  onCheckedChange={setIsUrgent}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate(-1)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" variant="request" disabled={loading} className="flex-1">
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
