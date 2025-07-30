import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, User, Mail, Crown, Save, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const ProfileSettings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile, updateProfile } = useProfile();
  const { isAdmin, isModerator } = useUserRole();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    display_name: '',
    bio: '',
    avatar_url: ''
  });

  const [settings, setSettings] = useState({
    notifications: true,
    soundNotifications: true,
    darkMode: false
  });

  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile'>('profile');

  useEffect(() => {
    if (profile) {
      setFormData({
        display_name: profile.display_name || '',
        bio: profile.bio || '', // Now we'll use the bio from profile
        avatar_url: profile.avatar_url || ''
      });
    }
  }, [profile]);

  const getInitials = (name: string | null, email: string | undefined) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.substring(0, 2).toUpperCase() || 'U';
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSettingToggle = (setting: string, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { error } = await updateProfile({
        display_name: formData.display_name.trim() || null,
        bio: formData.bio.trim() || null,
        avatar_url: formData.avatar_url.trim() || null
      });

      if (error) {
        toast({
          title: "Error",
          description: error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Profile Updated",
          description: "Your profile has been saved successfully!",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = () => {
    // For now, just show info toast. In production, this would open file picker
    toast({
      title: "Avatar Upload",
      description: "Avatar upload feature coming soon! For now, use a direct image URL.",
    });
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      toast({
        title: "Account Deletion",
        description: "Account deletion feature coming soon. Please contact admin.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Navigation Sidebar */}
          <div className="lg:col-span-1">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-4 space-y-2">
                <Button
                  variant={activeTab === 'profile' ? 'default' : 'ghost'}
                  className="w-full justify-start hover:bg-slate-100 transition-colors"
                  onClick={() => setActiveTab('profile')}
                >
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <>
                {/* Profile Overview */}
                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="pb-4 border-b bg-gradient-to-r from-slate-50 to-blue-50">
                    <CardTitle className="flex items-center gap-2 text-slate-800">
                      <User className="h-5 w-5 text-primary" />
                      Profile Information
                      {isAdmin && (
                        <Badge variant="default" className="ml-2 flex items-center gap-1 bg-yellow-500 hover:bg-yellow-600 text-white">
                          <Crown className="h-4 w-4" />
                          <span>Administrator</span>
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-slate-600">
                      Update your public profile information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Avatar Section */}
                    <div className="flex items-center gap-6">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={formData.avatar_url || profile?.avatar_url || ''} alt="Profile" />
                        <AvatarFallback className="text-lg">
                          {getInitials(formData.display_name, user?.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-2">
                        <Button variant="outline" onClick={handleAvatarUpload}>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Avatar
                        </Button>
                        <p className="text-sm text-muted-foreground">
                          Recommended: Square image, at least 200x200px
                        </p>
                      </div>
                    </div>

                    <Separator />

                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="display-name">Display Name</Label>
                        <Input
                          id="display-name"
                          value={formData.display_name}
                          onChange={(e) => handleInputChange('display_name', e.target.value)}
                          placeholder="Enter your display name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          value={user?.email || ''}
                          disabled
                          className="bg-muted"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={formData.bio}
                        onChange={(e) => handleInputChange('bio', e.target.value)}
                        placeholder="Tell us about yourself..."
                        rows={3}
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={saveProfile} disabled={saving}>
                        {saving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}


          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfileSettings; 