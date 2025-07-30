import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Database, 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Loader2,
  RefreshCw,
  ExternalLink,
  Shield,
  MessageSquare,
  Users,
  Settings
} from 'lucide-react';
import { ComprehensiveMigration } from '@/utils/comprehensiveMigration';
import { useToast } from '@/hooks/use-toast';

interface MigrationButtonProps {
  onMigrationComplete?: () => void;
  variant?: 'default' | 'card' | 'inline';
  className?: string;
}

export const MigrationButton = ({ 
  onMigrationComplete, 
  variant = 'default',
  className = '' 
}: MigrationButtonProps) => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('');
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    completedSteps: number;
    totalSteps: number;
    errors: string[];
    categoryResults?: Record<string, { completed: number; total: number; success: boolean }>;
  } | null>(null);
  const { toast } = useToast();

  const runCompleteMigration = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setProgress(0);
    setStatus('Starting complete chat app setup...');
    setResult(null);

    try {
      console.log('🚀 User initiated complete chat app migration');
      
      // Check current status first
      const systemCheck = await ComprehensiveMigration.verifyAllSystems();
      
      if (systemCheck.overall) {
        toast({
          title: "Chat App Already Ready! 🎉",
          description: "All systems are working correctly. No migration needed.",
        });
        setIsRunning(false);
        return;
      }

      console.log('📋 Some systems need setup, running complete migration...');
      setStatus('Setting up complete chat app database...');
      
      // Run the comprehensive migration
      const migrationResult = await ComprehensiveMigration.runCompleteMigration();
      
      // Update progress based on completed steps
      const progressPercent = (migrationResult.completedSteps / migrationResult.totalSteps) * 100;
      setProgress(progressPercent);
      
      setResult(migrationResult);
      
      if (migrationResult.success) {
        console.log('✅ Complete migration successful');
        setStatus('Chat app setup completed successfully!');
        toast({
          title: "🎉 Chat App Setup Complete!",
          description: "All features are now ready: Friends, Chat, Messages, Admin Panel, and more!",
        });
        
        // Call completion callback
        if (onMigrationComplete) {
          setTimeout(() => {
            onMigrationComplete();
          }, 1000);
        }
        
        // Auto-refresh after success
        setTimeout(() => {
          window.location.reload();
        }, 2500);
        
      } else {
        console.error('❌ Migration failed:', migrationResult.message);
        setStatus(`Setup failed: ${migrationResult.message}`);
        toast({
          title: "Setup Failed",
          description: migrationResult.message,
          variant: "destructive",
        });
      }
      
    } catch (error: any) {
      console.error('💥 Migration error:', error);
      setStatus(`Error: ${error.message}`);
      toast({
        title: "Setup Error",
        description: "An unexpected error occurred during setup.",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const openSupabaseDashboard = () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (supabaseUrl) {
      const projectRef = supabaseUrl.split('//')[1]?.split('.')[0];
      window.open(`https://supabase.com/dashboard/project/${projectRef}/sql`, '_blank');
    } else {
      window.open('https://supabase.com/dashboard', '_blank');
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Security': return <Shield className="h-4 w-4" />;
      case 'Chat System': return <MessageSquare className="h-4 w-4" />;
      case 'Friends System': return <Users className="h-4 w-4" />;
      case 'Core Tables': return <Database className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Button
          onClick={runCompleteMigration}
          disabled={isRunning}
          size="sm"
          className="flex items-center gap-2"
        >
          {isRunning ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Database className="h-4 w-4" />
          )}
          {isRunning ? 'Setting up...' : 'Complete Setup'}
        </Button>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Database className="h-5 w-5" />
            Complete Chat App Setup Required
            {result?.success && <Badge variant="default" className="ml-2">Completed</Badge>}
            {result && !result.success && <Badge variant="destructive" className="ml-2">Failed</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your chat app database needs complete setup. This will configure all features: 
            Friends, Chat, Messages, User Management, and Security.
          </p>

          {/* Progress bar */}
          {isRunning && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{status}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Category Results */}
          {result?.categoryResults && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Setup Progress by Feature:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(result.categoryResults).map(([category, categoryResult]) => (
                  <div key={category} className="flex items-center gap-2 p-2 bg-muted rounded text-xs">
                    {getCategoryIcon(category)}
                    <span className="flex-1">{category}</span>
                    <span className={`font-medium ${categoryResult.success ? 'text-green-600' : 'text-orange-600'}`}>
                      {categoryResult.completed}/{categoryResult.total}
                    </span>
                    {categoryResult.success && <CheckCircle className="h-3 w-3 text-green-500" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Result display */}
          {result && (
            <Alert className={result.success ? 'border-green-200 bg-green-50 dark:bg-green-950' : 'border-red-200 bg-red-50 dark:bg-red-950'}>
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <AlertDescription className="text-sm">
                  {result.message}
                  {result.completedSteps > 0 && (
                    <span className="ml-2 text-xs opacity-75">
                      ({result.completedSteps}/{result.totalSteps} steps completed)
                    </span>
                  )}
                </AlertDescription>
              </div>
              
              {result.errors.length > 0 && (
                <div className="mt-2 text-xs opacity-75">
                  <details>
                    <summary className="cursor-pointer">View details ({result.errors.length} items)</summary>
                    <ul className="mt-1 list-disc list-inside space-y-1">
                      {result.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </details>
                </div>
              )}
            </Alert>
          )}

          {/* Features list */}
          <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
            <h4 className="font-medium mb-2">🚀 Features being set up:</h4>
            <div className="grid grid-cols-2 gap-1">
              <div>• Friends & Contacts</div>
              <div>• Private Messages</div>
              <div>• Group Conversations</div>
              <div>• User Profiles</div>
              <div>• Admin Panel</div>
              <div>• User Status</div>
              <div>• Security Policies</div>
              <div>• Real-time Updates</div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={runCompleteMigration}
              disabled={isRunning}
              className="flex items-center gap-2 flex-1"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isRunning ? 'Setting up Complete Chat App...' : 'Complete Auto Setup'}
            </Button>
            
            <Button
              onClick={openSupabaseDashboard}
              variant="outline"
              className="flex items-center gap-2 flex-1 sm:flex-none"
            >
              <ExternalLink className="h-4 w-4" />
              Manual Setup
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            <p>
              <strong>Complete Auto Setup:</strong> Sets up all chat app features automatically (recommended).
            </p>
            <p>
              <strong>Manual Setup:</strong> Apply migration files manually in Supabase SQL Editor.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default variant
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Button
        onClick={runCompleteMigration}
        disabled={isRunning}
        variant={result?.success ? "default" : "destructive"}
        className="flex items-center gap-2"
      >
        {isRunning ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : result?.success ? (
          <CheckCircle className="h-4 w-4" />
        ) : (
          <Database className="h-4 w-4" />
        )}
        {isRunning ? 'Setting up...' : result?.success ? 'Setup Complete' : 'Complete Setup'}
      </Button>

      {result && !result.success && (
        <Button
          onClick={openSupabaseDashboard}
          variant="outline"
          size="sm"
          className="flex items-center gap-1"
        >
          <ExternalLink className="h-3 w-3" />
          Manual Setup
        </Button>
      )}

      {isRunning && (
        <div className="text-sm text-muted-foreground">
          {status} ({Math.round(progress)}%)
        </div>
      )}
    </div>
  );
}; 