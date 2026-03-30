import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Timer, Crown } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function TrialBanner({ user, onUpdate }) {
  if (!user?.trial_plan || !user?.trial_expires) return null;

  const daysLeft = differenceInDays(new Date(user.trial_expires), new Date());
  const trialPlanName = {
    pro: 'Pro',
    advanced: 'Advanced', 
    enterprise: 'Enterprise'
  }[user.trial_plan];

  const getBannerColor = () => {
    if (daysLeft <= 1) return 'from-red-600 to-red-700';
    if (daysLeft <= 3) return 'from-yellow-600 to-orange-600';
    return 'from-blue-600 to-purple-600';
  };

  return (
    <Card className={`bg-gradient-to-r ${getBannerColor()} border-0 shadow-lg mb-6`}>
      <CardContent className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Star className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Trial {trialPlanName} Aktif
                <Badge className="bg-white/20 text-white border-white/30">
                  <Timer className="w-3 h-3 mr-1" />
                  {daysLeft} hari tersisa
                </Badge>
              </h3>
              <p className="text-white/90 text-sm">
                Trial Anda berakhir pada {format(new Date(user.trial_expires), 'dd MMMM yyyy')}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Link to={createPageUrl('Pricing')}>
              <Button 
                variant="secondary" 
                className="bg-white text-gray-900 hover:bg-gray-100 font-semibold"
              >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade Sekarang
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}