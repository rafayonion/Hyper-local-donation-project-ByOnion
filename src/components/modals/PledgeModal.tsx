import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NgoRequest } from '@/lib/supabase-types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { HandHeart, Minus, Plus } from 'lucide-react';

interface PledgeModalProps {
  request: NgoRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PledgeModal({ request, open, onOpenChange, onSuccess }: PledgeModalProps) {
  const { user } = useAuth();
  const [amount, setAmount] = useState(1);
  const [loading, setLoading] = useState(false);

  if (!request) return null;

  const remaining = request.quantity_needed - request.quantity_pledged;
  const maxPledge = Math.max(remaining, 0);

  const handlePledge = async () => {
    if (!user) {
      toast.error('Please sign in to pledge');
      return;
    }

    if (amount < 1 || amount > maxPledge) {
      toast.error(`Please enter a valid amount (1-${maxPledge})`);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('pledges')
        .insert({
          request_id: request.id,
          user_id: user.id,
          amount,
        });

      if (error) throw error;

      toast.success(`Thank you! You pledged ${amount} ${request.item_name}`);
      onOpenChange(false);
      onSuccess?.();
      setAmount(1);
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit pledge');
    } finally {
      setLoading(false);
    }
  };

  const progress = Math.min((request.quantity_pledged / request.quantity_needed) * 100, 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <HandHeart className="h-5 w-5 text-request" />
            Pledge to Help
          </DialogTitle>
          <DialogDescription>
            {request.profiles?.organization_name || 'NGO'} needs {request.item_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="p-4 rounded-lg bg-request-light border border-request/20">
            <h4 className="font-semibold mb-2">{request.title}</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current Progress</span>
                <span className="font-medium">
                  {request.quantity_pledged} / {request.quantity_needed}
                </span>
              </div>
              <Progress value={progress} variant="request" className="h-2" />
              <p className="text-sm text-muted-foreground">
                {remaining > 0 ? `${remaining} more needed` : 'Goal reached!'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="amount">How many can you provide?</Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setAmount(Math.max(1, amount - 1))}
                disabled={amount <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                id="amount"
                type="number"
                min={1}
                max={maxPledge}
                value={amount}
                onChange={(e) => setAmount(Math.min(maxPledge, Math.max(1, parseInt(e.target.value) || 1)))}
                className="text-center text-lg font-semibold"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setAmount(Math.min(maxPledge, amount + 1))}
                disabled={amount >= maxPledge}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Maximum: {maxPledge} items
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            variant="request" 
            onClick={handlePledge} 
            disabled={loading || maxPledge === 0}
          >
            {loading ? 'Submitting...' : `Pledge ${amount} Items`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
