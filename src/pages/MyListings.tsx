import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/layout/Navbar';
import { DonationCard } from '@/components/cards/DonationCard';
import { RequestCard } from '@/components/cards/RequestCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { DonationListing, NgoRequest, ListingStatus } from '@/lib/supabase-types';
import { Plus, Package, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function MyListings() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [listings, setListings] = useState<DonationListing[]>([]);
  const [requests, setRequests] = useState<NgoRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const isNgo = profile?.role === 'ngo';

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (user) {
      fetchData();
    }
  }, [user, authLoading, navigate]);

  const fetchData = async () => {
    setLoading(true);
    if (isNgo) {
      await fetchRequests();
    } else {
      await fetchListings();
    }
    setLoading(false);
  };

  const fetchListings = async () => {
    const { data, error } = await supabase
      .from('donation_listings')
      .select('*, profiles(*)')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      toast.error('Failed to load listings');
      return;
    }
    setListings(data as DonationListing[]);
  };

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from('ngo_requests')
      .select('*, profiles(*)')
      .eq('ngo_id', user!.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      toast.error('Failed to load requests');
      return;
    }
    setRequests(data as NgoRequest[]);
  };

  const updateListingStatus = async (listingId: string, status: ListingStatus) => {
    const { error } = await supabase
      .from('donation_listings')
      .update({ status })
      .eq('id', listingId);
    
    if (error) {
      toast.error('Failed to update status');
      return;
    }
    toast.success('Status updated');
    fetchListings();
  };

  const deleteListing = async (listingId: string) => {
    const { error } = await supabase
      .from('donation_listings')
      .delete()
      .eq('id', listingId);
    
    if (error) {
      toast.error('Failed to delete listing');
      return;
    }
    toast.success('Listing deleted');
    fetchListings();
  };

  const deleteRequest = async (requestId: string) => {
    const { error } = await supabase
      .from('ngo_requests')
      .delete()
      .eq('id', requestId);
    
    if (error) {
      toast.error('Failed to delete request');
      return;
    }
    toast.success('Request deleted');
    fetchRequests();
  };

  const filterByStatus = (items: DonationListing[], status: ListingStatus) => 
    items.filter(item => item.status === status);

  if (authLoading || loading) {
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
      
      <main className="container py-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold mb-2">
              My {isNgo ? 'Requests' : 'Listings'}
            </h1>
            <p className="text-muted-foreground">
              Manage your {isNgo ? 'item requests' : 'donation listings'}
            </p>
          </div>
          <Button onClick={() => navigate(isNgo ? '/create-request' : '/create-listing')}>
            <Plus className="h-4 w-4" />
            {isNgo ? 'New Request' : 'New Listing'}
          </Button>
        </div>

        {isNgo ? (
          // NGO view - show requests with edit/delete
          <div className="space-y-6">
            {requests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-4">No requests yet</p>
                <Button onClick={() => navigate('/create-request')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Request
                </Button>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {requests.map((request) => (
                  <div key={request.id} className="space-y-2">
                    <RequestCard request={request} showActions={false} />
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => navigate(`/edit-request/${request.id}`)}
                      >
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        className="flex-1"
                        onClick={() => deleteRequest(request.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // General user view - show listings with tabs
          <Tabs defaultValue="active" className="space-y-6">
            <TabsList>
              <TabsTrigger value="active" className="gap-2">
                <Package className="h-4 w-4" />
                Active
                <Badge variant="secondary" className="ml-1">
                  {filterByStatus(listings, 'active').length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="pending_pickup" className="gap-2">
                <Clock className="h-4 w-4" />
                Pending
                <Badge variant="secondary" className="ml-1">
                  {filterByStatus(listings, 'pending_pickup').length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="collected" className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Collected
                <Badge variant="secondary" className="ml-1">
                  {filterByStatus(listings, 'collected').length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            {(['active', 'pending_pickup', 'collected'] as ListingStatus[]).map((status) => (
              <TabsContent key={status} value={status}>
                {filterByStatus(listings, status).length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No {status.replace('_', ' ')} listings</p>
                  </div>
                ) : (
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {filterByStatus(listings, status).map((listing) => (
                      <div key={listing.id} className="space-y-2">
                        <DonationCard listing={listing} showActions={false} />
                        <div className="flex gap-2">
                          {status === 'active' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="flex-1"
                                onClick={() => navigate(`/edit-listing/${listing.id}`)}
                              >
                                Edit
                              </Button>
                              <Button 
                                size="sm" 
                                variant="secondary"
                                className="flex-1"
                                onClick={() => updateListingStatus(listing.id, 'pending_pickup')}
                              >
                                Mark Pending
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive" 
                                onClick={() => deleteListing(listing.id)}
                              >
                                Delete
                              </Button>
                            </>
                          )}
                          {status === 'pending_pickup' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="donation"
                                className="flex-1"
                                onClick={() => updateListingStatus(listing.id, 'collected')}
                              >
                                Mark Collected
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="flex-1"
                                onClick={() => updateListingStatus(listing.id, 'active')}
                              >
                                Back to Active
                              </Button>
                            </>
                          )}
                          {status === 'collected' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="flex-1"
                              onClick={() => updateListingStatus(listing.id, 'active')}
                            >
                              Relist
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </main>
    </div>
  );
}
