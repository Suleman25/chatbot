import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Database, CheckCircle, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const DatabaseSetupPanel: React.FC = () => {
  const [setupStatus, setSetupStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testResults, setTestResults] = useState<string>('');
  const [sqlCopied, setSqlCopied] = useState(false);
  const { toast } = useToast();

  const completeSetupSQL = `-- ============================================================================
-- COMPLETE DATABASE SETUP: Fix All Messaging Issues
-- ============================================================================
-- Copy this entire script and run it in Supabase SQL Editor
-- ============================================================================

-- Step 1: Clean up existing structures (if they exist)
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP FUNCTION IF EXISTS get_user_conversations(UUID);

-- Step 2: Create profiles table first (required for foreign keys)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Step 3: Create messages table with all required columns
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message_type TEXT CHECK (message_type IN ('text', 'image', 'video', 'file')) DEFAULT 'text',
    file_url TEXT,
    file_name TEXT,
    file_size BIGINT,
    mime_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Step 4: Create performance indexes
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_messages_user_id ON public.messages(user_id);
CREATE INDEX idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_messages_conversation ON public.messages(user_id, receiver_id, created_at DESC);
CREATE INDEX idx_messages_type ON public.messages(message_type);

-- Step 5: Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies for profiles
CREATE POLICY "profiles_select_policy" ON public.profiles 
FOR SELECT USING (true);

CREATE POLICY "profiles_insert_policy" ON public.profiles 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_policy" ON public.profiles 
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Step 7: Create RLS policies for messages
CREATE POLICY "messages_select_policy" ON public.messages 
FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.uid() = receiver_id OR 
    receiver_id IS NULL
);

CREATE POLICY "messages_insert_policy" ON public.messages 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "messages_update_policy" ON public.messages 
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "messages_delete_policy" ON public.messages 
FOR DELETE USING (auth.uid() = user_id);

-- Step 8: Grant all necessary permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.messages TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Step 9: Create profiles for all existing users
INSERT INTO public.profiles (user_id, display_name)
SELECT 
    id, 
    COALESCE(
        raw_user_meta_data->>'display_name',
        raw_user_meta_data->>'name', 
        email,
        'User'
    ) as display_name
FROM auth.users 
ON CONFLICT (user_id) DO UPDATE SET
    display_name = COALESCE(
        EXCLUDED.display_name,
        profiles.display_name,
        'User'
    );

-- Step 10: Create media storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'chat-media',
    'chat-media', 
    true,
    52428800,
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 52428800;

-- Step 11: Create storage policies
CREATE POLICY "chat_media_upload_policy" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'chat-media' AND auth.role() = 'authenticated');

CREATE POLICY "chat_media_select_policy" ON storage.objects
FOR SELECT USING (bucket_id = 'chat-media');

-- Step 12: Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- SETUP COMPLETE! 🎉
-- ============================================================================`;

  const handleCopySQL = async () => {
    try {
      await navigator.clipboard.writeText(completeSetupSQL);
      setSqlCopied(true);
      toast({
        title: "SQL Copied!",
        description: "The complete database setup SQL has been copied to your clipboard.",
      });
      setTimeout(() => setSqlCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy SQL:', err);
      toast({
        title: "Copy Failed",
        description: "Unable to copy to clipboard. Please manually select and copy the SQL above.",
        variant: "destructive",
      });
    }
  };

  const testDatabaseSetup = async () => {
    setSetupStatus('testing');
    setTestResults('🔍 Testing database setup...\n');

    try {
      // Test 1: Check if tables exist
      setTestResults(prev => prev + '\n📋 Checking if tables exist...');
      
      const { data: messagesTest, error: messagesError } = await supabase
        .from('messages')
        .select('count')
        .limit(1);

      if (messagesError) {
        setTestResults(prev => prev + '\n❌ Messages table: Missing or inaccessible');
        setSetupStatus('error');
        return;
      } else {
        setTestResults(prev => prev + '\n✅ Messages table: Found');
      }

      const { data: profilesTest, error: profilesError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);

      if (profilesError) {
        setTestResults(prev => prev + '\n❌ Profiles table: Missing or inaccessible');
        setSetupStatus('error');
        return;
      } else {
        setTestResults(prev => prev + '\n✅ Profiles table: Found');
      }

      // Test 2: Try to insert a test message
      setTestResults(prev => prev + '\n\n📝 Testing message insert...');
      
      const { data: insertTest, error: insertError } = await supabase
        .from('messages')
        .insert({
          content: 'Database test message',
          user_id: (await supabase.auth.getUser()).data.user?.id,
          message_type: 'text'
        })
        .select()
        .single();

      if (insertError) {
        setTestResults(prev => prev + `\n❌ Message insert failed: ${insertError.message}`);
        setSetupStatus('error');
        return;
      } else {
        setTestResults(prev => prev + '\n✅ Message insert: Success');
        
        // Clean up test message
        await supabase
          .from('messages')
          .delete()
          .eq('id', insertTest.id);
      }

      // Test 3: Check storage bucket
      setTestResults(prev => prev + '\n\n💾 Checking media storage...');
      
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      
      if (bucketError) {
        setTestResults(prev => prev + '\n⚠️ Storage check failed (this is optional)');
      } else {
        const chatMediaBucket = buckets?.find(b => b.id === 'chat-media');
        if (chatMediaBucket) {
          setTestResults(prev => prev + '\n✅ Media storage bucket: Found');
        } else {
          setTestResults(prev => prev + '\n⚠️ Media storage bucket: Missing (images/videos may not work)');
        }
      }

      setTestResults(prev => prev + '\n\n🎉 Database setup test completed successfully!');
      setTestResults(prev => prev + '\n✅ All core messaging features should work now.');
      setSetupStatus('success');

    } catch (error) {
      console.error('Database test failed:', error);
      setTestResults(prev => prev + `\n\n💥 Test failed: ${error}`);
      setSetupStatus('error');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Setup Panel
          </CardTitle>
          <CardDescription>
            Fix all messaging database issues with the complete setup script
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Setup Status */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Setup Status:</span>
            {setupStatus === 'idle' && <Badge variant="secondary">Not tested</Badge>}
            {setupStatus === 'testing' && <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Testing...</Badge>}
            {setupStatus === 'success' && <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Ready</Badge>}
            {setupStatus === 'error' && <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Needs Setup</Badge>}
          </div>

          {/* Instructions */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Getting database errors?</strong> Follow these steps to fix all messaging issues:
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Copy the complete SQL script below</li>
                <li>Open your Supabase Dashboard → SQL Editor</li>
                <li>Paste and run the script</li>
                <li>Wait for "Success. No rows returned"</li>
                <li>Click "Test Database Setup" below</li>
                <li>Refresh your app (F5)</li>
              </ol>
            </AlertDescription>
          </Alert>

          {/* SQL Script */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Complete Database Setup SQL:</label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopySQL}
                className="h-8"
              >
                {sqlCopied ? <CheckCircle className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                {sqlCopied ? 'Copied!' : 'Copy SQL'}
              </Button>
            </div>
            <Textarea
              value={completeSetupSQL}
              readOnly
              className="font-mono text-xs h-48 resize-none"
              placeholder="Complete database setup SQL script..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={testDatabaseSetup}
              disabled={setupStatus === 'testing'}
              className="flex-1"
            >
              {setupStatus === 'testing' ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Testing...</>
              ) : (
                <><Database className="h-4 w-4 mr-2" />Test Database Setup</>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Supabase
            </Button>
          </div>

          {/* Test Results */}
          {testResults && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Test Results:</label>
              <Textarea
                value={testResults}
                readOnly
                className="font-mono text-xs h-32 resize-none bg-gray-50"
                placeholder="Test results will appear here..."
              />
            </div>
          )}

          {/* Success Message */}
          {setupStatus === 'success' && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>🎉 Setup Complete!</strong> Your database is properly configured. 
                All messaging features should work now. Try sending a message to test!
              </AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          {setupStatus === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>⚠️ Setup Required:</strong> Your database needs to be set up. 
                Please copy and run the SQL script above in your Supabase SQL Editor.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DatabaseSetupPanel; 