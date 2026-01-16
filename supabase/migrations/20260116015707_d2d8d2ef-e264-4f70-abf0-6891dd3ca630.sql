-- =====================================================
-- SECURITY HARDENING: Profiles Table Protection
-- =====================================================

-- 1. Create security_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.security_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT,
  ip_address TEXT,
  success BOOLEAN DEFAULT false,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on security_logs
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view security logs
CREATE POLICY "Admins can view security logs" ON public.security_logs
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'ADMIN'));

-- System can insert logs
CREATE POLICY "System can insert logs" ON public.security_logs
FOR INSERT TO authenticated
WITH CHECK (true);

-- 2. Create rate_limits table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON public.rate_limits(user_id, endpoint, window_start);
CREATE INDEX IF NOT EXISTS idx_security_logs_user ON public.security_logs(user_id, created_at);

-- Enable RLS on rate_limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Users can only see their own rate limits
CREATE POLICY "Users can view own rate limits" ON public.rate_limits
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- System can manage rate limits
CREATE POLICY "System can insert rate limits" ON public.rate_limits
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. Create rate limiting check function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_endpoint TEXT,
  p_max_requests INTEGER DEFAULT 10,
  p_window_seconds INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  v_window_start := now() - (p_window_seconds || ' seconds')::INTERVAL;
  
  -- Count requests in current window
  SELECT COALESCE(SUM(request_count), 0) INTO v_count
  FROM public.rate_limits
  WHERE user_id = auth.uid()
    AND endpoint = p_endpoint
    AND window_start >= v_window_start;
  
  -- Check if over limit
  IF v_count >= p_max_requests THEN
    -- Log rate limit exceeded
    INSERT INTO public.security_logs (user_id, action, resource, success, error_message)
    VALUES (auth.uid(), 'RATE_LIMIT_EXCEEDED', p_endpoint, false, 'Too many requests');
    RETURN false;
  END IF;
  
  -- Record this request
  INSERT INTO public.rate_limits (user_id, endpoint, window_start)
  VALUES (auth.uid(), p_endpoint, now());
  
  RETURN true;
END;
$$;

-- 4. Create secure RPC function to get own profile (with rate limiting)
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS TABLE(
  id UUID,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check rate limit (5 requests per minute)
  IF NOT public.check_rate_limit('get_profile', 5, 60) THEN
    -- Log the blocked attempt
    INSERT INTO public.security_logs (user_id, action, resource, success, error_message)
    VALUES (auth.uid(), 'ACCESS_BLOCKED', 'profiles', false, 'Rate limit exceeded');
    RAISE EXCEPTION 'Rate limit exceeded. Please try again later.';
  END IF;
  
  -- Log successful access
  INSERT INTO public.security_logs (user_id, action, resource, success)
  VALUES (auth.uid(), 'READ', 'profiles', true);
  
  RETURN QUERY
  SELECT 
    p.id,
    p.nome as display_name,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  WHERE p.id = auth.uid();
END;
$$;

-- 5. Create secure RPC function to update own profile
CREATE OR REPLACE FUNCTION public.update_my_profile(new_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check rate limit (3 updates per minute)
  IF NOT public.check_rate_limit('update_profile', 3, 60) THEN
    INSERT INTO public.security_logs (user_id, action, resource, success, error_message)
    VALUES (auth.uid(), 'UPDATE_BLOCKED', 'profiles', false, 'Rate limit exceeded');
    RETURN false;
  END IF;
  
  -- Validate input
  IF new_name IS NULL OR length(trim(new_name)) < 2 THEN
    INSERT INTO public.security_logs (user_id, action, resource, success, error_message)
    VALUES (auth.uid(), 'UPDATE', 'profiles', false, 'Invalid name provided');
    RETURN false;
  END IF;
  
  -- Update profile
  UPDATE public.profiles
  SET nome = trim(new_name), updated_at = now()
  WHERE id = auth.uid();
  
  -- Log success
  INSERT INTO public.security_logs (user_id, action, resource, success)
  VALUES (auth.uid(), 'UPDATE', 'profiles', true);
  
  RETURN true;
END;
$$;

-- 6. Create function to get user role securely
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role::TEXT INTO v_role
  FROM public.user_roles
  WHERE user_id = auth.uid();
  
  RETURN COALESCE(v_role, 'USUARIO');
END;
$$;

-- 7. Cleanup old rate limit entries function
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE window_start < now() - INTERVAL '1 hour';
END;
$$;

-- 8. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_profile(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

-- 9. Add documentation comments
COMMENT ON FUNCTION public.get_my_profile() IS 'Secure function to get current user profile with rate limiting';
COMMENT ON FUNCTION public.update_my_profile(TEXT) IS 'Secure function to update current user profile with validation';
COMMENT ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) IS 'Check if user is within rate limits for an endpoint';
COMMENT ON FUNCTION public.get_my_role() IS 'Get the role of the current authenticated user';
COMMENT ON TABLE public.security_logs IS 'Audit trail for security-related actions';
COMMENT ON TABLE public.rate_limits IS 'Rate limiting tracking per user/endpoint';